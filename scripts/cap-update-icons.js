/**
 * Aktualisiert das Android-Launcher-Icon aus dem Projekt-Icon.
 * Quelle (in Reihenfolge): out/icon.png (nach Next-Build), public/icon.png, assets/icon.png.
 * Nutzt @capacitor/assets zur Generierung der Android-Mipmaps/Drawables.
 *
 * Ausführen: npm run cap:icons
 * Wird automatisch vor cap sync in build:mobile / mobile:update ausgeführt.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const assetsDir = path.join(root, "assets");
const assetsIcon = path.join(assetsDir, "icon.png");

const sources = [
  path.join(root, "out", "icon.png"),
  path.join(root, "public", "icon.png"),
  assetsIcon,
];

let source = null;
for (const p of sources) {
  if (fs.existsSync(p)) {
    source = p;
    break;
  }
}

if (!source) {
  console.error(
    "Kein Icon gefunden. Bitte lege icon.png (mind. 1024×1024 px) in public/ oder führe zuerst den Web-Build aus (npm run export), damit out/icon.png entsteht."
  );
  process.exit(1);
}

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

if (source !== assetsIcon) {
  fs.copyFileSync(source, assetsIcon);
  console.log("Icon übernommen:", source, "->", assetsIcon);
}

console.log("Generiere Android-Launcher-Icons…");
execSync(
  'npx @capacitor/assets generate --android --iconBackgroundColor "#FFFFFF" --assetPath assets',
  {
    cwd: root,
    stdio: "inherit",
  }
);
console.log("Android-Start-Icon aktualisiert.");
