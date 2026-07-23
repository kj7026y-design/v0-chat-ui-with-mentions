import assert from "node:assert/strict"
import test from "node:test"

import {
  emptyAiQualityJudgeResult,
  sanitizeAiQualityJudgeResult,
} from "../lib/rp/validation/ai-quality-judge"
import {
  compileRoleplayContext,
  normalizeGeneratedRoleplayOutput,
  recoverRoleplayOutputDeterministically,
  validateRoleplayOutput,
} from "../lib/rp/pipeline"

test("character interpretation of the user's spoken consent is not an objective user-state assertion", () => {
  const output = [
    '"당연히 됐지. 내가 얼마나 오래 기다렸는지 알면 아마 놀랄걸."',
    "강태현은 이 순간을 위해 수없이 시뮬레이션을 돌려왔던 사람처럼, 김여자가 내뱉은 승낙의 무게를 가늠하며 만족스러운 숨을 내뱉었다.",
  ].join("\n\n")
  const rawJudge = emptyAiQualityJudgeResult()
  rawJudge.objectiveUserStateAssertion = {
    failed: true,
    reason: "강태현은 '김여자가 내뱉은 승낙의 무게를 가늠하며 만족스러운 숨을 내뱉었다'라는 문장에서 김여자의 승낙을 강태현의 주관적 해석으로 제시하고 있다.",
    severity: "hard",
  }

  const sanitized = sanitizeAiQualityJudgeResult(rawJudge, {
    output,
    userName: "김여자",
    characterName: "강태현",
  })

  assert.equal(sanitized.objectiveUserStateAssertion.failed, false)
})

test("an explicit omniscient statement of the user's inner intent remains blocked", () => {
  const output = "김여자는 속으로 당장 거절하고 싶다고 생각했다. 강태현은 그 사실을 알지 못했다."
  const rawJudge = emptyAiQualityJudgeResult()
  rawJudge.objectiveUserStateAssertion = {
    failed: true,
    reason: "'김여자는 속으로 당장 거절하고 싶다고 생각했다'라고 사용자의 내면을 사실로 확정한다.",
    severity: "hard",
  }

  const sanitized = sanitizeAiQualityJudgeResult(rawJudge, {
    output,
    userName: "김여자",
    characterName: "강태현",
  })

  assert.equal(sanitized.objectiveUserStateAssertion.failed, true)
})

test("an overlong provider candidate is normalized to a complete in-range response", () => {
  const stableResponse = [
    '"준비는 끝났어. 네가 물은 것부터 바로 알려줄게."',
    `강태현은 소파 등받이에 걸친 팔을 그대로 둔 채 목소리를 낮췄다. ${"창밖의 불빛이 거실 바닥을 길게 가르고 초침 소리가 고른 간격으로 이어졌다. ".repeat(5)}그는 서두르지 않고 설명의 첫머리를 골랐다.`,
    '"말로 먼저 설명하고, 네가 원하면 그다음으로 넘어가자."',
    `입가에 남은 웃음이 조금 누그러졌다. ${"익숙한 공간의 조명 아래에서 표정과 호흡의 작은 변화가 전보다 선명하게 드러났다. ".repeat(5)}그의 시선은 질문을 피하지 않은 채 정면에 머물렀다.`,
    '"그러니까 궁금한 것부터 하나씩 물어봐. 이번에는 빼지 않고 답할 테니까."',
    `낮게 가라앉은 마지막 말 뒤로 짧은 정적이 이어졌다. ${"손끝으로 두드리던 리듬이 멎고 자세가 한층 느긋하게 풀렸다. ".repeat(4)}대답할 준비가 됐다는 태도만은 분명했다.`,
  ].join("\n\n")
  const overlongResponse = `${stableResponse}\n\n초과 구간 시작. ${"이 문장은 허용 범위 밖의 불필요한 후속 설명이다. ".repeat(20)}\n\n절대 남으면 안 되는 마지막 꼬리.`
  const context = compileRoleplayContext(
    { characterName: "강태현", userName: "김여자" },
    [
      { role: "assistant", content: "강태현은 소파에 앉아 김여자의 질문을 기다렸다." },
      { role: "user", content: "준비는 됐어 알려줄 수 있어?" },
    ],
    undefined,
    { minChars: 700, maxChars: 1100 },
  )

  const normalized = normalizeGeneratedRoleplayOutput(overlongResponse, context)
  const length = Array.from(normalized).length

  assert.ok(Array.from(overlongResponse).length > 1100)
  assert.ok(length >= 700)
  assert.ok(length <= 1100)
  assert.ok(length < Array.from(overlongResponse).length)
  assert.doesNotMatch(normalized, /절대 남으면 안 되는 마지막 꼬리/u)
  assert.equal(normalized.match(/^".+"$/gmu)?.length, 3)
  assert.match(normalized, /[.!?。！？”"]$/u)
})

test("a complete minor length undershoot is finished without another provider call", () => {
  const responseStart = [
    '"당연히 준비됐지. 네가 물은 것부터 대답할게."',
    "강태현은 질문을 피하지 않고 낮은 목소리로 설명을 이어갔다. 그는 말의 순서를 천천히 골랐다.",
    '"말로 먼저 알려주고, 네가 원하면 그다음으로 넘어가자."',
    "장난스럽던 표정은 조금 누그러졌지만 태도는 여전히 분명했다. 그는 자신이 한 대답을 거두지 않았다.",
    '"그러니까 이번에는 궁금한 걸 하나씩 말해. 빼지 않고 답할 테니까."',
  ].join("\n\n")
  const fillerSentence = "창밖의 불빛이 거실 바닥을 가르고 초침 소리가 일정한 간격으로 이어졌다."
  let candidate = `${responseStart}\n\n${fillerSentence}`
  while (Array.from(candidate).length + Array.from(` ${fillerSentence}`).length < 670) {
    candidate += ` ${fillerSentence}`
  }
  const context = compileRoleplayContext(
    { characterName: "강태현", userName: "김여자" },
    [
      { role: "assistant", content: "강태현은 질문을 기다렸다." },
      { role: "user", content: "준비는 됐어 알려줄 수 있어?" },
    ],
    undefined,
    { minChars: 700, maxChars: 1100 },
  )
  const normalized = normalizeGeneratedRoleplayOutput(candidate, context)

  assert.ok(Array.from(candidate).length >= 580)
  assert.ok(Array.from(candidate).length < 700)
  assert.ok(Array.from(normalized).length >= 700)
  assert.ok(Array.from(normalized).length <= 1100)
  assert.ok(normalized.startsWith(candidate))
  assert.match(normalized, /강태현/u)
})

test("a truncated or substantially short response is still sent to model repair", () => {
  const context = compileRoleplayContext(
    { characterName: "강태현", userName: "김여자" },
    [
      { role: "assistant", content: "강태현은 질문을 기다렸다." },
      { role: "user", content: "준비는 됐어 알려줄 수 있어?" },
    ],
    undefined,
    { minChars: 700, maxChars: 1100 },
  )
  const truncated = '"대답할게."\n\n강태현은 소파에서 몸을 일으키며 아직 끝나지 않은 말을'

  assert.equal(normalizeGeneratedRoleplayOutput(truncated, context), truncated)
})

test("the final deterministic recovery removes only invented user actions and fills the hard minimum", () => {
  const context = compileRoleplayContext(
    { characterName: "강태현", userName: "김여자" },
    [
      { role: "assistant", content: "강태현은 창가에 기대 다음 말을 골랐다." },
      { role: "user", content: "그래서 무슨 말을 할 건데?" },
    ],
    undefined,
    { minChars: 700, maxChars: 1100 },
  )
  const shortCandidate = [
    '"지금부터는 돌려 말하지 않을게. 내가 먼저 정한 답부터 이야기하지."',
    "강태현은 창가에서 몸을 돌려 목소리를 가다듬었다. 김여자는 고개를 끄덕였다. 그는 자신의 판단을 흐리지 않으려 문장마다 힘을 실었다.",
    '"내가 선택한 일은 내가 설명할 거야. 네 몫까지 정하려는 뜻은 아니야."',
    "낮고 또렷한 어조가 방 안의 정적을 가르며 이어졌다. 창밖의 불빛은 바닥을 길게 가르고 있었고, 초침 소리는 말 사이의 간격을 일정하게 채웠다. 강태현은 서두르지 않고 자신의 생각과 다음 선택을 차례대로 꺼냈다. 익숙한 공간의 작은 소음까지 가라앉자 그의 목소리는 한층 또렷하게 남았다.",
    '"그러니 이번에는 내 말을 끝까지 들어. 그다음 판단은 네가 직접 하면 돼."',
  ].join("\n\n")

  const recovered = recoverRoleplayOutputDeterministically(shortCandidate, context)
  const validation = validateRoleplayOutput(recovered, context)

  assert.ok(Array.from(shortCandidate).length < 700)
  assert.ok(Array.from(recovered).length >= 700)
  assert.ok(Array.from(recovered).length <= 1100)
  assert.doesNotMatch(recovered, /김여자는 고개를 끄덕였다/u)
  assert.equal(recovered.match(/^".+"$/gmu)?.length, 3)
  assert.deepEqual(
    Object.entries(validation).filter(([, failed]) => failed).map(([key]) => key),
    [],
  )
})
