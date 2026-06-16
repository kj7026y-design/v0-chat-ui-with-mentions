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

export interface ChatInputCharacter {
  id: string
  name: string
}

export interface ChatIntroContext {
  title: string
  scene?: string
  firstMessage?: string
}

export type ParsedChatInput =
  | {
      kind: "plain"
      content: string
      mentionCharacterIds?: string[]
      mentionAll?: boolean
    }
  | {
      kind: "character_line"
      speakerId: string
      speakerName: string
      content: string
      originalContent: string
      isEmptyLine: boolean
    }

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function getSubjectParticle(name: string): "이" | "가" {
  const lastChar = name.trim().at(-1)
  if (!lastChar) return "가"
  const code = lastChar.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return "가"
  return (code - 0xac00) % 28 === 0 ? "가" : "이"
}

function extractMentionIds(content: string, characters: ChatInputCharacter[], explicitMentions?: string[]) {
  const mentionIds = new Set<string>()
  let mentionAll = explicitMentions?.includes("all") ?? false

  explicitMentions?.forEach((id) => {
    if (id === "all") return
    mentionIds.add(id)
  })

  if (/(^|\s)@모두(?=\s|$)/.test(content)) {
    mentionAll = true
  }

  characters.forEach((character) => {
    const pattern = new RegExp(`(^|\\s)@${escapeRegExp(character.name)}(?=\\s|$)`, "u")
    if (pattern.test(content)) mentionIds.add(character.id)
  })

  return {
    mentionCharacterIds: [...mentionIds],
    mentionAll,
  }
}

export function parseChatInput(
  content: string,
  characters: ChatInputCharacter[],
  explicitMentions?: string[],
): ParsedChatInput {
  const originalContent = content.trim()

  for (const character of characters) {
    if (character.name === "모두") continue
    const speechPattern = new RegExp(
      `^ⓣ${escapeRegExp(character.name)}:\\s*([\\s\\S]*)$`,
      "u",
    )
    const match = originalContent.match(speechPattern)
    if (!match) continue

    const lineContent = (match[1] ?? "").trim()
    return {
      kind: "character_line",
      speakerId: character.id,
      speakerName: character.name,
      content: lineContent,
      originalContent,
      isEmptyLine: lineContent.length === 0,
    }
  }

  const mentions = extractMentionIds(originalContent, characters, explicitMentions)
  return {
    kind: "plain",
    content: originalContent,
    mentionCharacterIds: mentions.mentionCharacterIds,
    mentionAll: mentions.mentionAll,
  }
}

export function formatMessageForAIContext(message: ChatMessage) {
  if (message.isUserAuthoredCharacterLine && message.speakerName) {
    return `[사용자가 ${message.speakerName}의 대사로 작성함]: ${message.content}`
  }

  if (message.mentionAll) {
    return `[사용자가 모든 캐릭터를 언급함]: ${message.content}`
  }

  if (message.mentionCharacterIds?.length || message.mentions?.length) {
    const mentioned = message.mentionCharacterIds?.join(", ") || message.mentions?.join(", ")
    return `[사용자가 ${mentioned}를 언급함]: ${message.content}`
  }

  return message.content
}

export function formatIntroForAIContext(intro?: ChatIntroContext | null) {
  if (!intro) return ""
  return [
    "[선택된 도입부]",
    `제목: ${intro.title}`,
    intro.scene ? `장면: ${intro.scene}` : "",
    intro.firstMessage ? `첫 메시지: ${intro.firstMessage}` : "",
    "사용자는 이 도입부 직후의 장면에서 첫 응답을 보냈다.",
    "AI는 도입부를 반복하지 말고 이어서 진행한다.",
  ].filter(Boolean).join("\n")
}

/** 유저 메시지 객체 생성 */
export function buildUserMessage(
  content: string,
  characters: ChatInputCharacter[] = [],
  mentions?: string[],
  image?: { url: string; name?: string },
): ChatMessage {
  const parsedInput = parseChatInput(content, characters, mentions)

  if (parsedInput.kind === "character_line") {
    return {
      id: makeId(),
      type: "user",
      content: parsedInput.content,
      timestamp: new Date(),
      speakerType: "character",
      speakerId: parsedInput.speakerId,
      speakerName: parsedInput.speakerName,
      isUserAuthoredCharacterLine: true,
      originalContent: parsedInput.originalContent,
      imageUrl: image?.url,
      imageName: image?.name,
    }
  }

  return {
    id: makeId(),
    type: "user",
    content: parsedInput.content,
    timestamp: new Date(),
    mentions: parsedInput.mentionAll ? ["all"] : parsedInput.mentionCharacterIds,
    mentionCharacterIds: parsedInput.mentionCharacterIds,
    mentionAll: parsedInput.mentionAll,
    imageUrl: image?.url,
    imageName: image?.name,
  }
}

/**
 * AI 응답 생성 (더미)
 * @returns Promise<ChatMessage> - 추후 fetch("/api/chat") 등으로 교체
 */
export async function generateAssistantReply(
  history: ChatMessage[],
  _userContent: string,
  introContext?: ChatIntroContext | null,
): Promise<ChatMessage> {
  void formatIntroForAIContext(introContext)
  void history.map(formatMessageForAIContext)
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
