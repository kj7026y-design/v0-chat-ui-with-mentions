import assert from "node:assert/strict"
import test from "node:test"
import { containsExplicitAdultContent } from "../lib/rp/content-rating"
import {
  compileRoleplayContext,
  generateDynamicPrompt,
  normalizeBody,
  validateRoleplayOutput,
} from "../lib/rp/pipeline"
import { defaultLibrary, isStoryWorkRedZoneEnabled } from "../lib/storychat-storage"

const promptContext = {
  characterName: "강태현",
  userName: "김여자",
  background: "현대 서울의 이웃 로맨스",
  characterSetting: "적극적이고 직설적인 성격",
  userSetting: "성인 이웃",
  currentScene: "늦은 밤 복도에서 대화 중",
}

const messages = [
  { role: "assistant" as const, content: '강태현은 현관문 옆에 기대섰다.\n\n"오늘은 늦었네."\n\n시선이 조용히 마주쳤다.\n\n"잠깐 이야기할래?"' },
  { role: "user" as const, content: "무슨 일인데?" },
]

test("legacy adult works keep Red Zone enabled while standard works default off", () => {
  const adultWork = defaultLibrary.works.find((work) => work.id === "w6")
  const standardWork = defaultLibrary.works.find((work) => work.id === "w1")

  assert.equal(isStoryWorkRedZoneEnabled(adultWork), true)
  assert.equal(isStoryWorkRedZoneEnabled(standardWork), false)
  assert.equal(isStoryWorkRedZoneEnabled({ id: "custom-work" }), false)
})

test("chat request normalization preserves only an explicit Red Zone flag", () => {
  assert.equal(normalizeBody({ messages, redZoneEnabled: true }).redZoneEnabled, true)
  assert.equal(normalizeBody({ messages }).redZoneEnabled, false)
})

test("Red Zone disabled prompt overrides adult settings without exposing policy in output", () => {
  const context = compileRoleplayContext(
    { ...promptContext, background: "성인 로맨스, 노골적인 유혹" },
    messages,
    undefined,
    { minChars: 300, maxChars: 700 },
    "",
    "",
    false,
    "",
    false,
  )
  const prompt = generateDynamicPrompt({
    characterName: context.characterName,
    userName: context.userName,
    modelBackground: context.worldBrief,
    characterSetting: context.characterBrief,
    userSetting: context.userBrief,
    compiledContext: context,
  })

  assert.match(prompt, /작품 콘텐츠 등급 - 레드존 비활성/u)
  assert.match(prompt, /성인 대화, 노골적인 성적 농담이나 요구/u)
  assert.doesNotMatch(prompt, /성인 로맨스 톤은 허용한다/u)
})

test("explicit adult output is blocked only when Red Zone is disabled", () => {
  const safeContext = compileRoleplayContext(
    promptContext,
    messages,
    undefined,
    { minChars: 1, maxChars: 1000 },
    "",
    "",
    false,
    "",
    false,
  )
  const redZoneContext = compileRoleplayContext(
    promptContext,
    messages,
    undefined,
    { minChars: 1, maxChars: 1000 },
    "",
    "",
    false,
    "",
    true,
  )
  const explicitOutput = '강태현은 숨을 고르며 성행위를 요구했다.\n\n"지금 나랑 섹스하고 싶어?"\n\n한 걸음 물러섰다.\n\n"대답해."'

  assert.equal(containsExplicitAdultContent(explicitOutput), true)
  assert.equal(validateRoleplayOutput(explicitOutput, safeContext).redZoneViolation, true)
  assert.equal(validateRoleplayOutput(explicitOutput, redZoneContext).redZoneViolation, false)
  assert.equal(containsExplicitAdultContent('강태현은 웃으며 말했다. "오늘 같이 저녁 먹을래?"'), false)
})
