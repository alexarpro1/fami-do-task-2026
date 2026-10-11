/**
 * Löscht alle Android-Build-Ordner (node_modules/@capacitor, android/app/build, android/build).
 * Beendet zuerst alle Gradle-Daemons und wartet, damit keine Dateien mehr gesperrt sind.
 * Verhindert dauerhaft "Unable to delete directory" in Android Studio / Gradle.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const androidDir = path.join(root, "android");

// Alle bekannten Build-Ordner + dynamisch alle @capacitor/*/android/build
function getDirsToRemove() {
  const fixed = [
    // path.join(root, "android", "app", "build"),  // Auskommentiert: Darf nicht mehr gelöscht werden
    // path.join(root, "android", "build"),         // Auskommentiert: Darf nicht mehr gelöscht werden
  ];
  const capacitorRoot = path.join(root, "node_modules", "@capacitor");
  const list = [...fixed];
  if (fs.existsSync(capacitorRoot)) {
    try {
      const packages = fs.readdirSync(capacitorRoot);
      for (const pkg of packages) {
        const buildDir = path.join(capacitorRoot, pkg, "android", "build");
        if (fs.existsSync(buildDir)) list.push(buildDir);
        // @capacitor/android hat Untermodul capacitor
        if (pkg === "android") {
          const capBuild = path.join(capacitorRoot, pkg, "capacitor", "build");
          if (fs.existsSync(capBuild)) list.push(capBuild);
        }
      }
    } catch (_) {}
  }
  return list;
}

function rmRecursive(dir, retries = 3) {
  if (!fs.existsSync(dir)) return true;
  for (let i = 0; i < retries; i++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    } catch (e) {
      if (i < retries - 1) {
        console.warn("  Warte 2s, erneuter Versuch:", path.relative(root, dir));
        try { execSync("timeout /t 2 /nobreak >nul", { stdio: "pipe" }); } catch (_) {}
      } else {
        console.warn("  Konnte nicht löschen:", path.relative(root, dir), e.message);
        return false;
      }
    }
  }
  return false;
}

console.log("Gradle-Daemons beenden...");
try {
  execSync("gradlew.bat --stop", { cwd: androidDir, stdio: "pipe" });
  console.log("  OK");
} catch (_) {
  console.log("  (kein Daemon aktiv oder gradlew nicht gefunden)");
}
console.log("Warte 3 Sekunden (Dateien freigeben)...");
try {
  execSync("timeout /t 3 /nobreak >nul", { stdio: "pipe" });
} catch (_) {}

const dirsToRemove = getDirsToRemove();
console.log("Lösche", dirsToRemove.length, "Build-Ordner...");
dirsToRemove.forEach((d) => {
  if (rmRecursive(d)) console.log("  OK:", path.relative(root, d));
});
console.log("Fertig. Tipp: Vor dem Öffnen in Android Studio immer zuerst 'npm run android:clean' ausführen.");
console.log("Danach z.B.: npm run android:pixel9 oder npm run android:bs");
