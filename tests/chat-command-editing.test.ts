import assert from "node:assert/strict"
import test from "node:test"

import {
  formatEditedCommandContent,
  getCommandEditableContent,
  getCommandTitle,
} from "../lib/chat-command-editing"

test("status command editor hides tags and the protected title", () => {
  const content = [
    "<status>",
    "<status-title>📊 상태창</status-title>",
    '<status-divider tone="strong"></status-divider>',
    "<status-date>📅 2026.07.28 17:36</status-date>",
    "<status-meta>📍 거실 | 🌡️ 맑음</status-meta>",
    '<status-divider tone="muted"></status-divider>',
    "<status-summary>✍️ 두 사람이 거실에서 이야기를 나눴다.</status-summary>",
    "<status-thought>😶 아직은 말하지 않는 편이 낫겠다.</status-thought>",
    "</status>",
  ].join("\n")

  const editable = getCommandEditableContent(content, "status")

  assert.doesNotMatch(editable, /<status|상태창/u)
  assert.equal(
    editable,
    [
      "📅 2026.07.28 17:36",
      "📍 거실 | 🌡️ 맑음",
      "",
      "✍️ 두 사람이 거실에서 이야기를 나눴다.",
      "😶 아직은 말하지 않는 편이 낫겠다.",
    ].join("\n"),
  )
})

test("Instagram command editor exposes comment text without markup", () => {
  const content = [
    "<ig>",
    "<ig-title>🅾 INSTAGRAM · 강태현</ig-title>",
    "<ig-divider></ig-divider>",
    "<ig-post>",
    "<ig-image>📷창가에 놓인 찻잔</ig-image>",
    "<ig-caption>&apos;늦은 오후.&apos;</ig-caption>",
    "<ig-stats>♥️142   💬 1</ig-stats>",
    '<ig-comment nickname="min.z" time="5분" reply="false">분위기 좋다</ig-comment>',
    "</ig-post>",
    "</ig>",
  ].join("\n")

  const editable = getCommandEditableContent(content, "sns")

  assert.doesNotMatch(editable, /<ig|INSTAGRAM/u)
  assert.match(editable, /📷창가에 놓인 찻잔/u)
  assert.match(editable, /min\.z · 5분\n분위기 좋다/u)
})

test("saving command edits restores the original protected title and line breaks", () => {
  const saved = formatEditedCommandContent(
    "<ig-title>🅾 INSTAGRAM · 강태현</ig-title>",
    "sns",
    "첫 번째 줄\n두 번째 줄",
  )

  assert.equal(
    saved,
    "🅾 INSTAGRAM · 강태현\n첫 번째 줄\n두 번째 줄",
  )
  assert.equal(
    getCommandEditableContent(saved, "sns"),
    "첫 번째 줄\n두 번째 줄",
  )
})

test("phone command editor hides phone markup and keeps visible line breaks", () => {
  const content = [
    "<phone-status><phone-time>17:36</phone-time><phone-icons>🔇 HD 5G 🔋91%</phone-icons></phone-status>",
    "<phone-divider></phone-divider>",
    "💬 최근 문자 목록",
    "김여자 | 곧 갈게 <phone-time>5분</phone-time>",
    "↪ 알겠어 <phone-time>4분</phone-time>",
  ].join("\n")

  const editable = getCommandEditableContent(content, "phone")

  assert.doesNotMatch(editable, /<phone|휴대폰/u)
  assert.equal(
    editable,
    [
      "17:36  🔇 HD 5G 🔋91%",
      "💬 최근 문자 목록",
      "김여자 | 곧 갈게 5분",
      "↪ 알겠어 4분",
    ].join("\n"),
  )
  assert.match(
    formatEditedCommandContent(content, "phone", editable),
    /^📱 휴대폰\n17:36/u,
  )
})

test("image is a recognized command id for failed-message retries", () => {
  assert.equal(getCommandTitle("", "image"), "이미지")
})
