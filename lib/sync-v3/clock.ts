import type { HlcTimestamp } from "./types"

export function compareHlc(a: HlcTimestamp, b: HlcTimestamp): number {
  if (a.wallTime !== b.wallTime) return a.wallTime < b.wallTime ? -1 : 1
  if (a.logical !== b.logical) return a.logical < b.logical ? -1 : 1
  return a.node.localeCompare(b.node)
}

export function maxHlc(a: HlcTimestamp, b: HlcTimestamp): HlcTimestamp {
  return compareHlc(a, b) >= 0 ? a : b
}

/** Creates a monotone local timestamp even if the device clock moves backwards. */
export function tickHlc(
  current: HlcTimestamp | undefined,
  node: string,
  now: number,
): HlcTimestamp {
  if (!current || now > current.wallTime) {
    return { wallTime: now, logical: 0, node }
  }
  return {
    wallTime: current.wallTime,
    logical: current.logical + 1,
    node,
  }
}

/** Advances the local HLC after observing a timestamp from another device. */
export function observeHlc(
  current: HlcTimestamp | undefined,
  remote: HlcTimestamp,
  node: string,
  now: number,
): HlcTimestamp {
  const localWall = current?.wallTime ?? 0
  const wallTime = Math.max(now, localWall, remote.wallTime)

  let logical = 0
  if (wallTime === localWall && wallTime === remote.wallTime) {
    logical = Math.max(current?.logical ?? 0, remote.logical) + 1
  } else if (wallTime === localWall) {
    logical = (current?.logical ?? 0) + 1
  } else if (wallTime === remote.wallTime) {
    logical = remote.logical + 1
  }

  return { wallTime, logical, node }
}
