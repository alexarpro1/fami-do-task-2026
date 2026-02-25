const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const adb = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk", "platform-tools", "adb.exe")
  : "adb";
const BS_HOST = "127.0.0.1:5555";
const APK = path.join(root, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");

console.log("BlueStacks: Verbinde mit", BS_HOST, "...");
execSync(`"${adb}" connect ${BS_HOST}`, { stdio: "inherit" });

console.log("Capacitor: Web-Assets kopieren ...");
execSync("npx cap copy", { cwd: root, stdio: "inherit" });

if (!fs.existsSync(APK)) {
  console.log("APK bauen ...");
  execSync("gradlew.bat assembleDebug", { cwd: path.join(root, "android"), stdio: "inherit" });
} else {
  console.log("APK vorhanden, überspringe Build (lösche android/app/build für Neuaufbau).");
}

console.log("Installiere auf BlueStacks ...");
execSync(`"${adb}" -s ${BS_HOST} install -r "${APK}"`, { stdio: "inherit" });

console.log("Starte App ...");
execSync(`"${adb}" -s ${BS_HOST} shell am start -n com.famiapp.app/.MainActivity`, { stdio: "inherit" });

console.log("Fertig. App sollte auf BlueStacks laufen.");
