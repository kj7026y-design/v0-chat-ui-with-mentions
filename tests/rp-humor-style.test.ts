import assert from "node:assert/strict"
import test from "node:test"

import { geminiFlashRpProfile } from "../lib/rp/model-profiles/gemini"
import {
  buildComedyRepairPrompt,
  buildRoleplayMessages,
  compileRoleplayContext,
  generateDynamicPrompt,
  validateRoleplayOutput,
} from "../lib/rp/pipeline"
import {
  buildHumorRepairRules,
  buildHumorWritingRules,
  hasOverexplainedAcademicHumor,
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

  assert.match(finalSystemInstruction, /최신 사용자 입력에 정확히 반응/u)
  assert.match(finalSystemInstruction, /눈에 띄는 유머는 한 응답에 보통 0~2회/u)
  assert.match(finalSystemInstruction, /발상은 이상하게, 태도는 정상적으로, 설명은 짧게/u)
  assert.match(finalSystemInstruction, /\[GOOD - 구조만 참고/u)
  assert.match(finalSystemInstruction, /\[BAD\]/u)
  assert.match(finalSystemInstruction, /즉시 실제 행동과 본론으로 복귀/u)
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
      hasOverexplainedAcademicHumor(fixture.text, true),
      fixture.failed,
      fixture.name,
    )
    const validation = validateRoleplayOutput(fixture.text, makeHumorContext(), geminiFlashRpProfile)
    assert.equal(validation.overexplainedHumor, fixture.failed, `${fixture.name}:validator`)
  }
})

test("academic framing is not rejected outside a humor category", () => {
  const academicText = "연구 결과와 가설 검증 절차를 설명했다. 학계의 정설도 함께 검토했다."
  assert.equal(hasOverexplainedAcademicHumor(academicText, false), false)
})

test("legitimate research and debugging language is allowed inside a humor work", () => {
  assert.equal(hasOverexplainedAcademicHumor("장애 원인 가설을 세우고 로그로 검증했습니다.", true), false)
  assert.equal(hasOverexplainedAcademicHumor("실제 연구 결과를 확인한 뒤 다음 실험을 준비했다.", true), false)
})

test("humor repair grows a short RP through scene progress, not more jokes", () => {
  const context = makeHumorContext("배포했는데 서버가 터졌어요.", 700)
  const errors = validateRoleplayOutput("짧습니다.", context, geminiFlashRpProfile)
  const prompt = buildComedyRepairPrompt(errors, context)

  assert.match(prompt, /완료된 농담에 설명, 추가 드립, 되받아치기, 예시를 붙여 늘리지 마라/u)
  assert.match(prompt, /실제 작업이나 다음 행동의 결과/u)
  assert.match(prompt, /부족한 분량은 농담이 아니라/u)
  assert.doesNotMatch(prompt, /전문 용어.*최소 하나/u)
})

test("shared humor helpers encode the same generation and repair contract", () => {
  const writingRules = buildHumorWritingRules()
  const repairRules = buildHumorRepairRules()

  assert.match(writingRules, /사용자 입력에 정확히 반응/u)
  assert.match(writingRules, /진지한 장면에는 0회도 정상/u)
  assert.match(repairRules, /즉시 본래 행동이나 화제로 돌아간다/u)
  assert.match(repairRules, /관계나 감정의 변화로 채운다/u)
})
