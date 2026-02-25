const fs = require("fs");
const path = require("path");

const pngPath = path.join(__dirname, "..", "FamiDo Task  LOGO-2.png");
const outPath = path.join(__dirname, "..", "public", "icon.svg");

if (!fs.existsSync(pngPath)) {
  console.error("PNG not found:", pngPath);
  process.exit(1);
}

const pngBuffer = fs.readFileSync(pngPath);
const base64 = pngBuffer.toString("base64");
const dataUri = "data:image/png;base64," + base64;

const svg = `<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="180" height="180" rx="37" fill="#f0f0f0"/>
  <image href="${dataUri}" x="0" y="0" width="180" height="180" preserveAspectRatio="xMidYMid meet"/>
</svg>
`;

fs.writeFileSync(outPath, svg, "utf8");
console.log("Written:", outPath);
