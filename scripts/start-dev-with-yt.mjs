/**
 * Startet Next.js Dev-Server + lokalen YouTube-Download-Server (Browser-Videos).
 */
import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const isWin = process.platform === "win32"
const children = []

function start(label, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: isWin,
    env: process.env,
  })
  child.on("exit", (code, signal) => {
    if (signal) console.log(`[dev] ${label} beendet (${signal})`)
    else if (code && code !== 0) console.error(`[dev] ${label} Exit-Code ${code}`)
    shutdown(code ?? 0)
  })
  children.push(child)
  return child
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      try {
        child.kill("SIGTERM")
      } catch {
        /* ignore */
      }
    }
  }
  setTimeout(() => process.exit(code), 200)
}

process.on("SIGINT", () => shutdown(0))
process.on("SIGTERM", () => shutdown(0))

start("youtube", "node", ["scripts/youtube-download-server.mjs"])
start("next", isWin ? "npx" : "npx", ["next", "dev"])
