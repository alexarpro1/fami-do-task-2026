// Kopiert version.json nach public/version.json (ohne Build zu erhöhen).
// Nützlich nach manueller Änderung von major/minor/patch in version.json und lib/version.ts.
const fs = require("fs");
const path = require("path");
const versionJsonPath = path.join(__dirname, "../version.json");
const publicVersionPath = path.join(__dirname, "../public/version.json");
const data = JSON.parse(fs.readFileSync(versionJsonPath, "utf8"));
fs.writeFileSync(publicVersionPath, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("public/version.json aktualisiert:", `${data.major}.${data.minor}.${data.patch}.${data.build}`);
