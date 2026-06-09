import { type ChatMessage } from "@/lib/chat-types"

/**
 * 채팅 엔진 - 더미 동작 레이어
 *
 * 추후 OpenAI API / Supabase 연결 시, 아래 함수들의 내부 구현만 교체하면 됩니다.
 * 컴포넌트는 이 함수들의 시그니처에만 의존하도록 작성되어 있습니다.
 */

// 더미 AI 응답 풀
const DUMMY_AI_REPLIES = [
  "잠시 침묵하던 그는 당신을 바라보며 낮게 대답했다.",
  "그 말은 쉽게 넘길 수 없겠군요.",
  "당신이 그렇게 말할 줄은 몰랐습니다.",
  "그는 천천히 고개를 끄덕였다. 무언가 결심한 듯한 표정이었다.",
  "\"...그래.\" 짧은 한마디였지만, 그 안엔 많은 것이 담겨 있었다.",
  "당신의 말에 그의 눈빛이 흔들렸다.",
]

const DUMMY_INNER_THOUGHTS = [
  "그는 대답하지 않았지만, 당신의 말이 오래 마음에 남았다. 인정하고 싶지 않았을 뿐이다.",
  "사실 요즘 많이 외로웠어. 네가 이렇게 찾아와줘서 정말 고마워...",
  "이 감정을 뭐라고 불러야 할까. 처음 느껴보는 거라 두렵기도 하다.",
]

const DUMMY_SUMMARY =
  "지금까지: 당신은 이무기와 호수 공원에서 벚꽃을 보며 가까워졌고, 그는 조금씩 마음을 열기 시작했다."

function buildStatusBar(characterName: string): string {
  return [
    `[${characterName} 상태]`,
    "감정: 흔들림",
    "호감도: 62",
    "경계심: 35",
    "현재 생각: 당신이 떠날까 봐 신경 쓰고 있다.",
    "숨기는 것: 과거의 계약",
  ].join("\n")
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** 유저 메시지 객체 생성 */
export function buildUserMessage(content: string, mentions?: string[]): ChatMessage {
  return {
    id: makeId(),
    type: "user",
    content,
    timestamp: new Date(),
    mentions,
  }
}

/**
 * AI 응답 생성 (더미)
 * @returns Promise<ChatMessage> - 추후 fetch("/api/chat") 등으로 교체
 */
export async function generateAssistantReply(
  _history: ChatMessage[],
  _userContent: string,
): Promise<ChatMessage> {
  await new Promise((resolve) => setTimeout(resolve, 1200))
  return {
    id: makeId(),
    type: "ai",
    content: pick(DUMMY_AI_REPLIES),
    timestamp: new Date(),
  }
}

export type CommandResult =
  | { kind: "message"; message: ChatMessage }
  | { kind: "toast"; message: string }

/**
 * 슬래시 명령어 처리 (더미)
 */
export async function runCommand(
  command: string,
  characterName: string,
): Promise<CommandResult> {
  const normalized = command.replace(/^\//, "").trim()

  if (normalized === "상태바") {
    return {
      kind: "message",
      message: {
        id: makeId(),
        type: "ai",
        content: buildStatusBar(characterName),
        timestamp: new Date(),
      },
    }
  }

  if (normalized === "속마음") {
    await new Promise((resolve) => setTimeout(resolve, 900))
    return {
      kind: "message",
      message: {
        id: makeId(),
        type: "inner-thought",
        content: pick(DUMMY_INNER_THOUGHTS),
        timestamp: new Date(),
      },
    }
  }

  if (normalized === "요약") {
    return {
      kind: "message",
      message: {
        id: makeId(),
        type: "ai",
        content: DUMMY_SUMMARY,
        timestamp: new Date(),
      },
    }
  }

  if (normalized === "이미지") {
    return { kind: "toast", message: "이미지 생성 기능은 준비 중이에요." }
  }

  return { kind: "toast", message: "곧 연결될 기능이에요." }
}
