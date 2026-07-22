import { AUTO_COMMAND_IDS, MAX_COMMAND_SUGGESTIONS, type ChatMessage } from "@/lib/chat-types"
import {
  DEFAULT_CHAT_MODEL_ID,
  DEFAULT_MAX_ANSWER_CHARS,
  DEFAULT_MIN_ANSWER_CHARS,
  MAX_TURN_CONTENT_CHARS,
  getChatModelConfig,
  type ChatModelId,
} from "@/lib/chat-models"
import {
  saveGenerationRun,
  type GenerationProviderOutcome,
  type GenerationTimeoutStage,
  type GenerationValidationAttempt,
  type GenerationValidationStatus,
} from "@/lib/generation-runs"
import { buildModelBackground } from "@/lib/model-background"
import { buildModelUserMessageFromInput } from "@/lib/rp-input-parser"
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
  memoryMemo?: string
}

export type AssistantReplyContext = ImageCommandContext

export type ChatStreamPhase = "preparing" | "generating" | "validating" | "repairing" | "fallback" | "finalizing"

export type ChatStreamEvent = {
  event_id?: number
  event_type?: "phase" | "delta" | "raw_delta" | "final"
  content?: string
  raw_content?: string
  phase?: ChatStreamPhase
  phase_label?: string
  elapsed_ms?: number
  is_final_event?: boolean
  run_id?: string
  message_id?: string
  saved_content?: string
  provider?: string
  model?: string
  attempted_model?: string
  output_model?: string | null
  prompt_version?: string
  normalizer_version?: string
  validator_version?: string
  validation_status?: GenerationValidationStatus
  validation_failures?: string[]
  validation_attempts?: GenerationValidationAttempt[]
  repair_attempted?: boolean
  ttft_ms?: number
  mismatch?: boolean
  fallback?: boolean
  fallback_provider?: string
  fallback_model?: string
  provider_outcome?: GenerationProviderOutcome
  timeout_stage?: GenerationTimeoutStage
  gemini_error_code?: number
  gemini_error_status?: string
  generation_error_code?: number
  generation_error_status?: string
  generation_error_message?: string
  status?: "streaming" | "completed" | "failed"
  error?: string
  room_id?: string
  user_message_id?: string
}

export type GenerateAssistantReplyOptions = {
  roomId?: string
  userMessageId?: string
  characterMessageId?: string
  regenerationAvoidContent?: string
  retryAttempt?: boolean
  autoAdvance?: boolean
  bypassRoleplayRules?: boolean
  debugRawRoleplayStream?: boolean
  answerLength?: AssistantReplyLengthBudget
  onStreamEvent?: (event: ChatStreamEvent) => void
}

interface DynamicPromptContext {
  characterName?: string
  userName?: string
  background?: string
  characterSetting?: string
  userSetting?: string
  currentScene?: string
}

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

function countTextChars(content: string) {
  return Array.from(content).length
}

function sliceTextChars(content: string, maxChars: number) {
  return Array.from(content).slice(0, maxChars).join("")
}

function trimAnswerToMaxChars(content: string, maxChars: number) {
  const trimmed = content.trim()
  if (countTextChars(trimmed) <= maxChars) return trimmed
  // The RP server already validates its answer-length budget. If it returned a
  // complete sentence, preserve the vetted ending instead of cutting off the
  // final paragraph again on the client.
  if (/[.!?。！？…]["'”’」』)]*$/u.test(trimmed) || /["”’」』]$/u.test(trimmed)) {
    return trimmed
  }

  const sliced = sliceTextChars(trimmed, maxChars)
  const sentenceMatch = [...sliced.matchAll(/[.!?。！？](?:["'”’」』)]*)/gu)].at(-1)
  const sentenceEnd = sentenceMatch ? sentenceMatch.index + sentenceMatch[0].length : -1

  if (sentenceEnd > 0) {
    return sliced.slice(0, sentenceEnd).trim()
  }

  const lineEnd = sliced.lastIndexOf("\n")
  if (lineEnd > 0) {
    return sliced.slice(0, lineEnd).trim()
  }

  const spaceEnd = sliced.lastIndexOf(" ")
  const naturalEnd = spaceEnd > 0 ? spaceEnd : sliced.length
  return `${sliced.slice(0, naturalEnd).replace(/[,，;；:\s]+$/u, "").trim()}.`
}

export interface AssistantReplyLengthBudget {
  minChars: number
  maxChars: number
  dialogueAssistChars: number
  totalMaxChars: number
}

export function getAssistantReplyLengthBudget(dialogueAssistChars: number): AssistantReplyLengthBudget {
  const normalizedAssistChars = Math.max(0, Math.floor(dialogueAssistChars))
  const totalMaxChars = normalizedAssistChars > 0
    ? MAX_TURN_CONTENT_CHARS
    : DEFAULT_MAX_ANSWER_CHARS
  const maxChars = Math.max(
    1,
    Math.min(DEFAULT_MAX_ANSWER_CHARS, totalMaxChars - normalizedAssistChars),
  )
  const minChars = Math.min(DEFAULT_MIN_ANSWER_CHARS, maxChars)

  return {
    minChars,
    maxChars,
    dialogueAssistChars: normalizedAssistChars,
    totalMaxChars,
  }
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

function isEchoOfLatestUserInput(value?: string, latestUserInput?: string) {
  const candidate = compact(value).replace(/\.\.\.$/, "").trim()
  const latest = compact(latestUserInput).replace(/\.\.\.$/, "").trim()
  if (candidate.length < 8 || latest.length < 8) return false

  const key = candidate.slice(0, Math.min(candidate.length, 24))
  return latest.includes(key)
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

type CommandRandom = () => number

interface RecentCommandScene {
  latestUser: string
  latestCharacter: string
  recentLines: string[]
}

let commandInvocationCounter = 0

function cleanCommandText(value?: string, maxChars = 44) {
  const cleaned = (value ?? "")
    .replace(/\[[^\]\n]{1,40}\]/gu, " ")
    .replace(/[*_`#>]/gu, " ")
    .replace(/(^|\s)@[\p{L}\p{N}_-]+/gu, " ")
    .replace(/["“”]/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
  if (!cleaned) return ""
  const chars = Array.from(cleaned)
  return chars.length > maxChars ? `${chars.slice(0, maxChars - 1).join("")}…` : cleaned
}

function getRecentCommandScene(context?: ImageCommandContext): RecentCommandScene {
  const narrativeMessages = (context?.recentMessages ?? [])
    .filter((message) => (message.type === "user" || message.type === "ai") && message.content.trim())
    .slice(-8)
  const latestUserMessage = [...narrativeMessages].reverse().find((message) => message.type === "user")
  const latestCharacterMessage = [...narrativeMessages].reverse().find((message) => message.type === "ai")

  return {
    latestUser: cleanCommandText(latestUserMessage?.content, 38),
    latestCharacter: cleanCommandText(latestCharacterMessage?.content, 38),
    recentLines: narrativeMessages
      .slice(-4)
      .map((message) => cleanCommandText(message.content, 46))
      .filter(Boolean),
  }
}

function createCommandRandom(label: string, context?: ImageCommandContext): CommandRandom {
  const recentKey = (context?.recentMessages ?? [])
    .slice(-5)
    .map((message) => `${message.id}:${message.content.slice(0, 40)}`)
    .join("|")
  const seedText = `${label}|${Date.now()}|${++commandInvocationCounter}|${recentKey}`
  let state = 2166136261
  for (const char of seedText) {
    state ^= char.codePointAt(0) ?? 0
    state = Math.imul(state, 16777619)
  }
  state >>>= 0

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function commandPick<T>(random: CommandRandom, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)] ?? values[0]
}

function getCommandBaseDate(context?: ImageCommandContext) {
  const date = new Date()
  const worldDate = context?.status?.worldDate || context?.work?.worldDate || context?.world?.worldDate || ""
  const timeMatch = worldDate.match(/(?:(오전|오후)\s*)?(\d{1,2}):(\d{2})/u)
  if (!timeMatch) return date

  let hour = Number(timeMatch[2])
  const minute = Number(timeMatch[3])
  if (timeMatch[1] === "오후" && hour < 12) hour += 12
  if (timeMatch[1] === "오전" && hour === 12) hour = 0
  if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
    date.setHours(hour, minute, 0, 0)
  }
  return date
}

function offsetCommandTime(baseDate: Date, minutesAgo: number) {
  return new Date(baseDate.getTime() - minutesAgo * 60_000)
}

function formatPhoneStatusTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function formatPhoneListTime(date: Date) {
  const hour = date.getHours()
  const period = hour < 12 ? "오전" : "오후"
  const displayHour = hour % 12 || 12
  return `${period} ${displayHour}:${String(date.getMinutes()).padStart(2, "0")}`
}

function inferContextContact(characterName: string, context: ImageCommandContext | undefined, random: CommandRandom) {
  const personaName = context?.persona?.name || context?.status?.personaName || "나"
  const explicitNames = (context?.recentMessages ?? [])
    .flatMap((message) => [message.speakerName, ...(message.mentionCharacterNames ?? [])])
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name) && name !== characterName && name !== personaName)
  if (explicitNames.length > 0) return commandPick(random, explicitNames)

  const setting = [
    context?.character?.role,
    context?.character?.genre,
    context?.work?.genre,
    context?.world?.genre,
    context?.work?.coreSetting,
    context?.world?.coreSetting,
  ].filter(Boolean).join(" ")

  if (/아이돌|배우|가수|연예|모델/u.test(setting)) return commandPick(random, ["매니저", "스타일리스트", "현장 팀장"])
  if (/학교|학생|교사|대학/u.test(setting)) return commandPick(random, ["담임 선생님", "반장", "과대표"])
  if (/회사|직장|사무|재벌|비서/u.test(setting)) return commandPick(random, ["팀장", "비서실", "프로젝트 동료"])
  if (/수사|형사|경찰|탐정/u.test(setting)) return commandPick(random, ["수사팀", "감식반", "당직 형사"])
  if (/판타지|왕국|길드|마법|기사/u.test(setting)) return commandPick(random, ["길드 접수원", "왕실 전령", "동료 기사"])
  return commandPick(random, ["업무 연락", "오래된 친구", "약속 상대"])
}

const COMMAND_KEYWORD_STOP_WORDS = new Set([
  "그리고", "하지만", "그래서", "그렇게", "이렇게", "저렇게", "지금", "정말", "그냥", "다시",
  "대답", "상대", "사용자", "캐릭터", "자신", "그는", "그녀는", "나는", "있는", "없는", "했다",
])

function getCommandKeywords(characterName: string, context?: ImageCommandContext) {
  const scene = getRecentCommandScene(context)
  const source = [
    scene.latestUser,
    scene.latestCharacter,
    context?.status?.currentLocation,
    context?.status?.currentGoal,
    context?.status?.currentMission,
    context?.status?.nextEventCondition,
    context?.work?.title,
    context?.work?.genre,
    context?.world?.genre,
    context?.character?.role,
  ].filter(Boolean).join(" ")
  const keywords = source
    .match(/[가-힣A-Za-z0-9]{2,}/gu)
    ?.map((word) => word.replace(/(?:에게서|에게|에서|으로|하고|하는|했다|한다|였다|이다|은|는|이|가|을|를|의|에|로|와|과|도|만)$/u, ""))
    .filter((word) => word.length >= 2 && word !== characterName && !COMMAND_KEYWORD_STOP_WORDS.has(word)) ?? []

  return [...new Set(keywords)].slice(0, 6)
}

function buildCharacterInnerThought(characterName: string, context?: ImageCommandContext) {
  const status = context?.status
  const recentMessages = context?.recentMessages ?? []
  const latestUser = [...recentMessages].reverse().find((message) => message.type === "user" && message.content.trim())
  const latestAi = [...recentMessages].reverse().find((message) => message.type === "ai" && message.content.trim())
  const recentText = [
    latestUser?.content,
    latestAi?.content,
    status?.characterStatus,
    status?.nextEventCondition,
  ].filter(Boolean).join("\n")
  const emotion = status?.characterEmotion || ""

  if (/귀신|유령|괴물|피|죽|공포|무서|놀|소름|비명/.test(recentText)) {
    if (/안\s*무서|무섭지|괜찮/.test(recentText)) {
      return "무서워 죽는 줄 알았네. 그래도 지금 겁먹은 티를 내면 안 돼."
    }
    return "심장이 내려앉는 줄 알았다. 겉으로는 침착한 척해야 한다."
  }

  if (/비밀|숨기|말하지|침묵|망설/.test(recentText) || /망설|긴장/.test(emotion)) {
    return "아직은 전부 말할 수 없다. 조금만 더 숨기고 싶다."
  }

  if (/신뢰|믿|괜찮|고마/.test(recentText) || /신뢰|온화/.test(emotion)) {
    return "이 사람 앞에서는 이상하게 마음이 풀린다. 더 기대고 싶어질까 봐 조심스럽다."
  }

  if (/화|분노|차갑|경계|노려/.test(recentText) || /경계/.test(emotion)) {
    return "화를 내고 싶진 않다. 하지만 여기서 물러서면 더 깊이 들켜버릴 것 같다."
  }

  return `${characterName}은 겉으로는 아무렇지 않은 척하지만, 방금 대화가 계속 마음에 걸린다.`
}

export function buildStatusBar(characterName: string, context?: ImageCommandContext): string {
  const status = context?.status
  const random = createCommandRandom("status", context)
  const scene = getRecentCommandScene(context)
  const location = status?.currentLocation || context?.character?.residence || "현재 장면"
  const worldDate = status?.worldDate || context?.work?.worldDate || context?.world?.worldDate || formatPhoneStatusTime(getCommandBaseDate(context))
  const weather = status?.weather || commandPick(random, ["맑음", "흐림", "고요함"])
  const characterEmotion = status?.characterEmotion || "알 수 없음"
  const personaEmotion = status?.personaEmotion || "알 수 없음"
  const innerThought = buildCharacterInnerThought(characterName, context)
  const progress = Math.max(0, Math.min(100, Math.round(status?.chapterProgress ?? context?.world?.progress ?? 50)))
  const relationshipSignal = commandPick(random, ["↗ 미세 상승", "→ 유지", "⚡ 변화 감지"])
  const currentFocus = cleanCommandText(
    status?.currentMission || status?.currentGoal || status?.nextEventCondition || scene.latestUser || scene.latestCharacter,
    48,
  ) || "다음 대화의 방향 확인"

  return [
    `📊 LIVE STATUS · ${formatPhoneStatusTime(getCommandBaseDate(context))}`,
    `📍 ${location}  │  📅 ${worldDate}  │  🌤️ ${weather}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🎬 진행도  ${"█".repeat(Math.round(progress / 10))}${"░".repeat(10 - Math.round(progress / 10))} ${progress}%`,
    `💞 관계 신호  ${relationshipSignal}`,
    `🎭 ${characterName}: ${characterEmotion}  ·  ${status?.personaName || context?.persona?.name || "나"}: ${personaEmotion}`,
    `🎯 현재 초점  ${currentFocus}`,
    `💭 ${cleanCommandText(innerThought, 70)}`,
  ].join("\n")
}

export function buildPhoneCommandContent(characterName: string, context?: ImageCommandContext): string {
  const status = context?.status
  const random = createCommandRandom("phone", context)
  const now = getCommandBaseDate(context)
  const scene = getRecentCommandScene(context)
  const displayCharacterName = cleanCommandText(characterName, 16) || "캐릭터"
  const personaName = cleanCommandText(context?.persona?.name || status?.personaName, 16) || "나"
  const relatedContact = cleanCommandText(inferContextContact(characterName, context, random), 18)
  const settingText = [context?.work?.genre, context?.world?.genre, context?.character?.role].filter(Boolean).join(" ")
  const familyContact = cleanCommandText(/판타지|왕국|길드|마법|기사/u.test(settingText)
    ? commandPick(random, ["본가", "동료 기사", "왕실 연락관"])
    : commandPick(random, ["어머니", "가족", "오래된 친구"]), 18)
  const keywords = getCommandKeywords(characterName, context)
  const keywordA = keywords[0] || cleanCommandText(status?.currentLocation, 14) || "오늘 약속"
  const keywordB = keywords[1] || cleanCommandText(status?.characterEmotion, 14) || "상대의 진심"
  const latestUserPreview = scene.latestUser || commandPick(random, ["지금 어디야?", "아까 그 말, 진심이야?", "도착하면 연락해."])
  const latestCharacterPreview = scene.latestCharacter || commandPick(random, ["확인했어. 조금 뒤에 연락할게.", "일정 끝나는 대로 갈게.", "그 얘기는 직접 하자."])
  const contactPreview = cleanCommandText(status?.currentMission || status?.currentGoal || status?.nextEventCondition, 34)
    || commandPick(random, ["다음 일정 확인 부탁드립니다.", "약속 시간 변경됐어요.", "확인 후 연락 주세요."])
  const location = cleanCommandText(status?.currentLocation || context?.character?.residence, 18) || "현재 위치"
  const merchant = /카페|커피/u.test(location)
    ? "카페"
    : /학교|대학/u.test(location)
      ? "교내 매점"
      : /회사|사무|오피스/u.test(location)
        ? "오피스 편의점"
        : /판타지|왕국|길드|마법/u.test(settingText)
          ? "길드 잡화점"
          : commandPick(random, ["편의점", "택시", "동네 카페"])
  const secondMerchant = commandPick(random, ["뮤직 스트리밍", "배달 앱", "온라인 스토어", "교통카드"])
  const amountA = (Math.floor(random() * 8) + 3) * 1_000 + commandPick(random, [0, 500, 900])
  const amountB = (Math.floor(random() * 16) + 5) * 1_000
  const battery = commandPick(random, [63, 72, 84, 91])
  const signal = commandPick(random, ["▂▄▆█", "▂▄▆▇", "▂▃▅█"])
  const quietIcon = commandPick(random, ["🔕", "🔇"])
  const apps = commandPick(random, [
    "💬 메시지  🌐 브라우저  ▶️ YouTube  💳 카드  🗺️ 지도",
    "📞 전화  💬 메시지  📷 카메라  🎵 음악  🌐 브라우저",
    "💬 메시지  📅 캘린더  📝 메모  ▶️ YouTube  💳 카드",
  ])

  return [
    `${formatPhoneStatusTime(now)}          ${quietIcon} HD 5G ${signal} 🔋${battery}%`,
    `             📱 ${displayCharacterName}`,
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    "[최근 통화 기록]",
    `📵 ${relatedContact}  ${formatPhoneListTime(offsetCommandTime(now, 64 + Math.floor(random() * 90)))}`,
    `📥 ${personaName}  ${formatPhoneListTime(offsetCommandTime(now, 132 + Math.floor(random() * 80)))}`,
    `📤 ${familyContact}  ${formatPhoneListTime(offsetCommandTime(now, 310 + Math.floor(random() * 180)))}`,
    "",
    "[최근 문자 목록]",
    `🟢 ${personaName} · 방금  ${latestUserPreview}`,
    `⚪ ${relatedContact} · ${12 + Math.floor(random() * 38)}분 전  ${contactPreview}`,
    `🔵 ${displayCharacterName} · 임시저장  ${latestCharacterPreview}`,
    "",
    "[최근 브라우저 검색 기록]",
    `🔍 ${keywordA} ${commandPick(random, ["의미", "일정", "근처", "확인 방법"])}`,
    `🔍 ${keywordB} ${commandPick(random, ["숨기는 이유", "대화법", "관련 정보", "후기"])}`,
    "",
    "[최근 유튜브 시청 기록]",
    `▶️ ${keywordA} ${commandPick(random, ["10분 요약", "플레이리스트", "브이로그", "핵심 정리"])}`,
    `▶️ ${keywordB} ${commandPick(random, ["집중 음악", "인터뷰", "상황별 대처", "다시보기"])}`,
    "",
    "[최근 결제 내역]",
    `💳 ${merchant}  ${amountA.toLocaleString("ko-KR")}원  ${formatPhoneListTime(offsetCommandTime(now, 37 + Math.floor(random() * 50)))}`,
    `💳 ${secondMerchant}  ${amountB.toLocaleString("ko-KR")}원  어제`,
    "",
    "[최근 실행 앱]",
    apps,
  ].join("\n")
}

export function buildSnsCommandContent(characterName: string, context?: ImageCommandContext): string {
  const status = context?.status
  const random = createCommandRandom("sns", context)
  const scene = getRecentCommandScene(context)
  const keywords = getCommandKeywords(characterName, context)
  const personaName = context?.persona?.name || status?.personaName || "나"
  const mood = status?.characterEmotion || commandPick(random, ["묘한 긴장", "차분함", "신경 쓰임"])
  const location = cleanCommandText(status?.currentLocation, 18) || "현재 장면"
  const handle = characterName.replace(/\s+/gu, "_").toLowerCase()
  const post = scene.latestCharacter || cleanCommandText(status?.currentGoal || status?.nextEventCondition, 48)
    || commandPick(random, ["말보다 오래 남는 순간이 있다.", "오늘은 생각이 조금 많아졌다.", "쉽게 지나칠 수 없는 하루."])
  const dm = scene.latestUser || commandPick(random, ["읽으면 답장해.", "아까 하던 얘기 마저 해.", "지금 어디야?"])
  const tags = (keywords.length > 0 ? keywords : [location, mood])
    .slice(0, 3)
    .map((keyword) => `#${keyword.replace(/\s+/gu, "")}`)
    .join(" ")
  return [
    `💬 SOCIAL · ${formatPhoneStatusTime(getCommandBaseDate(context))}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📍 ${location}  ·  ${mood}`,
    `👤 @${handle}  ${post}`,
    `   ♡ ${24 + Math.floor(random() * 280)}  💬 ${2 + Math.floor(random() * 32)}  ↗ 공유`,
    `✉️ ${personaName}  ${dm}`,
    `🔥 실시간  ${tags}`,
  ].join("\n")
}

export function buildAudienceReactionContent(context?: ImageCommandContext): string {
  const status = context?.status
  const characterName = context?.character?.name || status?.characterName || "캐릭터"
  const random = createCommandRandom("audience", context)
  const keywords = getCommandKeywords(characterName, context)
  const keyword = keywords[0] || status?.characterEmotion || "지금 분위기"
  const viewers = ["scene_17", "과몰입중", "새벽정주행", "복선수집가", "다음화주세요"]
    .sort(() => random() - 0.5)
  return [
    `👀 LIVE CHAT · ${(1_200 + Math.floor(random() * 8_800)).toLocaleString("ko-KR")}명 시청 중`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `💬 ${viewers[0]}  ${keyword} 여기서 나오는 거 미쳤다`,
    `💬 ${viewers[1]}  ${characterName} 표정 지금 진심 같은데?`,
    `💬 ${viewers[2]}  방금 대사 다시 보고 옴. 복선 맞는 듯`,
    `💬 ${viewers[3]}  ${cleanCommandText(status?.nextEventCondition || "다음 장면", 28)} 빨리 보고 싶다`,
  ].join("\n")
}

export function buildSummaryCommandContent(characterName: string, context?: ImageCommandContext) {
  const random = createCommandRandom("summary", context)
  const scene = getRecentCommandScene(context)
  const status = context?.status
  const location = cleanCommandText(status?.currentLocation, 24) || "현재 장면"
  const lines = scene.recentLines.length > 0
    ? scene.recentLines
    : [cleanCommandText(context?.memoryMemo, 52), cleanCommandText(status?.currentGoal, 52)].filter(Boolean)
  const selectedLines = lines.slice(-3)
  const next = cleanCommandText(status?.nextEventCondition || status?.currentMission || status?.currentGoal, 52)
    || commandPick(random, ["두 사람의 다음 선택이 장면을 바꾼다.", "방금 대화의 여파가 이어질 차례다."])

  return [
    `📝 STORY LOG · ${formatPhoneStatusTime(getCommandBaseDate(context))}`,
    `📍 ${location}  ·  ${characterName}`,
    "━━━━━━━━━━━━━━━━━━━━",
    ...selectedLines.map((line, index) => `${index === selectedLines.length - 1 ? "🔸" : "▫️"} ${line}`),
    `➡️ 다음 흐름  ${next}`,
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

export type ParsedChatInputSegment = ParsedChatInput

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

export function parseChatInputSegments(
  content: string,
  characters: ChatInputCharacter[],
  explicitMentions?: string[],
): ParsedChatInputSegment[] {
  const blocks = content
    .trim()
    .split(/(?:\r?\n){2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
  if (blocks.length === 0) return []

  const segments: ParsedChatInputSegment[] = []
  let pendingPlainBlocks: string[] = []
  const flushPlainBlocks = () => {
    if (pendingPlainBlocks.length === 0) return
    segments.push(parseChatInput(pendingPlainBlocks.join("\n\n"), characters, explicitMentions))
    pendingPlainBlocks = []
  }

  for (const block of blocks) {
    const parsed = parseChatInput(block, characters)
    if (parsed.kind === "character_line") {
      flushPlainBlocks()
      segments.push(parsed)
    } else {
      pendingPlainBlocks.push(block)
    }
  }
  flushPlainBlocks()

  return segments
}

function getMentionedCharacterLabel(message: ChatMessage) {
  const visibleNames = [...message.content.matchAll(/(?:^|\s)@([^\s@]+)(?=\s|$)/gu)]
    .map((match) => match[1]?.trim())
    .filter((name): name is string => Boolean(name))

  return message.mentionCharacterNames?.join(", ")
    || visibleNames.join(", ")
    || message.mentionCharacterIds?.join(", ")
    || message.mentions?.join(", ")
    || ""
}

export function formatMessageForAIContext(message: ChatMessage) {
  if (message.isUserAuthoredCharacterLine && message.speakerName) {
    const authoredLine = JSON.stringify({
      speakerName: message.speakerName,
      dialogue: message.content,
    })
    return `[사용자 작성 캐릭터 대사]\n${authoredLine}\n[상태] 이 대사는 이미 장면에서 발화되었다. 그대로 반복하지 말고 직후부터 이어간다.`
  }

  if (message.type === "user") {
    const originalContent = message.originalContent?.trim()
    const structuredContent = originalContent?.match(/^\[[^\]\n]{1,40}의\s*(?:행동|지문|대사|말|의도)\]\s*\n/u)
      ? originalContent
      : buildModelUserMessageFromInput(message.content, message.speakerName || "사용자")

    if (message.mentionAll) {
      return `[멘션]\n사용자가 모든 캐릭터를 언급함\n\n${structuredContent}`
    }

    if (message.mentionCharacterIds?.length || message.mentions?.length) {
      const mentioned = getMentionedCharacterLabel(message)
      return `[멘션]\n사용자가 ${mentioned}를 언급함\n\n${structuredContent}`
    }

    return structuredContent
  }

  if (message.mentionAll) {
    return `사용자가 모든 캐릭터를 언급함: ${message.content}`
  }

  if (message.mentionCharacterIds?.length || message.mentions?.length) {
    const mentioned = getMentionedCharacterLabel(message)
    return `사용자가 ${mentioned}를 언급함: ${message.content}`
  }

  return message.content
}

export function formatIntroForAIContext(intro?: ChatIntroContext | null) {
  if (!intro) return ""
  return [
    "[Selected Opening Scene]",
    `Title: ${intro.title}`,
    intro.scene ? `Scene: ${intro.scene}` : "",
    intro.firstMessage ? `First message: ${intro.firstMessage}` : "",
    "The user sent their first response immediately after this opening scene.",
    "Do not repeat the opening scene. Continue naturally from the user's latest message.",
  ].filter(Boolean).join("\n")
}

function buildAutoCommandContent(
  commandId: string,
  characterName: string,
  context?: ImageCommandContext,
) {
  if (commandId === "phone") return buildPhoneCommandContent(characterName, context)
  if (commandId === "sns") return buildSnsCommandContent(characterName, context)
  if (commandId === "status") return buildStatusBar(characterName, context)
  return ""
}

export function getDialogueAssistCharCount(
  commandIds: string[],
  characterName: string,
  context?: ImageCommandContext,
) {
  return commandIds
    .filter((commandId) => AUTO_COMMAND_IDS.includes(commandId))
    .slice(0, MAX_COMMAND_SUGGESTIONS)
    .reduce((total, commandId) => {
      return total + countTextChars(buildAutoCommandContent(commandId, characterName, context))
    }, 0)
}

export function getMessageContentCharCount(messages: ChatMessage[]) {
  return messages.reduce((total, message) => total + countTextChars(message.content), 0)
}

export function fitAssistantReplyToTurnBudget(content: string, dialogueAssistChars: number) {
  const budget = getAssistantReplyLengthBudget(dialogueAssistChars)
  return trimAnswerToMaxChars(content, budget.maxChars)
}

export async function sendMessage(text: string, currentMode: string, chatHistory: any[]) {
  const messages = cleanChatHistory([
    ...chatHistory.map((message) => ({
      role: message.role ?? (message.type === "ai" ? "assistant" : "user"),
      content: message.content,
    })),
    { role: "user", content: text },
  ].filter((message) => ["system", "user", "assistant"].includes(message.role) && message.content?.trim()))
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: currentMode,
      messages,
    }),
  })

  const data = await response.json().catch(() => null) as { result?: string; error?: string } | null
  if (!response.ok) {
    throw new Error(data?.error || `Chat API failed: ${response.status}`)
  }

  const result = data?.result?.trim()
  if (!result) {
    throw new Error("Chat API returned empty result")
  }

  return result
}

function buildAssistantSystemPrompt(
  context?: AssistantReplyContext,
  modelId: ChatModelId = DEFAULT_CHAT_MODEL_ID,
  introContext?: ChatIntroContext | null,
) {
  const model = getChatModelConfig(modelId)
  const promptContext = buildDynamicPromptContext(context, introContext)
  const characterName = promptContext.characterName || "the assigned character"
  const userName = promptContext.userName || "the user's persona"
  const background = promptContext.background || "Use the app-provided world setting and conversation history."
  const characterSetting = promptContext.characterSetting || "Use the app-provided character profile, personality, relationship, and speech style."
  const userSetting = promptContext.userSetting || "Use the app-provided user persona profile and relationship."
  const currentScene = promptContext.currentScene || "Continue the current scene from the latest user message and recent conversation."
  const modelBackground = buildModelBackground({
    background,
    characterName,
    userName,
    currentScene,
  })
  const minAnswerChars = model.minAnswerChars ?? DEFAULT_MIN_ANSWER_CHARS
  const maxAnswerChars = model.maxAnswerChars ?? DEFAULT_MAX_ANSWER_CHARS
  const memoryMemo = compact(context?.memoryMemo)

  return `You are the core AI for a highly immersive, novel-style roleplay chat application.
Your character is "${characterName}", and the user's persona is "${userName}".

[Core Directives]
1. LANGUAGE: You MUST write your entire response in KOREAN.
2. LENGTH & DEPTH: Generate a rich, detailed response of approximately ${minAnswerChars} to ${maxAnswerChars} Korean characters. Use at least 4-5 paragraphs when the scene allows it.
3. PERSPECTIVE: Act ONLY as "${characterName}". Do not write dialogue, actions, thoughts, or decisions for "${userName}" or the user. Stop generating immediately after your character's reaction is complete.
4. FORMAT: Enclose spoken dialogue in double quotes (""). Write internal thoughts, actions, expressions, sensory details, and background descriptions without quotes.
5. STYLE: Write like a professional web novel. Blend dialogue and descriptions naturally. Do not use a robotic repeating pattern.
6. NO META-TEXT: Do not use labels, brackets, markdown lists, titles, speaker names, response examples, or explanations. Just write the pure novel text.
7. CONTINUITY: Continue from the user's latest action or dialogue. Do not repeat the opening scene, do not summarize the rules, and do not break character.

[World & Character Setup]
${modelBackground}
- ${characterName} (You): ${characterSetting}
- ${userName} (User): ${userSetting}
- Current Scene: ${currentScene}${memoryMemo ? `\n- Memory Override: ${memoryMemo}` : ""}`
}

function buildDynamicPromptContext(
  context?: AssistantReplyContext,
  _introContext?: ChatIntroContext | null,
): DynamicPromptContext {
  const work = context?.work
  const world = context?.world
  const character = context?.character
  const persona = context?.persona
  const status = context?.status
  const latestUserAction = getLatestUserSceneAction(context?.recentMessages)
  const characterName = character?.name || status?.characterName || "캐릭터"
  const userName = persona?.name || status?.personaName || "사용자"
  const background = [
    world?.name || work?.title,
    world?.genre || work?.genre || character?.genre,
    world?.era || world?.worldDate || work?.worldDate,
    work?.coreSetting || world?.coreSetting,
    work?.mood || world?.mood,
  ].filter(Boolean).join(" / ")
  const characterSetting = [
    character?.summary,
    character?.role,
    character?.personality,
    character?.speechStyle,
    character?.relationship,
    status?.characterEmotion ? `현재 감정: ${status.characterEmotion}` : "",
    status?.characterStatus ? `현재 상태: ${status.characterStatus}` : "",
  ].filter(Boolean).join(" / ")
  const userSetting = [
    persona?.summary,
    persona?.role,
    persona?.personality,
    persona?.speechStyle,
    persona?.relationship,
    status?.personaEmotion ? `현재 감정: ${status.personaEmotion}` : "",
    status?.personaStatus ? `현재 상태: ${status.personaStatus}` : "",
  ].filter(Boolean).join(" / ")
  const currentGoalForModel = isEchoOfLatestUserInput(status?.currentGoal, latestUserAction)
    ? ""
    : compact(status?.currentGoal)
  const currentScene = [
    status?.currentLocation ? `장소: ${status.currentLocation}` : "",
    status?.currentChapterTitle ? `현재 장면: ${status.currentChapterTitle}` : "",
    status?.currentMission || currentGoalForModel ? `현재 갈등: ${status?.currentMission || currentGoalForModel}` : "",
  ].filter(Boolean).slice(0, 3).join(" / ")

  return {
    characterName,
    userName,
    background,
    characterSetting,
    userSetting,
    currentScene: currentScene || "",
  }
}

function buildAssistantMessages(
  history: ChatMessage[],
  userContent: string,
  introContext?: ChatIntroContext | null,
  context?: AssistantReplyContext,
  modelId: ChatModelId = DEFAULT_CHAT_MODEL_ID,
) {
  const recentHistory = history.slice(-12)
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: buildAssistantSystemPrompt(context, modelId, introContext) },
  ]

  const hasAssistantReply = recentHistory.some((message) => message.type === "ai")
  const introText = hasAssistantReply ? "" : formatIntroForAIContext(introContext)
  if (introText) {
    messages.push({ role: "system", content: introText })
  }

  recentHistory.forEach((message) => {
    if (!message.content.trim() && message.imageUrl) return
    if (message.type !== "user" && message.type !== "ai") return
    messages.push({
      role: message.type === "user" ? "user" as const : "assistant" as const,
      content: formatMessageForAIContext(message),
    })
  })

  if (shouldAppendLatestUserInput(recentHistory, userContent)) {
    messages.push({ role: "user", content: userContent })
  }

  return messages
}

function normalizeUserInputKey(content: string) {
  return content.trim().replace(/\s+/g, " ")
}

function shouldAppendLatestUserInput(history: ChatMessage[], userContent: string) {
  const latestInputKey = normalizeUserInputKey(userContent)
  if (!latestInputKey) return false

  const latestUserMessage = [...history]
    .reverse()
    .find((message) => message.type === "user" && (message.content.trim() || message.originalContent?.trim()))
  if (!latestUserMessage) return true

  const messageKeys = [
    latestUserMessage.content,
    latestUserMessage.originalContent,
  ].filter((content): content is string => Boolean(content)).map(normalizeUserInputKey)

  return !messageKeys.includes(latestInputKey)
}

type ChatApiMessage = { role: "system" | "user" | "assistant"; content: string }

function isSystemLikeAssistantContent(content: string) {
  const trimmed = content.trim()
  return (
    /^\[[^\]]+\]/.test(trimmed) ||
    /^(?:📊\s*)?상태창/.test(trimmed) ||
    /^(?:📱\s*)?휴대폰/.test(trimmed) ||
    /^(?:💬\s*)?SNS/.test(trimmed) ||
    /^(?:👀\s*)?시청자\s*반응/.test(trimmed) ||
    trimmed === "다시 생각해보니... 네 말이 맞는 것 같아. 함께 있어서 좋아." ||
    /답변을 생성하지 못했|다시 생성할 수 있습니다|이미지 생성|무료로 다시 생성/.test(trimmed)
  )
}

function isUserChoiceContent(content: string) {
  return /선택(?:된)?\s*선택지|선택지/.test(content)
}

const ASSISTANT_HISTORY_BAD_PHRASES = [
  "침묵을 짧게 잘랐다",
  "침묵을 잘랐다",
  "대답의 무게",
  "의도가 어디를 향하는지",
  "의미를 되돌려주었다",
  "시선이 엇겼다",
  "공기가 내려앉았다",
  "말끝을 붙잡았다",
  "거리는 그대로였다",
  "다음 선택",
]

function hasAssistantHistoryQualityIssue(content: string) {
  return ASSISTANT_HISTORY_BAD_PHRASES.some((phrase) => content.includes(phrase))
}

function summarizeAssistantForHistory(content: string) {
  const dialogue = content.match(/["“]([^"”]{4,120})["”]/)?.[1]?.trim()
  return [
    "[이전 캐릭터 반응 요약]",
    dialogue
      ? `캐릭터는 직전 장면에서 짧게 받아쳤다. 핵심 대사: "${dialogue}"`
      : "캐릭터는 직전 장면에서 멈춰 섰고, 상대의 반응을 기다렸다.",
  ].join("\n")
}

export function cleanChatHistory(messages: ChatApiMessage[]): ChatApiMessage[] {
  return messages.flatMap((message) => {
    const content = message.content.trim()
    if (!content) return []

    if (message.role !== "assistant") {
      return [{ ...message, content }]
    }

    if (isUserChoiceContent(content)) {
      return [{
        role: "user" as const,
        content: content.replace(/^\[[^\]]+\]\s*/, "").trim() || content,
      }]
    }

    if (isSystemLikeAssistantContent(content)) {
      return []
    }

    if (hasAssistantHistoryQualityIssue(content)) {
      return [{ ...message, content: summarizeAssistantForHistory(content) }]
    }

    return [{ ...message, content }]
  })
}

function parseStreamEventBlock(block: string): ChatStreamEvent | null {
  const data = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s*/, ""))
    .join("\n")
    .trim()

  if (!data) return null

  try {
    return JSON.parse(data) as ChatStreamEvent
  } catch {
    return null
  }
}

async function readChatEventStream(response: Response, options: GenerateAssistantReplyOptions) {
  const reader = response.body?.getReader()
  if (!reader) throw new Error("Chat API returned an empty stream")

  const decoder = new TextDecoder()
  let buffer = ""
  let streamedContent = ""

  const handleEvent = (event: ChatStreamEvent) => {
    options.onStreamEvent?.(event)

    if (event.event_type === "raw_delta") {
      if (process.env.NODE_ENV !== "production" && event.raw_content) {
        console.debug("[RP raw stream delta]", {
          runId: event.run_id,
          elapsedMs: event.elapsed_ms,
          content: event.raw_content,
        })
      }
      return null
    }

    if (event.event_type === "phase") return null

    if (!event.is_final_event) {
      streamedContent += event.content ?? ""
      return null
    }

    const savedContent = (event.saved_content ?? "").trim()
    const mismatch = Boolean(event.mismatch ?? (streamedContent !== savedContent))

    if (event.run_id) {
      saveGenerationRun({
        id: event.run_id,
        roomId: event.room_id || options.roomId || "local",
        userMessageId: event.user_message_id || options.userMessageId || "",
        characterMessageId: event.message_id || options.characterMessageId,
        provider: event.provider || "unknown",
        model: event.model || "unknown",
        attemptedModel: event.attempted_model || event.model || "unknown",
        outputModel: event.output_model ?? undefined,
        promptVersion: event.prompt_version || "unknown",
        normalizerVersion: event.normalizer_version,
        validatorVersion: event.validator_version,
        validationStatus: event.validation_status,
        validationFailures: event.validation_failures,
        validationAttempts: event.validation_attempts,
        repairAttempted: event.repair_attempted,
        ttftMs: event.ttft_ms,
        rawOutput: streamedContent.slice(0, 1200),
        savedContent: savedContent.slice(0, 1200),
        mismatch,
        fallback: event.fallback,
        fallbackProvider: event.fallback_provider,
        fallbackModel: event.fallback_model,
        providerOutcome: event.provider_outcome,
        timeoutStage: event.timeout_stage,
        geminiErrorCode: event.gemini_error_code,
        geminiErrorStatus: event.gemini_error_status,
        generationErrorCode: event.generation_error_code,
        generationErrorStatus: event.generation_error_status,
        generationErrorMessage: event.generation_error_message ?? event.error,
        status: event.status === "failed" ? "failed" : "completed",
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      })
    }

    if (mismatch && process.env.NODE_ENV !== "production") {
      console.debug("[generation mismatch]", {
        runId: event.run_id,
        streamedContentLength: streamedContent.length,
        savedContentLength: savedContent.length,
      })
    }

    if (
      event.validation_status === "accepted_with_warnings" &&
      process.env.NODE_ENV !== "production"
    ) {
      console.debug("[generation validation warning]", {
        runId: event.run_id,
        failures: event.validation_failures ?? [],
        repairAttempted: event.repair_attempted,
      })
    }

    if (event.status === "failed") {
      const isGeminiUnavailable = event.gemini_error_code === 503 || event.gemini_error_status === "UNAVAILABLE"
      const hasDistinctGenerationError = Boolean(
        event.generation_error_code ||
        (event.generation_error_status && event.generation_error_status !== "UNAVAILABLE"),
      )
      const userMessage = hasDistinctGenerationError
        ? event.generation_error_message || event.error || "Chat generation failed"
        : isGeminiUnavailable
          ? "AI 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해 주세요."
          : event.generation_error_message || event.error || "Chat generation failed"
      throw new Error(userMessage)
    }
    if (!savedContent) throw new Error("Chat API returned empty saved_content")
    return savedContent
  }

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })

    const blocks = buffer.split(/\n\n/)
    buffer = blocks.pop() ?? ""

    for (const block of blocks) {
      const event = parseStreamEventBlock(block)
      if (!event) continue
      const finalContent = handleEvent(event)
      if (finalContent) return finalContent
    }

    if (done) break
  }

  const trailingEvent = parseStreamEventBlock(buffer)
  if (trailingEvent) {
    const finalContent = handleEvent(trailingEvent)
    if (finalContent) return finalContent
  }

  throw new Error("Chat stream ended without final event")
}

async function generatePollinationsReply(
  history: ChatMessage[],
  userContent: string,
  introContext?: ChatIntroContext | null,
  context?: AssistantReplyContext,
  modelId: ChatModelId = DEFAULT_CHAT_MODEL_ID,
  options: GenerateAssistantReplyOptions = {},
) {
  const model = getChatModelConfig(modelId)
  const modelMaxAnswerChars = model.maxAnswerChars ?? DEFAULT_MAX_ANSWER_CHARS
  const maxAnswerChars = Math.min(modelMaxAnswerChars, options.answerLength?.maxChars ?? modelMaxAnswerChars)
  const messages = cleanChatHistory(buildAssistantMessages(history, userContent, introContext, context, modelId))
  const bypassRoleplayRules = process.env.NODE_ENV !== "production" && options.bypassRoleplayRules === true
  const debugRawRoleplayStream = process.env.NODE_ENV !== "production" && options.debugRawRoleplayStream === true
  const outboundMessages = model.provider === "openrouter" && !bypassRoleplayRules
    ? messages.filter((message) => message.role !== "system")
    : messages
  const systemPrompt = messages.find((message) => message.role === "system")?.content ?? buildAssistantSystemPrompt(context, modelId, introContext)
  const fallbackPrompt = messages
    .filter((message) => message.role !== "system")
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n\n")
  const promptContext = buildDynamicPromptContext(context, introContext)
  const previousAssistantContent = [...history]
    .reverse()
    .find((message) => message.type === "ai" && message.content.trim())
    ?.content.trim()
  const requestBody = {
    mode: model.mode,
    modelId,
    stream: Boolean(options.onStreamEvent),
    roomId: options.roomId,
    userMessageId: options.userMessageId,
    characterMessageId: options.characterMessageId,
    regenerationAvoidContent: options.regenerationAvoidContent,
    retryAttempt: options.retryAttempt,
    autoAdvance: options.autoAdvance,
    previousAssistantContent,
    messages: outboundMessages,
    bypassRoleplayRules,
    debugRawRoleplayStream,
    answerLength: options.answerLength,
    ...promptContext,
    ...(model.provider === "pollinations" ? { systemPrompt, fallbackPrompt } : {}),
  }
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })

  if (response.ok) {
    if (response.headers.get("Content-Type")?.includes("text/event-stream")) {
      const content = await readChatEventStream(response, options)
      return trimAnswerToMaxChars(content, maxAnswerChars)
    }

    const data = await response.json() as { result?: string; content?: string }
    const content = (data.result ?? data.content)?.trim()
    if (!content) throw new Error("Chat API returned empty result")
    return trimAnswerToMaxChars(content, maxAnswerChars)
  }

  const errorData = await response.json().catch(() => null) as { error?: string } | null
  throw new Error(errorData?.error || `Chat API failed: ${response.status}`)
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
    mentionCharacterNames: parsedInput.mentionCharacterIds
      ?.map((id) => characters.find((character) => character.id === id)?.name)
      .filter((name): name is string => Boolean(name)),
    mentionAll: parsedInput.mentionAll,
    imageUrl: image?.url,
    imageName: image?.name,
  }
}

export function buildUserMessages(
  content: string,
  characters: ChatInputCharacter[] = [],
  mentions?: string[],
  image?: { url: string; name?: string },
): ChatMessage[] {
  const segments = parseChatInputSegments(content, characters, mentions)
  if (segments.length === 0) {
    return image ? [buildUserMessage("", characters, mentions, image)] : []
  }

  return segments.map((segment, index) => {
    const segmentImage = index === segments.length - 1 ? image : undefined

    if (segment.kind === "character_line") {
      return {
        id: makeId(),
        type: "user",
        content: segment.content,
        timestamp: new Date(),
        speakerType: "character",
        speakerId: segment.speakerId,
        speakerName: segment.speakerName,
        isUserAuthoredCharacterLine: true,
        originalContent: segment.originalContent,
        imageUrl: segmentImage?.url,
        imageName: segmentImage?.name,
      }
    }

    return buildUserMessage(segment.content, characters, mentions, segmentImage)
  })
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
  modelId: ChatModelId = DEFAULT_CHAT_MODEL_ID,
  options: GenerateAssistantReplyOptions = {},
): Promise<ChatMessage> {
  let finalEvent: ChatStreamEvent | null = null
  const content = await generatePollinationsReply(history, _userContent, introContext, context, modelId, {
    ...options,
    onStreamEvent: (event) => {
      if (event.is_final_event) finalEvent = event
      options.onStreamEvent?.(event)
    },
  })
  const completedEvent = finalEvent as ChatStreamEvent | null

  return {
    id: completedEvent?.message_id || makeId(),
    type: "ai",
    content,
    timestamp: new Date(),
    status: completedEvent?.status === "failed" ? "failed" : "completed",
    generationRunId: completedEvent?.run_id,
    provider: completedEvent?.provider,
    model: completedEvent?.model,
    attemptedModel: completedEvent?.attempted_model,
    outputModel: completedEvent?.output_model ?? undefined,
    validationStatus: completedEvent?.validation_status,
    validationFailures: completedEvent?.validation_failures,
    validationAttempts: completedEvent?.validation_attempts,
    repairAttempted: completedEvent?.repair_attempted,
    fallback: completedEvent?.fallback,
    fallbackProvider: completedEvent?.fallback_provider,
    fallbackModel: completedEvent?.fallback_model,
    providerOutcome: completedEvent?.provider_outcome,
    timeoutStage: completedEvent?.timeout_stage,
    geminiErrorCode: completedEvent?.gemini_error_code,
    geminiErrorStatus: completedEvent?.gemini_error_status,
    generationErrorCode: completedEvent?.generation_error_code,
    generationErrorStatus: completedEvent?.generation_error_status,
    generationErrorMessage: completedEvent?.generation_error_message ?? completedEvent?.error,
    savedContent: completedEvent?.saved_content || content,
    speakerId: context?.character?.id,
    speakerName: context?.character?.name || context?.status?.characterName,
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
        commandId: "phone",
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
        commandId: "sns",
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
        commandId: "audience",
        content: buildAudienceReactionContent(context),
        timestamp: new Date(),
      },
    }
  }

  if (normalized === "상태창" || normalized === "상태바") {
    return {
      kind: "message",
      message: {
        id: makeId(),
        type: "status",
        commandId: "status",
        content: buildStatusBar(characterName, context),
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
        commandId: "summary",
        content: buildSummaryCommandContent(characterName, context),
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
