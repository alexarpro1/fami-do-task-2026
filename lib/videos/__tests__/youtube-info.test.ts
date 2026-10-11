import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  catalogPatchFromYoutubeInfo,
  mergeYoutubeInfoFields,
  normalizeDurationSeconds,
  parseYoutubeDlDumpJson,
} from "../youtube-info"

describe("parseYoutubeDlDumpJson", () => {
  it("reads duration/title/thumbnail from yt-dlp dump", () => {
    const raw = JSON.stringify({
      title: "Demo Clip",
      duration: 125.4,
      thumbnail: "https://i.ytimg.com/vi/abc/maxresdefault.jpg",
    })
    const info = parseYoutubeDlDumpJson(raw)
    assert.equal(info.title, "Demo Clip")
    assert.equal(info.durationSeconds, 125)
    assert.equal(info.thumbnailUrl, "https://i.ytimg.com/vi/abc/maxresdefault.jpg")
  })

  it("parses nested raw from plugin wrapper", () => {
    const info = parseYoutubeDlDumpJson({
      raw: JSON.stringify({ title: "Nested", duration: 60 }),
    })
    assert.equal(info.title, "Nested")
    assert.equal(info.durationSeconds, 60)
  })

  it("prefers last thumbnail entry", () => {
    const info = parseYoutubeDlDumpJson({
      duration: 10,
      thumbnails: [{ url: "https://a/low.jpg" }, { url: "https://a/hi.jpg" }],
    })
    assert.equal(info.thumbnailUrl, "https://a/hi.jpg")
    assert.equal(info.durationSeconds, 10)
  })
})

describe("catalogPatchFromYoutubeInfo / markDownloadDone meta contract", () => {
  it("sets durationSeconds when missing; leaves title when set", () => {
    const patch = catalogPatchFromYoutubeInfo(
      { title: "User Title", thumbnailUrl: "https://i.ytimg.com/vi/x/hqdefault.jpg" },
      { title: "YT Title", durationSeconds: 200, thumbnailUrl: "https://better.jpg" },
    )
    assert.equal(patch.durationSeconds, 200)
    assert.equal(patch.title, undefined)
    assert.equal(patch.thumbnailUrl, undefined)
  })

  it("fills empty title and thumbnail", () => {
    const patch = catalogPatchFromYoutubeInfo(
      { title: "", thumbnailUrl: undefined },
      { title: "From YT", durationSeconds: 33, thumbnailUrl: "https://t.jpg" },
    )
    assert.deepEqual(patch, {
      durationSeconds: 33,
      title: "From YT",
      thumbnailUrl: "https://t.jpg",
    })
  })

  it("accepts durationSeconds meta shape used by markDownloadDone", () => {
    const meta: { durationSeconds?: number } = {
      durationSeconds: normalizeDurationSeconds(99.6),
    }
    assert.equal(meta.durationSeconds, 100)
    const merged = mergeYoutubeInfoFields({ durationSeconds: meta.durationSeconds }, {})
    assert.equal(merged.durationSeconds, 100)
  })
})
