import type {
  EventTransport,
  PullRequest,
  PullResponse,
  PushRequest,
  PushResponse,
} from "./types"

export interface EventTransportHandlers {
  push(request: PushRequest): Promise<PushResponse>
  pull(request: PullRequest): Promise<PullResponse>
  acknowledge?(
    familyId: string,
    deviceId: string,
    eventIds: string[],
  ): Promise<void>
}

/**
 * Small adapter useful for wiring either existing Supabase RPCs or WLAN
 * messages without introducing either dependency into the queue.
 */
export class CallbackEventTransport implements EventTransport {
  constructor(private readonly handlers: EventTransportHandlers) {}

  push(request: PushRequest): Promise<PushResponse> {
    return this.handlers.push(request)
  }

  pull(request: PullRequest): Promise<PullResponse> {
    return this.handlers.pull(request)
  }

  acknowledge(
    familyId: string,
    deviceId: string,
    eventIds: string[],
  ): Promise<void> {
    return this.handlers.acknowledge?.(familyId, deviceId, eventIds) ?? Promise.resolve()
  }
}
