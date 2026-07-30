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
import { parseAiCommandJson } from "../lib/chat-commands/shared"

test("command JSON parser repairs common model formatting mistakes", () => {
  const parsed = parseAiCommandJson(
    `응답:
{"caption":"첫 줄
둘째 줄","items":["하나","둘",],}
부연 설명 {"ignored":true}`,
    "테스트 결과",
  )

  assert.deepEqual(parsed, {
    caption: "첫 줄\n둘째 줄",
    items: ["하나", "둘"],
  })
})

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

test("phone command renders the full AI-generated phone screen", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({
    result: JSON.stringify({
      wallpaper: { label: "잠금화면", description: "공연장 출입증 두 장을 나란히 놓고 찍은 사진" },
      calls: [
        { contact: "최 매니저", direction: "부재중", time: "오후 4:45" },
        { contact: "윤재", direction: "수신", time: "오후 4:20" },
      ],
      directMessages: [
        { contact: "윤재", time: "방금", content: "인터뷰 끝나면 갈게.", isDraft: false },
        { contact: "최 매니저", time: "5분전", content: "순서 확인했습니다.", isDraft: false },
        { contact: "윤재", time: "임시저장", content: "공연 끝나고도 네 옆에 있고 싶어.", isDraft: true },
      ],
      groupChat: {
        roomName: "공연 전 체크",
        members: ["강태현", "최 매니저", "한서진"],
        messages: [
          { sender: "최 매니저", time: "5분전", content: "인터뷰 순서 바뀌었습니다." },
          { sender: "한서진", time: "3분전", content: "무대 오른쪽에서 대기할게요." },
          { sender: "강태현", time: "1분전", content: "확인했어. 바로 갈게." },
          { sender: "최 매니저", time: "방금", content: "차량도 준비됐습니다." },
        ],
      },
      searches: ["공연 뒤 조용한 출구", "긴장 풀어 주는 대화법"],
      videos: ["무대 전 호흡 루틴", "서울 밤 드라이브 플레이리스트"],
      payments: [
        { method: "법인카드", merchant: "공연장 카페", detail: "스태프용 아이스커피 네 잔", amount: "24,000원", time: "오후 3:40" },
      ],
      recentApps: ["메시지", "캘린더", "지도"],
    }),
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
  try {
    const first = await buildPhoneCommandContent("강태현", commandContext)
    assert.match(first, /^<phone-status><phone-time>17:17<\/phone-time><phone-icons>🔇 HD 5G ▂▄▆▇ 🔋91%<\/phone-icons><\/phone-status>/u)
    assert.match(first, /🖼️ 배경화면/u)
    assert.match(first, /📞 최근 통화 기록/u)
    assert.match(first, /💬 최근 문자 목록/u)
    assert.match(first, /👥 단체 채팅/u)
    assert.match(first, /🔍 최근 브라우저 검색 기록/u)
    assert.match(first, /▶️ 최근 유튜브 시청 기록/u)
    assert.match(first, /💳 최근 결제 내역/u)
    assert.match(first, /📱 최근 실행 앱/u)
    assert.match(first, /윤재/u)
    assert.match(first, /공연 전 체크/u)

    const result = await runCommand("휴대폰", "강태현", commandContext)
    assert.equal(result.kind, "message")
    if (result.kind === "message") {
      assert.equal(result.message.commandId, "phone")
      assert.match(result.message.content, /👥 단체 채팅/u)
      assert.match(result.message.content, /\[공연 전 체크 · 3명\]/u)
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("remaining text commands use the current scene instead of fixed dummy copy", async () => {
  const originalFetch = globalThis.fetch
  let snsRequestBody = ""
  let statusRequestBody = ""
  globalThis.fetch = async (_input, init) => {
    const requestBody = String(init?.body ?? "")
    const parsedRequest = JSON.parse(requestBody) as {
      messages?: Array<{ content?: string }>
    }
    const isStatusRequest = parsedRequest.messages?.[0]?.content?.includes("역할극 상태창") === true
    if (isStatusRequest) {
      statusRequestBody = requestBody
      return new Response(JSON.stringify({
        result: JSON.stringify({
          sceneSummary: "윤재가 공연이 끝난 뒤에도 대화를 이어갈 것인지 물었다. 강태현은 인터뷰 일정표를 접고 공연 뒤에는 다른 사람을 만나지 않겠다고 답했다.",
          thoughtEmoji: "😶",
          innerThought: "일정표를 접는 손은 멀쩡했는데 윤재의 질문에는 바로 답하기 어려웠다. 공연이 끝나면 이번에는 피하지 말아야 한다.",
        }),
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    snsRequestBody = requestBody
    return new Response(JSON.stringify({
      result: JSON.stringify({
        dailyPost: {
          image: "대기실 화장대 위에 접어 둔 인터뷰 일정표와 무대 조명 사진",
          caption: "무대에 오르기 전에는 순서부터 정리한다.",
          likes: 218,
          comments: [
            { nickname: "min.scene", elapsedTime: "8분", content: "오늘도 무대 찢겠다", isReply: false },
            { nickname: "j._.h", elapsedTime: "2시간", content: "일정표 접은 거 보니 준비 끝났네", isReply: false },
            { nickname: "east-yeon", elapsedTime: "24초", content: "조명 벌써 예쁘다", isReply: false },
          ],
        },
        userPost: {
          image: "인터뷰 일정표 아래 나란히 놓인 공연 뒤 출입증 두 장",
          caption: "끝난 뒤의 약속은 미루지 않는다.",
          likes: 164,
          comments: [
            { nickname: "d0y00n", elapsedTime: "30분", content: "두 장이면 누구랑 가는 건데", isReply: false },
            { nickname: "ch_lean", elapsedTime: "5일", content: "오늘은 공연 뒤가 더 중요해 보인다", isReply: false },
            { nickname: "tae.hyun", elapsedTime: "1분", content: "약속한 사람이 있어.", isReply: true },
          ],
        },
      }),
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  let sns = ""
  let status = ""
  try {
    sns = await buildSnsCommandContent("강태현", commandContext)
    status = await buildStatusBar("강태현", commandContext)
  } finally {
    globalThis.fetch = originalFetch
  }
  const audience = buildAudienceReactionContent(commandContext)
  const summary = buildSummaryCommandContent("강태현", commandContext)

  assert.match(sns, /^<ig>/u)
  assert.match(sns, /nickname="min\.scene"/u)
  assert.doesNotMatch(sns, /<ig-comment author=/u)
  assert.match(sns, /공연 뒤 출입증 두 장/u)
  assert.match(snsRequestBody, /최근 두 차례 대화/u)
  assert.match(snsRequestBody, /오늘 공연 끝나고도 나랑 이야기할 거지/u)
  assert.match(status, /콘서트홀 대기실/u)
  assert.match(status, /<status-summary>✍️ 윤재가 공연이 끝난 뒤에도/u)
  assert.match(status, /😶 일정표를 접는 손은/u)
  assert.match(statusRequestBody, /미리 정해진 문장/u)
  assert.match(statusRequestBody, /오늘 공연 끝나고도 나랑 이야기할 거지/u)
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
  assert.equal(budget.minChars, 630)
  assert.equal(budget.maxChars, 700)
  assert.ok(budget.minChars < budget.maxChars)
  assert.equal(budget.totalMaxChars, 1500)
})
