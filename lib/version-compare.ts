import { parseVersionString } from "@/lib/version"

/**
 * Vergleicht zwei Versions-Strings (z. B. "2.6.0.29" oder "V2.6.0.29").
 * @returns -1 wenn a < b, 0 wenn a === b, 1 wenn a > b
 */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersionString(a)
  const pb = parseVersionString(b)
  if (!pa || !pb) return 0
  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1
  if (pa.build !== pb.build) return pa.build < pb.build ? -1 : 1
  return 0
}
