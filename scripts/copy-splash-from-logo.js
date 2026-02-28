/**
 * Kopiert das FamiDo-Logo als Android-Splash-Bild.
 * Quelle: FamiDo Task  LOGO-2.png (Projektwurzel)
 * Ziel:   android/app/src/main/res/drawable/splash.png
 *
 * Ausführen: npm run android:splash
 */
const fs = require("fs");
const path = require("path");

const logoPath = path.join(__dirname, "..", "FamiDo Task  LOGO-2.png");
const splashPath = path.join(__dirname, "..", "android", "app", "src", "main", "res", "drawable", "splash.png");

if (!fs.existsSync(logoPath)) {
  console.error("Logo nicht gefunden:", logoPath);
  process.exit(1);
}

fs.copyFileSync(logoPath, splashPath);
console.log("Splash aktualisiert:", splashPath);
