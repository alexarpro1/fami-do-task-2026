import assert from "node:assert/strict"
import test from "node:test"
import {
  shouldRunUpdateCheck,
  UPDATE_CHECK_MAX_STALE_MS,
  UPDATE_CHECK_RESUME_MIN_MS,
} from "../../app-update-check"

test("shouldRunUpdateCheck: cold und manual immer", () => {
  const now = 1_700_000_000_000
  assert.equal(shouldRunUpdateCheck("cold", now - 1000, now), true)
  assert.equal(shouldRunUpdateCheck("manual", now - 1000, now), true)
  assert.equal(shouldRunUpdateCheck("cold", 0, now), true)
})

test("shouldRunUpdateCheck: resume erst nach 1h", () => {
  const now = 1_700_000_000_000
  assert.equal(shouldRunUpdateCheck("resume", now - 1000, now), false)
  assert.equal(
    shouldRunUpdateCheck("resume", now - UPDATE_CHECK_RESUME_MIN_MS, now),
    true,
  )
  assert.equal(shouldRunUpdateCheck("resume", 0, now), true)
})

test("shouldRunUpdateCheck: interval erst nach 24h", () => {
  const now = 1_700_000_000_000
  assert.equal(
    shouldRunUpdateCheck("interval", now - UPDATE_CHECK_RESUME_MIN_MS, now),
    false,
  )
  assert.equal(
    shouldRunUpdateCheck("interval", now - UPDATE_CHECK_MAX_STALE_MS, now),
    true,
  )
})
