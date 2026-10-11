/**
 * Prueft Remote-URLs fuer APK + version.json (GitHub Releases).
 * Exit 1 wenn ein kanonischer Link 404 liefert oder das Repo nicht erreichbar ist.
 *
 * Usage: node scripts/verify-update-urls.mjs
 */

const OWNER = "alexarpro1"
const REPO = "fami-do-task-2026"

const URLS = [
  {
    name: "APK (latest)",
    url: `https://github.com/${OWNER}/${REPO}/releases/latest/download/FamiApp-latest.apk`,
    required: true,
  },
  {
    name: "version.json (latest)",
    url: `https://github.com/${OWNER}/${REPO}/releases/latest/download/version.json`,
    required: true,
  },
  {
    name: "Releases API (latest)",
    url: `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`,
    required: false,
  },
  {
    name: "Repo API",
    url: `https://api.github.com/repos/${OWNER}/${REPO}`,
    required: true,
  },
]

async function probe(label, url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" })
    let detail = `${res.status}`
    if (res.status === 404 && url.includes("api.github.com/repos")) {
      const getRes = await fetch(url)
      const body = await getRes.text()
      if (body.includes('"Not Found"')) {
        detail += " (Repo fehlt, privat ohne Token, oder kein Release)"
      }
    }
    if (res.status === 200 && label.includes("version.json")) {
      const getRes = await fetch(url)
      const text = await getRes.text()
      try {
        const j = JSON.parse(text)
        detail += ` -> ${j.major}.${j.minor}.${j.patch}.${j.build}`
      } catch {
        detail += " (Body kein JSON)"
      }
    }
    return { ok: res.ok, status: res.status, detail }
  } catch (err) {
    return { ok: false, status: 0, detail: String(err?.message || err) }
  }
}

async function main() {
  console.log(`Update-URLs fuer ${OWNER}/${REPO}\n`)
  let failed = false

  for (const entry of URLS) {
    const { ok, detail } = await probe(entry.name, entry.url)
    const mark = ok ? "OK" : "FAIL"
    console.log(`[${mark}] ${entry.name}: ${entry.url}`)
    console.log(`       ${detail}`)
    if (entry.required && !ok) failed = true
  }

  console.log("")
  if (failed) {
    console.log(
      "Hinweis: 404 auf /releases/latest/download/* bedeutet meist: kein GitHub-Release mit Assets",
      "FamiApp-latest.apk + version.json, oder Repo existiert nicht / ist nicht oeffentlich.",
    )
    console.log("Siehe GITHUB_AUTO_UPDATE_CHECKLIST.md Abschnitt 10.")
    process.exit(1)
  }
  console.log("Alle Pflicht-URLs erreichbar.")
}

main()
