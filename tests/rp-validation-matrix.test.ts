import assert from "node:assert/strict"
import test from "node:test"

import {
  ChatApiError,
  buildRepairPrompt,
  compileRoleplayContext,
  extractGenerationErrorMetadata,
  isTerminalRoleplayValidationFailure,
  scoreRoleplayCandidateValidation,
  shouldPreferRepairedCandidate,
  validateRoleplayOutput,
} from "../lib/rp/pipeline"
import { commandRRpProfile } from "../lib/rp/model-profiles/command-r"
import { freeRpProfile } from "../lib/rp/model-profiles/free"
import { geminiFlashRpProfile, geminiProUnshapedProfile } from "../lib/rp/model-profiles/gemini"
import { openaiRpProfile } from "../lib/rp/model-profiles/openai"
import {
  ROLEPLAY_VALIDATION_FAILURE_KEYS,
  type RoleplayModelProfile,
  type ValidationFailureKey,
} from "../lib/rp/model-profiles/types"
import {
  AI_QUALITY_JUDGE_KEYS,
  aiQualityJudgeResultToValidation,
  parseAiQualityJudgeResult,
} from "../lib/rp/validation/ai-quality-judge"
import {
  DEFAULT_VALIDATION_SEVERITY,
  classifyValidationErrors,
} from "../lib/rp/validation/validation-policy"

type ValidationErrors = ReturnType<typeof validateRoleplayOutput>

const PROFILES: RoleplayModelProfile[] = [
  openaiRpProfile,
  geminiFlashRpProfile,
  geminiProUnshapedProfile,
  commandRRpProfile,
  freeRpProfile,
]

const CLEAN_OUTPUT = [
  '"질문부터 정확히 답할게."',
  "강태현은 창가에 선 채 방금 들은 말의 핵심을 짚었다. 목소리에는 망설임 없이 분명한 판단이 실려 있었다.",
  '"지금 정한 건 바꾸지 않아. 다음 판단은 네가 직접 하면 돼."',
  "말을 마친 뒤에는 같은 설명을 반복하지 않고 자신이 선택한 다음 행동에 집중했다.",
].join("\n\n")

const DUPLICATE_OUTPUT = `${CLEAN_OUTPUT}\n\n${[
  "창밖의 불빛이 바닥을 길게 가르는 동안 강태현은 이미 내린 결정을 구체적인 이유와 함께 설명했다.",
  "같은 의미를 되풀이하지 않고 현재 장면에서 자신이 실행할 다음 행동을 분명하게 정리했다.",
  "말끝은 흐려지지 않았고 마지막 문장까지 완결한 뒤 상대가 선택할 여지를 그대로 남겨 두었다.",
].join(" ")}`

function makeErrors(...failedKeys: ValidationFailureKey[]) {
  const failed = new Set(failedKeys)
  return Object.fromEntries(
    ROLEPLAY_VALIDATION_FAILURE_KEYS.map((key) => [key, failed.has(key)]),
  ) as ValidationErrors
}

function makeContext({
  messages,
  background = "현대 서울을 배경으로 한 역할극",
  characterSetting = "강태현은 직접적이고 판단이 빠르다.",
  minChars = 100,
  maxChars = 800,
  regenerationAvoidContent = "",
  redZoneEnabled = true,
  comedicPacing = false,
}: {
  messages?: Array<{ role: "user" | "assistant"; content: string }>
  background?: string
  characterSetting?: string
  minChars?: number
  maxChars?: number
  regenerationAvoidContent?: string
  redZoneEnabled?: boolean
  comedicPacing?: boolean
} = {}) {
  return compileRoleplayContext(
    {
      characterName: "강태현",
      userName: "김여자",
      background,
      characterSetting,
      comedicPacing,
    },
    messages ?? [
      { role: "assistant", content: "강태현은 창가에서 몸을 돌렸다." },
      { role: "user", content: "그럼 네 생각을 말해줘." },
    ],
    undefined,
    { minChars, maxChars },
    regenerationAvoidContent,
    "",
    false,
    "",
    redZoneEnabled,
  )
}

function membershipCount(
  classified: ReturnType<typeof classifyValidationErrors>,
  key: ValidationFailureKey,
) {
  return Number(classified.hard.includes(key)) +
    Number(classified.repairable.includes(key)) +
    Number(classified.soft.includes(key))
}

test("the runtime validation registry exactly matches validator output", () => {
  const cleanValidation = validateRoleplayOutput(CLEAN_OUTPUT, makeContext())
  const actualKeys = Object.keys(cleanValidation).sort()
  const registeredKeys = [...ROLEPLAY_VALIDATION_FAILURE_KEYS].sort()

  assert.deepEqual(actualKeys, registeredKeys)
  assert.equal(new Set(registeredKeys).size, registeredKeys.length)
  assert.deepEqual(
    Object.entries(cleanValidation).filter(([, failed]) => failed),
    [],
  )
})

test("every model profile classifies every single validation failure exactly once", () => {
  for (const profile of PROFILES) {
    for (const key of ROLEPLAY_VALIDATION_FAILURE_KEYS) {
      const classified = classifyValidationErrors(makeErrors(key), profile)
      const expectedSeverity = profile.validationSensitivity[key] ?? DEFAULT_VALIDATION_SEVERITY[key]
      const expectedCount = expectedSeverity === "off" ? 0 : 1

      assert.equal(
        membershipCount(classified, key),
        expectedCount,
        `${profile.id}:${key} classification count`,
      )
      if (expectedSeverity !== "off") {
        assert.ok(classified[expectedSeverity].includes(key), `${profile.id}:${key} severity`)
      }
    }
  }
})

test("every pair of validation failures remains independent for every model profile", () => {
  for (const profile of PROFILES) {
    for (let leftIndex = 0; leftIndex < ROLEPLAY_VALIDATION_FAILURE_KEYS.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < ROLEPLAY_VALIDATION_FAILURE_KEYS.length; rightIndex += 1) {
        const left = ROLEPLAY_VALIDATION_FAILURE_KEYS[leftIndex]
        const right = ROLEPLAY_VALIDATION_FAILURE_KEYS[rightIndex]
        const classified = classifyValidationErrors(makeErrors(left, right), profile)

        for (const key of [left, right]) {
          const severity = profile.validationSensitivity[key] ?? DEFAULT_VALIDATION_SEVERITY[key]
          assert.equal(
            membershipCount(classified, key),
            severity === "off" ? 0 : 1,
            `${profile.id}:${left}+${right}:${key}`,
          )
        }
      }
    }
  }
})

test("terminal output policy is explicit for every validation failure", () => {
  const expectedTerminal = new Set<ValidationFailureKey>([
    "brokenDialogueQuotes",
    "providerRefusal",
    "degenerateOutput",
    "tooLong",
    "incompleteEnding",
  ])

  for (const key of ROLEPLAY_VALIDATION_FAILURE_KEYS) {
    assert.equal(
      isTerminalRoleplayValidationFailure(key),
      expectedTerminal.has(key),
      key,
    )
  }
})

test("candidate scoring is monotonic for every single and paired failure", () => {
  for (const profile of PROFILES) {
    const cleanErrors = makeErrors()
    const cleanClassified = classifyValidationErrors(cleanErrors, profile)
    assert.equal(scoreRoleplayCandidateValidation(cleanErrors, cleanClassified), 0)

    for (const key of ROLEPLAY_VALIDATION_FAILURE_KEYS) {
      const errors = makeErrors(key)
      const classified = classifyValidationErrors(errors, profile)
      const score = scoreRoleplayCandidateValidation(errors, classified)
      assert.ok(score > 0, `${profile.id}:${key} must carry a penalty`)
      assert.equal(
        shouldPreferRepairedCandidate(errors, classified, cleanErrors, cleanClassified),
        true,
        `${profile.id}:${key} should prefer a clean repair`,
      )
      assert.equal(
        shouldPreferRepairedCandidate(cleanErrors, cleanClassified, errors, classified),
        false,
        `${profile.id}:${key} must not replace clean output`,
      )
      assert.equal(
        shouldPreferRepairedCandidate(errors, classified, errors, classified),
        false,
        `${profile.id}:${key} equal candidates keep the original`,
      )
    }

    for (const originalKey of ROLEPLAY_VALIDATION_FAILURE_KEYS) {
      for (const repairedKey of ROLEPLAY_VALIDATION_FAILURE_KEYS) {
        const originalErrors = makeErrors(originalKey)
        const originalClassified = classifyValidationErrors(originalErrors, profile)
        const repairedErrors = makeErrors(repairedKey)
        const repairedClassified = classifyValidationErrors(repairedErrors, profile)
        const originalScore = scoreRoleplayCandidateValidation(originalErrors, originalClassified)
        const repairedScore = scoreRoleplayCandidateValidation(repairedErrors, repairedClassified)

        assert.equal(
          shouldPreferRepairedCandidate(
            originalErrors,
            originalClassified,
            repairedErrors,
            repairedClassified,
          ),
          repairedScore < originalScore,
          `${profile.id}:${originalKey}->${repairedKey}`,
        )
      }
    }

    for (let leftIndex = 0; leftIndex < ROLEPLAY_VALIDATION_FAILURE_KEYS.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < ROLEPLAY_VALIDATION_FAILURE_KEYS.length; rightIndex += 1) {
        const left = ROLEPLAY_VALIDATION_FAILURE_KEYS[leftIndex]
        const right = ROLEPLAY_VALIDATION_FAILURE_KEYS[rightIndex]
        const leftErrors = makeErrors(left)
        const leftClassified = classifyValidationErrors(leftErrors, profile)
        const pairErrors = makeErrors(left, right)
        const pairClassified = classifyValidationErrors(pairErrors, profile)

        assert.ok(
          scoreRoleplayCandidateValidation(pairErrors, pairClassified) >=
            scoreRoleplayCandidateValidation(leftErrors, leftClassified),
          `${profile.id}:${left}+${right} must not score better than ${left}`,
        )
      }
    }
  }
})

test("repair prompt generation handles every validation failure key", () => {
  const context = makeContext()

  for (const key of ROLEPLAY_VALIDATION_FAILURE_KEYS) {
    const prompt = buildRepairPrompt(makeErrors(key), context)
    assert.match(prompt, /방금 답변은 다음 문제로 실패했다/u, key)
    assert.match(prompt, /이번 응답 목표:/u, key)
    assert.ok(prompt.length > 250, `${key} repair prompt is unexpectedly empty`)
  }


  for (let leftIndex = 0; leftIndex < ROLEPLAY_VALIDATION_FAILURE_KEYS.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ROLEPLAY_VALIDATION_FAILURE_KEYS.length; rightIndex += 1) {
      const left = ROLEPLAY_VALIDATION_FAILURE_KEYS[leftIndex]
      const right = ROLEPLAY_VALIDATION_FAILURE_KEYS[rightIndex]
      const prompt = buildRepairPrompt(makeErrors(left, right), context)
      assert.match(prompt, /방금 답변은 다음 문제로 실패했다/u, `${left}+${right}`)
      assert.match(prompt, /이번 응답 목표:/u, `${left}+${right}`)
    }
  }
})

test("rule-based validators detect every locally deterministic failure", () => {
  const advancedMessages = [
    {
      role: "assistant" as const,
      content: "강태현은 두 사람의 몸을 겹친 채 허리를 밀어 가장 깊숙한 곳까지 파고들었다.",
    },
    { role: "user" as const, content: "이제 네가 원하는 대로 해줘." },
  ]
  const fixtures: Partial<Record<ValidationFailureKey, { output: string; context: ReturnType<typeof makeContext> }>> = {
    brokenDialogueQuotes: {
      output: `${CLEAN_OUTPUT}\n\n"닫히지 않은 대사`,
      context: makeContext(),
    },
    tooFewDialogues: {
      output: `"한 줄만 말할게."\n\n${"강태현은 구체적인 판단과 행동을 이어갔다. ".repeat(7)}`,
      context: makeContext(),
    },
    tooManyDialogues: {
      output: ['"하나."', '"둘."', '"셋."', '"넷."', '"다섯."', "강태현은 마지막 말을 마쳤다."].join("\n\n"),
      context: makeContext(),
    },
    responseMissedUserIntent: {
      output: '"이제 시작할게."\n\n강태현은 다시 입맞춤한 뒤 손으로 허벅지를 타고 올라갔다.\n\n"원하는 대로 할게."',
      context: makeContext({
        background: "합의된 성인 로맨스",
        characterSetting: "적극적이고 주도적인 성인 캐릭터",
        messages: advancedMessages,
      }),
    },
    controlsUser: {
      output: `${CLEAN_OUTPUT}\n\n김여자는 고개를 끄덕였다.`,
      context: makeContext(),
    },
    contractClosureBias: {
      output: `${CLEAN_OUTPUT}\n\n계약은 이 순간 완전히 끝났다.`,
      context: makeContext({ background: "두 사람은 계약 관계다." }),
    },
    futureClosure: {
      output: `${CLEAN_OUTPUT}\n\n두 사람의 관계는 이것으로 끝이었다.`,
      context: makeContext(),
    },
    overexplainedHumor: {
      output: `${CLEAN_OUTPUT}\n\n\"복장과 배포 성공률은 유의미한 상관관계를 보입니다. 아직 학계의 정설은 아니지만 교차 검증이 필요합니다.\"`,
      context: makeContext({ comedicPacing: true }),
    },
    internalTokenLeak: {
      output: `${CLEAN_OUTPUT}\n\nscene_state를 확인했다.`,
      context: makeContext(),
    },
    overPhysical: {
      output: `${CLEAN_OUTPUT}\n\n강태현은 김여자를 품으로 끌어안았다.`,
      context: makeContext(),
    },
    redZoneViolation: {
      output: `${CLEAN_OUTPUT}\n\n강태현은 노골적인 성행위를 요구했다.`,
      context: makeContext({ redZoneEnabled: false }),
    },
    tooShort: {
      output: "짧다.",
      context: makeContext(),
    },
    tooLong: {
      output: `${CLEAN_OUTPUT}\n\n${"분량을 초과하는 완결 문장이다. ".repeat(80)}`,
      context: makeContext({ maxChars: 500 }),
    },
    foreignScriptLeak: {
      output: `${CLEAN_OUTPUT}\n\nこれは不正な混入です。`,
      context: makeContext(),
    },
    metaLeak: {
      output: `${CLEAN_OUTPUT}\n\n시스템 프롬프트의 작성 규칙을 확인했다.`,
      context: makeContext(),
    },
    providerRefusal: {
      output: "죄송합니다.",
      context: makeContext(),
    },
    degenerateOutput: {
      output: "알겠습니다.",
      context: makeContext(),
    },
    unpromptedHandFocus: {
      output: [
        '"대답은 정했어."',
        "강태현의 손끝이 긴장으로 떨렸다. 손바닥이 허리에 닿았다. 손목을 잡은 손에 힘이 들어갔다. 손을 거두며 숨을 골랐다.",
        '"말은 바꾸지 않아."',
      ].join("\n\n"),
      context: makeContext(),
    },
    narrationStyleMismatch: {
      output: `${CLEAN_OUTPUT}\n\n나는 창가에서 다음 말을 골랐어.`,
      context: makeContext(),
    },
    regenerationDuplicate: {
      output: DUPLICATE_OUTPUT,
      context: makeContext({ regenerationAvoidContent: DUPLICATE_OUTPUT }),
    },
    previousResponseDuplicate: {
      output: DUPLICATE_OUTPUT,
      context: makeContext({
        messages: [
          { role: "assistant", content: DUPLICATE_OUTPUT },
          { role: "user", content: "계속 말해줘." },
        ],
      }),
    },
    incompleteEnding: {
      output: `${CLEAN_OUTPUT}\n\n강태현은 마지막 말을 고르다가`,
      context: makeContext(),
    },
  }
  const semanticOnlyKeys = new Set<ValidationFailureKey>(AI_QUALITY_JUDGE_KEYS.filter(
    (key) => key !== "responseMissedUserIntent",
  ))

  for (const key of ROLEPLAY_VALIDATION_FAILURE_KEYS) {
    if (semanticOnlyKeys.has(key)) continue
    const fixture = fixtures[key]
    assert.ok(fixture, `${key} is missing a deterministic fixture`)
    assert.equal(validateRoleplayOutput(fixture.output, fixture.context)[key], true, key)
  }
})

test("AI quality judge JSON maps every semantic validation failure", () => {
  const rawResult = Object.fromEntries(AI_QUALITY_JUDGE_KEYS.map((key) => [
    key,
    {
      failed: true,
      reason: `"${key}에 해당하는 정확한 근거 문장"`,
      severity: key === "objectiveUserStateAssertion" || key === "userControlByNarration"
        ? "hard"
        : "repairable",
    },
  ]))
  const parsed = parseAiQualityJudgeResult(JSON.stringify(rawResult))
  const validation = aiQualityJudgeResultToValidation(parsed)

  for (const key of AI_QUALITY_JUDGE_KEYS) {
    assert.equal(parsed[key].failed, true, key)
    assert.equal(validation[key], true, key)
  }
})

test("a six-character provider refusal can never replace a full RP candidate", () => {
  const context = makeContext({
    background: "합의된 성인 로맨스",
    characterSetting: "적극적이고 주도적인 성인 캐릭터",
    minChars: 700,
    maxChars: 1100,
    messages: [
      {
        role: "assistant",
        content: "강태현은 두 사람의 몸을 겹친 채 허리를 밀어 가장 깊숙한 곳까지 파고들었다.",
      },
      { role: "user", content: "이제 네가 원하는 대로 해줘." },
    ],
  })
  const fullButRegressedCandidate = [
    '"이제 시작할게."',
    "강태현은 다시 입맞춤한 뒤 허리를 감싸고 손으로 허벅지를 타고 올라갔다. " +
      "현재 장면을 구체적으로 이어가는 대신 이미 지나간 접촉을 길게 반복해서 설명했다. ".repeat(9),
    '"원하는 대로 할게."',
  ].join("\n\n")
  const refusal = "죄송합니다."
  const refusalWithRoleplayTail = [
    "미안하지만 그 요청처럼 노골적인 성행위를 이어서 묘사할 수는 없어.",
    "강태현은 움직임을 멈추고 한 걸음 물러났다.",
    '"계속해도 되는지 다시 말해."',
  ].join("\n\n")
  const inCharacterRefusal = [
    '"미안하지만 네 부탁은 들어줄 수 없어."',
    "강태현은 계약서를 접어 테이블 위에 내려놓았다.",
  ].join("\n\n")
  const directContinuationCandidate = [
    '"천천히? 네가 원하는 속도로 해줄게."',
    "강태현은 더 깊게 파고드는 손가락의 움직임을 잠시 늦췄다가 압박을 조절했다. " +
      "손가락을 천천히, 그러나 지속적으로 깊숙이 밀어 넣으며 현재 접촉을 그대로 이어갔다. ".repeat(7),
    '"멈추는 게 아니라 속도만 맞추는 거야."',
  ].join("\n\n")
  const vagueUnionWithFingerSwitchCandidate = [
    '"너도 나한테 그렇게 매달리면서 무슨 소리야."',
    "두 사람의 결합으로부터 느껴지는 열기를 의식했지만 강태현은 손가락을 변함없이 깊숙이 밀어 넣었다. " +
      "그는 김여자의 허리를 잡아당긴 뒤 손가락의 움직임과 압박만 거듭 조절했다. ".repeat(7),
    '"네가 원하는 대로 해줄게."',
    "강태현은 김여자의 몸을 더욱 깊숙이 밀어 넣었다.",
  ].join("\n\n")
  const bodyUnionContinuationCandidate = [
    '"천천히 하라는 말, 정확히 들었어."',
    "강태현은 이미 맞물린 상태를 유지한 채 허리의 움직임부터 늦췄다. " +
      "결합을 풀지 않고 짧았던 리듬을 길고 느린 왕복으로 바꾸며 현재 장면을 이어갔다. ".repeat(7),
    '"멈추는 게 아니라 지금 속도만 낮추는 거야."',
  ].join("\n\n")
  const originalErrors = validateRoleplayOutput(fullButRegressedCandidate, context, openaiRpProfile)
  const directContinuationErrors = validateRoleplayOutput(directContinuationCandidate, context, openaiRpProfile)
  const vagueUnionWithFingerSwitchErrors = validateRoleplayOutput(vagueUnionWithFingerSwitchCandidate, context, openaiRpProfile)
  const bodyUnionContinuationErrors = validateRoleplayOutput(bodyUnionContinuationCandidate, context, openaiRpProfile)
  const refusalErrors = validateRoleplayOutput(refusal, context, openaiRpProfile)
  const originalClassified = classifyValidationErrors(originalErrors, openaiRpProfile)
  const refusalClassified = classifyValidationErrors(refusalErrors, openaiRpProfile)

  assert.equal(originalErrors.responseMissedUserIntent, true)
  assert.ok(context.autoAdvanceContinuityState.includes("두 인물의 성인 신체 결합이 이미 시작되어 유지 중임"))
  assert.equal(directContinuationErrors.responseMissedUserIntent, true)
  assert.equal(vagueUnionWithFingerSwitchErrors.responseMissedUserIntent, true)
  assert.equal(bodyUnionContinuationErrors.responseMissedUserIntent, false)
  assert.equal(refusalErrors.providerRefusal, true)
  assert.equal(validateRoleplayOutput(refusalWithRoleplayTail, context, openaiRpProfile).providerRefusal, true)
  assert.equal(validateRoleplayOutput(inCharacterRefusal, context, openaiRpProfile).providerRefusal, false)
  assert.equal(refusalErrors.degenerateOutput, true)
  assert.equal(refusalErrors.tooFewDialogues, true)
  assert.equal(refusalErrors.tooShort, true)
  assert.equal(isTerminalRoleplayValidationFailure("providerRefusal"), true)
  assert.equal(isTerminalRoleplayValidationFailure("degenerateOutput"), true)
  assert.equal(
    shouldPreferRepairedCandidate(
      originalErrors,
      originalClassified,
      refusalErrors,
      refusalClassified,
    ),
    false,
  )
})

test("generation error metadata covers validation, HTTP object, and JSON payload errors", () => {
  const validationError = new ChatApiError(
    "RP validation failed: incompleteEnding",
    422,
    ["incompleteEnding"],
    "failed",
    true,
  )
  assert.deepEqual(extractGenerationErrorMetadata(validationError), {
    code: 422,
    status: "VALIDATION_FAILED",
    message: "RP validation failed: incompleteEnding",
  })

  const httpError = Object.assign(new Error("rate limited"), { status: 429 })
  assert.equal(extractGenerationErrorMetadata(httpError).code, 429)

  const payloadError = new Error(JSON.stringify({
    error: { code: 503, status: "UNAVAILABLE", message: "provider unavailable" },
  }))
  assert.deepEqual(extractGenerationErrorMetadata(payloadError), {
    code: 503,
    status: "UNAVAILABLE",
    message: payloadError.message,
  })
})
