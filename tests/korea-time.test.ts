import assert from "node:assert/strict"
import test from "node:test"
import {
  normalizeKoreaIsoTimestamp,
  toKoreaDateString,
  toKoreaIsoString,
  withKoreaTimeZoneDatabaseUrl,
} from "../lib/korea-time"

test("KST ISO serialization preserves the exact instant with a +09:00 offset", () => {
  const source = "2026-08-10T00:15:30.125Z"
  const koreaIso = toKoreaIsoString(source)

  assert.equal(koreaIso, "2026-08-10T09:15:30.125+09:00")
  assert.equal(new Date(koreaIso).toISOString(), source)
})

test("KST date keys use the Korean calendar day around the UTC boundary", () => {
  assert.equal(toKoreaDateString("2026-08-09T15:30:00.000Z"), "2026-08-10")
  assert.equal(toKoreaDateString("2026-08-09T14:59:59.999Z"), "2026-08-09")
})

test("only timestamp-like story fields are normalized to KST", () => {
  assert.equal(
    normalizeKoreaIsoTimestamp("2026-08-10T00:00:00.000Z"),
    "2026-08-10T09:00:00.000+09:00",
  )
  assert.equal(normalizeKoreaIsoTimestamp("2026.08.10"), "2026.08.10")
  assert.equal(normalizeKoreaIsoTimestamp("오늘"), "오늘")
})

test("Neon connection URLs receive the KST session option without losing existing options", () => {
  const configured = withKoreaTimeZoneDatabaseUrl(
    "postgresql://user:pass@example.neon.tech/app?sslmode=require&options=endpoint%3Ddemo%20-c%20timezone%3DUTC",
  )
  const url = new URL(configured)

  assert.equal(url.searchParams.get("sslmode"), "require")
  assert.equal(url.searchParams.get("options"), "endpoint=demo -c timezone=Asia/Seoul")
})
