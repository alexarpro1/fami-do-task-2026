/**
 * Versioniertes Backup des wichtigsten App-Codes.
 * Nach jedem Update (version:bump) ausführen: npm run version:backup
 *
 * Sichert: Seiten (app/), Komponenten, Lib, Types, Context, Hooks,
 * Konfiguration, Skripte, Dokumentation, public (Assets/Version).
 * Bezeichnung: backup-v{version}-{datum}
 */

const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "..")

const versionJsonPath = path.join(root, "version.json")
if (!fs.existsSync(versionJsonPath)) {
  console.error("version.json nicht gefunden. Zuerst npm run version:bump ausführen.")
  process.exit(1)
}

const versionData = JSON.parse(fs.readFileSync(versionJsonPath, "utf8"))
const v = versionData
const versionLabel = `v${v.major}.${v.minor}.${v.patch}.${v.build}`
const dateStr = (versionData.lastUpdated || new Date().toISOString()).slice(0, 10)
const backupDirName = `backup-${versionLabel}-${dateStr}`
const backupRoot = path.join(root, "backups", backupDirName)

const DIRS_TO_BACKUP = ["app", "components", "lib", "types", "context", "hooks", "public"]
const FILES_TO_BACKUP = [
  "version.json",
  "package.json",
  "DOCUMENTATION.md",
  "next.config.mjs",
  "next.config.js",
  "tsconfig.json",
  "tailwind.config.ts",
  "tailwind.config.js",
  "postcss.config.mjs",
  "capacitor.config.ts",
  "capacitor.config.json",
]
const SCRIPTS_TO_BACKUP = [
  "increment-version.js",
  "sync-version-public.js",
  "version-backup.js",
  "clean-android-builds.js",
  "run-android-bs.js",
]

function copyDirSync(src, dest, skipDirs = []) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skipDirs.includes(entry.name)) continue
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(s, d, skipDirs)
    } else {
      fs.copyFileSync(s, d)
    }
  }
}

function copyFile(src, destDir) {
  const srcPath = path.join(root, src)
  if (!fs.existsSync(srcPath)) return
  const destPath = path.join(destDir, path.basename(src))
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  fs.copyFileSync(srcPath, destPath)
}

// Backup-Ordner anlegen
fs.mkdirSync(backupRoot, { recursive: true })

// Verzeichnisse kopieren (ohne node_modules, .next, build-Ordner)
const skipInDirs = ["node_modules", ".next", "out", "build", ".git"]
for (const dir of DIRS_TO_BACKUP) {
  const src = path.join(root, dir)
  if (fs.existsSync(src)) {
    copyDirSync(src, path.join(backupRoot, dir), skipInDirs)
    console.log(`  📁 ${dir}/`)
  }
}

// Wichtige Dateien aus dem Root
for (const file of FILES_TO_BACKUP) {
  copyFile(file, backupRoot)
  if (fs.existsSync(path.join(root, file))) console.log(`  📄 ${file}`)
}

// Skripte
const scriptsDest = path.join(backupRoot, "scripts")
fs.mkdirSync(scriptsDest, { recursive: true })
for (const name of SCRIPTS_TO_BACKUP) {
  const src = path.join(root, "scripts", name)
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(scriptsDest, name))
    console.log(`  📄 scripts/${name}`)
  }
}

// README im Backup
const readme = `# Backup ${backupDirName}

Erstellt am ${new Date().toISOString()}
Version: ${versionLabel}

Enthält: app/, components/, lib/, types/, context/, hooks/, public/,
Konfiguration, Skripte, DOCUMENTATION.md.
`
fs.writeFileSync(path.join(backupRoot, "README.txt"), readme, "utf8")

console.log("")
console.log(`✅ Backup erstellt: backups/${backupDirName}`)
console.log(`   Version ${versionLabel} – wichtigster App-Code gesichert.`)
console.log("")
