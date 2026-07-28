import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAiPhoneCommandContent,
  buildPhoneCommandContent,
} from "../lib/chat-commands/phone"
import type { ImageCommandContext } from "../lib/chat-commands/types"

const aiPhoneResponse = {
  wallpaper: {
    label: "잠금화면",
    description: "김여자와 대기실 창가에 나란히 놓아 둔 출입증 두 장을 찍은 사진",
  },
  calls: [
    { contact: "최 실장", direction: "부재중", time: "오후 4:42" },
    { contact: "김여자", direction: "수신", time: "오후 4:18" },
    { contact: "공연장 보안팀", direction: "발신", time: "오후 3:55" },
  ],
  directMessages: [
    { contact: "김여자", time: "방금", content: "인터뷰 끝나면 바로 갈게. 거기 있어.", isDraft: false },
    { contact: "김여자", time: "7분전", content: "알겠어. 끝나자마자 갈게.", isDraft: false, isReply: true },
    { contact: "김여자", time: "임시저장", content: "아까는 말을 못 했는데, 공연 끝나고도 네 옆에 있고 싶어.", isDraft: true },
  ],
  groupChat: {
    roomName: "공연 30분 전",
    members: ["강태현", "최 실장", "한서진", "오지훈"],
    messages: [
      { sender: "최 실장", time: "8분전", content: "동선 바뀐 거 확인 부탁드립니다." },
      { sender: "한서진", time: "6분전", content: "의상팀은 무대 오른쪽에 대기할게요." },
      { sender: "강태현", time: "3분전", content: "확인했어. 인터뷰 먼저 끝내고 갈게." },
      { sender: "오지훈", time: "방금", content: "차량도 뒤편에 대기 중입니다." },
    ],
  },
  searches: [
    "공연 끝난 뒤 사람 없는 출구",
    "긴장한 사람 옆에서 말없이 안심시키는 법",
  ],
  videos: [
    "무대 오르기 전 5분 호흡 루틴",
    "비 오는 서울 밤 드라이브 플레이리스트",
  ],
  payments: [
    { method: "법인카드", merchant: "콘서트홀 스태프 카페", detail: "스태프용 커피 여섯 잔", amount: "38,000원", time: "오후 3:21" },
    { method: "개인카드", merchant: "온라인 쇼핑", detail: "무대용 진정 크림", amount: "26,800원", time: "어제" },
  ],
  recentApps: ["메시지", "캘린더", "지도", "음성 메모"],
}

const phoneContext = {
  work: {
    title: "무대 뒤의 비밀",
    genre: "현대 연예계 로맨스",
    coreSetting: "공연을 앞둔 배우와 관계자들이 콘서트홀에서 움직인다.",
  },
  world: {
    name: "서울의 밤",
    genre: "현대 로맨스",
    era: "현대",
    coreSetting: "연예계",
  },
  character: {
    name: "강태현",
    role: "친한 친구가 거의 없는 인기 배우",
    personality: "사적인 관계가 적고 일할 때는 침착하고 직설적이다.",
    speechStyle: "낮고 간결한 반말",
    relationship: "김여자에게 마음을 드러내기 시작했다.",
  },
  persona: {
    name: "김여자",
  },
  status: {
    characterName: "강태현",
    personaName: "김여자",
    currentLocation: "콘서트홀 대기실",
    currentMission: "공연 전 인터뷰 마무리",
    worldDate: "2026.07.22 17:17",
  },
  recentMessages: [
    {
      id: "user-1",
      type: "user",
      content: "오늘 공연 끝나고도 나랑 이야기할 거지?",
      speakerName: "김여자",
      timestamp: new Date(),
    },
    {
      id: "ai-1",
      type: "ai",
      content: "강태현은 인터뷰 일정표를 접고 공연 뒤에는 다른 사람을 만나지 않겠다고 답했다.",
      speakerName: "강태현",
      timestamp: new Date(),
    },
  ],
} as ImageCommandContext

test("AI generates the entire phone from character, world, and recent scenes", async () => {
  const originalFetch = globalThis.fetch
  let requestBody = ""
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body ?? "")
    return new Response(JSON.stringify({
      result: JSON.stringify(aiPhoneResponse),
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const phone = await buildPhoneCommandContent("강태현", phoneContext)

    assert.match(phone, /^<phone-status><phone-time>17:17<\/phone-time><phone-icons>🔇 HD 5G ▂▄▆▇ 🔋91%<\/phone-icons><\/phone-status>/u)
    assert.match(phone, /🖼️ 배경화면/u)
    assert.match(phone, /김여자와 대기실 창가에 나란히 놓아 둔 출입증 두 장/u)
    assert.match(phone, /📞 최근 통화 기록/u)
    assert.match(phone, /최 실장.*<phone-time>오후 4:42<\/phone-time>/u)
    assert.match(phone, /💬 최근 문자 목록/u)
    assert.match(phone, /김여자 \| 인터뷰 끝나면 바로 갈게.*<phone-time>방금<\/phone-time>/u)
    assert.match(phone, /↪ 알겠어. 끝나자마자 갈게.*<phone-time>7분<\/phone-time>/u)
    assert.doesNotMatch(phone, /김여자 \| 알겠어. 끝나자마자 갈게/u)
    assert.match(phone, /김여자 \| 아까는 말을 못 했는데.*<phone-time>임시저장<\/phone-time>/u)
    assert.doesNotMatch(phone, /해야겠다|시작한다|정리해 두자/u)
    assert.match(phone, /👥 단체 채팅/u)
    assert.match(phone, /\[공연 30분 전 · 4명\]/u)
    assert.match(phone, /최 실장 \| 동선 바뀐 거 확인.*<phone-time>8분<\/phone-time>/u)
    assert.doesNotMatch(phone, /<phone-time>\d+(?:초|분|시간|일|주|개월|년)\s*전<\/phone-time>/u)
    assert.match(phone, /🔍 최근 브라우저 검색 기록/u)
    assert.match(phone, /긴장한 사람 옆에서 말없이 안심시키는 법/u)
    assert.match(phone, /▶️ 최근 유튜브 시청 기록/u)
    assert.match(phone, /💳 최근 결제 내역/u)
    assert.match(phone, /온라인 쇼핑\(무대용 진정 크림\)/u)
    assert.match(phone, /26,800원 <phone-time>어제<\/phone-time>/u)
    assert.match(phone, /📱 최근 실행 앱/u)

    assert.match(requestBody, /모든 항목은 미리 정해진 연락처·검색어·영상·결제처·앱·배경화면·단톡방 목록에서 고르지 말고/u)
    assert.match(requestBody, /recentConversation의 마지막 두 차례 대화/u)
    assert.match(requestBody, /groupChat도 recentConversation의 마지막 두 차례 장면을 반드시 고려한다/u)
    assert.match(requestBody, /사적인 일이면 단톡 구성원에게 내용을 그대로 유출하지 않는다/u)
    assert.match(requestBody, /오늘 공연 끝나고도 나랑 이야기할 거지/u)
    assert.match(requestBody, /인터뷰 일정표를 접고 공연 뒤에는 다른 사람을 만나지 않겠다고 답했다/u)
    assert.match(requestBody, /사적인 관계가 적고 일할 때는 침착하고 직설적이다/u)
    assert.match(requestBody, /콘서트홀 대기실/u)
    assert.match(requestBody, /detail에는 실제로 결제한 품목·서비스·용도를 구체적으로 작성한다/u)
    assert.match(requestBody, /브라우저 검색창에 실제로 직접 입력했을 구체적인 검색어/u)
    assert.match(requestBody, /임시저장 문자는 전송되지 않았으므로 누구의 답장도 붙일 수 없다/u)
    assert.equal(
      (JSON.parse(requestBody) as { responseMimeType?: string }).responseMimeType,
      "application/json",
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("phone generation retries once when the first AI result is malformed", async () => {
  const originalFetch = globalThis.fetch
  let requestCount = 0
  globalThis.fetch = async () => {
    requestCount += 1
    return new Response(JSON.stringify({
      result: requestCount === 1
        ? '{"wallpaper":{"label":"잠금화면"'
        : JSON.stringify(aiPhoneResponse),
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const phone = await buildPhoneCommandContent("강태현", phoneContext)
    assert.equal(requestCount, 2)
    assert.match(phone, /김여자와 대기실 창가에 나란히 놓아 둔 출입증/u)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("phone generation rejects meta story-planning browser searches", async () => {
  const originalFetch = globalThis.fetch
  let requestCount = 0
  globalThis.fetch = async () => {
    requestCount += 1
    const result = requestCount === 1
      ? {
          ...aiPhoneResponse,
          searches: ["다음 단계 로맨틱한 분위기 연출", "공연 뒤 조용한 출구"],
        }
      : aiPhoneResponse
    return new Response(JSON.stringify({
      result: JSON.stringify(result),
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const phone = await buildPhoneCommandContent("강태현", phoneContext)
    assert.equal(requestCount, 2)
    assert.doesNotMatch(phone, /다음 단계|분위기 연출/u)
    assert.match(phone, /공연 끝난 뒤 사람 없는 출구/u)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("phone generation rejects replies attached to drafts or unrelated contacts", async () => {
  const originalFetch = globalThis.fetch
  let requestCount = 0
  globalThis.fetch = async () => {
    requestCount += 1
    const result = requestCount === 1
      ? {
          ...aiPhoneResponse,
          directMessages: [
            {
              contact: "김여자",
              time: "임시저장",
              content: "아직도 궁금해?",
              isDraft: true,
              isReply: false,
            },
            {
              contact: "김여자",
              time: "1분전",
              content: "내가 괜히 궁금한 게 아니지.",
              isDraft: false,
              isReply: true,
            },
            {
              contact: "최 실장",
              time: "5분전",
              content: "일정 확인 부탁드립니다.",
              isDraft: false,
              isReply: false,
            },
          ],
        }
      : aiPhoneResponse
    return new Response(JSON.stringify({
      result: JSON.stringify(result),
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const phone = await buildPhoneCommandContent("강태현", phoneContext)
    assert.equal(requestCount, 2)
    assert.doesNotMatch(phone, /아직도 궁금해|내가 괜히 궁금한 게 아니지/u)
    assert.match(phone, /↪ 알겠어. 끝나자마자 갈게/u)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("legacy AI phone export uses the same full-generation path", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({
    result: JSON.stringify(aiPhoneResponse),
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })

  try {
    const phone = await buildAiPhoneCommandContent("강태현", phoneContext)
    assert.match(phone, /공연 30분 전/u)
    assert.match(phone, /공연 끝난 뒤 사람 없는 출구/u)
  } finally {
    globalThis.fetch = originalFetch
  }
})
