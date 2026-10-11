import { observeHlc, tickHlc } from "./clock"
import type { SyncStateStore } from "./durable-store"
import {
  applyEvent,
  entityKey,
  isJsonValue,
  isSyncEvent,
  materializeEntity,
  mergeEventsForCompaction,
} from "./merge"
import type {
  EntityReplica,
  JsonValue,
  PersistedSyncState,
  QueueEntry,
  RetryPolicy,
  SyncEvent,
  SyncIdentity,
} from "./types"

const DEFAULT_RETRY: RetryPolicy = {
  baseDelayMs: 1_000,
  maxDelayMs: 5 * 60_000,
  jitterRatio: 0.2,
}
const MAX_SEEN_EVENT_IDS = 10_000

export interface EventQueueOptions {
  identity: SyncIdentity
  store: SyncStateStore
  retry?: Partial<RetryPolicy>
  now?: () => number
  random?: () => number
  eventId?: () => string
  maxSeenEventIds?: number
}

export interface ApplyEventsResult {
  received: number
  applied: number
  duplicates: number
  rejected: number
}

function emptyState(): PersistedSyncState {
  return {
    schemaVersion: 1,
    generation: 0,
    queue: [],
    entities: {},
    seenEventIds: [],
  }
}

function defaultEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function cloneState(state: PersistedSyncState): PersistedSyncState {
  return structuredClone(state)
}

function addSeen(state: PersistedSyncState, eventId: string, limit: number): void {
  state.seenEventIds.push(eventId)
  if (state.seenEventIds.length > limit) {
    state.seenEventIds.splice(0, state.seenEventIds.length - limit)
  }
}

export class LocalEventQueue {
  private readonly identity: SyncIdentity
  private readonly store: SyncStateStore
  private readonly retry: RetryPolicy
  private readonly now: () => number
  private readonly random: () => number
  private readonly createEventId: () => string
  private readonly maxSeenEventIds: number
  private state: PersistedSyncState | null = null
  private operation: Promise<void> = Promise.resolve()

  constructor(options: EventQueueOptions) {
    this.identity = options.identity
    this.store = options.store
    this.retry = { ...DEFAULT_RETRY, ...options.retry }
    this.now = options.now ?? Date.now
    this.random = options.random ?? Math.random
    this.createEventId = options.eventId ?? defaultEventId
    this.maxSeenEventIds = options.maxSeenEventIds ?? MAX_SEEN_EVENT_IDS
  }

  async initialize(): Promise<void> {
    await this.exclusive(async () => {
      if (this.state) return
      this.state = (await this.store.load()) ?? emptyState()
    })
  }

  async enqueuePatch(
    entityType: string,
    entityId: string,
    patch: Record<string, JsonValue>,
    options: { resurrect?: boolean } = {},
  ): Promise<SyncEvent> {
    this.assertEntityIdentity(entityType, entityId)
    for (const [field, value] of Object.entries(patch)) {
      if (!field || !isJsonValue(value)) {
        throw new TypeError(`Field "${field}" is not a serializable JSON value`)
      }
    }
    return this.mutate((state) => {
      const now = this.now()
      const clock = tickHlc(state.clock, this.identity.deviceId, now)
      state.clock = clock
      const fields = Object.fromEntries(
        Object.entries(patch).map(([field, value]) => [
          field,
          { value, clock },
        ]),
      )
      const event: SyncEvent = {
        schemaVersion: 1,
        eventId: this.createEventId(),
        familyId: this.identity.familyId,
        deviceId: this.identity.deviceId,
        entityType,
        entityId,
        clock,
        createdAt: now,
        mutation: {
          fields,
          tombstone:
            options.resurrect === false ? undefined : { value: false, clock },
        },
      }
      this.appendLocalEvent(state, event)
      return event
    })
  }

  async enqueueDelete(entityType: string, entityId: string): Promise<SyncEvent> {
    this.assertEntityIdentity(entityType, entityId)
    return this.mutate((state) => {
      const now = this.now()
      const clock = tickHlc(state.clock, this.identity.deviceId, now)
      state.clock = clock
      const event: SyncEvent = {
        schemaVersion: 1,
        eventId: this.createEventId(),
        familyId: this.identity.familyId,
        deviceId: this.identity.deviceId,
        entityType,
        entityId,
        clock,
        createdAt: now,
        mutation: {
          fields: {},
          tombstone: { value: true, clock },
        },
      }
      this.appendLocalEvent(state, event)
      return event
    })
  }

  async applyRemote(
    events: readonly unknown[],
    cursor?: string,
  ): Promise<ApplyEventsResult> {
    return this.mutate((state) => {
      const seen = new Set(state.seenEventIds)
      const result: ApplyEventsResult = {
        received: events.length,
        applied: 0,
        duplicates: 0,
        rejected: 0,
      }

      for (const candidate of events) {
        if (!isSyncEvent(candidate) || candidate.familyId !== this.identity.familyId) {
          result.rejected++
          continue
        }
        if (seen.has(candidate.eventId)) {
          result.duplicates++
          continue
        }

        state.clock = observeHlc(
          state.clock,
          candidate.clock,
          this.identity.deviceId,
          this.now(),
        )
        const key = entityKey(
          candidate.familyId,
          candidate.entityType,
          candidate.entityId,
        )
        const merged = applyEvent(state.entities[key], candidate)
        state.entities[key] = merged.entity
        if (merged.changed) result.applied++
        addSeen(state, candidate.eventId, this.maxSeenEventIds)
        seen.add(candidate.eventId)
      }

      if (cursor !== undefined) state.transportCursor = cursor
      return result
    })
  }

  async getReady(limit = 100): Promise<QueueEntry[]> {
    return this.read((state) =>
      state.queue
        .filter((entry) => entry.nextAttemptAt <= this.now())
        .slice(0, limit)
        .map((entry) => structuredClone(entry)),
    )
  }

  async acknowledge(eventIds: readonly string[]): Promise<number> {
    if (eventIds.length === 0) return 0
    const ids = new Set(eventIds)
    return this.mutate((state) => {
      const before = state.queue.length
      state.queue = state.queue.filter((entry) => !ids.has(entry.event.eventId))
      return before - state.queue.length
    })
  }

  async markForRetry(eventIds: readonly string[], error: unknown): Promise<number> {
    if (eventIds.length === 0) return 0
    const ids = new Set(eventIds)
    return this.mutate((state) => {
      let updated = 0
      for (const entry of state.queue) {
        if (!ids.has(entry.event.eventId)) continue
        entry.attempts += 1
        const exponential = Math.min(
          this.retry.maxDelayMs,
          this.retry.baseDelayMs * 2 ** Math.max(0, entry.attempts - 1),
        )
        const jitter = exponential * this.retry.jitterRatio * (this.random() * 2 - 1)
        entry.nextAttemptAt = this.now() + Math.max(0, Math.round(exponential + jitter))
        entry.lastError = error instanceof Error ? error.message : String(error)
        updated++
      }
      return updated
    })
  }

  /**
   * Coalesces only never-attempted events. Once an event might have reached a
   * transport, its event ID is immutable until an explicit ACK arrives.
   */
  async compact(): Promise<number> {
    return this.mutate((state) => {
      const groups = new Map<string, QueueEntry[]>()
      for (const entry of state.queue) {
        if (entry.attempts !== 0) continue
        const key = entityKey(
          entry.event.familyId,
          entry.event.entityType,
          entry.event.entityId,
        )
        const group = groups.get(key) ?? []
        group.push(entry)
        groups.set(key, group)
      }

      const compactable = new Map(
        [...groups.entries()].filter(([, entries]) => entries.length > 1),
      )
      if (compactable.size === 0) return 0

      const emitted = new Set<string>()
      const compacted: QueueEntry[] = []
      let removed = 0
      for (const entry of state.queue) {
        const key = entityKey(
          entry.event.familyId,
          entry.event.entityType,
          entry.event.entityId,
        )
        const group = compactable.get(key)
        if (!group) {
          compacted.push(entry)
          continue
        }
        if (emitted.has(key)) {
          removed++
          continue
        }
        emitted.add(key)
        compacted.push({
          event: mergeEventsForCompaction(group.map((item) => item.event)),
          attempts: 0,
          nextAttemptAt: Math.min(...group.map((item) => item.nextAttemptAt)),
        })
      }
      state.queue = compacted
      return removed
    })
  }

  async getEntityReplica(
    entityType: string,
    entityId: string,
  ): Promise<EntityReplica | undefined> {
    return this.read((state) => {
      const entity = state.entities[
        entityKey(this.identity.familyId, entityType, entityId)
      ]
      return entity ? structuredClone(entity) : undefined
    })
  }

  async getEntity(
    entityType: string,
    entityId: string,
    includeDeleted = false,
  ): Promise<Record<string, JsonValue> | null> {
    const replica = await this.getEntityReplica(entityType, entityId)
    return materializeEntity(replica, includeDeleted)
  }

  async getEntitiesByType(
    entityType: string,
    includeDeleted = false,
  ): Promise<Record<string, Record<string, JsonValue>>> {
    return this.read((state) => {
      const result: Record<string, Record<string, JsonValue>> = {}
      for (const replica of Object.values(state.entities)) {
        if (replica.familyId !== this.identity.familyId || replica.entityType !== entityType) continue
        const materialized = materializeEntity(replica, includeDeleted)
        if (materialized) result[replica.entityId] = materialized
      }
      return result
    })
  }

  async getEntitySnapshotsByType(
    entityType: string,
  ): Promise<Record<string, Record<string, JsonValue> | null>> {
    return this.read((state) => {
      const result: Record<string, Record<string, JsonValue> | null> = {}
      for (const replica of Object.values(state.entities)) {
        if (replica.familyId !== this.identity.familyId || replica.entityType !== entityType) continue
        result[replica.entityId] = materializeEntity(replica, false)
      }
      return result
    })
  }

  async getCursor(): Promise<string | undefined> {
    return this.read((state) => state.transportCursor)
  }

  async pendingCount(): Promise<number> {
    return this.read((state) => state.queue.length)
  }

  /** Pending Outbound-Event-IDs für Presence-queueHash (Store-and-Forward). */
  async listPendingEventIds(): Promise<string[]> {
    return this.read((state) => state.queue.map((entry) => entry.event.eventId))
  }

  private appendLocalEvent(state: PersistedSyncState, event: SyncEvent): void {
    const key = entityKey(event.familyId, event.entityType, event.entityId)
    state.entities[key] = applyEvent(state.entities[key], event).entity
    state.queue.push({ event, attempts: 0, nextAttemptAt: this.now() })
    addSeen(state, event.eventId, this.maxSeenEventIds)
  }

  private assertEntityIdentity(entityType: string, entityId: string): void {
    if (!entityType || !entityId) {
      throw new TypeError("entityType and entityId must not be empty")
    }
  }

  private async read<T>(reader: (state: PersistedSyncState) => T): Promise<T> {
    return this.exclusive(async () => {
      await this.ensureLoaded()
      return reader(this.state!)
    })
  }

  private async mutate<T>(
    mutation: (state: PersistedSyncState) => T,
  ): Promise<T> {
    return this.exclusive(async () => {
      await this.ensureLoaded()
      const candidate = cloneState(this.state!)
      const result = mutation(candidate)
      candidate.generation = this.state!.generation + 1
      await this.store.save(candidate)
      this.state = candidate
      return result
    })
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.state) this.state = (await this.store.load()) ?? emptyState()
  }

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operation.then(operation, operation)
    this.operation = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }
}
