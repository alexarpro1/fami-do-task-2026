import assert from "node:assert/strict"
import test from "node:test"
import {
  DEFAULT_GITHUB_APK_URL,
  DEFAULT_GITHUB_VERSION_CHECK_URL,
  isAllowedUpdateUrl,
  parseRemoteVersionManifest,
  resolveSafeApkDownloadUrl,
  resolveVersionCheckUrl,
  sanitizeDownloadUrl,
} from "../../update-security"

test("Allowlist: GitHub HTTPS APK und version.json erlaubt", () => {
  assert.equal(isAllowedUpdateUrl(DEFAULT_GITHUB_APK_URL), true)
  assert.equal(isAllowedUpdateUrl(DEFAULT_GITHUB_VERSION_CHECK_URL), true)
  assert.equal(
    isAllowedUpdateUrl("https://api.github.com/repos/alexarpro1/fami-do-task-2026/releases/latest"),
    true,
  )
  assert.equal(
    isAllowedUpdateUrl(
      "https://objects.githubusercontent.com/github-production-release-asset-2e65be/123/abc",
    ),
    true,
  )
})

test("Allowlist: http und fremde Hosts ablehnen", () => {
  assert.equal(isAllowedUpdateUrl("http://github.com/x/y/releases/latest/download/a.apk"), false)
  assert.equal(isAllowedUpdateUrl("https://evil.example/malware.apk"), false)
  assert.equal(isAllowedUpdateUrl("https://drive.google.com/drive/folders/abc"), false)
  assert.equal(isAllowedUpdateUrl("not-a-url"), false)
  assert.equal(sanitizeDownloadUrl("https://evil.example/x.apk"), null)
})

test("resolveVersionCheckUrl: kein doppeltes /version.json", () => {
  const full =
    "https://github.com/alexarpro1/fami-do-task-2026/releases/latest/download/version.json"
  assert.equal(resolveVersionCheckUrl(full), full)
  assert.equal(resolveVersionCheckUrl(full + "/"), full)
  assert.equal(
    resolveVersionCheckUrl(
      "https://github.com/alexarpro1/fami-do-task-2026/releases/latest/download",
    ),
    full,
  )
  assert.equal(
    resolveVersionCheckUrl("https://example.com/updates"),
    "https://example.com/updates/version.json",
  )
})

test("parseRemoteVersionManifest: Schema + Allowlist apkUrl", () => {
  const ok = parseRemoteVersionManifest({
    major: 2,
    minor: 6,
    patch: 1,
    build: 40,
    apkUrl: DEFAULT_GITHUB_APK_URL,
    apkSha256: "a".repeat(64),
    publishedAt: "2026-10-11T12:00:00Z",
  })
  assert.ok(ok)
  assert.equal(ok!.apkUrl, DEFAULT_GITHUB_APK_URL)
  assert.equal(ok!.apkSha256, "a".repeat(64))

  const badHost = parseRemoteVersionManifest({
    major: 2,
    minor: 6,
    patch: 1,
    build: 40,
    apkUrl: "https://evil.example/x.apk",
    apkSha256: "b".repeat(64),
  })
  assert.ok(badHost)
  assert.equal(badHost!.apkUrl, undefined)

  assert.equal(parseRemoteVersionManifest({ major: "x", build: 1 }), null)
  assert.equal(parseRemoteVersionManifest(null), null)
})

test("resolveSafeApkDownloadUrl: Fallback GitHub", () => {
  assert.equal(resolveSafeApkDownloadUrl("https://evil.example/x.apk"), DEFAULT_GITHUB_APK_URL)
  assert.equal(resolveSafeApkDownloadUrl(DEFAULT_GITHUB_APK_URL), DEFAULT_GITHUB_APK_URL)
})
