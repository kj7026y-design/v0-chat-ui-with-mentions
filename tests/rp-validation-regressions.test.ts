import assert from "node:assert/strict"
import test from "node:test"

import {
  emptyAiQualityJudgeResult,
  sanitizeAiQualityJudgeResult,
} from "../lib/rp/validation/ai-quality-judge"
import {
  ChatApiError,
  compileRoleplayContext,
  extractGenerationErrorMetadata,
  generateDynamicPrompt,
  getDuplicateValidationEvidence,
  getGeminiPromptBlockReason,
  getGeminiPromptBlockOutcome,
  isTerminalRoleplayValidationFailure,
  normalizeGeneratedRoleplayOutput,
  recoverRoleplayOutputDeterministically,
  validateRoleplayOutput,
} from "../lib/rp/pipeline"
import { commandRRpProfile } from "../lib/rp/model-profiles/command-r"
import { freeRpProfile } from "../lib/rp/model-profiles/free"
import { geminiFlashRpProfile, geminiProUnshapedProfile } from "../lib/rp/model-profiles/gemini"
import { openaiRpProfile, openaiTerraRpProfile } from "../lib/rp/model-profiles/openai"
import { buildAdultFictionInstruction } from "../lib/rp/prompt/adult-fiction"
import { COMMON_ROLEPLAY_DIALOGUE_COUNTS } from "../lib/rp/prompt/dialogue-cadence"

test("adult fiction prompt uses a semantic style instruction instead of a vocabulary list", () => {
  const prompt = buildAdultFictionInstruction("강태현")

  assert.match(prompt, /친밀한 스킨십, 밀착, 감정적·신체적 고조 상황/)
  assert.match(prompt, /강렬한 구어체 대사/)
  assert.doesNotMatch(prompt, /같은 직설적인 성적 표현을 사용할 수 있다/)
})

test("every RP model uses the common dialogue cadence and requests a longer speech after short turns", () => {
  const context = compileRoleplayContext(
    {
      characterName: "강태현",
      userName: "김여자",
      background: "현대 로맨스",
      characterSetting: "직설적이고 대담하지만 설명할 때는 자기 생각을 분명하게 말한다.",
    },
    [
      {
        role: "assistant",
        content: '"그렇게 할게."\n\n강태현은 고개를 기울였다.\n\n"대신 피하지 마."',
      },
      { role: "user", content: "왜 그렇게 생각해?" },
      {
        role: "assistant",
        content: '"보면 모르겠어?"\n\n입가에 웃음이 걸렸다.\n\n"계속 말해 봐."',
      },
      { role: "user", content: "그래도 네 생각을 제대로 말해줘." },
    ],
    undefined,
    { minChars: 700, maxChars: 1100 },
  )
  const profiles = [
    openaiRpProfile,
    openaiTerraRpProfile,
    geminiFlashRpProfile,
    geminiProUnshapedProfile,
    commandRRpProfile,
    freeRpProfile,
  ]

  assert.equal(context.preferExtendedDialogue, true)
  for (const profile of profiles) {
    const prompt = generateDynamicPrompt({
      characterName: context.characterName,
      userName: context.userName,
      modelBackground: context.worldBrief,
      characterSetting: context.characterBrief,
      userSetting: context.userBrief,
      compiledContext: context,
      profile,
    })

    assert.equal(profile.minDialogues, COMMON_ROLEPLAY_DIALOGUE_COUNTS.minDialogues)
    assert.equal(profile.preferredDialogues, COMMON_ROLEPLAY_DIALOGUE_COUNTS.preferredDialogues)
    assert.equal(profile.maxDialogues, COMMON_ROLEPLAY_DIALOGUE_COUNTS.maxDialogues)
    assert.match(prompt, /모든 대사를 비슷한 길이의 한 문장으로 통일하지 않는다/u)
    assert.match(prompt, /최근 두 턴의 대사가 계속 짧았다/u)
    assert.match(prompt, /2~4문장, 약 60~140자의 긴 대사 블록을 하나 포함한다/u)
    assert.match(prompt, /하나의 이어진 발화를 대사 개수에 맞추려고 여러 개의 짧은 따옴표 블록으로 쪼개지 않는다/u)
    assert.doesNotMatch(prompt, /짧고 직접적인 대사와 행동으로 쓴다/u)
  }
})

test("OpenAI RP profiles allow a cross-provider fallback after a provider refusal", () => {
  assert.ok(openaiRpProfile.fallback.providerOrder.includes("openrouter"))
  assert.ok(openaiTerraRpProfile.fallback.providerOrder.includes("openrouter"))
})

test("Gemini provider prompt blocks are detected even without a finish reason", () => {
  assert.equal(
    getGeminiPromptBlockReason({ blockReason: "PROHIBITED_CONTENT" }),
    "PROHIBITED_CONTENT",
  )
  assert.equal(
    getGeminiPromptBlockOutcome({ blockReason: "PROHIBITED_CONTENT" }),
    "provider-prompt-block:PROHIBITED_CONTENT",
  )
  assert.equal(getGeminiPromptBlockReason({}), undefined)
  assert.equal(getGeminiPromptBlockOutcome({}), undefined)
  assert.equal(getGeminiPromptBlockReason(null), undefined)
})

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

test("a complete minor length undershoot is preserved without generic padding", () => {
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
  assert.ok(Array.from(normalized).length < 700)
  assert.ok(Array.from(normalized).length <= 1100)
  assert.equal(normalized, candidate)
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

test("a quoted character subject is not counted as an extra dialogue", () => {
  const context = compileRoleplayContext(
    { characterName: "강태현", userName: "김여자" },
    [
      { role: "assistant", content: "강태현은 김여자의 곁에 머물렀다." },
      { role: "user", content: "태현아!" },
    ],
    undefined,
    { minChars: 700, maxChars: 1100 },
  )
  const malformedStart = [
    '"강태현"은(는) "이렇게 애타게 부르는데, 내가 어떻게 무시하겠어?"',
    "낮게 가라앉은 목소리가 방 안을 울렸다. " +
      "창밖의 불빛이 바닥을 길게 가르고 서로의 거친 호흡이 가까운 거리에서 겹쳐졌다. ".repeat(
        5,
      ),
    '"내가 원하는 답은 이미 정해졌어."',
    "표정에 남은 장난기가 조금 누그러졌지만 태도는 선명했다. " +
      "강태현은 이미 이어진 장면의 흐름을 되돌리지 않은 채 자신의 다음 선택에 집중했다. ".repeat(
        4,
      ),
    '"그러니까 이번에는 내 말만 들어."',
    "짧은 말 뒤에도 시선은 흔들리지 않았다. " +
      "방금 내린 결정을 번복하지 않으려는 긴장과 확신이 낮은 숨결 사이로 또렷하게 남았다. ".repeat(
        4,
      ),
    '"끝까지 책임질 테니까."',
    "마지막 말은 온전히 끝났고 강태현은 자신의 선택을 흐리지 않았다.",
  ].join("\n\n")

  const normalized = normalizeGeneratedRoleplayOutput(malformedStart, context)
  const validation = validateRoleplayOutput(normalized, context)

  assert.doesNotMatch(normalized, /"강태현"은\(는\)/u)
  assert.equal(normalized.match(/["“]([^"”]{1,500})["”]/gu)?.length, 4)
  assert.equal(validation.tooManyDialogues, false)
})

test("validation rejection metadata is not reported as a bad gateway", () => {
  const error = new ChatApiError(
    "RP validation failed: tooManyDialogues",
    422,
    ["tooManyDialogues"],
    "failed",
    true,
  )

  assert.deepEqual(extractGenerationErrorMetadata(error), {
    code: 422,
    status: "VALIDATION_FAILED",
    message: "RP validation failed: tooManyDialogues",
  })
})

test("dialogue count quality issues never block the final response", () => {
  assert.equal(isTerminalRoleplayValidationFailure("tooFewDialogues"), false)
  assert.equal(isTerminalRoleplayValidationFailure("tooManyDialogues"), false)
  assert.equal(isTerminalRoleplayValidationFailure("brokenDialogueQuotes"), true)
  assert.equal(isTerminalRoleplayValidationFailure("incompleteEnding"), true)
})

test("the final deterministic recovery removes invented user actions without padding the prose", () => {
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
  assert.ok(Array.from(recovered).length < 700)
  assert.ok(Array.from(recovered).length <= 1100)
  assert.doesNotMatch(recovered, /김여자는 고개를 끄덕였다/u)
  assert.equal(recovered.match(/^".+"$/gmu)?.length, 3)
  assert.deepEqual(
    Object.entries(validation).filter(([, failed]) => failed).map(([key]) => key),
    ["tooShort"],
  )
})

test("OpenAI accepts a complete near-boundary response without length padding", () => {
  const context = compileRoleplayContext(
    { characterName: "강태현", userName: "김여자" },
    [
      { role: "assistant", content: "강태현은 이미 다음 행동을 시작했다." },
      { role: "user", content: "계속해." },
    ],
    undefined,
    { minChars: 700, maxChars: 1100 },
  )
  const completeResponse = [
    '"이번에는 멈추지 않을게."',
    "강태현은 직전 동작을 이어 구체적인 다음 행동을 실행했다. " + "가".repeat(550),
    '"여기서부터는 내가 정해."',
  ].join("\n\n")

  assert.ok(Array.from(completeResponse).length >= 595)
  assert.ok(Array.from(completeResponse).length < 700)
  assert.equal(validateRoleplayOutput(completeResponse, context).tooShort, true)
  assert.equal(validateRoleplayOutput(completeResponse, context, openaiRpProfile).tooShort, false)
})

test("recent concrete scene progression is preserved in the next response goal", () => {
  const context = compileRoleplayContext(
    {
      characterName: "강태현",
      userName: "김여자",
      background: "합의된 성인 로맨스",
      characterSetting: "적극적이고 주도적인 성인 캐릭터",
    },
    [
      {
        role: "assistant",
        content: "강태현은 바지와 셔츠를 이미 풀어 둔 채 두 사람의 몸을 겹쳤다. 허리를 밀어 가장 깊숙한 곳까지 파고들었다.",
      },
      { role: "user", content: "조금만 천천히." },
      {
        role: "assistant",
        content: "속도를 낮춘 강태현은 허리를 감싼 상태를 유지하며 짧게 숨을 골랐다. \"말한 대로 천천히 할게.\"",
      },
      { role: "user", content: "응, 이제 네가 원하는 대로 해줘." },
    ],
    undefined,
    { minChars: 700, maxChars: 1100 },
  )

  assert.ok(context.autoAdvanceContinuityState.includes("합의된 성인 접촉이 이미 가장 직접적인 단계로 진행 중임"))
  assert.match(context.responseGoal, /가장 구체적인 신체 상태와 수위/u)
  assert.doesNotMatch(context.responseGoal, /신체 접촉을 한 단계 먼저 시작/u)
  assert.match(context.recentSceneContinuity, /한 턴 전 답변/u)
  assert.match(context.recentSceneContinuity, /직전 답변/u)

  const regressedResponse = '"원하는 대로 할게."\n\n강태현은 다시 입맞춤한 뒤 손으로 허벅지를 타고 올라갔다.\n\n"이제 시작할게."'
  const continuedResponse = '"네가 허락했으니 그대로 갈게."\n\n강태현은 이미 겹쳐진 자세를 유지한 채 허리를 느린 속도로 움직였다.\n\n"이번에는 내 리듬만 따라와."'

  assert.equal(validateRoleplayOutput(regressedResponse, context).responseMissedUserIntent, true)
  assert.equal(validateRoleplayOutput(continuedResponse, context).responseMissedUserIntent, false)
})

test("ongoing contact does not turn an unrelated latest utterance into new permission", () => {
  const context = compileRoleplayContext(
    {
      characterName: "강태현",
      userName: "김여자",
      background: "합의된 성인 로맨스",
    },
    [
      {
        role: "assistant",
        content: "강태현은 바지와 셔츠를 이미 풀어 둔 채 두 사람의 몸을 겹쳤다. 허리를 밀어 가장 깊숙한 곳까지 파고들었다.",
      },
      { role: "user", content: "ㅇㄴ아ㅣ릐ㅏ ㅈㅇㄴㄹㄷ재걸" },
    ],
    undefined,
    { minChars: 700, maxChars: 1100 },
  )

  assert.equal(context.latestInput.physicalContactRequested, false)
  assert.equal(context.latestInput.physicalContactPermitted, false)
  assert.equal(context.turnPolicy.continuesExistingPhysicalContact, true)
  assert.match(context.responseGoal, /최신 대사 자체를 새로운 접촉 허락이나 수위 상승 지시로 해석하지 않는다/u)
  assert.doesNotMatch(context.responseGoal, /최신 말이 현재 접촉과 진행을 허락하거나 이어가라는 뜻/u)
})

test("continued contact with a new rhythm is not mislabeled as a previous-response copy", () => {
  const previousResponse = [
    "강태현은 김여자의 허리를 감싼 채 귓가에 입술을 스쳤다.",
    '"네 마음이 같다는 말, 이제는 못 무르게 해."',
  ].join("\n\n")
  const context = compileRoleplayContext(
    { characterName: "강태현", userName: "김여자", background: "성인 로맨스" },
    [
      { role: "assistant", content: previousResponse },
      { role: "user", content: "계속해." },
    ],
    undefined,
    { minChars: 700, maxChars: 1100 },
  )
  const continuedResponse = [
    "강태현은 허리를 다시 감쌌지만, 속도를 한 단계 높이며 리듬을 바꿨다. 귀 가까이에 머물던 입술은 그대로 둔 채 흐트러진 자세를 바로잡았다.",
    '"좋아한다는 말을 들었는데 내가 아무 일도 없던 것처럼 물러날 것 같았어? 내일 네가 친구라고 우겨도 이제는 안 속아."',
    "손을 등 뒤로 옮겨 균형을 받친 뒤 빨라진 움직임을 끊지 않았다.",
  ].join("\n\n")

  assert.equal(
    validateRoleplayOutput(continuedResponse, context).previousResponseDuplicate,
    false,
  )
})

test("restarting multiple completed scene beats without progression remains a duplicate", () => {
  const previousResponse = "강태현은 김여자의 허리를 감싼 채 귓가에 입술을 스쳤다."
  const context = compileRoleplayContext(
    { characterName: "강태현", userName: "김여자" },
    [
      { role: "assistant", content: previousResponse },
      { role: "user", content: "계속해." },
    ],
    undefined,
    { minChars: 700, maxChars: 1100 },
  )
  const staleResponse = "강태현은 김여자의 허리를 다시 감싸 힘을 주었다. 귓가에 다시 입술을 스쳤다."
  const evidence = getDuplicateValidationEvidence(staleResponse, context)

  assert.deepEqual(evidence.previousResponse?.repeatedSceneBeats, [
    "waist-contact",
    "ear-contact",
  ])
  assert.equal(
    validateRoleplayOutput(staleResponse, context).previousResponseDuplicate,
    true,
  )
})
