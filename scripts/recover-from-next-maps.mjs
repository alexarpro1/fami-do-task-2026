/**
 * One-off: restore TS/TSX sources embedded in .next source maps (pre-wipe dev/build).
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const nextDir = path.join(root, ".next")
const projectMarker = "fami-do-task%202026/"
const projectMarkerAlt = "fami-do-task 2026/"

function decodeSourcePath(source) {
  if (!source || typeof source !== "string") return null
  let s = source.replace(/^file:\/\/\/?/i, "").replace(/\\/g, "/")
  const idx = s.indexOf(projectMarker)
  if (idx >= 0) return s.slice(idx + projectMarker.length)
  const idx2 = s.indexOf(projectMarkerAlt)
  if (idx2 >= 0) return s.slice(idx2 + projectMarkerAlt.length)
  if (s.includes("Documents/fami-do-task")) {
    const m = s.match(/fami-do-task(?:%20| )2026[/\\](.+)$/i)
    if (m) return m[1].replace(/\\/g, "/")
  }
  return null
}

function collectFromMap(obj, out) {
  if (!obj || typeof obj !== "object") return
  const sources = obj.sources
  const content = obj.sourcesContent
  if (Array.isArray(sources) && Array.isArray(content)) {
    for (let i = 0; i < sources.length; i++) {
      const rel = decodeSourcePath(sources[i])
      const text = content[i]
      if (!rel || typeof text !== "string" || !text.trim()) continue
      if (
        rel.includes("node_modules/") ||
        rel.startsWith("[") ||
        rel.includes("turbopack")
      ) {
        continue
      }
      if (!/\.(tsx?|jsx?|mjs|cjs|css|json)$/.test(rel)) continue
      out.set(rel.replace(/\//g, path.sep), text)
    }
  }
  if (Array.isArray(obj.sections)) {
    for (const sec of obj.sections) {
      if (sec.map) collectFromMap(sec.map, out)
    }
  }
}

function walkMaps(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walkMaps(p, files)
    else if (ent.name.endsWith(".map")) files.push(p)
  }
  return files
}

const extracted = new Map()
for (const mapFile of walkMaps(nextDir)) {
  try {
    const raw = fs.readFileSync(mapFile, "utf8")
    const parsed = JSON.parse(raw)
    collectFromMap(parsed, extracted)
    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        if (entry?.map) collectFromMap(entry.map, extracted)
      }
    }
  } catch {
    // ignore invalid maps
  }
}

let written = 0
let skipped = 0
for (const [rel, text] of extracted) {
  const dest = path.join(root, rel)
  if (fs.existsSync(dest)) {
    skipped++
    continue
  }
  const dir = path.dirname(dest)
  if (fs.existsSync(dir) && !fs.statSync(dir).isDirectory()) {
    console.warn("[recover] skip, parent not a dir:", rel)
    continue
  }
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(dest, text, "utf8")
  written++
}

console.log(
  `[recover-from-next-maps] unique embedded: ${extracted.size}, written: ${written}, skipped existing: ${skipped}`,
)
