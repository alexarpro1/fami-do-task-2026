import type { LocalEventQueue } from "./event-queue"
import type {
  EventTransport,
  SyncIdentity,
  SyncRunResult,
} from "./types"

export interface SyncEngineOptions {
  identity: SyncIdentity
  queue: LocalEventQueue
  transport: EventTransport
  pushBatchSize?: number
  pullBatchSize?: number
}

/**
 * Opt-in event sync orchestrator. It does not read or replace FamilyState;
 * callers map existing actions/entities to queue events explicitly.
 */
export class EventSyncEngine {
  private readonly identity: SyncIdentity
  private readonly queue: LocalEventQueue
  private readonly transport: EventTransport
  private readonly pushBatchSize: number
  private readonly pullBatchSize: number
  private running: Promise<SyncRunResult> | null = null

  constructor(options: SyncEngineOptions) {
    this.identity = options.identity
    this.queue = options.queue
    this.transport = options.transport
    this.pushBatchSize = options.pushBatchSize ?? 100
    this.pullBatchSize = options.pullBatchSize ?? 200
  }

  /** Concurrent triggers share one run, avoiding duplicate transport writes. */
  syncOnce(): Promise<SyncRunResult> {
    if (this.running) return this.running
    this.running = this.run().finally(() => {
      this.running = null
    })
    return this.running
  }

  private async run(): Promise<SyncRunResult> {
    await this.queue.initialize()
    await this.queue.compact()

    const result: SyncRunResult = {
      pushed: 0,
      received: 0,
      applied: 0,
      duplicates: 0,
      failed: 0,
      hasMore: false,
    }

    const ready = await this.queue.getReady(this.pushBatchSize)
    if (ready.length > 0) {
      const sentIds = new Set(ready.map((entry) => entry.event.eventId))
      try {
        const response = await this.transport.push({
          ...this.identity,
          events: ready.map((entry) => entry.event),
        })
        const acknowledged = response.acknowledgedEventIds.filter((id) =>
          sentIds.has(id),
        )
        await this.queue.acknowledge(acknowledged)
        result.pushed = acknowledged.length

        const acknowledgedSet = new Set(acknowledged)
        const missing = [...sentIds].filter((id) => !acknowledgedSet.has(id))
        if (missing.length > 0) {
          await this.queue.markForRetry(missing, "Transport did not acknowledge event")
          result.failed += missing.length
        }
      } catch (error) {
        await this.queue.markForRetry([...sentIds], error)
        result.failed += sentIds.size
      }
    }

    try {
      const response = await this.transport.pull({
        ...this.identity,
        cursor: await this.queue.getCursor(),
        limit: this.pullBatchSize,
      })
      const applied = await this.queue.applyRemote(response.events, response.cursor)
      result.received = applied.received
      result.applied = applied.applied
      result.duplicates = applied.duplicates
      result.failed += applied.rejected
      result.hasMore = response.hasMore ?? false

      if (response.events.length > 0 && this.transport.acknowledge) {
        try {
          await this.transport.acknowledge(
            this.identity.familyId,
            this.identity.deviceId,
            response.events.map((event) => event.eventId),
          )
        } catch {
          // Safe to retry: local event-ID dedup makes another pull idempotent.
        }
      }
    } catch {
      // A push ACK remains valid even when pulling is temporarily unavailable.
      result.failed += 1
    }

    return result
  }
}
