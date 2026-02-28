// Liest version.json und gibt die Version für APK-Ordner/Dateinamen aus: z. B. "V2.6.0.16"
const path = require("path")
const fs = require("fs")
const versionPath = path.join(__dirname, "../version.json")
const v = JSON.parse(fs.readFileSync(versionPath, "utf8"))
process.stdout.write("V" + v.major + "." + v.minor + "." + v.patch + "." + v.build)
