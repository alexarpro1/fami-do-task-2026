/**
 * Kopiert das responsive FamiDo-Logo als Android-Splash-Bild.
 * Quelle: assets/responsive-intro-logo.png (zentriertes Logo für alle Bildschirmgrößen)
 * Ziel:   android/app/src/main/res/drawable/splash.png
 *
 * Ausführen: npm run android:splash
 */
const fs = require("fs");
const path = require("path");

const logoPath = path.join(__dirname, "..", "assets", "responsive-intro-logo.png");
const splashPath = path.join(__dirname, "..", "android", "app", "src", "main", "res", "drawable", "splash.png");

if (!fs.existsSync(logoPath)) {
  console.error("Logo nicht gefunden:", logoPath);
  process.exit(1);
}

fs.copyFileSync(logoPath, splashPath);
console.log("Splash aktualisiert:", splashPath);
