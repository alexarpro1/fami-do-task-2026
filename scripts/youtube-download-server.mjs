/**
 * Lokaler YouTube-Download-Server für Browser-Dev (youtubei.js).
 * Endpunkte: GET /health, POST /info, POST /download
 */
import http from "node:http"
import { Readable } from "node:stream"
import { Innertube } from "youtubei.js"

const PORT = Number(process.env.YT_DL_PORT || process.env.PORT || 47124)
const HOST = process.env.YT_DL_HOST || "127.0.0.1"

let innertubePromise = null

function getInnertube() {
  if (!innertubePromise) {
    innertubePromise = Innertube.create()
  }
  return innertubePromise
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  })
  res.end(payload)
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString("utf8")
  if (!raw.trim()) return {}
  return JSON.parse(raw)
}

function mapQuality(quality) {
  if (!quality || quality === "best") return "best"
  if (typeof quality === "string" && /^\d+p$/i.test(quality)) return quality.toLowerCase()
  return "best"
}

function infoFromBasic(basic) {
  const thumbs = basic?.thumbnail
  const thumbnailUrl =
    Array.isArray(thumbs) && thumbs.length > 0
      ? thumbs[thumbs.length - 1]?.url || thumbs[0]?.url
      : undefined
  return {
    title: typeof basic?.title === "string" ? basic.title : undefined,
    durationSeconds:
      typeof basic?.duration === "number" && basic.duration > 0 ? Math.round(basic.duration) : undefined,
    thumbnailUrl: typeof thumbnailUrl === "string" ? thumbnailUrl : undefined,
  }
}

async function handleInfo(url) {
  const yt = await getInnertube()
  const info = await yt.getInfo(url)
  return infoFromBasic(info.basic_info)
}

async function handleDownload(url, quality) {
  const yt = await getInnertube()
  const info = await yt.getInfo(url)
  const q = mapQuality(quality)
  const stream = await info.download({
    type: "video+audio",
    quality: q,
    format: "mp4",
  })
  return Readable.fromWeb(stream)
}

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = (req.url || "/").split("?")[0]

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      })
      res.end()
      return
    }

    if (req.method === "GET" && urlPath === "/health") {
      sendJson(res, 200, { ok: true })
      return
    }

    if (req.method === "POST" && urlPath === "/info") {
      const body = await readJsonBody(req)
      const videoUrl = typeof body.url === "string" ? body.url.trim() : ""
      if (!videoUrl) {
        sendJson(res, 400, { ok: false, error: "missing_url" })
        return
      }
      const info = await handleInfo(videoUrl)
      sendJson(res, 200, { ok: true, info })
      return
    }

    if (req.method === "POST" && urlPath === "/download") {
      const body = await readJsonBody(req)
      const videoUrl = typeof body.url === "string" ? body.url.trim() : ""
      const quality = body.quality
      if (!videoUrl) {
        sendJson(res, 400, { ok: false, error: "missing_url" })
        return
      }
      const nodeStream = await handleDownload(videoUrl, quality)
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Access-Control-Allow-Origin": "*",
      })
      nodeStream.pipe(res)
      nodeStream.on("error", (err) => {
        console.error("[yt-server] stream error:", err)
        if (!res.headersSent) sendJson(res, 500, { ok: false, error: "download_failed" })
        else res.destroy()
      })
      return
    }

    sendJson(res, 404, { ok: false, error: "not_found" })
  } catch (err) {
    console.error("[yt-server]", err)
    if (!res.headersSent) {
      sendJson(res, 500, {
        ok: false,
        error: err instanceof Error ? err.message : "server_error",
      })
    }
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[yt-server] listening on http://${HOST}:${PORT}`)
})
