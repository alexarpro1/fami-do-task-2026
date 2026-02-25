// Erhöht die Build-Nummer und schreibt version.json + lib/version.ts + public/version.json.
// Bei jedem "npm run build" / "npm run export" wird das automatisch ausgeführt.
//
// Neue Version (z. B. 2.6.0) manuell setzen:
// 1. version.json: major, minor, patch anpassen; build z. B. auf 0 setzen.
// 2. lib/version.ts: major, minor, patch, build und timestamp anpassen.
// 3. npm run version:sync  → aktualisiert public/version.json für Update-Check.

const fs = require("fs")
const path = require("path")

const versionJsonPath = path.join(__dirname, "../version.json")
const versionTsPath = path.join(__dirname, "../lib/version.ts")
const publicVersionPath = path.join(__dirname, "../public/version.json")

const versionData = JSON.parse(fs.readFileSync(versionJsonPath, "utf8"))

// Öffentliche Version für Update-Check (immer aktuell halten)
fs.writeFileSync(publicVersionPath, JSON.stringify(versionData, null, 2) + "\n", "utf8")
const currentBuild = versionData.build
const newBuild = currentBuild + 1
const now = new Date().toISOString()

versionData.build = newBuild
versionData.lastUpdated = now
fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + "\n", "utf8")
fs.writeFileSync(publicVersionPath, JSON.stringify(versionData, null, 2) + "\n", "utf8")

let tsContent = fs.readFileSync(versionTsPath, "utf8")
tsContent = tsContent.replace(/build: \d+/, `build: ${newBuild}`)
tsContent = tsContent.replace(/timestamp: new Date\(".*?"\)/, `timestamp: new Date("${now}")`)
fs.writeFileSync(versionTsPath, tsContent, "utf8")

console.log(`✅ Version updated: Build ${currentBuild} → ${newBuild}`)
console.log(`📅 Timestamp: ${now}`)
console.log(`📝 Both version.json and lib/version.ts synchronized`)
