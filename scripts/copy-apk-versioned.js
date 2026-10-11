/**
 * Kopiert Debug- oder Release-APK in einen versionsbenannten Ordner.
 *
 * Ordner: android/app/build/outputs/apk/V2.6.1.13/
 * Datei:  FamiApp-V2.6.1.13.apk  bzw. FamiApp-V2.6.1.13-release.apk
 *
 * Args: release | debug | (leer = neueste vorhandene APK, Release bevorzugt wenn neuer/gleich alt)
 */

const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "..")
const versionPath = path.join(root, "version.json")
const debugApk = path.join(root, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk")
const releaseDirApk = path.join(root, "android", "app", "build", "outputs", "apk", "release")
const releaseApkCandidates = [
  path.join(releaseDirApk, "app-release.apk"),
  path.join(releaseDirApk, "app-release-unsigned.apk"),
]

function findReleaseApk() {
  for (const p of releaseApkCandidates) {
    if (fs.existsSync(p)) return p
  }
  return null
}

function mtimeMs(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs
  } catch {
    return 0
  }
}

const prefer = (process.argv[2] || "").toLowerCase()
const version = JSON.parse(fs.readFileSync(versionPath, "utf8"))
const versionStr = `${version.major}.${version.minor}.${version.patch}.${version.build}`
const versionDirName = `V${versionStr}`
const versionDir = path.join(root, "android", "app", "build", "outputs", "apk", versionDirName)

let source = null
let destName = `FamiApp-V${versionStr}.apk`
const releaseApk = findReleaseApk()
const debugExists = fs.existsSync(debugApk)

if (prefer === "release") {
  if (!releaseApk) {
    console.error("❌ Release-APK nicht gefunden. Zuerst: npm run apk:release  (oder npm run apk:build)")
    process.exit(1)
  }
  if (path.basename(releaseApk).includes("unsigned")) {
    console.error("❌ Gefunden: app-release-unsigned.apk – Signatur fehlt.")
    console.error("   Prüfe android/keystore.properties und npm run apk:keystore")
    process.exit(1)
  }
  source = releaseApk
  destName = `FamiApp-V${versionStr}-release.apk`
} else if (prefer === "debug") {
  if (!debugExists) {
    console.error("❌ Debug-APK nicht gefunden. Zuerst: cd android && gradlew.bat assembleDebug")
    process.exit(1)
  }
  source = debugApk
} else {
  // Ohne Prefer: nie eine alte Release-APK nehmen, wenn Debug frischer ist
  if (releaseApk && !path.basename(releaseApk).includes("unsigned") && debugExists) {
    if (mtimeMs(releaseApk) >= mtimeMs(debugApk)) {
      source = releaseApk
      destName = `FamiApp-V${versionStr}-release.apk`
    } else {
      source = debugApk
    }
  } else if (releaseApk && !path.basename(releaseApk).includes("unsigned")) {
    source = releaseApk
    destName = `FamiApp-V${versionStr}-release.apk`
  } else if (debugExists) {
    source = debugApk
  } else {
    console.error("❌ Keine APK gefunden. Empfohlen: npm run apk:build")
    process.exit(1)
  }
}

fs.mkdirSync(versionDir, { recursive: true })
const apkDest = path.join(versionDir, destName)
fs.copyFileSync(source, apkDest)

console.log(`✅ APK kopiert nach: android/app/build/outputs/apk/${versionDirName}/${destName}`)
console.log(`   Quelle: ${path.relative(root, source)}`)
if (destName.includes("-release")) {
  console.log("   Signatur: Release (Updates ohne Deinstallieren, gleiche Keystore)")
} else {
  console.log("   Signatur: Debug – nur update-fähig, wenn Debug ebenfalls mit Release-Keystore signiert ist")
}
