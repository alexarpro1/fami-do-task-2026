import { compareHlc, maxHlc } from "./clock"
import type {
  EntityReplica,
  HlcTimestamp,
  JsonValue,
  SyncEvent,
  VersionedValue,
} from "./types"

export function entityKey(familyId: string, entityType: string, entityId: string): string {
  return `${encodeURIComponent(familyId)}|${encodeURIComponent(entityType)}|${encodeURIComponent(entityId)}`
}

function initialTombstone(clock: HlcTimestamp): VersionedValue<boolean> {
  return {
    value: false,
    clock: { wallTime: 0, logical: 0, node: clock.node },
  }
}

/**
 * CRDT-like register merge: every field and the deletion marker have their
 * own HLC. Therefore unrelated concurrent edits survive; only edits to the
 * same field use deterministic LWW.
 */
export function applyEvent(
  current: EntityReplica | undefined,
  event: SyncEvent,
): { entity: EntityReplica; changed: boolean } {
  const entity: EntityReplica = current
    ? {
        ...current,
        fields: { ...current.fields },
        tombstone: { ...current.tombstone },
      }
    : {
        familyId: event.familyId,
        entityType: event.entityType,
        entityId: event.entityId,
        fields: {},
        tombstone: initialTombstone(event.clock),
      }

  let changed = false
  for (const [field, incoming] of Object.entries(event.mutation.fields)) {
    // While deleted, ignore fields older than the tombstone. Otherwise an
    // offline stale edit could become visible after a later, partial revival.
    if (
      entity.tombstone.value &&
      compareHlc(incoming.clock, entity.tombstone.clock) <= 0
    ) {
      continue
    }
    const existing = entity.fields[field]
    if (!existing || compareHlc(incoming.clock, existing.clock) > 0) {
      entity.fields[field] = incoming
      changed = true
    }
  }

  const incomingTombstone = event.mutation.tombstone
  if (
    incomingTombstone &&
    compareHlc(incomingTombstone.clock, entity.tombstone.clock) > 0
  ) {
    entity.tombstone = incomingTombstone
    changed = true
  }

  return { entity, changed }
}

export function materializeEntity(
  entity: EntityReplica | undefined,
  includeDeleted = false,
): Record<string, JsonValue> | null {
  if (!entity || (entity.tombstone.value && !includeDeleted)) return null
  return Object.fromEntries(
    Object.entries(entity.fields).map(([field, register]) => [field, register.value]),
  )
}

export function mergeEventsForCompaction(events: SyncEvent[]): SyncEvent {
  if (events.length === 0) throw new Error("At least one event is required")

  const latest = events.reduce((winner, event) =>
    compareHlc(event.clock, winner.clock) > 0 ? event : winner,
  )
  const fields: SyncEvent["mutation"]["fields"] = {}
  let tombstone: SyncEvent["mutation"]["tombstone"]
  let clock = events[0].clock

  for (const event of events) {
    clock = maxHlc(clock, event.clock)
    for (const [field, register] of Object.entries(event.mutation.fields)) {
      const current = fields[field]
      if (!current || compareHlc(register.clock, current.clock) > 0) {
        fields[field] = register
      }
    }
    if (
      event.mutation.tombstone &&
      (!tombstone || compareHlc(event.mutation.tombstone.clock, tombstone.clock) > 0)
    ) {
      tombstone = event.mutation.tombstone
    }
  }

  return {
    ...latest,
    clock,
    mutation: { fields, tombstone },
  }
}

function isHlc(value: unknown): value is HlcTimestamp {
  if (!value || typeof value !== "object") return false
  const clock = value as Partial<HlcTimestamp>
  return (
    typeof clock.wallTime === "number" &&
    Number.isFinite(clock.wallTime) &&
    typeof clock.logical === "number" &&
    Number.isSafeInteger(clock.logical) &&
    clock.logical >= 0 &&
    typeof clock.node === "string" &&
    clock.node.length > 0
  )
}

export function isJsonValue(value: unknown, ancestors = new Set<object>()): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true
  }
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value !== "object") return false
  if (ancestors.has(value)) return false

  ancestors.add(value)
  const valid = Array.isArray(value)
    ? value.every((item) => isJsonValue(item, ancestors))
    : Object.getPrototypeOf(value) === Object.prototype &&
      Object.values(value).every((item) => isJsonValue(item, ancestors))
  ancestors.delete(value)
  return valid
}

export function isSyncEvent(value: unknown): value is SyncEvent {
  if (!value || typeof value !== "object") return false
  const event = value as Partial<SyncEvent>
  const fields = event.mutation?.fields
  const validFields =
    !!fields &&
    typeof fields === "object" &&
    !Array.isArray(fields) &&
    Object.values(fields).every(
      (register) =>
        !!register &&
        typeof register === "object" &&
        isHlc(register.clock) &&
        isJsonValue(register.value),
    )
  const tombstone = event.mutation?.tombstone
  const validTombstone =
    tombstone === undefined ||
    (typeof tombstone.value === "boolean" && isHlc(tombstone.clock))
  return (
    event.schemaVersion === 1 &&
    typeof event.eventId === "string" && event.eventId.length > 0 &&
    typeof event.familyId === "string" && event.familyId.length > 0 &&
    typeof event.deviceId === "string" && event.deviceId.length > 0 &&
    typeof event.entityType === "string" && event.entityType.length > 0 &&
    typeof event.entityId === "string" && event.entityId.length > 0 &&
    typeof event.createdAt === "number" && Number.isFinite(event.createdAt) &&
    isHlc(event.clock) &&
    validFields &&
    validTombstone
  )
}
