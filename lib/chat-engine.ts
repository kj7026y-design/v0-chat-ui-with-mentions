import { type ChatMessage } from "@/lib/chat-types"
import type { StoryCharacter, StoryPersona, StoryWork, StoryWorld } from "@/lib/storychat-storage"

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

export interface ImageCommandStatusContext {
  currentChapterTitle?: string
  chapterProgress?: number
  currentMission?: string
  currentGoal?: string
  worldDate?: string
  currentLocation?: string
  weather?: string
  characterName?: string
  characterEmotion?: string
  characterStatus?: string
  personaName?: string
  personaEmotion?: string
  personaStatus?: string
  nextEventCondition?: string
}

export interface ImageCommandContext {
  work?: StoryWork
  world?: StoryWorld
  character?: StoryCharacter
  persona?: StoryPersona
  status?: ImageCommandStatusContext
  recentMessages?: ChatMessage[]
}

export type AssistantReplyContext = ImageCommandContext

function normalizeList(value?: string | string[] | null): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean)
  if (!value) return []
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function compact(value?: string | number | null) {
  if (value === undefined || value === null) return ""
  return String(value).trim()
}

function clip(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value
}

function formatRecentMessages(messages: ChatMessage[] = []) {
  return messages
    .slice(-6)
    .map((message) => {
      const role =
        message.type === "user"
          ? message.speakerName || "user"
          : message.type === "status"
            ? "scene status"
            : "character"
      return `${role}: ${clip(message.content || message.imageName || "image scene", 120)}`
    })
    .join(" / ")
}

function getLatestUserSceneAction(messages: ChatMessage[] = []) {
  const latestUserMessage = [...messages].reverse().find((message) => message.type === "user" && message.content.trim())
  if (!latestUserMessage) return ""
  return clip(latestUserMessage.content.trim(), 180)
}

export function buildImagePrompt(characterName: string, context: ImageCommandContext = {}) {
  const work = context.work
  const world = context.world
  const character = context.character
  const persona = context.persona
  const status = context.status
  const locations = normalizeList(work?.majorLocations).length
    ? normalizeList(work?.majorLocations)
    : normalizeList(world?.places)
  const events = normalizeList(work?.majorEvents).length
    ? normalizeList(work?.majorEvents)
    : normalizeList(world?.events)
  const visualTags = normalizeList(character?.visualTags)
  const moodKeywords = normalizeList(world?.moodKeywords)
  const scene = [
    compact(status?.currentLocation),
    compact(status?.currentChapterTitle || work?.currentChapter || world?.currentChapter),
    compact(status?.worldDate || work?.worldDate || world?.worldDate || world?.era),
  ].filter(Boolean).join(", ")
  const currentGoal = compact(status?.currentMission || status?.currentGoal || work?.currentGoal || world?.currentGoal)
  const recentFlow = formatRecentMessages(context.recentMessages)
  const latestUserAction = getLatestUserSceneAction(context.recentMessages)
  const personaName = persona?.name || status?.personaName || "user persona"

  const promptParts = [
    "cinematic story illustration",
    `show two visible subjects in the same scene: ${character?.name || characterName} and ${personaName}`,
    latestUserAction
      ? `main visual action: ${personaName} ${latestUserAction}, reacting toward ${character?.name || characterName}`
      : "",
    "compose the image so both the character and the user persona are clearly visible, with facial expression and body language",
    compact(work?.title || world?.name),
    compact(work?.genre || world?.genre || character?.genre),
    compact(work?.tagline || world?.tagline),
    compact(work?.coreSetting || world?.coreSetting),
    locations.length ? `main locations: ${locations.slice(0, 4).join(", ")}` : "",
    events.length ? `story clues: ${events.slice(0, 4).join(", ")}` : "",
    compact(work?.mood || world?.mood),
    moodKeywords.length ? `mood keywords: ${moodKeywords.slice(0, 5).join(", ")}` : "",
    scene ? `current scene: ${scene}` : "",
    currentGoal ? `current goal: ${currentGoal}` : "",
    [
      `${character?.name || characterName}`,
      compact(character?.role),
      compact(character?.appearance),
      visualTags.length ? visualTags.slice(0, 5).join(", ") : "",
      compact(character?.summary),
    ].filter(Boolean).join(", "),
    persona
      ? [
          `user persona: ${personaName}`,
          compact(persona.role),
          compact(persona.appearance),
          compact(persona.relationship),
        ].filter(Boolean).join(", ")
      : "",
    status?.characterEmotion ? `${character?.name || characterName} emotion: ${status.characterEmotion}` : "",
    status?.personaEmotion ? `${persona?.name || status.personaName || "user"} emotion: ${status.personaEmotion}` : "",
    recentFlow ? `recent conversation: ${recentFlow}` : "",
    [
      "high quality fantasy concept art",
      "cinematic composition",
      "dramatic moody lighting",
      "detailed background",
      "sharp focus",
      "rich atmosphere",
      "high detail digital illustration",
      "no text",
      "no watermark",
    ].join(", "),
  ].filter(Boolean)

  return clip(promptParts.join(". "), 1400)
}

function buildFreeSampleImageUrl(characterName: string, context: ImageCommandContext = {}) {
  const prompt = encodeURIComponent(buildImagePrompt(characterName, context))
  const params = new URLSearchParams({
    width: "1024",
    height: "1024",
    model: "flux",
    enhance: "true",
    nologo: "true",
    seed: String(Date.now()),
  })
  return `https://image.pollinations.ai/prompt/${prompt}?${params.toString()}`
}

function buildStatusBar(characterName: string, context?: ImageCommandContext): string {
  const status = context?.status
  const location = status?.currentLocation || "장소명"
  const worldDate = status?.worldDate || "yy.mm.dd hh:mm"
  const weather = status?.weather || "20˚/31˚ 맑음"
  const characterEmotion = status?.characterEmotion || "알 수 없음"
  const personaEmotion = status?.personaEmotion || "알 수 없음"
  const characterStatus = status?.characterStatus || `${characterName}은 현재 상황을 살피고 있다.`
  const nextFlow = status?.nextEventCondition || status?.currentGoal || status?.currentMission || "대화 흐름에 따라 다음 장면이 이어집니다."

  return [
    `📍장소: ${location} | 📅일시: ${worldDate} | 🌡️날씨 : ${weather}`,
    "💓호감도: 62000/100000",
    `🎭감정: ${characterName} ${characterEmotion} · ${status?.personaName || "나"} ${personaEmotion}`,
    "💬속마음",
    `- ${characterStatus}`,
    `➡️다음 흐름: ${nextFlow}`,
  ].join("\n")
}

function buildPhoneCommandContent(characterName: string, context?: ImageCommandContext): string {
  const status = context?.status
  return [
    "📱 휴대폰",
    `알림: ${characterName}의 새 메시지를 기다리는 중`,
    status?.currentLocation ? `현재 위치: ${status.currentLocation}` : "",
    status?.worldDate ? `시간: ${status.worldDate}` : "",
  ].filter(Boolean).join("\n")
}

function buildSnsCommandContent(characterName: string, context?: ImageCommandContext): string {
  const status = context?.status
  const mood = status?.characterEmotion || "묘한 분위기"
  return [
    "💬 SNS",
    `${characterName} 관련 게시글이 조용히 올라오고 있다.`,
    `실시간 분위기: ${mood}`,
    status?.nextEventCondition ? `화제: ${status.nextEventCondition}` : "",
  ].filter(Boolean).join("\n")
}

function buildAudienceReactionContent(context?: ImageCommandContext): string {
  const status = context?.status
  return [
    "👀 시청자 반응",
    `- 지금 장면 분위기 좋다.`,
    status?.characterEmotion ? `- 캐릭터 감정이 ${status.characterEmotion} 쪽으로 움직이는 중.` : "",
    status?.currentGoal || status?.currentMission ? `- 목표가 분명해서 다음 대화가 궁금해진다.` : "",
  ].filter(Boolean).join("\n")
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

function buildAssistantSystemPrompt(context?: AssistantReplyContext) {
  const work = context?.work
  const world = context?.world
  const character = context?.character
  const persona = context?.persona
  const status = context?.status
  const characterName = character?.name || status?.characterName || "캐릭터"
  const personaName = persona?.name || status?.personaName || "사용자"
  const worldInfo = [
    world?.name || work?.title,
    world?.genre || work?.genre || character?.genre,
    world?.era || world?.worldDate || work?.worldDate,
    work?.coreSetting || world?.coreSetting,
    work?.mood || world?.mood,
  ].filter(Boolean).join(" / ")
  const characterInfo = [
    character?.summary,
    character?.role,
    character?.personality,
    character?.speechStyle,
    character?.relationship,
  ].filter(Boolean).join(" / ")
  const personaInfo = [
    persona?.summary,
    persona?.role,
    persona?.personality,
    persona?.speechStyle,
    persona?.relationship,
  ].filter(Boolean).join(" / ")
  const sceneInfo = [
    status?.currentLocation,
    status?.currentChapterTitle,
    status?.currentMission || status?.currentGoal,
    status?.worldDate,
    status?.characterEmotion ? `${characterName} 감정: ${status.characterEmotion}` : "",
    status?.personaEmotion ? `${personaName} 감정: ${status.personaEmotion}` : "",
  ].filter(Boolean).join(" / ")
  const sceneDialoguePairCount = 2 + Math.floor(Math.random() * 3)

  return [
    "너는 StoryChat의 역할극 채팅 AI다.",
    `주 캐릭터는 ${characterName}이고, 사용자의 자아는 ${personaName}이다.`,
    "사용자의 마지막 행동과 대사에 이어서 캐릭터의 자연스러운 반응을 한국어로 작성한다.",
    "설정표처럼 설명하지 말고, 채팅 말풍선에 들어갈 본문만 작성한다.",
    `답변은 반드시 '현재 상황에 대한 소설식 설명 한 문장' 다음 줄에 '캐릭터의 대사 한 줄'을 쓰는 패턴을 정확히 ${sceneDialoguePairCount}번 반복한다.`,
    "대사는 반드시 큰따옴표로 감싼다.",
    "상황 설명에는 따옴표를 쓰지 않는다.",
    "사용자의 대사나 행동을 새로 대신 작성하지 말고, 사용자가 이미 한 행동에 대한 캐릭터의 반응만 이어서 쓴다.",
    "번호, 제목, 화자명, 괄호 설명, 마크다운 목록은 쓰지 않는다.",
    "캐릭터의 말투와 관계성을 유지하고, 세계관을 깨는 메타 발언을 하지 않는다.",
    worldInfo ? `[작품/세계관]\n${worldInfo}` : "",
    characterInfo ? `[캐릭터 설정]\n${characterInfo}` : "",
    personaInfo ? `[사용자 자아]\n${personaInfo}` : "",
    sceneInfo ? `[현재 장면]\n${sceneInfo}` : "",
  ].filter(Boolean).join("\n\n")
}

function buildAssistantMessages(
  history: ChatMessage[],
  userContent: string,
  introContext?: ChatIntroContext | null,
  context?: AssistantReplyContext,
) {
  const recentHistory = history.slice(-12)
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: buildAssistantSystemPrompt(context) },
  ]

  const introText = formatIntroForAIContext(introContext)
  if (introText) {
    messages.push({ role: "system", content: introText })
  }

  if (recentHistory.length > 0) {
    recentHistory.forEach((message) => {
      if (!message.content.trim() && message.imageUrl) return
      messages.push({
        role: message.type === "user" ? "user" as const : "assistant" as const,
        content: formatMessageForAIContext(message),
      })
    })
  } else {
    messages.push({ role: "user", content: userContent })
  }

  return messages
}

async function generatePollinationsReply(
  history: ChatMessage[],
  userContent: string,
  introContext?: ChatIntroContext | null,
  context?: AssistantReplyContext,
) {
  const messages = buildAssistantMessages(history, userContent, introContext, context)
  const systemPrompt = messages.find((message) => message.role === "system")?.content ?? buildAssistantSystemPrompt(context)
  const fallbackPrompt = messages
    .filter((message) => message.role !== "system")
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n\n")
  const response = await fetch("/api/free-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      systemPrompt,
      fallbackPrompt,
    }),
  })

  if (response.ok) {
    const data = await response.json() as { content?: string }
    const content = data.content?.trim()
    if (!content) throw new Error("Pollinations text API returned empty content")
    return content
  }

  throw new Error(`Free chat API failed: ${response.status}`)
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
  context?: AssistantReplyContext,
): Promise<ChatMessage> {
  const content = await generatePollinationsReply(history, _userContent, introContext, context)
  return {
    id: makeId(),
    type: "ai",
    content,
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
  context?: ImageCommandContext,
): Promise<CommandResult> {
  const normalized = command.replace(/^\//, "").trim()

  if (normalized === "휴대폰") {
    return {
      kind: "message",
      message: {
        id: makeId(),
        type: "status",
        content: buildPhoneCommandContent(characterName, context),
        timestamp: new Date(),
      },
    }
  }

  if (normalized === "SNS") {
    return {
      kind: "message",
      message: {
        id: makeId(),
        type: "status",
        content: buildSnsCommandContent(characterName, context),
        timestamp: new Date(),
      },
    }
  }

  if (normalized === "시청자반응") {
    return {
      kind: "message",
      message: {
        id: makeId(),
        type: "status",
        content: buildAudienceReactionContent(context),
        timestamp: new Date(),
      },
    }
  }

  if (normalized === "상태바") {
    return {
      kind: "message",
      message: {
        id: makeId(),
        type: "status",
        content: buildStatusBar(characterName, context),
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
        type: "status",
        content: DUMMY_SUMMARY,
        timestamp: new Date(),
      },
    }
  }

  if (normalized === "이미지") {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const prompt = buildImagePrompt(characterName, context)
    return {
      kind: "message",
      message: {
        id: makeId(),
        type: "ai",
        content: "",
        imageUrl: buildFreeSampleImageUrl(characterName, context),
        imageName: "무료 샘플 이미지",
        originalContent: prompt,
        timestamp: new Date(),
      },
    }
  }

  return { kind: "toast", message: "곧 연결될 기능이에요." }
}
