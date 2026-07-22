import assert from "node:assert/strict"
import test from "node:test"

import {
  buildUserMessages,
  formatMessageForAIContext,
  parseChatInputSegments,
  type ChatInputCharacter,
} from "../lib/chat-engine"
import {
  buildRoleplayMessages,
  compileRoleplayContext,
  extractMentionTargets,
  parseUserAuthoredCharacterLine,
  trimRoleplayAtCompleteBoundary,
} from "../lib/rp/pipeline"

const characters: ChatInputCharacter[] = [
  { id: "c8", name: "강태현" },
  { id: "c9", name: "이서윤" },
]

function compile(rawInput: string, autoAdvance = false) {
  const messages = [
    { role: "assistant" as const, content: "창가에 기대 있던 강태현이 조용히 시선을 들었다." },
    { role: "user" as const, content: rawInput },
  ]
  const compiled = compileRoleplayContext(
    { characterName: "강태현", userName: "나" },
    messages,
    undefined,
    { minChars: 400, maxChars: 900 },
    "",
    "",
    autoAdvance,
  )
  return { messages, compiled }
}

test("AC01 mention keeps ids for UI and names for model context", () => {
  const [message] = buildUserMessages("@강태현 지금 내 말 듣고 있어?", characters)

  assert.deepEqual(message.mentionCharacterIds, ["c8"])
  assert.deepEqual(message.mentionCharacterNames, ["강태현"])

  const modelContext = formatMessageForAIContext(message)
  assert.match(modelContext, /사용자가 강태현를 언급함/u)
  assert.doesNotMatch(modelContext, /사용자가 c8를 언급함/u)
  assert.deepEqual(extractMentionTargets(modelContext), ["강태현"])

  const { messages, compiled } = compile(modelContext)
  const finalMessages = buildRoleplayMessages(messages, "system", "나", compiled)
  assert.deepEqual(compiled.mentionTargets, ["강태현"])
  assert.match(compiled.responseGoal, /물은 구체적인 질문/u)
  assert.match(finalMessages.at(-1)?.content ?? "", /\[멘션 대상\]\s*강태현/u)
})

test("AC02 user-authored character line is a completed scene event", () => {
  const [message] = buildUserMessages("ⓣ이서윤: 늦었네. 기다리고 있었어.", characters)

  assert.equal(message.isUserAuthoredCharacterLine, true)
  assert.equal(message.speakerId, "c9")
  assert.equal(message.speakerName, "이서윤")

  const modelContext = formatMessageForAIContext(message)
  assert.deepEqual(parseUserAuthoredCharacterLine(modelContext), {
    speakerName: "이서윤",
    dialogue: "늦었네. 기다리고 있었어.",
  })

  const { messages, compiled } = compile(modelContext)
  const finalMessages = buildRoleplayMessages(messages, "system", "나", compiled)
  const finalInput = finalMessages.at(-1)?.content ?? ""
  assert.equal(compiled.latestInput.kind, "character_line")
  assert.match(compiled.responseGoal, /이미 말한 확정 대사/u)
  assert.match(finalInput, /사용자 작성 캐릭터 대사 - 확정 장면/u)
  assert.match(finalInput, /다시 말하거나 인용하지 않고 직후부터 이어간다/u)
})

test("AC03 mixed user and character lines keep chronological order", () => {
  const messages = buildUserMessages(
    "거기 있었네.\n\nⓣ이서윤: 이제야 왔어?\n\n*문가에 멈춰 선다*",
    characters,
  )

  assert.equal(messages.length, 3)
  assert.equal(messages[0].isUserAuthoredCharacterLine, undefined)
  assert.equal(messages[1].speakerName, "이서윤")
  assert.equal(messages[2].isUserAuthoredCharacterLine, undefined)
  assert.equal(messages[2].content, "*문가에 멈춰 선다*")
})

test("AC04 empty character line remains detectable and must be rejected by UI", () => {
  const [segment] = parseChatInputSegments("ⓣ강태현:", characters)
  assert.equal(segment.kind, "character_line")
  assert.equal(segment.kind === "character_line" && segment.isEmptyLine, true)
})

test("AC05 auto advance does not reuse stale mentions or authored lines as new input", () => {
  const mentionedMessage = buildUserMessages("@강태현 여기 봐.", characters)[0]
  const rawMention = formatMessageForAIContext(mentionedMessage)
  const messages = [
    { role: "user" as const, content: rawMention },
    { role: "assistant" as const, content: "고개를 돌린 강태현의 시선이 곧장 마주쳤다." },
  ]
  const compiled = compileRoleplayContext(
    { characterName: "강태현", userName: "나" },
    messages,
    undefined,
    { minChars: 400, maxChars: 900 },
    "",
    "고개를 돌린 강태현의 시선이 곧장 마주쳤다.",
    true,
  )
  const finalMessages = buildRoleplayMessages(messages, "system", "나", compiled)
  const finalInput = finalMessages.at(-1)?.content ?? ""

  assert.equal(compiled.turnPolicy.autoAdvance, true)
  assert.deepEqual(compiled.mentionTargets, [])
  assert.match(compiled.responseGoal, /사용자 반응 없이도 성립하는 새로운 행동·결정·정보/u)
  assert.match(finalInput, /사용자가 새 행동이나 대사를 입력하지 않고 침묵/u)
  assert.doesNotMatch(finalInput, /\[멘션 대상\]/u)
  assert.doesNotMatch(finalInput, /사용자 작성 캐릭터 대사 - 확정 장면/u)
})

test("AC06 metadata survives persistence round-trip for retry and regeneration", () => {
  const original = buildUserMessages("@이서윤 먼저 말해 봐.", characters)[0]
  const restored = JSON.parse(JSON.stringify(original)) as typeof original

  assert.deepEqual(restored.mentionCharacterIds, ["c9"])
  assert.deepEqual(restored.mentionCharacterNames, ["이서윤"])
  assert.match(formatMessageForAIContext(restored), /사용자가 이서윤를 언급함/u)

  delete restored.mentionCharacterNames
  assert.match(formatMessageForAIContext(restored), /사용자가 이서윤를 언급함/u)
})

test("AC07 overlong auto-advance output is trimmed only at a complete boundary", () => {
  const content = [
    '"그래, 계속 듣고 있어."',
    "강태현은 시선을 유지한 채 다음 말을 고르며 잠시 숨을 골랐다. 서두르지 않는 태도에도 대화를 이어가려는 의지는 분명했다.",
    '"천천히 말해도 돼. 이번에는 끊지 않을게."',
    "그는 자리를 지키며 상대가 스스로 다음 말을 꺼낼 수 있도록 조용히 기다렸다. 방금 전의 대답을 반복하지 않고 다음 순간으로 넘어갔다.",
  ].join("\n\n")
  const trimmed = trimRoleplayAtCompleteBoundary(content, 150, 80)

  assert.ok(Array.from(trimmed).length >= 80)
  assert.ok(Array.from(trimmed).length <= 150)
  assert.match(trimmed, /[.!?。！？”"]$/u)
  assert.notEqual(trimmed, content)
})

test("AC08 image-only messages survive segmented input handling", () => {
  const messages = buildUserMessages("", characters, undefined, {
    url: "data:image/png;base64,qa",
    name: "qa.png",
  })

  assert.equal(messages.length, 1)
  assert.equal(messages[0].content, "")
  assert.equal(messages[0].imageUrl, "data:image/png;base64,qa")
  assert.equal(messages[0].imageName, "qa.png")
})
