import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAudienceReactionContent,
  buildPhoneCommandContent,
  buildSnsCommandContent,
  buildStatusBar,
  buildSummaryCommandContent,
  getAssistantReplyLengthBudget,
  getDialogueAssistCharCount,
  runCommand,
  type ImageCommandContext,
} from "../lib/chat-engine"

const commandContext = {
  work: {
    id: "w8",
    title: "무대 뒤의 비밀",
    genre: "현대 연예계 로맨스",
    coreSetting: "공연을 앞둔 배우와 관계자가 대기실에서 비밀스러운 대화를 나눈다.",
    currentGoal: "공연 전까지 서로의 진심을 확인하기",
  },
  world: {
    id: "world8",
    name: "서울의 밤",
    genre: "현대 로맨스",
    era: "현대",
    coreSetting: "연예계",
    places: "콘서트홀, 대기실, 카페",
    events: "콘서트, 인터뷰",
  },
  character: {
    id: "c8",
    name: "강태현",
    genre: "현대 로맨스",
    role: "인기 배우",
    residence: "서울",
    summary: "무대에서는 완벽하지만 사적인 감정을 감춘다.",
    personality: "침착하고 직설적",
    speechStyle: "낮고 간결한 반말",
    relationship: "윤재와 비밀스러운 관계",
  },
  persona: {
    id: "p8",
    name: "윤재",
    age: "성인",
    role: "공연 관계자",
    summary: "강태현과 대화를 이어가는 인물",
    personality: "솔직함",
    speechStyle: "담백함",
    appearance: "단정한 차림",
    relationship: "강태현과 가까워지는 중",
    secret: "",
    preferredDevelopments: "",
    forbiddenDevelopments: "",
    createdAt: "2026-07-22",
  },
  status: {
    characterName: "강태현",
    personaName: "윤재",
    currentLocation: "콘서트홀 대기실",
    worldDate: "2026.07.22 17:17",
    weather: "비 온 뒤 맑음",
    currentGoal: "공연 전까지 서로의 진심을 확인하기",
    currentMission: "인터뷰 전에 윤재와 단둘이 대화하기",
    characterEmotion: "긴장과 기대",
    personaEmotion: "호기심",
    nextEventCondition: "매니저가 대기실 문을 두드리기 전",
    chapterProgress: 63,
  },
  recentMessages: [
    {
      id: "u1",
      type: "user",
      content: "오늘 공연 끝나고도 나랑 이야기할 거지?",
      speakerName: "윤재",
      timestamp: new Date("2026-07-22T16:58:00+09:00"),
    },
    {
      id: "a1",
      type: "ai",
      content: "강태현은 인터뷰 일정표를 접어 두고 공연 뒤에는 아무도 만나지 않겠다고 말했다.",
      speakerName: "강태현",
      timestamp: new Date("2026-07-22T16:59:00+09:00"),
    },
  ],
} as unknown as ImageCommandContext

test("phone command renders a contextual phone screen and changes on each invocation", async () => {
  const first = buildPhoneCommandContent("강태현", commandContext)
  const second = buildPhoneCommandContent("강태현", commandContext)

  assert.match(first, /^17:17\s+.*HD 5G.*🔋/u)
  assert.match(first, /\[최근 통화 기록\]/u)
  assert.match(first, /\[최근 문자 목록\]/u)
  assert.match(first, /\[최근 브라우저 검색 기록\]/u)
  assert.match(first, /\[최근 유튜브 시청 기록\]/u)
  assert.match(first, /\[최근 결제 내역\]/u)
  assert.match(first, /\[최근 실행 앱\]/u)
  assert.match(first, /윤재/u)
  assert.match(first, /매니저|스타일리스트|현장 팀장/u)
  assert.match(first, /콘서트|공연|인터뷰/u)
  assert.notEqual(first, second)
  assert.ok(Array.from(first).length <= 800)

  const result = await runCommand("휴대폰", "강태현", commandContext)
  assert.equal(result.kind, "message")
  if (result.kind === "message") assert.equal(result.message.commandId, "phone")
})

test("remaining text commands use the current scene instead of fixed dummy copy", async () => {
  const sns = buildSnsCommandContent("강태현", commandContext)
  const status = buildStatusBar("강태현", commandContext)
  const audience = buildAudienceReactionContent(commandContext)
  const summary = buildSummaryCommandContent("강태현", commandContext)

  assert.match(sns, /SOCIAL/u)
  assert.match(sns, /강태현|윤재/u)
  assert.match(status, /콘서트홀 대기실/u)
  assert.doesNotMatch(status, /장소명|yy\.mm\.dd/u)
  assert.match(audience, /LIVE CHAT/u)
  assert.match(summary, /STORY LOG/u)
  assert.match(summary, /공연|인터뷰|대화/u)

  const summaryResult = await runCommand("요약", "강태현", commandContext)
  assert.equal(summaryResult.kind, "message")
  if (summaryResult.kind === "message") assert.equal(summaryResult.message.commandId, "summary")
})

test("auto command estimate and actual output stay inside the combined turn budget", () => {
  const assistChars = getDialogueAssistCharCount(["phone", "sns"], "강태현", commandContext)
  const budget = getAssistantReplyLengthBudget(assistChars)

  assert.ok(assistChars > 0)
  assert.ok(budget.maxChars + assistChars <= budget.totalMaxChars)
  assert.equal(budget.minChars, 700)
  assert.equal(budget.totalMaxChars, 1500)
})
