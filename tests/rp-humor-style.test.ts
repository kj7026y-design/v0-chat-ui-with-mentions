import assert from "node:assert/strict"
import test from "node:test"

import { geminiFlashRpProfile } from "../lib/rp/model-profiles/gemini"
import {
  buildComedyRepairPrompt,
  buildRoleplayMessages,
  compileRoleplayContext,
  generateDynamicPrompt,
  isTerminalRoleplayValidationFailure,
  validateRoleplayOutput,
} from "../lib/rp/pipeline"
import {
  buildHumorRepairRules,
  buildHumorWritingRules,
  hasOverexplainedHumor,
  isHumorCategoryContext,
} from "../lib/rp/prompt/humor-style"

function makeHumorContext(userInput = "내 옷이 그렇게 중요해?", minChars = 1) {
  return compileRoleplayContext(
    {
      characterName: "김버그",
      userName: "이주니",
      background: "현대 개발실 / 유머 / 서버 장애 대응 중",
      characterSetting: "무표정하고 건조한 시니어 개발자. 사소한 사실을 엉뚱하게 해석하지만 실제 문제 해결은 미루지 않는다.",
      userSetting: "다급한 주니어 개발자",
      currentScene: "버그 지옥 개발실",
      comedicPacing: true,
    },
    [{ role: "user", content: userInput }],
    undefined,
    { minChars, maxChars: 2_000 },
    "",
    "",
    false,
    "",
    false,
  )
}

test("humor category detection follows the work category, not only the character", () => {
  assert.equal(isHumorCategoryContext({ workGenre: "유머", characterGenre: "회사" }), true)
  assert.equal(isHumorCategoryContext({ worldGenre: "유머" }), true)
  assert.equal(isHumorCategoryContext({ characterTags: ["코미디"] }), true)
  assert.equal(isHumorCategoryContext({ workGenre: "로맨스", characterGenre: "회사" }), false)
  assert.equal(isHumorCategoryContext({ workGenre: "로맨스", characterGenre: "유머" }), false)
})

test("the final humor system prompt uses behavioral priority and good/bad examples", () => {
  const context = makeHumorContext()
  const systemPrompt = generateDynamicPrompt({
    characterName: "김버그",
    userName: "이주니",
    modelBackground: "[세계관]\n- 장소: 버그 지옥 개발실",
    characterSetting: context.characterBrief,
    userSetting: context.userBrief,
    currentScene: "버그 지옥 개발실",
    compiledContext: context,
    profile: geminiFlashRpProfile,
  })
  const finalMessages = buildRoleplayMessages(
    [{ role: "user", content: "내 옷이 그렇게 중요해?" }],
    systemPrompt,
    "이주니",
    context,
  )
  const finalSystemInstruction = finalMessages[0]?.content || ""
  const finalUserContent = finalMessages.at(-1)?.content || ""

  assert.match(finalSystemInstruction, /우선순위는 직접 반응, 구체적인 장면 진행/u)
  assert.match(finalSystemInstruction, /웃길 소재가 없으면 유머는 0회여도 된다/u)
  assert.match(finalSystemInstruction, /발상만 이상하게 만들고 말투는 평범하게 유지한다/u)
  assert.match(finalSystemInstruction, /코믹한 해석은 원칙적으로 한 문장/u)
  assert.match(finalSystemInstruction, /지적·논리적·분석적이라는 설정은 상황 파악과 행동 선택/u)
  assert.doesNotMatch(finalSystemInstruction, /유머·드립 컨셉 전용 캐릭터 작가/u)
  assert.doesNotMatch(finalSystemInstruction, /답변, 설명, 고백, 설득, 협상, 경고/u)
  assert.doesNotMatch(finalSystemInstruction, /긴 대사에는 현재 장면에 대한 새 정보, 구체적인 이유/u)
  assert.doesNotMatch(finalSystemInstruction, /텍스트의 압도적인 비중은 대사/u)
  assert.match(finalSystemInstruction, /\[GOOD - 구조만 참고/u)
  assert.match(finalSystemInstruction, /\[BAD 구조\]/u)
  assert.match(finalSystemInstruction, /즉시 실제 행동이나 본래 대화로 돌아간다/u)
  assert.doesNotMatch(finalSystemInstruction, /매 턴 대사 중 최소 하나/u)
  assert.doesNotMatch(finalSystemInstruction, /기술적 정의.*1:1/u)
  assert.match(finalUserContent, /내 옷이 그렇게 중요해\?/u)
})

test("seven distinct humor situations keep short odd premises and reject academic riffs", () => {
  const cases = [
    { name: "outfit", text: '"중요하진 않습니다. 서버가 터진 날의 복장으로만 기억하겠습니다."\n\n김버그는 로그 화면으로 돌아갔다.', failed: false },
    { name: "cooking", text: '탄 타르트 바닥을 접시에서 떼어냈다.\n\n"디저트가 지하층을 확보했습니다."\n\n먹을 수 있는 윗부분을 잘라 냈다.', failed: false },
    { name: "dropped object", text: '휴대폰을 주워 화면을 확인했다.\n\n"중력 쪽 의견이 더 강했습니다."\n\n깨진 곳이 없는지 모서리부터 살폈다.', failed: false },
    { name: "late promise", text: '김버그는 시계를 한 번 봤다.\n\n"삼십 분이면 약속도 혼자 생각할 시간이 필요했겠습니다."\n\n기다리던 안건을 바로 꺼냈다.', failed: false },
    { name: "development error", text: '"배포는 되었습니다. 서버가 그 사실을 받아들이지 못했을 뿐입니다."\n\n김버그는 직전 커밋과 오류 로그를 나란히 열었다.', failed: false },
    { name: "playful provocation", text: '"시니어의 복장과 장애 대응 속도는 유의미한 상관관계를 보입니다. 아직 학계의 정설은 아니며 교차 검증이 필요합니다."', failed: true },
    { name: "serious conversation", text: '김버그는 농담을 덧붙이지 않았다.\n\n"실수한 커밋은 되돌리면 됩니다. 지금부터 영향 범위를 같이 확인하겠습니다."\n\n문제가 난 요청부터 차례로 분리했다.', failed: false },
  ]

  for (const fixture of cases) {
    assert.equal(
      hasOverexplainedHumor(fixture.text, true),
      fixture.failed,
      fixture.name,
    )
    const validation = validateRoleplayOutput(fixture.text, makeHumorContext(), geminiFlashRpProfile)
    assert.equal(validation.overexplainedHumor, fixture.failed, `${fixture.name}:validator`)
  }
})

test("academic framing is not rejected outside a humor category", () => {
  const academicText = "연구 결과와 가설 검증 절차를 설명했다. 학계의 정설도 함께 검토했다."
  assert.equal(hasOverexplainedHumor(academicText, false), false)
})

test("legitimate research and debugging language is allowed inside a humor work", () => {
  assert.equal(hasOverexplainedHumor("장애 원인 가설을 세우고 로그로 검증했습니다.", true), false)
  assert.equal(hasOverexplainedHumor("실제 연구 결과를 확인한 뒤 다음 실험을 준비했다.", true), false)
})

test("the logged explanatory comedy failure is detected without blocking requested definitions", () => {
  const failedOutput = '"dev를 main에 직접 머지한 것은 완성되지 않은 설계도로 건물을 올리기 시작한 것과 유사한 상황이라고 볼 수 있겠습니다. 롤백이라는 단어는 과거로 되돌리는 타임머신과 같은 개념입니다."'
  const requestedDefinition = '"롤백이라는 용어는 이전 상태로 되돌리는 개념입니다."'
  const validation = validateRoleplayOutput(
    failedOutput,
    makeHumorContext("dev를 main에 직접 머지했어요.", 700),
    geminiFlashRpProfile,
  )

  assert.equal(hasOverexplainedHumor(failedOutput, true, "dev를 main에 머지했어요."), true)
  assert.equal(hasOverexplainedHumor(requestedDefinition, true, "롤백이 뭐야?"), false)
  assert.equal(validation.internalTokenLeak, false)
  assert.equal(validation.overexplainedHumor, true)
  assert.equal(validation.tooShort, true)
  assert.equal(isTerminalRoleplayValidationFailure("overexplainedHumor"), true)

  const repairPrompt = buildComedyRepairPrompt(
    validation,
    makeHumorContext("dev를 main에 직접 머지했어요.", 700),
  )
  assert.match(repairPrompt, /원문의 농담과 그 설명은 문장을 다듬어 보존하지 말고 비트 전체를 폐기하라/u)
})

test("emoji definitions chained through economics and physics are rejected", () => {
  const explanatoryOutput = `"이모티콘은 유니코드 테이블의 특정 값을 참조하는 표현입니다. 하지만 이 코드 포인트는 타입 에러를 해결하는 함수를 포함하지 않습니다."

"따라서 사과보다 해결책이 효율적입니다. 주인-대리인 문제에서 정보의 비대칭이 클수록 비효율이 발생하기 때문입니다."

"근본적인 원인은 책상 위 먼지의 밀도입니다. 이는 사무실의 엔트로피가 증가했다는 신호이며 코드의 무질서도가 높아지는 자연 법칙입니다."`
  const conciseTechnicalReply = `"타입 에러는 응답 값이 비어 있어서 발생했습니다. 우선 이전 커밋으로 롤백하고 null 검사를 추가하겠습니다."`

  assert.equal(hasOverexplainedHumor(explanatoryOutput, true, "미안해 😭"), true)
  assert.equal(hasOverexplainedHumor(conciseTechnicalReply, true, "왜 오류가 난 거야?"), false)

  const context = makeHumorContext("미안해 😭", 700)
  const validation = validateRoleplayOutput(explanatoryOutput, context, geminiFlashRpProfile)
  assert.equal(validation.internalTokenLeak, false)
  assert.equal(validation.overexplainedHumor, true)
  assert.equal(isTerminalRoleplayValidationFailure("overexplainedHumor"), true)
})

test("repeated developer metaphors for emotions are rejected without blocking real work", () => {
  const stereotypedDeveloperReply = `"지금 그 이모티콘은 유니코드 U+1F62D에 해당하는 표현입니다."

"사과가 콜백 함수로 작동한다면 좋겠지만 감정적 API는 지원하지 않습니다."

"이 상황은 주니어 개발자의 성장 과정에서 발생하는 예외 처리로 분류하겠습니다."`
  const actualWorkReply = `"사과는 됐습니다."

김버그는 터미널로 시선을 돌려 이전 커밋을 확인했다.

"우선 롤백하고 타입 검사부터 다시 돌리겠습니다."`

  assert.equal(hasOverexplainedHumor(stereotypedDeveloperReply, true, "미안해 😭"), true)
  assert.equal(hasOverexplainedHumor(actualWorkReply, true, "미안해 😭"), false)

  const validation = validateRoleplayOutput(
    stereotypedDeveloperReply,
    makeHumorContext("미안해 😭", 700),
    geminiFlashRpProfile,
  )
  assert.equal(validation.overexplainedHumor, true)
})

test("abstract philosophical comedy chains are rejected while literal priorities remain valid", () => {
  const abstractMonologue = `"이모티콘 사용에 대해 잠시 고찰해 보았습니다. 감정을 효율적으로 압축한 결과물이라고 할 수 있겠습니다. 하지만 문제 해결이 더 높은 우선순위를 갖는다고 판단했습니다."

"이것을 우리는 경험적 성장이라고 부릅니다. 실수와 장애는 그 본질이 같다고 생각합니다. 성장을 위해 반드시 치러야 하는 비용입니다."`
  const deadpanReturn = `화면의 ㅠㅠ를 잠깐 바라봤다.

"두 번 우셨네요."

다시 로그를 열었다.

"현재 우선순위는 서버 복구입니다."`

  assert.equal(hasOverexplainedHumor(abstractMonologue, true, "ㅠㅠ"), true)
  assert.equal(hasOverexplainedHumor(deadpanReturn, true, "ㅠㅠ"), false)

  const validation = validateRoleplayOutput(
    abstractMonologue,
    makeHumorContext("ㅠㅠ", 700),
    geminiFlashRpProfile,
  )
  assert.equal(validation.overexplainedHumor, true)
  assert.equal(isTerminalRoleplayValidationFailure("overexplainedHumor"), true)
})

test("internal token validation allows technical terms and rejects only known service identifiers", () => {
  const context = makeHumorContext("dev를 main에 직접 머지했어요.")
  const legitimate = '"dev를 main에 직접 머지했습니다. API와 GitHub 기록부터 확인하겠습니다."'

  assert.equal(validateRoleplayOutput(legitimate, context, geminiFlashRpProfile).internalTokenLeak, false)
  assert.equal(validateRoleplayOutput("scene_state를 확인했다.", context, geminiFlashRpProfile).internalTokenLeak, true)
  assert.equal(validateRoleplayOutput("turnPolicy와 responseGoal을 확인했다.", context, geminiFlashRpProfile).internalTokenLeak, true)
})

test("humor repair grows a short RP through scene progress, not more jokes", () => {
  const context = makeHumorContext("배포했는데 서버가 터졌어요.", 700)
  const errors = validateRoleplayOutput("scene_state", context, geminiFlashRpProfile)
  const prompt = buildComedyRepairPrompt(errors, context)

  assert.match(prompt, /완료된 농담에 설명, 추가 드립, 되받아치기, 예시를 붙여 늘리지 마라/u)
  assert.match(prompt, /실제로 수행하는 행동의 순서와 결과/u)
  assert.match(prompt, /부족한 분량은 농담이 아니라 현재 공간에서 실제로 수행하는 행동/u)
  assert.match(prompt, /dev, main, API, GitHub/u)
  assert.doesNotMatch(prompt, /전문 용어.*최소 하나/u)
})

test("shared humor helpers encode the same generation and repair contract", () => {
  const writingRules = buildHumorWritingRules()
  const repairRules = buildHumorRepairRules()

  assert.match(writingRules, /우선순위는 직접 반응/u)
  assert.match(writingRules, /유머는 0회여도 된다/u)
  assert.match(repairRules, /즉시 구체적인 행동이나 본래 화제로 이동한다/u)
  assert.match(repairRules, /실제로 수행하는 행동의 순서와 결과/u)
})
