/**
 * Löscht .next (und Lock) und startet den Next.js Dev-Server neu.
 * Behebt "Lost connection to server" (Turbopack/Dev-Server) durch sauberen Neustart.
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..");
const nextDir = path.join(root, ".next");
const lockFile = path.join(root, ".next", "dev", "lock");

if (fs.existsSync(lockFile)) {
  try {
    fs.unlinkSync(lockFile);
    console.log("[dev:clean] Lock-Datei entfernt.");
  } catch (e) {
    console.warn("[dev:clean] Lock konnte nicht gelöscht werden:", e.message);
  }
}

if (fs.existsSync(nextDir)) {
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log("[dev:clean] .next Cache gelöscht.");
  } catch (e) {
    console.warn("[dev:clean] .next konnte nicht gelöscht werden:", e.message);
    console.warn("Bitte Dev-Server stoppen (Strg+C) und erneut ausführen.");
  }
}

console.log("[dev:clean] Starte Next.js Dev-Server...");
const child = spawn("npx", ["next", "dev"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

child.on("error", (err) => {
  console.error("Fehler beim Start:", err);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
