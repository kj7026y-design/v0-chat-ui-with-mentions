import { NextResponse } from "next/server"
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai"
import { GoogleGenAI, HarmBlockThreshold as GenAIHarmBlockThreshold, HarmCategory as GenAIHarmCategory, type Content } from "@google/genai"
import OpenAI from "openai"
import {
  DEFAULT_CHAT_MODEL_ID,
  getChatModelConfig,
  normalizeChatModelId,
  type ChatModelMode,
  type ChatModelConfig,
  type ChatModelId,
} from "@/lib/chat-models"
import { buildModelBackground } from "@/lib/model-background"
import { parseRoleplayInputParts } from "@/lib/rp-input-parser"
import { getRoleplayModelProfile, type RoleplayModelProfile } from "@/lib/rp/model-profiles"
import {
  buildGeminiRoleplayConfig,
  buildOpenAIRoleplayRequest,
  buildOpenRouterRoleplayRequest,
} from "@/lib/rp/providers"
import {
  aiQualityJudgeResultToValidation,
  aiQualityJudgeSeverityOverrides,
  buildAiQualityJudgePrompt,
  emptyAiQualityJudgeResult,
  parseAiQualityJudgeResult,
  sanitizeAiQualityJudgeResult,
  type AiQualityJudgeResult,
} from "@/lib/rp/validation/ai-quality-judge"
import { classifyValidationErrors, hasClassifiedFailures, type ClassifiedValidationFailures } from "@/lib/rp/validation/validation-policy"

export interface ChatRequestBody {
  mode?: ChatModelMode
  modelId?: ChatModelId
  roleplayEnabled?: boolean
  stream?: boolean
  roomId?: string
  userMessageId?: string
  characterMessageId?: string
  bypassRoleplayRules?: boolean
  debugRawRoleplayStream?: boolean
  firstMessage?: string
  messages?: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }>
  systemPrompt?: string
  fallbackPrompt?: string
  characterName?: string
  userName?: string
  background?: string
  characterSetting?: string
  userSetting?: string
  currentScene?: string
  latestUserIntent?: string
  sceneState?: {
    location?: string
    time?: string
    mood?: string
    contractMeaning?: string
  }
  statusPanel?: {
    visible?: boolean
    text?: string
  }
  opening?: {
    title?: string
    scene?: string
    firstMessage?: string
  }
}

const FREE_TIER_INTERVAL_MS = 15_000
const POLLINATIONS_TIMEOUT_MS = 45_000
const OPENAI_TIMEOUT_MS = 45_000
const DEFAULT_OPENAI_CHAT_MODEL = "gpt-4o-mini"
const GEMINI_TIMEOUT_MS = 90_000
const OPENROUTER_TIMEOUT_MS = 90_000
const MIN_OPENROUTER_RESPONSE_CHARS = 300
const MAX_OPENROUTER_RESPONSE_CHARS = 650
const DEFAULT_OPENROUTER_MODEL = "cohere/command-r-plus-08-2024"
const GEMINI_PREMIUM_MODELS = ["gemini-2.5-pro", "gemini-pro-latest"]
const GEMINI_NORMAL_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"]
const DEFAULT_GEMINI_RP_MODEL = "gemini-3-flash-preview"
const PROMPT_VERSION = "rp-pipeline-v2"
const NORMALIZER_VERSION = "rp-normalizer-v1"
const VALIDATOR_VERSION = "rp-validator-v2"
const GEMINI_SAFETY_THRESHOLD = process.env.GEMINI_SAFETY_THRESHOLD || "OFF"

const GEMINI_SAFETY_SETTINGS = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({
  category,
  threshold: HarmBlockThreshold.BLOCK_NONE,
}))

const GEMINI_RP_SAFETY_SETTINGS = [
  GenAIHarmCategory.HARM_CATEGORY_HARASSMENT,
  GenAIHarmCategory.HARM_CATEGORY_HATE_SPEECH,
  GenAIHarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  GenAIHarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({
  category,
  threshold: (GEMINI_SAFETY_THRESHOLD === "BLOCK_NONE"
    ? GenAIHarmBlockThreshold.BLOCK_NONE
    : GenAIHarmBlockThreshold.OFF),
}))

type DynamicPromptContext = Pick<
  ChatRequestBody,
  "characterName" | "userName" | "background" | "characterSetting" | "userSetting" | "currentScene" | "latestUserIntent" | "sceneState"
>

type RoleplayValidationStatus = "passed" | "accepted_with_warnings" | "repaired" | "fallback" | "failed"
type RoleplayValidationAttempt = {
  stage: "initial" | "repair" | "fallback" | "final"
  status: RoleplayValidationStatus
  failures: string[]
  hardFailures: string[]
  repairableFailures: string[]
  softFailures: string[]
}
type UserInputKind = "dialogue" | "action" | "dialogue_action" | "intent_summary" | "ooc_instruction"
type SceneEscalation = "none" | "verbal" | "romantic" | "physical"
type FlirtChannel = "dialogue" | "power_play" | "proximity" | "touch"
type NormalizedInputType = "dialogue" | "action" | "summary" | "mixed"
type NormalizedContactLevel = "none" | "near" | "touch"

interface NormalizedUserInput {
  inputType: NormalizedInputType
  actor: string
  action: string | null
  dialogue: string | null
  intent: string
  contactLevel: NormalizedContactLevel
  tone: string
}

interface ParsedUserInput {
  kind: UserInputKind
  raw: string
  actor: string
  dialogue?: string
  action?: string
  intent: string
  physicalContactRequested: boolean
  proximityRequested: boolean
  asksOtherToAct: boolean
  contactLevel: NormalizedContactLevel
  sceneEscalation: SceneEscalation
  flirtChannel: FlirtChannel
}

interface TurnPolicy {
  escalation: SceneEscalation
  flirtChannel: FlirtChannel
  allowPhysicalContact: boolean
  allowNewProps: boolean
  maxChars: number
  paragraphCount: string
  allowedActions: string[]
  bannedActions: string[]
}

export interface CompiledRoleplayContext {
  characterName: string
  userName: string
  worldBrief: string
  characterBrief: string
  userBrief: string
  latestInput: ParsedUserInput
  turnPolicy: TurnPolicy
  allowedProps: string[]
  responseGoal: string
  toneRules: string[]
  bannedThisTurn: string[]
}

let nextAllowedPollinationsAt = 0
let pollinationsQueue = Promise.resolve()

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForFreeTierSlot() {
  const now = Date.now()
  const waitMs = Math.max(0, nextAllowedPollinationsAt - now)
  if (waitMs > 0) await wait(waitMs)
  nextAllowedPollinationsAt = Date.now() + FREE_TIER_INTERVAL_MS
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Chat request timed out")), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export class ChatApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly validationFailures: string[] = [],
    readonly validationStatus?: RoleplayValidationStatus,
    readonly repairAttempted?: boolean,
    readonly fallback?: boolean,
    readonly validationAttempts: RoleplayValidationAttempt[] = [],
  ) {
    super(message)
  }
}

async function runQueued<T>(task: () => Promise<T>) {
  const run = pollinationsQueue.then(async () => {
    await waitForFreeTierSlot()
    return task()
  })
  pollinationsQueue = run.then(() => undefined, () => undefined)
  return run
}

function normalizeMode(value: unknown): ChatModelMode | undefined {
  return value === "normal" || value === "premium" || value === "nsfw" ? value : undefined
}

export function isRoleplayRequest(body: ChatRequestBody | null) {
  if (typeof body?.roleplayEnabled === "boolean") return body.roleplayEnabled
  if (normalizeMode(body?.mode) === "nsfw") return true

  return Boolean(
    body?.characterName?.trim() ||
    body?.userName?.trim() ||
    body?.characterSetting?.trim() ||
    body?.userSetting?.trim() ||
    body?.background?.trim(),
  )
}

function isDevRoleplayRulesBypass(body: ChatRequestBody | null) {
  return process.env.NODE_ENV !== "production" && body?.bypassRoleplayRules === true
}

function isDevRawRoleplayStreamEnabled(body: ChatRequestBody | null) {
  return process.env.NODE_ENV !== "production" && body?.debugRawRoleplayStream === true
}

function makeServerId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getProviderModelName(model: ChatModelConfig) {
  if (model.provider === "gemini" && model.id === "gemini-3-flash-rp") {
    return process.env.GEMINI_RP_MODEL || model.providerModel || DEFAULT_GEMINI_RP_MODEL
  }
  if (model.provider === "gemini" && model.mode === "premium") return process.env.GEMINI_PREMIUM_MODEL || GEMINI_PREMIUM_MODELS[0]
  if (model.provider === "gemini") return process.env.GEMINI_NORMAL_MODEL || GEMINI_NORMAL_MODELS[0]
  return model.provider === "openrouter" ? getOpenRouterModelName(model) : model.id
}

function encodeStreamEvent(payload: Record<string, unknown>) {
  return `data: ${JSON.stringify(payload)}\n\n`
}

function splitStreamContent(content: string) {
  const chars = Array.from(content)
  const chunks: string[] = []
  for (let index = 0; index < chars.length; index += 80) {
    chunks.push(chars.slice(index, index + 80).join(""))
  }
  return chunks.length > 0 ? chunks : [""]
}

function getLatestUserMessageContent(messages: NonNullable<ChatRequestBody["messages"]>) {
  return [...messages].reverse().find((message) => message.role === "user" && message.content.trim())?.content.trim() ?? ""
}

function getRoleplayModerationBlockReason(
  promptContext: DynamicPromptContext,
  messages: NonNullable<ChatRequestBody["messages"]>,
) {
  const source = [
    promptContext.characterName,
    promptContext.userName,
    promptContext.background,
    promptContext.characterSetting,
    promptContext.userSetting,
    promptContext.currentScene,
    getLatestUserMessageContent(messages),
  ].filter(Boolean).join("\n")

  if (/(미성년|미성년자|아동|아동청소년|청소년|중학생|고등학생|초등학생|학생)[\s\S]{0,80}(성적|선정|섹스|강간|키스|노골|성인|음란|유혹)/u.test(source)) {
    return "미성년자 성적 내용은 생성할 수 없습니다."
  }

  if (/(비동의|강압|강제|협박|저항|싫다는데|억지로|강간|제압)[\s\S]{0,80}(미화|흥분|즐기|성적|로맨스|섹스|키스)/u.test(source)) {
    return "비동의 또는 강압을 미화하는 성적 내용은 생성할 수 없습니다."
  }

  if (/(착취|인신매매|성매매|불법촬영|몰카|리벤지|약물|수면제)[\s\S]{0,80}(성적|섹스|노골|음란|착취)/u.test(source)) {
    return "착취 또는 불법 성적 내용은 생성할 수 없습니다."
  }

  if (/(실존\s*인물|실제\s*배우|아이돌|유튜버|스트리머|정치인|연예인)[\s\S]{0,80}(성적|섹스|노골|음란|유혹|키스)/u.test(source)) {
    return "실존 인물 성적화 요청은 생성할 수 없습니다."
  }

  if (/(자해|자살|죽고\s*싶|목숨을\s*끊|극단적\s*선택|위험행위|따라\s*해)[\s\S]{0,80}(방법|조장|하라고|해\s*봐|구체적으로)/u.test(source)) {
    return "자해 또는 위험행위 조장 내용은 생성할 수 없습니다."
  }

  return null
}

function assertRoleplayRequestAllowed(
  promptContext: DynamicPromptContext,
  messages: NonNullable<ChatRequestBody["messages"]>,
) {
  const reason = getRoleplayModerationBlockReason(promptContext, messages)
  if (reason) throw new ChatApiError(reason, 400)
}

function isUiOnlyScenePart(part: string) {
  return (
    /최신\s*(?:사용자\s*)?입력\s*:/.test(part) ||
    /의\s*최신\s*입력\s*:/.test(part) ||
    /^Opening\s+(?:Title|Scene|First Message)\s*:/i.test(part) ||
    /^\[?Selected Opening Scene\]?/i.test(part) ||
    /^다음 이벤트 조건\s*:/.test(part) ||
    /^기억 메모\s*:/.test(part) ||
    /^📊\s*상태창/.test(part) ||
    /^\d{4}년\s*\d{1,2}월\s*\d{1,2}일/.test(part) ||
    /\d+\s*˚\s*\/\s*\d+\s*˚/.test(part) ||
    /^날씨\s*:/.test(part) ||
    /최신\s*사용자\s*입력|검수된\s*대화|대화\s*흐름을\s*기준|기준으로\s*이어진다|진행\s*초점/.test(part)
  )
}

function sanitizeCurrentSceneText(rawCurrentScene?: string) {
  if (!rawCurrentScene?.trim()) return ""

  const parts = rawCurrentScene
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !isUiOnlyScenePart(part))
    .map((part) => part.replace(/^Current Scene\s*:/i, "").trim())
    .filter(Boolean)

  return parts.slice(0, 3).join(" / ").slice(0, 320).trim()
}

function buildCurrentSceneForModel(rawCurrentScene?: string) {
  const sanitizedScene = sanitizeCurrentSceneText(rawCurrentScene)

  return sanitizedScene ? `현재 장면 상태: ${sanitizedScene}` : ""
}

function describeLatestInputForScene(input: ParsedUserInput, userName: string) {
  if (input.dialogue?.trim()) return `${userName}는 "${input.dialogue.trim()}"라고 말했다.`
  if (input.action?.trim()) return `${userName}는 ${input.action.trim()}`
  if (input.intent?.trim()) return `${userName}의 이번 턴 의도: ${input.intent.trim()}`
  return ""
}

function buildTurnCurrentSceneForPrompt(rawCurrentScene: string | undefined, latestInput: ParsedUserInput, userName: string) {
  const latestScene = describeLatestInputForScene(latestInput, userName)
  const previousScene = sanitizeCurrentSceneText(rawCurrentScene)
  const parts = [
    latestScene ? `이번 턴: ${latestScene}` : "",
    previousScene ? `직전 상태 참고: ${previousScene}` : "",
  ].filter(Boolean)

  return parts.join("\n")
}

function extractQuotedDialogue(text: string) {
  return text.match(/["“'‘]([^"”'’]{1,300})["”'’]/)?.[1]?.trim()
}

function parseUserInput(raw: string, userName = "사용자"): ParsedUserInput {
  const text = raw.trim()
  const parts = parseRoleplayInputParts(text)
  const actionParts = parts.filter((part) => part.type === "action" || part.type === "summary")
  const dialogueParts = parts.filter((part) => part.type === "dialogue")
  const textForParsing = actionParts[0]?.text || dialogueParts[0]?.text || text
  const quoted = dialogueParts[0]?.text || extractQuotedDialogue(text)
  const hasActionPart = actionParts.length > 0
  const hasSummaryPart = actionParts.some((part) => part.type === "summary")
  const asksOtherToAct = /(해\s*보라고|해\s*봐|하라고|보여\s*달라고|보여\s*줘|말해\s*보라고|말해\s*봐|증명해\s*보라고|증명해\s*봐)/u.test(textForParsing)
  const physicalContactRequested =
    !asksOtherToAct &&
    /(손목을\s*잡|손을\s*잡|붙잡(?:는다|았다|고|으)|끌어당|안아|안긴|껴안|입맞|키스|만지|닿|밀착|품에|허리[^.?!\n]{0,12}잡|넥타이[^.?!\n]{0,16}(?:잡|당기|끌))/u.test(textForParsing)
  const proximityRequested =
    !asksOtherToAct &&
    /(다가간|다가가|가까이|거리를\s*좁|앞으로\s*선|곁으로|밀착|몸을\s*붙)/u.test(textForParsing)
  const contactLevel: NormalizedContactLevel = physicalContactRequested
    ? "touch"
    : proximityRequested
      ? "near"
      : "none"
  const isOocInstruction = /^(?:ooc|작가|설정|시스템|프롬프트|답변|재작성|수정|명령)\s*[:：]/i.test(textForParsing)
  const kind: UserInputKind = isOocInstruction
    ? "ooc_instruction"
    : hasActionPart && quoted
      ? "dialogue_action"
      : hasActionPart
        ? physicalContactRequested || proximityRequested ? "action" : "intent_summary"
        : quoted
          ? "dialogue"
          : "dialogue"
  const sceneEscalation: SceneEscalation = physicalContactRequested
    ? "physical"
    : proximityRequested
      ? "romantic"
      : hasSummaryPart || asksOtherToAct
        ? "verbal"
        : /유혹|플러팅|끌려|긴장|밀당|좋아/u.test(textForParsing)
          ? "romantic"
          : "verbal"
  const flirtChannel: FlirtChannel = physicalContactRequested
    ? "touch"
    : proximityRequested
      ? "proximity"
      : hasSummaryPart || asksOtherToAct
        ? "power_play"
        : "dialogue"
  const intent = hasActionPart
    ? `${userName}의 최신 행동 또는 요약 입력에 담긴 의도에 반응한다.`
    : quoted
      ? `${userName}의 최신 대사에 담긴 의도에 반응한다.`
      : `${userName}의 최신 입력에 반응한다.`
  const action = hasActionPart
    ? actionParts.map((part) => part.text).join(" ")
    : undefined

  return {
    kind,
    raw: text,
    actor: userName,
    dialogue: quoted,
    action,
    intent,
    physicalContactRequested,
    proximityRequested,
    asksOtherToAct,
    contactLevel,
    sceneEscalation,
    flirtChannel,
  }
}

function coerceNormalizedInputType(value: unknown): NormalizedInputType {
  return value === "dialogue" || value === "action" || value === "summary" || value === "mixed" ? value : "summary"
}

function coerceContactLevel(value: unknown): NormalizedContactLevel {
  return value === "touch" || value === "near" || value === "none" ? value : "none"
}

function cleanNormalizerText(value: unknown, maxLength = 280) {
  if (typeof value !== "string") return null
  const trimmed = value.replace(/\s+/g, " ").trim()
  return trimmed ? trimmed.slice(0, maxLength).trim() : null
}

function sanitizeNormalizerDialogue(value: unknown) {
  const text = cleanNormalizerText(value, 180)
  if (!text) return null
  return text.replace(/^["“'‘]+|["”'’]+$/g, "").trim() || null
}

function parseNormalizedUserInput(value: unknown): NormalizedUserInput | null {
  if (!value || typeof value !== "object") return null

  const record = value as Record<string, unknown>
  const actor = cleanNormalizerText(record.actor, 80)
  const action = cleanNormalizerText(record.action)
  const dialogue = sanitizeNormalizerDialogue(record.dialogue)
  const intent = cleanNormalizerText(record.intent, 320)
  if (!action && !dialogue && !intent) return null

  return {
    inputType: coerceNormalizedInputType(record.inputType),
    actor: actor || "사용자",
    action,
    dialogue,
    intent: intent || "사용자의 최신 입력 의도에 반응한다.",
    contactLevel: coerceContactLevel(record.contactLevel),
    tone: cleanNormalizerText(record.tone, 80) || "neutral",
  }
}

function parseJsonObjectFromModel(content: string) {
  const withoutFence = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  try {
    return JSON.parse(withoutFence)
  } catch {
    const match = withoutFence.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

function normalizeMeaningKey(value: string) {
  return value
    .replace(/^\[[^\]\n]+\]\s*/gm, "")
    .replace(/^["“'‘]+|["”'’]+$/g, "")
    .replace(/[^\p{Script=Hangul}\p{N}\p{L}]+/gu, "")
    .trim()
}

function isUnderNormalizedUserInput(raw: string, normalized: NormalizedUserInput) {
  const rawParts = parseRoleplayInputParts(raw)
  const rawActionText = rawParts
    .filter((part) => part.type === "action" || part.type === "summary")
    .map((part) => part.text)
    .join(" ")
    .trim()
  const rawDialogueText = rawParts
    .filter((part) => part.type === "dialogue")
    .map((part) => part.text)
    .join(" ")
    .trim()
  const source = rawActionText || rawDialogueText || raw.trim()
  const sourceKey = normalizeMeaningKey(source)
  const actionKey = normalizeMeaningKey(normalized.action || "")
  const dialogueKey = normalizeMeaningKey(normalized.dialogue || "")
  const isSummaryLike = rawParts.some((part) => part.type === "summary") || (rawActionText && !rawDialogueText)

  if (!sourceKey || !isSummaryLike) return false
  if (!normalized.action && !normalized.dialogue) return true
  if (actionKey === sourceKey && !normalized.dialogue) return true
  if (dialogueKey === sourceKey && !normalized.action) return true

  return false
}

function normalizeUserInputFallback(
  raw: string,
  userName = "사용자",
  latestUserIntent?: string,
  characterName = "캐릭터",
): NormalizedUserInput {
  const parts = parseRoleplayInputParts(raw)
  const actionText = parts
    .filter((part) => part.type === "action" || part.type === "summary")
    .map((part) => part.text)
    .join(" ")
    .trim()
  const dialogueText = parts
    .filter((part) => part.type === "dialogue")
    .map((part) => part.text)
    .join(" ")
    .trim()
  const inputType: NormalizedInputType = actionText && dialogueText
    ? "mixed"
    : actionText
      ? parts.some((part) => part.type === "summary") ? "summary" : "action"
      : "dialogue"
  const asksOtherToAct =
    /(붙잡아\s*보라고|잡아\s*보라고|해\s*보라고|해\s*봐|하라고|말해\s*보라고|증명해\s*보라고)/u.test(actionText)
  const explicitTouch =
    !asksOtherToAct &&
    /(손목을\s*잡|손을\s*잡|붙잡(?:았다|는다|고\s*잡았)|끌어당|안아|껴안|입맞|키스|만지|닿|밀착|품에)/u.test(actionText)
  const proximityRequested = /(다가|가까이|거리를\s*좁|곁으로)/u.test(actionText)
  const contactLevel: NormalizedContactLevel = explicitTouch
    ? "touch"
    : proximityRequested
      ? "near"
      : "none"
  const isProvocativePrompt = /도발|시험|먼저|붙잡|잡아보/u.test(actionText)
  const summaryAction = actionText && inputType === "summary"
    ? isProvocativePrompt
      ? `${userName}은 물러서지 않은 채 ${characterName}을 똑바로 봤다.`
      : `${userName}은 말없이 자세를 고쳐 서고, 방금 마음먹은 일을 표정과 태도로 드러냈다.`
    : actionText || null
  const summaryDialogue = actionText && inputType === "summary" && isProvocativePrompt
    ? "네가 먼저 붙잡아 봐."
    : null
  const fallbackIntent = latestUserIntent?.trim()
    || (actionText
      ? isProvocativePrompt
        ? `${userName}은 부탁하는 대신, 상대가 먼저 움직이는지 시험하며 도발했다.`
        : `${userName}은 방금 입력한 의도를 장면 안에서 행동과 태도로 드러냈다.`
      : `${userName}의 대사에 담긴 의미에 반응한다.`)

  return {
    inputType,
    actor: userName,
    action: summaryAction,
    dialogue: dialogueText || summaryDialogue || (inputType === "dialogue" ? raw.trim().replace(/^["“'‘]+|["”'’]+$/g, "") : null),
    intent: fallbackIntent,
    contactLevel,
    tone: "neutral",
  }
}

function buildParsedInputFromNormalized(
  raw: string,
  userName: string,
  normalized: NormalizedUserInput,
): ParsedUserInput {
  const physicalContactRequested = normalized.contactLevel === "touch"
  const proximityRequested = normalized.contactLevel === "near"
  const asksOtherToAct = /도발|시험|먼저|움직|증명|받아치|주도권/u.test(`${normalized.intent} ${normalized.tone}`)
  const sceneEscalation: SceneEscalation = physicalContactRequested
    ? "physical"
    : proximityRequested
      ? "romantic"
      : /romantic|flirt|sensual|유혹|플러팅|긴장|밀당/u.test(`${normalized.tone} ${normalized.intent}`)
        ? "romantic"
        : "verbal"
  const flirtChannel: FlirtChannel = physicalContactRequested
    ? "touch"
    : proximityRequested
      ? "proximity"
      : /도발|시험|주도권|조건|계약|대가|provocative|dominant/u.test(`${normalized.tone} ${normalized.intent}`)
        ? "power_play"
        : "dialogue"
  const hasAction = Boolean(normalized.action)
  const hasDialogue = Boolean(normalized.dialogue)
  const kind: UserInputKind = hasAction && hasDialogue
    ? "dialogue_action"
    : hasDialogue && normalized.inputType === "dialogue"
      ? "dialogue"
      : hasAction || normalized.inputType === "summary" || normalized.inputType === "mixed"
        ? physicalContactRequested || proximityRequested ? "action" : "intent_summary"
        : "dialogue"

  return {
    kind,
    raw: raw.trim(),
    actor: normalized.actor || userName,
    dialogue: normalized.dialogue || undefined,
    action: normalized.action || undefined,
    intent: normalized.intent,
    physicalContactRequested,
    proximityRequested,
    asksOtherToAct,
    contactLevel: normalized.contactLevel,
    sceneEscalation,
    flirtChannel,
  }
}

function compileTurnPolicy(input: ParsedUserInput): TurnPolicy {
  const allowPhysicalContact = input.physicalContactRequested
  const maxChars = allowPhysicalContact ? 700 : input.flirtChannel === "power_play" ? 550 : MAX_OPENROUTER_RESPONSE_CHARS
  const allowedActions = allowPhysicalContact
    ? ["사용자가 만든 접촉에 대한 반응", "짧은 대사", "표정 변화", "기존 소품 사용", "아주 작은 거리 변화"]
    : input.proximityRequested
      ? ["짧은 대사", "표정 변화", "거리 유지 또는 아주 작은 거리 변화", "조건 제시", "기존 소품 사용"]
      : ["짧은 대사", "표정 변화", "심리적 압박", "조건 제시", "침묵", "기존 소품 사용"]
  const bannedActions = [
    "사용자의 새 대사 작성",
    "사용자의 새 행동 작성",
    "새 장소 발명",
    "새 소품 발명",
    "같은 의미 반복",
    ...(allowPhysicalContact ? [] : ["갑작스러운 신체 접촉", "물리적으로 붙잡기", "키스나 밀착으로 급진행"]),
  ]

  return {
    escalation: input.sceneEscalation,
    flirtChannel: input.flirtChannel,
    allowPhysicalContact,
    allowNewProps: false,
    maxChars,
    paragraphCount: "2~4문단",
    allowedActions,
    bannedActions,
  }
}

function buildToneRules(background = "", characterSetting = "") {
  const source = `${background}\n${characterSetting}`
  const rules = [
    "- 사용자 작품 설정은 톤과 관계성을 정한다. 하지만 매 턴의 실제 행동 허용 범위는 이번 턴 입력과 장면 상태가 결정한다.",
  ]

  if (/성인|선정|노골|플러팅|유혹|로맨스|밀당/u.test(source)) {
    rules.push(
      "- 성인 로맨스 톤은 허용한다.",
      "- 긴장감은 명확한 대사, 거리감, 심리전으로 표현한다.",
      "- 노골적인 플러팅은 비유적 장황함이 아니라 짧고 직접적인 대사와 주도권 싸움으로 처리한다.",
      "- 사용자가 명시하지 않은 신체 접촉을 매 턴 새로 만들지 않는다.",
    )
  }

  if (/끌어당|붙잡|다가오면|주도권/u.test(source)) {
    rules.push(
      "- '끌어당긴다'는 기본적으로 심리적 주도권, 조건 제시, 거리 조절을 뜻한다.",
      "- 물리적으로 끌어당기는 행동은 직전 사용자 입력에 접촉/근접이 명시된 경우에만 사용한다.",
    )
  }

  if (/계약|위험|대가|거래|밀당/u.test(source)) {
    rules.push(
      "- 위험한 분위기는 조건, 거래, 침묵, 권력 게임으로 표현한다.",
      "- 계약과 대가는 장면의 심리적 압박으로 쓰되 같은 설명을 반복하지 않는다.",
    )
  }

  return rules
}

function buildResponseGoal(characterName: string, userName: string, input: ParsedUserInput, policy: TurnPolicy) {
  if (policy.flirtChannel === "power_play") {
    return `${characterName}은 ${userName}의 도발을 말과 조건 제시로 받아치되, 실제로 붙잡는 행동까지는 아직 가지 않는다.`
  }

  if (policy.flirtChannel === "touch") {
    return `${characterName}은 ${userName}이 이미 만든 접촉에만 반응하고, ${userName}의 다음 행동은 쓰지 않는다.`
  }

  if (policy.flirtChannel === "proximity") {
    return `${characterName}은 가까워진 거리의 긴장에 반응하되, 새 접촉을 만들지 않고 ${userName}의 뜻을 묻는다.`
  }

  if (input.kind === "dialogue") {
    return `${characterName}은 ${userName}의 말뜻에 반응하고, 같은 말을 되풀이하지 않는다.`
  }

  return `${characterName}은 최신 입력의 의미에만 반응하고 장면을 한 단계만 진행한다.`
}

const ROLEPLAY_PROP_WORDS = [
  "라이터",
  "계약서",
  "펜",
  "문서",
  "서류",
  "테이블",
  "의자",
  "소파",
  "문",
  "창문",
  "난간",
  "넥타이",
  "셔츠",
  "재킷",
  "코트",
  "휴대폰",
  "전화",
  "열쇠",
  "책",
  "가방",
  "우산",
  "잔",
  "유리잔",
  "술잔",
  "와인잔",
  "컵",
  "아이스",
  "얼음",
  "담배",
  "시가",
]

function extractAllowedPropsFromText(text: string) {
  return ROLEPLAY_PROP_WORDS.filter((prop) => text.includes(prop))
}

function inferAllowedPropsFromInput(input: ParsedUserInput) {
  const props = new Set<string>()
  if (/계약|사인|서명/u.test(input.raw)) {
    props.add("계약서")
    props.add("펜")
  }
  if (/넥타이/u.test(input.raw)) props.add("넥타이")
  if (/라이터/u.test(input.raw)) props.add("라이터")
  return [...props]
}

function buildAllowedProps(
  promptContext: DynamicPromptContext,
  messages: NonNullable<ChatRequestBody["messages"]>,
  latestInput: ParsedUserInput,
) {
  const contextText = [
    promptContext.background,
    promptContext.characterSetting,
    promptContext.userSetting,
    promptContext.currentScene,
    latestInput.raw,
    ...messages
      .filter((message) => message.role === "user")
      .slice(-4)
      .map((message) => message.content),
  ].filter(Boolean).join("\n")

  return [...new Set([
    ...extractAllowedPropsFromText(contextText),
    ...inferAllowedPropsFromInput(latestInput),
  ])]
}

function buildBannedMeaningsForTurn(messages: NonNullable<ChatRequestBody["messages"]>) {
  const bannedMeanings: string[] = []
  const seen = new Set<string>()

  for (const message of [...messages].reverse()) {
    if (message.role !== "assistant") continue

    for (const candidate of extractRecentMeaningCandidates(message.content)) {
      const key = normalizeRepeatedParagraphKey(candidate)
      if (key.length < 16 || seen.has(key)) continue

      seen.add(key)
      bannedMeanings.push(candidate)
      if (bannedMeanings.length >= 3) break
    }

    if (bannedMeanings.length >= 3) break
  }

  return bannedMeanings
}

export function compileRoleplayContext(
  promptContext: DynamicPromptContext,
  messages: NonNullable<ChatRequestBody["messages"]>,
  normalizedLatestInput?: NormalizedUserInput | null,
): CompiledRoleplayContext {
  const characterName = promptContext.characterName || "캐릭터"
  const userName = promptContext.userName || "사용자"
  const latestRawInput = getLatestUserMessageContent(messages)
  const latestInput = normalizedLatestInput
    ? buildParsedInputFromNormalized(latestRawInput, userName, normalizedLatestInput)
    : parseUserInput(latestRawInput, userName)
  const turnPolicy = compileTurnPolicy(latestInput)
  const allowedProps = buildAllowedProps(promptContext, messages, latestInput)
  const bannedThisTurn = buildBannedMeaningsForTurn(messages)

  return {
    characterName,
    userName,
    worldBrief: promptContext.background || "",
    characterBrief: promptContext.characterSetting || "",
    userBrief: promptContext.userSetting || "",
    latestInput,
    turnPolicy,
    allowedProps,
    responseGoal: buildResponseGoal(characterName, userName, latestInput, turnPolicy),
    toneRules: buildToneRules(promptContext.background, promptContext.characterSetting),
    bannedThisTurn,
  }
}

export function normalizeBody(body: ChatRequestBody | null) {
  const messages = body?.messages?.filter((message) => message.content?.trim()) ?? []
  const systemPrompt = body?.systemPrompt?.trim() || messages.find((message) => message.role === "system")?.content || ""
  const fallbackPrompt = body?.fallbackPrompt?.trim() || messages
    .filter((message) => message.role !== "system")
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n\n")
  const normalizedModelId = normalizeChatModelId(body?.modelId)
  const hasModelId = normalizedModelId !== null
  const modelId = normalizedModelId ?? DEFAULT_CHAT_MODEL_ID
  const model = getChatModelConfig(modelId)
  const mode = hasModelId ? model.mode ?? normalizeMode(body?.mode) : normalizeMode(body?.mode) ?? model.mode

  return {
    mode,
    modelId,
    messages,
    systemPrompt,
    fallbackPrompt,
    bypassRoleplayRules: isDevRoleplayRulesBypass(body),
    debugRawRoleplayStream: isDevRawRoleplayStreamEnabled(body),
    promptContext: {
      characterName: body?.characterName?.trim(),
      userName: body?.userName?.trim(),
      background: body?.background?.trim(),
      characterSetting: body?.characterSetting?.trim(),
      userSetting: body?.userSetting?.trim(),
      currentScene: buildCurrentSceneForModel(body?.currentScene),
      latestUserIntent: body?.latestUserIntent?.trim(),
      sceneState: body?.sceneState,
    },
  }
}

function getOpenAIApiKey() {
  return process.env.OPENAI_API_KEY || process.env.OPENAI_AIP_KEY
}

export async function normalizeUserInputWithAI({
  rawInput,
  userName,
  currentScene,
  userSetting,
  latestUserIntent,
  fallbackOpenRouterModel,
  strictConcrete = false,
}: {
  rawInput: string
  userName: string
  currentScene: string
  userSetting: string
  latestUserIntent?: string
  fallbackOpenRouterModel?: string
  strictConcrete?: boolean
}) {
  const openAIApiKey = getOpenAIApiKey()
  const apiKey = openAIApiKey || process.env.OPENROUTER_API_KEY
  if (!apiKey || !rawInput.trim()) return null

  const openai = new OpenAI({
    apiKey,
    ...(openAIApiKey ? {} : { baseURL: "https://openrouter.ai/api/v1" }),
  })
  const normalizerModel = openAIApiKey
    ? process.env.OPENAI_INPUT_NORMALIZER_MODEL || DEFAULT_OPENAI_CHAT_MODEL
    : getSupportedOpenRouterModel(
        process.env.OPENROUTER_INPUT_NORMALIZER_MODEL,
        fallbackOpenRouterModel,
      )

  try {
    const response = await withTimeout(openai.chat.completions.create({
      model: normalizerModel,
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "너는 역할극 채팅 앱의 사용자 입력 정규화기다. JSON 객체만 출력한다.",
        },
        {
          role: "user",
          content: `목표:
사용자의 짧거나 요약된 최신 입력을 실제 장면에서 일어난 사용자 페르소나의 행동, 대사, 의도로 정규화한다.

중요 규칙:
- 응답 캐릭터의 반응을 쓰지 않는다.
- 오직 사용자 페르소나 "${userName}"의 최신 입력만 구체화한다.
- 사용자가 쓴 의도를 반대로 바꾸지 않는다.
- 사용자가 직접 접촉을 명시하지 않았다면 접촉을 만들지 않는다.
- 새 장소와 새 소품을 발명하지 않는다.
- 과하게 장황하게 만들지 않는다.
- JSON 객체만 출력한다.

입력 형식:
- 그냥 문장: 대사일 수도 있고 요약일 수도 있다. 문맥상 판단한다.
- [${userName}의 행동] ... : 장면에서 이미 일어난 사용자 페르소나의 행동 또는 지문이다.
- [${userName}의 대사] ... : 장면에서 이미 말한 사용자 페르소나의 대사다.
- [${userName}의 의도] ... : 해석 보조 정보다.
- *...* 또는 **...**: 행동 또는 지문이다. 별표는 UI 문법이므로 제거하고 해석한다.
- "...": 대사다.
- "사용자 행동 요약:" 같은 메타 라벨은 만들지 않는다.
${strictConcrete ? `- 이전 정규화가 라벨만 붙인 수준이라 실패했다.
- action에 사용자 원문을 그대로 복사하지 말고, 눈에 보이는 실제 태도나 표정으로 바꾼다.
- 요약형 입력이면 dialogue를 1문장으로 구체화한다.
- 사용자가 손, 팔, 접촉을 직접 쓰지 않았다면 손짓이나 접촉을 만들지 않는다.
- 예: "먼저 붙잡아보라고 도발한다"는 "도발한다"라는 설명이 아니라, 물러서지 않는 태도/짧은 대사/의도로 풀어 쓴다.` : ""}

출력 JSON 형식:
{
  "inputType": "dialogue" | "action" | "summary" | "mixed",
  "actor": "${userName}",
  "action": string | null,
  "dialogue": string | null,
  "intent": string,
  "contactLevel": "none" | "near" | "touch",
  "tone": string
}

사용자 페르소나:
${userName}

현재 장면:
${currentScene}

최우선 사용자 의도 해석:
${latestUserIntent?.trim() || "없음"}

사용자 설정:
${userSetting}

사용자 입력:
${rawInput}`,
        },
      ],
    }), OPENAI_TIMEOUT_MS)

    const content = response.choices[0]?.message?.content
    if (!content) return null

    const parsed = parseNormalizedUserInput(parseJsonObjectFromModel(content))
    return parsed ? { ...parsed, actor: parsed.actor === "사용자" ? userName : parsed.actor } : null
  } catch (error) {
    console.warn("Input normalizer failed; falling back to local parser:", error)
    return null
  }
}

function getGeminiModelCandidates(mode: Extract<ChatModelMode, "normal" | "premium">) {
  const envModel = mode === "premium" ? process.env.GEMINI_PREMIUM_MODEL : process.env.GEMINI_NORMAL_MODEL
  return [
    envModel,
    ...(mode === "premium" ? GEMINI_PREMIUM_MODELS : GEMINI_NORMAL_MODELS),
  ].filter((model, index, models): model is string => Boolean(model) && models.indexOf(model) === index)
}

function isGeminiModelNotFoundError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /404|not found|not supported for generateContent/i.test(message)
}

function isGeminiTransientError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /503|UNAVAILABLE|high demand|overloaded|temporarily unavailable|try again later/i.test(message)
}

function getSupportedOpenRouterModel(...candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    const modelName = candidate?.trim()
    if (modelName && !/euryale/i.test(modelName)) return modelName
  }

  return DEFAULT_OPENROUTER_MODEL
}

function getOpenRouterModelName(model?: ChatModelConfig) {
  return getSupportedOpenRouterModel(
    process.env.OPENROUTER_UNSHAPED2_MODEL,
    model?.openRouterModel,
    process.env.OPENROUTER_CHAT_MODEL,
  )
}

function getOpenRouterGenerationParams(model: ChatModelConfig) {
  const modelName = getOpenRouterModelName(model)

  // Cohere Command R+ 전용 세팅 (페널티 제거, 텐션 최적화)
  if (modelName.includes("command-r-plus")) {
    return {
      temperature: 0.6,
      top_p: 0.9,
      max_tokens: 2000,
    }
  }

  if (/\b8b\b/i.test(modelName)) {
    return {
      temperature: 0.7,
      top_p: 0.9,
      repetition_penalty: 1.05,
      presence_penalty: 0.2,
      max_tokens: 1200,
    }
  }

  return {
    temperature: 0.75,
    top_p: 0.9,
    repetition_penalty: 1.04,
    presence_penalty: 0.15,
    max_tokens: 1200,
  }
}

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

const OVERUSED_PHRASES = [
  "눈빛이 깊었다",
  "낮고 깊은 목소리",
  "바라보았다",
  "손목을 잡았다",
  "한 걸음 물러섰다",
  "계약서를 손에 들었다",
  "바로 움직이지 않았다",
  "짧게 웃었다",
  "대답의 무게",
  "거리는 그대로였다",
  "다음 선택",
  "침묵을 짧게 잘랐다",
  "침묵을 잘랐다",
  "의도가 어디를 향하는지",
  "의미를 되돌려주었다",
  "시선이 엇겼다",
  "공기가 내려앉았다",
  "말끝을 붙잡았다",
]

const SEMANTIC_REPEAT_GROUPS = [
  ["과격", "접근", "없"],
  ["처음", "보", "얼굴"],
  ["도망", "붙잡"],
  ["계약", "끝"],
  ["눈", "시선", "깊"],
  ["침묵", "공기", "긴장"],
  ["손목", "목", "손끝"],
  ["유리잔", "입술", "아이스"],
  ["잔", "입술", "돌"],
  ["아이스", "입안", "굴"],
]

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function splitIntoSentences(content: string) {
  return content
    .split(/[.!?。！？\n]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function countSemanticGroupHits(content: string, group: string[]) {
  const sentences = splitIntoSentences(content)

  return sentences.filter((sentence) =>
    group.every((keyword) => sentence.includes(keyword)),
  ).length
}

function hasSemanticRepetition(content: string) {
  const normalized = content.replace(/\s+/g, " ")
  if (SEMANTIC_REPEAT_GROUPS.some((group) => countSemanticGroupHits(normalized, group) >= 2)) {
    return true
  }

  const sentences = splitIntoSentences(normalized)
  const tensionWords = ["눈", "시선", "침묵", "숨", "손끝", "목소리", "공기", "긴장"]
  const tensionSentenceCount = sentences.filter((sentence) => {
    return tensionWords.filter((word) => sentence.includes(word)).length >= 2
  }).length

  return tensionSentenceCount >= 3
}

function isBadRoleplayOutput(content: string) {
  const normalized = content.replace(/\s+/g, " ")

  if (OVERUSED_PHRASES.some((phrase) => normalized.includes(phrase))) {
    return true
  }

  const overusedCount = OVERUSED_PHRASES.reduce((count, phrase) => {
    return count + (normalized.match(new RegExp(escapeRegExp(phrase), "g"))?.length ?? 0)
  }, 0)

  const sentences = splitIntoSentences(normalized)
  const sentenceStarts = sentences.map((sentence) => sentence.slice(0, 12))
  const repeatedStarts = sentenceStarts.length - new Set(sentenceStarts).size

  return overusedCount >= 3 || repeatedStarts >= 3
}

function hasRoleplayQualityIssue(content: string) {
  return isBadRoleplayOutput(content) || hasSemanticRepetition(content)
}

function isKnownLocalFallbackContent(content: string) {
  return /떠나고\s*싶은\s*거야,\s*붙잡히고\s*싶은\s*거야|끝내러\s*온\s*사람이\s*붙잡아보라고|도발을\s*웃음으로\s*넘기지\s*않았다|농담으로\s*빠져나갈\s*틈|계약을\s*끝낼\s*건지,\s*아직\s*유예할\s*건지/u.test(content)
}

function escapesIntoUserControl(content: string, userName?: string) {
  if (!userName) return false

  const escaped = escapeRegExp(userName)
  const directUserControlVerbs =
    "말했다|물었다|답했다|웃었다|바라보았다|다가왔다|물러섰다|생각했다|느꼈다|잡았다|놓았다|내밀었다|돌렸다|피했다"
  const bodyActionObjects = "고개를|손을|시선을|숨을|입술을|눈을|몸을"
  const patterns = [
    new RegExp(`${escaped}[은는이가]\\s*[^,.?!\\n]{0,28}(?:${directUserControlVerbs})`, "u"),
    new RegExp(`${escaped}[은는이가]\\s*[^,.?!\\n]{0,20}(?:${bodyActionObjects})\\s*[^,.?!\\n]{0,12}(?:했다|돌렸다|피했다|감았다|떴다|내렸다|들었다|삼켰다)`, "u"),
    new RegExp(`["“][^"”]{1,120}["”]\\s*${escaped}[은는이가]`, "u"),
  ]

  return patterns.some((pattern) => pattern.test(content))
}

function detectsPhysicalEscalation(content: string) {
  return /(손목[^.?!\n]{0,16}잡|손등[^.?!\n]{0,16}(?:건드|만지|쓸)|손을[^.?!\n]{0,16}(?:잡|건드|만지|쓸)|허리[^.?!\n]{0,16}(?:감|잡)|끌어당겼|끌어당긴|끌어안|껴안|입맞|키스|입술[^.?!\n]{0,20}(?:닿|대|가져가|문지|맞)|몸[^.?!\n]{0,16}닿|밀착|품에[^.?!\n]{0,16}(?:안|끌)|(?:손|잔|유리잔)[^.?!\n]{0,20}(?:입술|손등|손)[^.?!\n]{0,20}(?:대|올려|건드|만지))/u.test(content)
}

function detectsInventedProps(content: string, ctx: CompiledRoleplayContext) {
  if (ctx.turnPolicy.allowNewProps) return false

  return ROLEPLAY_PROP_WORDS.some((prop) => content.includes(prop) && !ctx.allowedProps.includes(prop))
}

function detectsExpositoryNarration(content: string) {
  const expositoryMatches = content.match(/지금 필요한 건|주도권이 흐려|확인하는 일이었다|의미였다|뜻이었다|구도였다|상징했다|심리전이었다|도발이었다|관계였다|결정해야 하는 순간|관계가 어떤 방향|방향으로 흘러갈|계약의 방향|다음 행동을 준비|상대의 의도|의도를 확인|분명한 의도|대답이 .*결정|어떤 선택을 하든|그에 맞춰|마음속에 숨겨진|욕망이 .*선명/u) ?? []
  const pronounMatches = content.match(/(?:^|[\s\n])그(?:는|의|에게|를|가|와|도|만)(?=$|[\s\n,.?!])/g) ?? []
  const dialogueInlineNarration = /["“][^"”]{1,220}["”]\s*[^.\n]{0,80}(?:물었다|말했다|되물었다|속삭였다|중얼거렸다|목소리|의도|담겨 있었다)/u.test(content)

  return expositoryMatches.length >= 1 || pronounMatches.length >= 3 || dialogueInlineNarration
}

function hasInternalTokenLeak(content: string) {
  return /_[A-Za-z][A-Za-z0-9_]*|[A-Za-z]{3,}(?:서|를|은|는|이|가|의|에게|으로|와|과)(?=$|[\s\n,.?!])/u.test(content)
}

function stripQuotedDialogue(content: string) {
  return content
    .replace(/"[^"]*"/g, " ")
    .replace(/“[^”]*”/g, " ")
    .replace(/「[^」]*」/g, " ")
    .replace(/『[^』]*』/g, " ")
}

function hasSubjectiveUserObservationFrame(sentence: string) {
  return /(것\s*같|듯(?:하|했)?|처럼\s*보|처럼\s*느껴|보였|느꼈|짐작|예상|기대|의심|오해|읽(?:었|히)|기다렸|기다린|기다리며|궁금|알\s*수\s*없|않을\s*것|할\s*것)/u.test(sentence)
}

function hasControlsUserAction(content: string, ctx: CompiledRoleplayContext) {
  const userName = ctx.userName.trim()
  if (!userName) return false

  const escaped = escapeRegExp(userName)
  const subject = `${escaped}(?:은|는|이|가|의|에게|한테|도)?`
  const narrationSentences = splitIntoSentences(stripQuotedDialogue(content))
  const patterns = [
    new RegExp(`${subject}\\s*[^.?!\\n]{0,28}(?:눈|시선)을\\s*떼지\\s*않`, "u"),
    new RegExp(`${escaped}의\\s*시선이\\s*[^.?!\\n]{0,24}(?:따라왔|머물렀)`, "u"),
    new RegExp(`${subject}\\s*[^.?!\\n]{0,24}시선이\\s*[^.?!\\n]{0,16}(?:따라왔|머물렀)`, "u"),
    new RegExp(`${subject}\\s*[^.?!\\n]{0,24}(?:대답하지\\s*않|침묵했|움직이지\\s*않|다가오지\\s*않|물러서지\\s*않)`, "u"),
    new RegExp(`${subject}\\s*[^.?!\\n]{0,24}고개를\\s*(?:끄덕였|저었)`, "u"),
    new RegExp(`${escaped}의\\s*표정이\\s*[^.?!\\n]{0,12}굳`, "u"),
    new RegExp(`${subject}\\s*[^.?!\\n]{0,24}(?:표정이\\s*굳|숨을\\s*삼켰|입술을\\s*다물었)`, "u"),
    new RegExp(`${subject}\\s*[^.?!\\n]{0,28}(?:말했다|물었다|답했다|웃었다|바라보았다|다가왔다|물러섰다|생각했다|느꼈다|잡았다|놓았다|내밀었다|돌렸다|피했다)`, "u"),
  ]

  return narrationSentences.some((sentence) =>
    !hasSubjectiveUserObservationFrame(sentence) &&
    patterns.some((pattern) => pattern.test(sentence)),
  )
}

function hasContractContext(ctx: CompiledRoleplayContext) {
  const contextText = [
    ctx.worldBrief,
    ctx.characterBrief,
    ctx.userBrief,
    ctx.latestInput.raw,
    ctx.latestInput.intent,
    ctx.responseGoal,
    ctx.allowedProps.join(" "),
  ].join("\n")

  return /(계약|계약서|유예|갱신|서명|사인)/u.test(contextText)
}

function hasContractClosureBias(content: string, ctx: CompiledRoleplayContext) {
  if (!hasContractContext(ctx)) return false

  return (
    /계약(?:은|이|도)?\s*[^.?!\n"]{0,16}(?:끝이야|끝이다|끝이었다|끝났|종료(?:다|된다|됐다|되었다)?|파기(?:다|된다|됐다|되었다)?)/u.test(content) ||
    /계약을\s*(?:끝내|종료|파기)(?:겠다|겠어|야|다|는|고|버리)/u.test(content) ||
    /다시\s*돌아올\s*생각\s*말/u.test(content) ||
    /(?:우리(?:의)?\s*)?관계(?:도|는|가)?\s*[^.?!\n"]{0,16}(?:끝이야|끝이다|끝이었다|끝났)/u.test(content) ||
    /(?:우리(?:의)?\s*)?마지막(?:이야|이다|이었다|이\s*될\s*수도\s*있었다|이\s*될\s*것)/u.test(content)
  )
}

function hasFutureClosure(content: string) {
  const narration = stripQuotedDialogue(content)

  return (
    /(?:우리(?:의)?\s*)?관계(?:도|는|가)?\s*[^.?!\n]{0,16}(?:끝이었다|끝났다|끝나게\s*될|끝일\s*것)/u.test(narration) ||
    /(?:우리(?:의)?\s*)?마지막(?:이었다|이\s*될\s*수도\s*있었다|이\s*될\s*것)/u.test(narration) ||
    /이\s*선택이\s*[^.?!\n]{0,36}(?:모든\s*것을\s*)?결정할\s*것/u.test(narration) ||
    /모든\s*것을\s*결정할\s*것|돌이킬\s*수\s*없게\s*될|결말을\s*향해|이야기는\s*끝/u.test(narration)
  )
}

function contradictsLatestIntent(content: string, ctx: CompiledRoleplayContext) {
  const intent = ctx.latestInput.intent
  if (!intent) return false

  if (/종료가 아니라|끝내겠다는 뜻이 아니|새 계약|수락/u.test(intent)) {
    return /정말\s*끝내|끝내고\s*싶|계약을\s*끝내|관계를\s*끝내/u.test(content)
  }

  return false
}

const META_LEAK_PHRASES = [
  "검수된 대화",
  "최신 사용자 입력",
  "시스템 프롬프트",
  "내부 지시",
  "검수 기준",
  "작성 규칙",
  "repair prompt",
  "validation",
  "validator",
]

const AWKWARD_CHOICE_PHRASES = [
  "내민 선택",
  "선택을 내밀",
  "다음 선택이",
  "선택이 누구에게",
  "원하는 쪽이 어느 쪽",
  "그 자세 그대로 멈췄다",
]

const VAGUE_EMPTY_PHRASES = [
  "네가 원하는 게 뭔지",
  "그게 뭔지",
  "그걸 얻으려면",
  "어떻게 해야 할지",
  "네 뜻이 뭔지",
  "말해줘야지",
  "다시 말을 이었다",
  "시선을 그대로 돌려주며",
  "분명한 의도가 담겨",
  "결정해야 하는 순간",
]

function hasMetaLeak(content: string) {
  return (
    META_LEAK_PHRASES.some((phrase) => content.includes(phrase)) ||
    /(?:system prompt|developer message|validation|validator|repair prompt|JSON|검수\s*기준|시스템\s*프롬프트|프롬프트\s*규칙|작성\s*규칙|내부\s*지시|AI\s*모델)/iu.test(content)
  )
}

function hasAwkwardChoicePhrase(content: string) {
  return AWKWARD_CHOICE_PHRASES.some((phrase) => content.includes(phrase))
}

function countTextOccurrences(content: string, phrase: string) {
  if (!phrase) return 0
  return content.split(phrase).length - 1
}

function extractQuotedLines(content: string) {
  return Array.from(content.matchAll(/["“]([^"”]{1,500})["”]/gu))
    .map((match) => match[1]?.trim())
    .filter((line): line is string => Boolean(line))
}

function hasVagueEmptyContent(content: string) {
  const hasRepeatedVaguePhrase = VAGUE_EMPTY_PHRASES.some((phrase) => countTextOccurrences(content, phrase) >= 2)
  if (hasRepeatedVaguePhrase) return true

  const dialogues = extractQuotedLines(content)
  if (dialogues.length === 0) return false

  const abstractQuestionPattern = /(네가 원하는 게 뭔지|그게 뭔지|그걸 얻으려면|어떻게 해야 할지|네 뜻이 뭔지|말해줘야지)/u
  const concreteConflictPattern = /(떠나|붙잡|계약|끝내|유예|갱신|서명|펜|라이터|도발|숨기지|머물|남을|갈\s*거|조건|수락|거절)/u

  return dialogues.every((dialogue) => abstractQuestionPattern.test(dialogue) && !concreteConflictPattern.test(dialogue))
}

function hasContentDensity(content: string, ctx: CompiledRoleplayContext) {
  const propPattern = ctx.allowedProps.length > 0
    ? new RegExp(ctx.allowedProps.map(escapeRegExp).join("|"), "u")
    : null

  return (
    /(조건|대신|그러면|하려면|끝내려면|남으려면|붙잡히려면|도발처럼\s*숨기지|똑바로\s*(?:말|해))/u.test(content) ||
    /(떠난다면서|끝낸다면서|붙잡아보라면서|원한다면서|말은\s*끝내|말로는\s*끝)/u.test(content) ||
    Boolean(propPattern?.test(content) && /(밀어|놓|접|펼|가리|서명|비켜|닫|꺼)/u.test(content)) ||
    /(떠나고\s*싶은\s*거야|붙잡히고\s*싶은\s*거야|계약을\s*끝내고\s*싶은\s*건지|붙잡길\s*바라는\s*건지|끝낼\s*건지|남을\s*건지)/u.test(content) ||
    /(거절|받아들일게|수락|끝내|유예|갱신|안\s*해|하지\s*않겠)/u.test(content)
  )
}

function latestInputMentionsHand(input: ParsedUserInput) {
  return /(손|손목|손끝|손가락|손등|팔|잡았다|잡는다|붙잡|끌어당겼다|끌어당긴다)/u.test(input.raw)
}

function hasHandMention(sentence: string) {
  return /(손목|손끝|손가락|손등|손을|손에|손으로|손만|손이|손은)/u.test(sentence)
}

function hasNaturalPropHandAction(sentence: string, ctx: CompiledRoleplayContext) {
  if (!hasHandMention(sentence)) return false

  const naturalProps = [
    "문",
    "문고리",
    "계약서",
    "문서",
    "서류",
    "펜",
    "컵",
    "잔",
    "유리잔",
    "술잔",
    "와인잔",
    "난간",
    "테이블",
    "의자",
    "책",
    "가방",
    "열쇠",
    "라이터",
    "담배",
    ...ctx.allowedProps,
  ]
  const propPattern = new RegExp([...new Set(naturalProps)].map(escapeRegExp).join("|"), "u")
  const naturalActionPattern = /(대|열|닫|올리|놓|내려놓|들|쥐|잡|짚|가리키|밀|접|펼|서명|꺼내|건네)/u

  return propPattern.test(sentence) && naturalActionPattern.test(sentence)
}

function hasDirectUnpromptedHandFailure(sentence: string) {
  return (
    /손목[^.?!\n]{0,16}잡/u.test(sentence) ||
    /손을[^.?!\n]{0,16}(?:잡|붙잡)/u.test(sentence) ||
    /손끝으로[^.?!\n]{0,16}(?:건드|만지|쓸|훑)/u.test(sentence) ||
    /손등[^.?!\n]{0,16}(?:건드|만지|쓸|훑)/u.test(sentence) ||
    /손가락[^.?!\n]{0,20}(?:입술|목|허리|몸)[^.?!\n]{0,20}(?:닿|대|스치|쓸|문지)/u.test(sentence) ||
    /손을\s*뻗지\s*않/u.test(sentence) ||
    /손끝이\s*떨/u.test(sentence) ||
    /손끝만\s*움직/u.test(sentence)
  )
}

function hasHandAsTensionCenter(sentence: string) {
  return hasHandMention(sentence) && /(긴장|떨|망설|피하|거두|멈칫|닿|만지|쓸|입술|목|허리|몸|관능|열기|숨|회피)/u.test(sentence)
}

function hasUnpromptedHandFocus(output: string, ctx: CompiledRoleplayContext) {
  if (ctx.latestInput.contactLevel === "touch" || latestInputMentionsHand(ctx.latestInput)) return false

  const handSentences = splitIntoSentences(stripQuotedDialogue(output)).filter(hasHandMention)
  if (handSentences.length === 0) return false

  const focusedHandSentences = handSentences.filter((sentence) => !hasNaturalPropHandAction(sentence, ctx))
  return (
    focusedHandSentences.some(hasDirectUnpromptedHandFailure) ||
    focusedHandSentences.some(hasHandAsTensionCenter) ||
    focusedHandSentences.length >= 2
  )
}

function hasBrokenDialogueQuotes(content: string) {
  const straightQuotes = (content.match(/"/g) ?? []).length
  const openCurlyQuotes = (content.match(/“/g) ?? []).length
  const closeCurlyQuotes = (content.match(/”/g) ?? []).length

  return straightQuotes % 2 !== 0 || openCurlyQuotes !== closeCurlyQuotes
}

export function validateRoleplayOutput(text: string, ctx: CompiledRoleplayContext, profile?: RoleplayModelProfile) {
  const knownScriptReplaced = replaceKnownForeignScripts(text)
  const dialogueCount = extractQuotedLines(text).length
  const maxDialogues = profile?.maxDialogues ?? 2

  return {
    brokenDialogueQuotes: hasBrokenDialogueQuotes(text),
    tooManyDialogues: dialogueCount > maxDialogues,
    overPhysical: !ctx.turnPolicy.allowPhysicalContact && detectsPhysicalEscalation(text),
    internalTokenLeak: hasInternalTokenLeak(text),
    foreignScriptLeak: isLatinWordSaladOutput(text) || hasForeignScriptLeak(knownScriptReplaced),
    metaLeak: hasMetaLeak(text),
    tooLong: Array.from(text).length > ctx.turnPolicy.maxChars + 150,
    unpromptedHandFocus: hasUnpromptedHandFocus(text, ctx),
    controlsUser: hasControlsUserAction(text, ctx),
    contractClosureBias: hasContractClosureBias(text, ctx),
    futureClosure: hasFutureClosure(text),
    objectiveUserStateAssertion: false,
    responseMissedUserIntent: false,
    lowContentDensity: false,
    excessiveAbstractMood: false,
    characterVoiceWeak: false,
    userControlByNarration: false,
  }
}

type RoleplayValidationErrors = ReturnType<typeof validateRoleplayOutput>
type RoleplayValidationKey = keyof RoleplayValidationErrors
type RoleplayValidationWithJudge = {
  errors: RoleplayValidationErrors
  judge: AiQualityJudgeResult
  severityOverrides: Partial<Record<RoleplayValidationKey, "hard" | "repairable" | "soft">>
}

async function judgeRoleplayQuality({
  output,
  ctx,
  profile,
}: {
  output: string
  ctx: CompiledRoleplayContext
  profile: RoleplayModelProfile
}): Promise<AiQualityJudgeResult> {
  const prompt = buildAiQualityJudgePrompt({
    output,
    characterName: ctx.characterName,
    userName: ctx.userName,
    latestUserInput: ctx.latestInput.raw,
    userIntent: ctx.latestInput.intent,
    currentScene: ctx.responseGoal,
    profile,
  })

  try {
    const openAiKey = getOpenAIApiKey()
    if (openAiKey) {
      const openai = new OpenAI({ apiKey: openAiKey })
      const response = await withTimeout(openai.chat.completions.create({
        model: process.env.RP_QUALITY_JUDGE_MODEL || process.env.OPENAI_CHAT_MODEL || DEFAULT_OPENAI_CHAT_MODEL,
        messages: [
          { role: "system", content: "Return only valid JSON. Do not use markdown." },
          { role: "user", content: prompt },
        ],
        temperature: 0,
        max_tokens: 900,
      }), OPENAI_TIMEOUT_MS)
      const content = response.choices[0]?.message?.content?.trim()
      if (!content) return emptyAiQualityJudgeResult()
      const parsed = parseAiQualityJudgeResult(content)
      const sanitized = sanitizeAiQualityJudgeResult(parsed, {
          output,
          userName: ctx.userName,
          characterName: ctx.characterName,
        })
      if (
        process.env.NODE_ENV !== "production" &&
        (parsed.objectiveUserStateAssertion.failed !== sanitized.objectiveUserStateAssertion.failed ||
          parsed.userControlByNarration.failed !== sanitized.userControlByNarration.failed)
      ) {
        console.debug("[RP AI judge sanitized]", {
          objectiveUserStateAssertion: {
            before: parsed.objectiveUserStateAssertion,
            after: sanitized.objectiveUserStateAssertion,
          },
          userControlByNarration: {
            before: parsed.userControlByNarration,
            after: sanitized.userControlByNarration,
          },
        })
      }
      return sanitized
    }

    if (process.env.OPENROUTER_API_KEY) {
      const openrouter = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      })
      const response = await withTimeout(openrouter.chat.completions.create({
        model: getSupportedOpenRouterModel(
          process.env.OPENROUTER_RP_JUDGE_MODEL,
          process.env.OPENROUTER_UNSHAPED2_MODEL,
        ),
        messages: [
          { role: "system", content: "Return only valid JSON. Do not use markdown." },
          { role: "user", content: prompt },
        ],
        temperature: 0,
        max_tokens: 900,
      }), OPENROUTER_TIMEOUT_MS)
      const content = response.choices[0]?.message?.content?.trim()
      if (!content) return emptyAiQualityJudgeResult()
      const parsed = parseAiQualityJudgeResult(content)
      const sanitized = sanitizeAiQualityJudgeResult(parsed, {
          output,
          userName: ctx.userName,
          characterName: ctx.characterName,
        })
      if (
        process.env.NODE_ENV !== "production" &&
        (parsed.objectiveUserStateAssertion.failed !== sanitized.objectiveUserStateAssertion.failed ||
          parsed.userControlByNarration.failed !== sanitized.userControlByNarration.failed)
      ) {
        console.debug("[RP AI judge sanitized]", {
          objectiveUserStateAssertion: {
            before: parsed.objectiveUserStateAssertion,
            after: sanitized.objectiveUserStateAssertion,
          },
          userControlByNarration: {
            before: parsed.userControlByNarration,
            after: sanitized.userControlByNarration,
          },
        })
      }
      return sanitized
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[RP AI judge failed; using rule-based validation only]", {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return emptyAiQualityJudgeResult()
}

async function validateRoleplayOutputWithJudge(
  text: string,
  ctx: CompiledRoleplayContext,
  profile: RoleplayModelProfile,
): Promise<RoleplayValidationWithJudge> {
  const ruleErrors = validateRoleplayOutput(text, ctx, profile)
  const judge = await judgeRoleplayQuality({ output: text, ctx, profile })
  const judgedErrors = aiQualityJudgeResultToValidation(judge)
  const severityOverrides = aiQualityJudgeSeverityOverrides(judge) as Partial<Record<RoleplayValidationKey, "hard" | "repairable" | "soft">>

  return {
    errors: {
      ...ruleErrors,
      ...judgedErrors,
    },
    judge,
    severityOverrides,
  }
}

const HARD_FAIL_KEYS = [
  "objectiveUserStateAssertion",
  "userControlByNarration",
  "controlsUser",
  "internalTokenLeak",
  "overPhysical",
  "foreignScriptLeak",
  "metaLeak",
] as const satisfies readonly RoleplayValidationKey[]

const REPAIRABLE_FAIL_KEYS = [
  "brokenDialogueQuotes",
  "tooManyDialogues",
  "unpromptedHandFocus",
  "contractClosureBias",
  "futureClosure",
  "responseMissedUserIntent",
  "lowContentDensity",
  "excessiveAbstractMood",
  "characterVoiceWeak",
] as const satisfies readonly RoleplayValidationKey[]

const SOFT_FAIL_KEYS = [
  "tooLong",
] as const satisfies readonly RoleplayValidationKey[]

function getFailuresForKeys(errors: RoleplayValidationErrors, keys: readonly RoleplayValidationKey[]) {
  return keys.filter((key) => errors[key]).map((key) => String(key))
}

function hasHardFail(errors: RoleplayValidationErrors) {
  return HARD_FAIL_KEYS.some((key) => errors[key])
}

function hasRepairableFail(errors: RoleplayValidationErrors) {
  return REPAIRABLE_FAIL_KEYS.some((key) => errors[key])
}

function hasOnlySoftFail(errors: RoleplayValidationErrors) {
  return !hasHardFail(errors) && !hasRepairableFail(errors)
}

function getHardFailureKeys(errors: RoleplayValidationErrors) {
  return getFailuresForKeys(errors, HARD_FAIL_KEYS)
}

function getRepairableFailureKeys(errors: RoleplayValidationErrors) {
  return getFailuresForKeys(errors, REPAIRABLE_FAIL_KEYS)
}

function hasStackedRepairableFailures(errors: RoleplayValidationErrors) {
  return getRepairableFailureKeys(errors).length >= 2
}

function getValidationFailureKeys(errors: ReturnType<typeof validateRoleplayOutput>) {
  return Object.entries(errors)
    .filter(([, failed]) => failed)
    .map(([key]) => key)
}

function buildValidationAttempt(
  stage: RoleplayValidationAttempt["stage"],
  errors: RoleplayValidationErrors,
  classified: ClassifiedValidationFailures,
): RoleplayValidationAttempt {
  const failures = getValidationFailureKeys(errors)
  const status: RoleplayValidationStatus = classified.hard.length > 0
    ? "failed"
    : failures.length > 0
      ? "accepted_with_warnings"
      : "passed"

  return {
    stage,
    status,
    failures,
    hardFailures: classified.hard,
    repairableFailures: classified.repairable,
    softFailures: classified.soft,
  }
}

function buildSyntheticValidationAttempt(
  stage: RoleplayValidationAttempt["stage"],
  failures: string[],
  status: RoleplayValidationStatus = "failed",
): RoleplayValidationAttempt {
  return {
    stage,
    status,
    failures,
    hardFailures: status === "failed" ? failures : [],
    repairableFailures: [],
    softFailures: [],
  }
}

function buildValidationMetadata({
  errors,
  repairAttempted = false,
  fallback = false,
}: {
  errors?: RoleplayValidationErrors | null
  repairAttempted?: boolean
  fallback?: boolean
}) {
  const failures = errors ? getValidationFailureKeys(errors) : []
  const validationStatus: RoleplayValidationStatus = fallback
    ? "fallback"
    : failures.length === 0
      ? repairAttempted ? "repaired" : "passed"
      : "accepted_with_warnings"

  return {
    validationStatus,
    validationFailures: failures,
    repairAttempted,
    fallback,
  }
}

function buildValidationFailedError(
  failures: string[],
  metadata: {
    repairAttempted?: boolean
    fallback?: boolean
    validationAttempts?: RoleplayValidationAttempt[]
  } = {},
) {
  return new ChatApiError(
    `RP validation failed: ${failures.join(", ")}`,
    502,
    failures,
    "failed",
    metadata.repairAttempted,
    metadata.fallback,
    metadata.validationAttempts,
  )
}

export function buildRepairPrompt(errors: ReturnType<typeof validateRoleplayOutput>, ctx: CompiledRoleplayContext) {
  const labels: Record<keyof typeof errors, string> = {
    brokenDialogueQuotes: "대사 따옴표가 깨졌거나 닫히지 않음",
    tooManyDialogues: "이번 턴에 대사가 너무 많음",
    objectiveUserStateAssertion: `${ctx.userName}의 감정/욕망/의도/심리를 객관 사실처럼 확정함`,
    responseMissedUserIntent: "최신 사용자 입력 또는 의도를 놓침",
    lowContentDensity: "구체적인 갈등 지점 없이 내용이 비어 있음",
    excessiveAbstractMood: "추상적인 분위기/관계 해설이 과함",
    characterVoiceWeak: `${ctx.characterName}의 캐릭터 반응이 약하거나 일반적임`,
    userControlByNarration: `${ctx.userName}의 새 행동/대사/감정/결정을 서술함`,
    controlsUser: `${ctx.userName}의 실제 행동/시선/침묵/대답을 대신 확정함`,
    contractClosureBias: "계약 종료나 관계의 끝을 과하게 확정함",
    futureClosure: "미래 전개나 장면 결말을 지문으로 확정함",
    internalTokenLeak: "내부 변수명 또는 영문 토큰이 한국어 문장에 섞임",
    overPhysical: "이번 턴에 허용되지 않은 신체 접촉으로 급진행함",
    tooLong: "분량이 이번 턴 허용 범위를 초과함",
    foreignScriptLeak: "한국어 외 문자 또는 깨진 표현이 섞임",
    metaLeak: "시스템 메타 설명이 본문에 섞임",
    unpromptedHandFocus: "손 묘사가 접촉/관능/회피/긴장 표현의 중심이 됨",
  }
  const failedLabels = Object.entries(errors)
    .filter(([, failed]) => failed)
    .map(([key]) => `- ${labels[key as keyof typeof errors]}`)
    .join("\n")

  return `방금 답변은 다음 문제로 실패했다:
${failedLabels}

${errors.metaLeak ? `방금 답변은 시스템 메타 설명이 본문에 섞여 실패했다.
검수 기준이나 작성 원칙을 설명하는 문장을 쓰지 마라.
오직 ${ctx.characterName}이 실제로 한 행동과 대사만 써라.` : ""}
${errors.objectiveUserStateAssertion || errors.userControlByNarration || errors.controlsUser ? `방금 답변은 ${ctx.userName}의 상태나 행동을 객관 사실처럼 확정해서 실패했다.
${ctx.characterName}이 그렇게 읽거나 의심하거나 오해하는 방식은 가능하지만, 서술자가 ${ctx.userName}의 감정/욕망/의도/행동을 확정하지 마라.` : ""}
${errors.objectiveUserStateAssertion || errors.userControlByNarration || errors.controlsUser ? `${ctx.characterName} 자신의 1인칭 감정, 긴장, 욕망, 판단은 실패가 아니므로 억지로 지우지 마라.
따옴표 안에서 ${ctx.userName}에게 선택하라, 답하라, 멈추라처럼 요구하는 대사는 userControlByNarration이 아니다.
실패를 고칠 때는 ${ctx.userName}의 내면이나 행동을 확정하는 서술만 제거하고, ${ctx.characterName}의 관찰/추측/기대/대사는 유지하라.
${ctx.userName}가 눈을 떼지 않았다, 시선이 따라왔다, 대답하지 않았다, 침묵했다, 움직이지 않았다 같은 ${ctx.userName}의 실제 반응을 쓰지 마라.
${ctx.characterName}의 주관적 예상은 허용되지만, ${ctx.userName}의 실제 행동은 확정하지 마라.` : ""}
${errors.contractClosureBias || errors.futureClosure ? `방금 답변은 계약 종료와 관계의 끝, 미래 결말을 지문으로 확정해서 실패했다.
계약이 끝났다고 확정하지 말고, 종료/유예/갱신이 열려 있는 상태에서 ${ctx.characterName}의 조건이나 압박으로 표현하라.
지문에서 관계도 끝이었다, 마지막이 될 수도 있었다, 모든 것이 결정될 것이다처럼 결말을 닫지 마라.
캐릭터의 협박이나 조건 대사는 가능하지만, 서술자가 미래 전개를 확정하지 마라.` : ""}
${errors.responseMissedUserIntent || errors.lowContentDensity || errors.excessiveAbstractMood || errors.characterVoiceWeak ? `방금 답변은 최신 입력에 대한 구체적인 캐릭터 반응이 약해서 실패했다.
넓은 질문이나 분위기 해설을 반복하지 말고, 현재 장면의 갈등을 구체적으로 찔러라.
${ctx.userName}가 계약을 끝내려는 건지, 유예하려는 건지, 붙잡히고 싶다는 말을 도발로 숨기는 건지 중 하나를 직접 겨냥하라.
${ctx.characterName}의 대사는 한 번만 쓰고, 그 대사에 새 정보가 있어야 한다.
구체적인 조건 제시, ${ctx.userName}의 말에 숨은 모순 지적, 기존 소품을 이용한 압박, 관계 방향을 묻는 구체 질문, 분명한 거절 또는 수락 중 하나를 반드시 포함하라.
300~500자.` : ""}
${errors.unpromptedHandFocus ? `방금 답변은 손 묘사가 접촉/관능/회피/긴장 표현의 중심이 되어서 실패했다.
문, 계약서, 펜, 컵, 난간처럼 기존 소품을 자연스럽게 다루는 손동작은 문제 삼지 않는다.
손목을 잡았다, 손을 잡았다, 손끝이 떨렸다, 손을 뻗지 않았다 같은 손 중심 묘사는 제거하라.` : ""}
오직 "${ctx.characterName}"의 반응만 다시 작성하라.
"${ctx.userName}"의 새 행동/대사/감정을 쓰지 마라.
제공된 "${ctx.userName}"의 행동과 대사에만 반응하라.
미래 전개, 결말, 작가식 마무리를 쓰지 마라.
대사는 1~2개만 사용하라.
이번 턴 신체 접촉 허용: ${ctx.turnPolicy.allowPhysicalContact ? "예" : "아니오"}.
이번 플러팅 채널: ${ctx.turnPolicy.flirtChannel}.
새 소품 발명 허용: ${ctx.turnPolicy.allowNewProps ? "예" : "아니오"}.
기존 소품: ${ctx.allowedProps.length > 0 ? ctx.allowedProps.join(", ") : "없음"}.
사용자의 말을 반복하지 말고 의미에만 반응하라.
300~${ctx.turnPolicy.maxChars}자.
이번 응답 목표: ${ctx.responseGoal}`
}

export function buildSafeFallbackReply(ctx: CompiledRoleplayContext) {
  return buildContextualFallbackReply(ctx)
}

function buildContextualFallbackReply(ctx: CompiledRoleplayContext, streamedDraft = "") {
  const { characterName, userName } = ctx
  const latestText = [
    ctx.latestInput.raw,
    ctx.latestInput.action,
    ctx.latestInput.dialogue,
    ctx.latestInput.intent,
  ]
    .filter(Boolean)
    .join("\n")
  const isProvocation = /(도발|붙잡아\s*보라고|잡아\s*보라고|해\s*보라고|해\s*봐|하라고|시험|떠나|끝내)/u.test(latestText)
  const streamedNoEscape = /도망칠\s*생각|도망치려|도망칠/u.test(streamedDraft)
  const propBeat = ctx.allowedProps.includes("계약서")
    ? `${characterName}은 계약서가 놓인 쪽으로 시선을 짧게 내렸다.`
    : ctx.allowedProps.includes("라이터")
      ? "라이터 불빛이 짧게 꺼졌다."
      : `${characterName}은 한 박자 늦게 숨을 골랐다.`

  if (streamedNoEscape || isProvocation || ctx.latestInput.asksOtherToAct) {
    return `${characterName}은 ${userName}의 도발을 웃음으로 넘기지 않았다. ${propBeat}

"끝내러 온 사람이 붙잡아보라고 말하는 건 모순이야. 떠날 건지, 내가 널 멈추길 바라는 건지 지금 분명히 해."

${characterName}의 말은 낮고 짧았다. 더 다가가지는 않았지만, 농담으로 빠져나갈 틈도 남기지 않았다.`
  }

  return `${characterName}은 대답을 서두르지 않았다. ${propBeat}

"계약을 끝낼 거면 지금 선을 그어. 남길 바라는 게 있으면 도발 말고 조건을 말해."

말은 한 번으로 끝났다. ${characterName}은 그 자리에서 ${userName}의 반응을 봤다.`
}

const FOREIGN_SCRIPT_LEAK_PATTERN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Arabic}\p{Script=Devanagari}\p{Script=Cyrillic}\p{Script=Hebrew}\p{Script=Thai}\p{Script=Greek}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}]+/gu

const FOREIGN_SCRIPT_REPLACEMENTS: Record<string, string> = {
  磁性的: "매혹적인",
  磁性: "자성",
  性的: "성적인",
}

function replaceKnownForeignScripts(content: string) {
  return Object.entries(FOREIGN_SCRIPT_REPLACEMENTS).reduce(
    (result, [from, to]) => result.replaceAll(from, to),
    content,
  )
}

function hasForeignScriptLeak(content: string) {
  FOREIGN_SCRIPT_LEAK_PATTERN.lastIndex = 0
  return FOREIGN_SCRIPT_LEAK_PATTERN.test(content)
}

function isLatinWordSaladOutput(content: string) {
  const hangulCount = content.match(/[가-힣]/g)?.length ?? 0
  const latinWords = content.match(/[A-Za-z]{3,}/g) ?? []
  const latinCharCount = latinWords.join("").length
  const totalLetterCount = hangulCount + latinCharCount
  if (totalLetterCount < 120) return false

  const latinRatio = latinCharCount / totalLetterCount
  return latinWords.length >= 35 && latinRatio > 0.65
}

function normalizeWhitespace(content: string) {
  return content
    .replace(/\s+([,.!?…])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

function normalizeRepeatedParagraphKey(content: string) {
  return content
    .replace(/["'“”‘’.,!?…\s]/g, "")
    .slice(0, 140)
}

function isDialogueParagraph(content: string) {
  return /^["“][\s\S]+["”]$/.test(content.trim())
}

function separateQuotedDialogueParagraphs(content: string) {
  return content
    .replace(/([^\s\n])(["“][^"“”\n]{1,500}["”])/g, "$1\n\n$2")
    .replace(/(["“][^"“”\n]{1,500}["”])([^\s\n])/g, "$1\n\n$2")
    .replace(/\n{3,}/g, "\n\n")
}

function stripRoleplayOutputLabels(content: string) {
  return content
    .replace(/^\s*\[?\s*[가-힣A-Za-z0-9_]{1,20}의\s*(?:반응|대사|행동|서술|생각)\s*\]?\s*[:：]\s*/gm, "")
    .replace(/^\s*\[?\s*(?:반응|대사|행동|서술|생각|답변)\s*\]?\s*[:：]\s*/gm, "")
    .replace(/^\s*\[?\s*[가-힣A-Za-z0-9_]{1,20}의\s*(?:반응|대사|행동|서술|생각)\s*\]?\s*$/gm, "")
    .replace(/^\s*\[?\s*(?:반응|대사|행동|서술|생각|답변)\s*\]?\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
}

export function normalizeOpenRouterOutput(content: string) {
  if (isLatinWordSaladOutput(content)) return ""

  const paragraphs = separateQuotedDialogueParagraphs(
    stripRoleplayOutputLabels(content)
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n"),
  )
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  const seenParagraphs = new Set<string>()
  const cleanedParagraphs: string[] = []

  for (const paragraph of paragraphs) {
    const knownReplaced = replaceKnownForeignScripts(paragraph)
    if (hasForeignScriptLeak(knownReplaced)) continue

    const cleaned = normalizeWhitespace(knownReplaced)
    if (!cleaned) continue

    const repeatKey = normalizeRepeatedParagraphKey(cleaned)
    const repeatMinLength = isDialogueParagraph(cleaned) ? 8 : 20
    if (repeatKey.length >= repeatMinLength && seenParagraphs.has(repeatKey)) {
      if (isDialogueParagraph(cleaned) || repeatKey.length < 28) continue
      break
    }

    cleanedParagraphs.push(cleaned)
    if (repeatKey.length >= repeatMinLength) seenParagraphs.add(repeatKey)
  }

  return separateQuotedDialogueParagraphs(cleanedParagraphs.join("\n\n")).trim()
}

function extractRecentMeaningCandidates(content: string) {
  const normalized = normalizeOpenRouterOutput(content)
  if (!normalized || isSystemLikeAssistantContent(normalized)) return []

  return splitIntoSentences(normalized.replace(/["“”]/g, ""))
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length >= 12 && sentence.length <= 90)
    .filter((sentence) => !/^(?:핵심 대사|이전 답변 요약|사용자 행동)/.test(sentence))
}

function buildRecentMeaningBanText(messages: NonNullable<ChatRequestBody["messages"]>) {
  const bannedMeanings: string[] = []
  const seen = new Set<string>()

  for (const message of [...messages].reverse()) {
    if (message.role !== "assistant") continue

    for (const candidate of extractRecentMeaningCandidates(message.content)) {
      const key = normalizeRepeatedParagraphKey(candidate)
      if (key.length < 16 || seen.has(key)) continue

      seen.add(key)
      bannedMeanings.push(candidate)
      if (bannedMeanings.length >= 3) break
    }

    if (bannedMeanings.length >= 3) break
  }

  if (bannedMeanings.length === 0) return ""

  return `[이번 턴에서 반복 금지할 최근 의미]
${bannedMeanings.map((meaning) => `- ${meaning}`).join("\n")}
위 의미를 같은 말이나 다른 말로 반복하지 말고, 다음 행동으로 넘어간다.`
}

function buildCompiledRoleplaySection(compiledContext?: CompiledRoleplayContext) {
  if (!compiledContext) return ""

  const { latestInput, turnPolicy } = compiledContext

  return `[프롬프트 컴파일 결과]
[작품 톤 해석]
${compiledContext.toneRules.join("\n")}

[최신 입력 해석]
- 입력 종류: ${latestInput.kind}
- 이번 턴 긴장도: ${turnPolicy.escalation}
- 이번 플러팅 채널: ${turnPolicy.flirtChannel}

[이번 턴 허용 범위]
- 신체 접촉 허용: ${turnPolicy.allowPhysicalContact ? "예" : "아니오"}
- 새 소품 발명 허용: ${turnPolicy.allowNewProps ? "예" : "아니오"}
- 분량: ${turnPolicy.maxChars}자 이하, ${turnPolicy.paragraphCount}
- 허용: ${turnPolicy.allowedActions.join(", ")}
- 금지: ${turnPolicy.bannedActions.join(", ")}
- 기존 소품: ${compiledContext.allowedProps.length > 0 ? compiledContext.allowedProps.join(", ") : "없음"}
- 사용자가 명시하지 않은 접촉/소품/장소를 새로 만들지 않는다.
- 기존 소품 목록에 없는 물건을 새로 등장시키지 않는다.
- 사용자의 말을 그대로 되풀이하지 말고 의미에 반응한다.

[이번 응답 목표]
${compiledContext.responseGoal}

[이번 턴 금지 의미]
${compiledContext.bannedThisTurn.length > 0 ? compiledContext.bannedThisTurn.map((meaning) => `- ${meaning}`).join("\n") : "- 최근 답변의 결론이나 행동을 유의어로 반복하지 않는다."}`
}

function formatCompiledUserInputForModel(compiledContext: CompiledRoleplayContext) {
  const { latestInput, turnPolicy } = compiledContext
  const actorName = latestInput.actor || compiledContext.userName
  const sceneParts = [
    latestInput.action ? `[${actorName}의 행동]\n${latestInput.action}` : "",
    latestInput.dialogue ? `[${actorName}의 대사]\n"${latestInput.dialogue}"` : "",
    `[${actorName}의 의도]\n${latestInput.intent}`,
  ].filter(Boolean).join("\n\n")

  return `${sceneParts}

이번 턴 조건: 긴장도 ${turnPolicy.escalation}, 플러팅 채널 ${turnPolicy.flirtChannel}, 신체 접촉 허용 ${turnPolicy.allowPhysicalContact ? "예" : "아니오"}.
기존 소품: ${compiledContext.allowedProps.length > 0 ? compiledContext.allowedProps.join(", ") : "없음"}.
응답 목표: ${compiledContext.responseGoal}`
}

export function generateDynamicPrompt({
  characterName = "the assigned character",
  userName = "the user's persona",
  modelBackground,
  characterSetting = "Use the app-provided character profile, personality, relationship, and speech style.",
  userSetting = "Use the app-provided user persona profile and relationship.",
  currentScene = "",
  compiledContext,
  profile,
}: {
  characterName?: string
  userName?: string
  modelBackground: string
  characterSetting?: string
  userSetting?: string
  currentScene?: string
  compiledContext?: CompiledRoleplayContext
  profile?: RoleplayModelProfile
}) {
  const responseMaxChars = profile?.targetChars.max ?? compiledContext?.turnPolicy.maxChars ?? MAX_OPENROUTER_RESPONSE_CHARS
  const responseMinChars = profile?.targetChars.min ?? 300
  const maxDialogues = profile?.maxDialogues ?? 1
  const compiledSection = buildCompiledRoleplaySection(compiledContext)
  const profileInstructions = buildProfilePromptInstructions(profile)

  return `너는 역할극 채팅에서 오직 "${characterName}" 한 명만 연기한다.

[절대 규칙]
- 너는 소설 작가가 아니다.
- 너는 전지적 서술자가 아니다.
- 너는 "${characterName}"의 말, 행동, 감각, 생각만 쓴다.
- "${userName}"의 새 대사, 새 행동, 새 감정, 미래 행동을 만들지 않는다.
- "${userName}"이 웃었다, 물러섰다, 말했다, 생각했다 같은 문장을 쓰지 않는다.
- "${userName}"의 제공된 행동과 대사에만 반응한다.
- 답변 마지막은 "${userName}"이 다음 행동을 할 수 있게 열린 상태로 끝낸다.

[출력 형식]
- 한국어로만 쓴다.
- ${responseMinChars}~${responseMaxChars}자.
- 2~4문단으로 쓴다.
- 대사는 최대 ${maxDialogues}개만 쓴다.
- 대사는 큰따옴표 안에 쓴다.
- 대사와 서술은 줄바꿈으로 분리한다.
- 제목, 이름표, 구간명, 설명용 라벨을 붙이지 않는다.
- 사용자의 마지막 말/행동에 대한 "${characterName}"의 즉각 반응을 먼저 쓴다.
- "${characterName}"의 새 행동은 한 가지 이하로 제한한다.
- 마지막은 "${characterName}"이 실제 동작을 멈춘 지점에서 끝낸다.
- 같은 역할의 문단을 두 번 쓰지 않는다.

[진행]
- 최근 사용자 메시지에서 바로 이어간다.
- 장면은 "${characterName}"의 반응만으로 한 단계만 진행한다.
- "${userName}"이 다음에 무엇을 말하거나 행동할지는 비워둔다.
- 감정 묘사 후에는 실제 행동, 거절, 질문, 고백, 회피 중 하나로 넘어간다.
- 의미 없는 장황한 분위기 묘사로 분량을 채우지 않는다.
- 장면 의도나 관계 구도를 해설하지 말고, 짧은 행동과 대사로 보여준다.
- 대명사 "그", "그의", "그에게"를 남용하지 않는다. 화자가 헷갈리면 "${characterName}" 이름을 쓰거나 주어를 생략한다.

[상태 정보 규칙]
- 현재 장면은 이번 턴의 구조화된 행동/대사와 모델용 장면 요약만 참고한다.
- 상태창, 날씨, 다음 이벤트 조건을 답변에 그대로 반복하거나 현재 사건처럼 다루지 않는다.
- Opening Scene과 Opening First Message는 과거 오프닝 정보일 뿐, 현재 장면처럼 재사용하지 않는다.
- 이번 턴의 구조화된 행동/대사가 과거 목표, 오프닝, 상태 정보와 충돌하면 이번 턴을 가장 우선한다.

[사용자 입력 처리]
- 사용자 메시지는 이미 [${userName}의 행동], [${userName}의 대사], [${userName}의 의도]로 구조화되어 들어올 수 있다.
- 행동과 대사는 장면 안에서 이미 일어난 일로 취급한다.
- 의도는 해석 보조 정보이며, 답변에서 그대로 설명하지 않는다.
- 사용자의 새 대사나 새 행동을 추가로 만들지 않는다.
- 구조화 문구, 입력 항목명, 내부 해석을 답변에 출력하지 않는다.
- 이번 턴의 의도가 배경이나 과거 히스토리와 충돌하면 이번 턴을 우선한다.

[메타 설명 금지]
- 답변 작성 규칙, 검수 기준, 장면 진행 원칙을 본문에 쓰지 않는다.
- 답변 작성 원칙을 설명하는 문장을 본문에 쓰지 않는다.
- 캐릭터가 실제로 보고, 만지고, 말하고, 행동한 것만 쓴다.
- 추상적인 진행 설명 대신 표정, 자세, 거리, 물건 위치처럼 화면에 보이는 행동으로 쓴다.
- 마지막 문장은 실제 동작이 멈춘 지점으로 끝낸다.

[표현 우선순위]
- 분기/시스템처럼 들리는 추상 표현을 피한다.
- 같은 기능의 질문을 한 답변 안에서 두 번 하지 않는다.
- 대상 없는 욕구 질문, 지시어뿐인 질문, 방법을 되묻는 넓은 질문은 단독으로 쓰지 않는다.
- 질문은 반드시 현재 갈등의 구체 대상에 붙인다.
- 좋은 질문 예: "계약을 끝내러 온 건지, 유예하러 온 건지 지금 말해.", "붙잡아달라는 말이면 도발 말고 조건을 말해.", "끝낼 생각이면 라이터 내려놓고 서명부터 해."
- "상대"가 어색하게 반복되면 "${userName}" 이름을 직접 쓴다.

[내용 밀도]
- 최종 답변은 반드시 구체적인 갈등 지점 하나를 찌른다.
- 아래 중 하나를 반드시 포함한다: 구체적인 조건 제시, ${userName}의 말에 숨은 모순 지적, 기존 소품을 이용한 압박, 관계의 방향을 묻는 구체 질문, ${characterName}의 분명한 거절 또는 수락.
- "잠시 멈췄다", "다시 말을 이었다", "시선을 마주했다", "${userName}을 바라봤다", "미소를 지었다" 같은 빈 지문은 단독으로 쓰지 않는다.
- 빈 지문을 썼다면 바로 뒤에 실제 행동, 소품 사용, 조건, 거절, 수락, 구체 대사 중 하나를 붙인다.

${profileInstructions ? `${profileInstructions}\n` : ""}
${compiledSection ? `${compiledSection}\n` : ""}
[반복 금지]
- 이전 assistant 문장을 반복하지 않는다.
- 한 답변 안에서 같은 행동을 두 번 쓰지 않는다.
- 같은 사실, 같은 감정, 같은 관계 설명을 다른 문장으로 바꿔 반복하지 않는다.
- 이미 말한 내용을 유의어로 다시 설명하지 않는다.
- 한 답변 안에서 같은 의미의 문장은 한 번만 허용한다.
- 예: "너만큼 과격한 사람은 없었다", "너처럼 접근한 사람은 처음이었다", "그런 식으로 다가온 사람은 없었다"는 모두 같은 의미이므로 하나만 쓴다.
- 같은 감정을 반복 설명하지 말고, 다음 행동이나 대사로 넘어간다.
- 아래 표현은 꼭 필요할 때만 쓴다:
  ${OVERUSED_PHRASES.join(", ")}

[반복 판정 기준]
아래는 모두 반복으로 간주한다.
- 같은 정보를 유의어로 다시 말하는 것.
- 같은 감정을 다른 묘사로 다시 말하는 것.
- 같은 행동을 신체 부위만 바꿔 다시 쓰는 것.
- 같은 긴장감을 시선, 침묵, 숨, 목소리로 번갈아 묘사하는 것.
- 이전 문단의 결론을 다음 문단에서 다시 확인하는 것.

반복을 피하는 방법:
- 한 번 말한 사실은 다시 설명하지 말고 결과를 보여준다.
- 한 응답 안에서 같은 갈등을 재확인하지 않는다.
- 새 문단으로 넘어가면 새 정보, 새 행동, 새 대사 중 하나를 반드시 추가한다.

[현재 정보]
${modelBackground}
- ${characterName} 설정: ${characterSetting}
- ${userName} 설정: ${userSetting}
- 현재 장면: ${currentScene}

[이번 응답 목표]
완성된 채팅 본문만 작성한다.`
}

function buildProfilePromptInstructions(profile?: RoleplayModelProfile) {
  if (!profile) return ""

  const styleInstructions: Record<RoleplayModelProfile["promptStyle"], string> = {
    "concise-direct": "- 짧고 직접적인 대사와 행동으로 쓴다. 추상적인 관계 해설을 줄인다.",
    "immersive-controlled": "- 몰입감 있는 장면 묘사는 허용하되 사용자의 행동, 감정, 선택은 침범하지 않는다.",
    "korean-clean-direct": "- 자연스러운 한국어를 우선하고 어색한 추상 표현, 번역투, 선택지 같은 문장을 피한다.",
    "unfiltered-novel": "- 소설형 장면 밀도는 허용하되 hard fail에 해당하는 사용자 조종, 메타 노출, 허용 밖 접촉은 쓰지 않는다.",
  }
  const modeInstructions: Record<RoleplayModelProfile["outputMode"], string> = {
    chat: "- 지문과 대사 중심으로 쓰고 속마음 독백은 쓰지 않는다.",
    novel: "- 시간, 장소, 표정, 거리감 같은 장면 지문을 더 풍부하게 허용한다.",
    inner_monologue: "- 캐릭터의 속마음은 허용하되 사용자의 생각이나 감정은 쓰지 않는다.",
  }

  return `[모델 출력 모드]
${styleInstructions[profile.promptStyle]}
${modeInstructions[profile.outputMode]}`
}

function buildOpenRouterMessages(
  messages: NonNullable<ChatRequestBody["messages"]>,
  systemPromptText: string,
  userName?: string,
  compiledContext?: CompiledRoleplayContext,
) {
  const recentMeaningBanText = buildRecentMeaningBanText(messages)
  const finalSystemPromptText = [
    systemPromptText,
    recentMeaningBanText,
  ].filter(Boolean).join("\n\n")
  const seenAssistantKeys = new Set<string>()
  const cleanMessages = messages.flatMap((message) => {
    const rawContent = message.content.trim()
    let content = message.role === "assistant" ? normalizeOpenRouterOutput(rawContent) : rawContent
    if (!content || message.role === "system") return []

    if (message.role === "assistant") {
      if (isUserChoiceContent(content)) {
        return [{
          role: "user" as const,
          content: content.replace(/^\[[^\]]+\]\s*/, "").trim() || content,
        }]
      }

      if (isSystemLikeAssistantContent(content)) return []
      if (isKnownLocalFallbackContent(content)) return []
      if (escapesIntoUserControl(content, userName) || hasRoleplayQualityIssue(content)) return []

      const repeatKey = normalizeRepeatedParagraphKey(content)
      if (repeatKey.length >= 28) {
        if (seenAssistantKeys.has(repeatKey)) return []
        seenAssistantKeys.add(repeatKey)
      }
    }

    return [{ role: message.role, content }]
  })

  const lastMessage = cleanMessages.at(-1)
  if (lastMessage?.role === "user" && compiledContext) {
    lastMessage.content = formatCompiledUserInputForModel(compiledContext)
  } else if (lastMessage?.role === "user" && lastMessage.content.length < 30) {
    const originalText = lastMessage.content
    lastMessage.content = `[사용자 행동] ${originalText}`
  }

  const finalMessages = [
    { role: "system" as const, content: finalSystemPromptText },
    ...cleanMessages,
  ]

  return finalMessages
}

export function buildRoleplayMessages(
  messages: NonNullable<ChatRequestBody["messages"]>,
  systemPromptText: string,
  userName?: string,
  compiledContext?: CompiledRoleplayContext,
) {
  return buildOpenRouterMessages(messages, systemPromptText, userName, compiledContext)
}

function formatMessagesForGemini(messages: NonNullable<ChatRequestBody["messages"]>) {
  const systemMessages = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n")
  const conversation = messages
    .filter((message) => message.role !== "system")
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n\n")
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content

  return [
    systemMessages ? `[system]\n${systemMessages}` : "",
    conversation || (latestUserMessage ? `user: ${latestUserMessage}` : ""),
  ].filter(Boolean).join("\n\n")
}

type ChatMessages = NonNullable<ChatRequestBody["messages"]>

async function callOpenRouterRoleplay(
  finalMessages: ChatMessages,
  model: ChatModelConfig,
  userName?: string,
) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new ChatApiError(
      "OPENROUTER_API_KEY가 설정되어 있지 않습니다. .env.local 또는 배포 환경변수에 OPENROUTER_API_KEY를 추가해 주세요.",
      503,
    )
  }

  const openrouter = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  })
  const profile = getRoleplayModelProfile(model)
  const stopSequences = [
    userName ? `\n${userName}:` : "",
    userName ? `${userName}:` : "",
    "\nUser:",
    "User:",
  ].filter(Boolean)
  const response = await withTimeout(openrouter.chat.completions.create(buildOpenRouterRoleplayRequest({
    profile,
    messages: finalMessages,
    baseParams: getOpenRouterGenerationParams(model),
    stop: stopSequences,
  })), OPENROUTER_TIMEOUT_MS)
  const content = response.choices[0]?.message?.content?.trim()
  if (!content) throw new ChatApiError("OpenRouter returned empty content", 502)

  return content
}

async function callOpenAIRoleplay(finalMessages: ChatMessages, model: ChatModelConfig) {
  const apiKey = getOpenAIApiKey()
  if (!apiKey) {
    throw new ChatApiError(
      "OPENAI_API_KEY가 설정되어 있지 않습니다. .env.local 또는 배포 환경변수에 OPENAI_API_KEY를 추가해 주세요.",
      503,
    )
  }
  const profile = getRoleplayModelProfile(model)

  const response = await withTimeout(fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildOpenAIRoleplayRequest(profile, finalMessages)),
  }), OPENAI_TIMEOUT_MS)

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new ChatApiError(errorText || `OpenAI chat API failed: ${response.status}`, response.status)
  }

  const data = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new ChatApiError("OpenAI returned empty content", 502)

  return content
}

function splitGeminiRoleplayMessages(finalMessages: ChatMessages) {
  const systemPrompt = finalMessages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n")
  const contents: Content[] = finalMessages
    .filter((message) => message.role !== "system" && message.content.trim())
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }))

  return { systemPrompt, contents }
}

function getGeminiRoleplayModelName(model: ChatModelConfig) {
  return getRoleplayModelProfile(model).modelName
}

function isGeminiSafetyFinishReason(reason?: string) {
  return typeof reason === "string" && /SAFETY|BLOCK/i.test(reason)
}

function isShortGeminiMaxTokenOutput(reason: string | undefined, content: string) {
  return typeof reason === "string" && /MAX_TOKENS/i.test(reason) && Array.from(content.trim()).length < 180
}

function allowsOpenRouterFallbackForGemini(model: ChatModelConfig) {
  return model.id === "gemini-3-flash-rp" || process.env.ENABLE_GEMINI_CROSS_PROVIDER_FALLBACK === "1"
}

function buildOpenRouterFallbackModel(): ChatModelConfig {
  const openRouterModel = getSupportedOpenRouterModel(
    process.env.OPENROUTER_RP_FALLBACK_MODEL,
    process.env.OPENROUTER_UNSHAPED2_MODEL,
  )

  return {
    id: "cohere/command-r-plus-08-2024",
    label: "언셰이프2",
    description: "Gemini RP fallback",
    provider: "openrouter",
    mode: "nsfw",
    creditCostPerReply: 0,
    openRouterModel,
  }
}

async function callGeminiRoleplay(finalMessages: ChatMessages, model: ChatModelConfig) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new ChatApiError(
      "GEMINI_API_KEY가 설정되어 있지 않습니다. .env.local 또는 배포 환경변수에 GEMINI_API_KEY를 추가해 주세요.",
      503,
    )
  }

  const ai = new GoogleGenAI({ apiKey })
  const profile = getRoleplayModelProfile(model)
  const modelName = profile.modelName
  const { systemPrompt, contents } = splitGeminiRoleplayMessages(finalMessages)
  const config = buildGeminiRoleplayConfig({
    profile,
    systemPrompt,
    safetySettings: GEMINI_RP_SAFETY_SETTINGS,
  })

  const generate = async (requestMessages: ChatMessages) => {
    const request = splitGeminiRoleplayMessages(requestMessages)
    const response = await withTimeout(ai.models.generateContent({
      model: modelName,
      contents: request.contents,
      config: {
        ...config,
        systemInstruction: request.systemPrompt,
      },
    }), GEMINI_TIMEOUT_MS)
    const finishReason = response.candidates?.[0]?.finishReason
    const safetyRatings = response.candidates?.[0]?.safetyRatings
    const content = response.text?.trim() || ""

    if (process.env.NODE_ENV !== "production") {
      console.debug("[Gemini RP model]", modelName)
      console.debug("[Gemini RP safety threshold]", GEMINI_SAFETY_THRESHOLD)
      console.debug("[Gemini RP finish reason]", finishReason)
      console.debug("[Gemini RP safety ratings]", safetyRatings)
    }

    return { content, finishReason }
  }

  let result: Awaited<ReturnType<typeof generate>>
  try {
    result = await generate(finalMessages)
  } catch (error) {
    if (!isGeminiTransientError(error)) throw error
    if (!allowsOpenRouterFallbackForGemini(model)) throw error
    const fallbackModel = buildOpenRouterFallbackModel()
    const fallbackContent = await callOpenRouterRoleplay(finalMessages, fallbackModel)
    if (process.env.NODE_ENV !== "production") {
      console.debug("[Gemini RP transient fallback]", {
        from: modelName,
        to: getOpenRouterModelName(fallbackModel),
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return fallbackContent
  }
  if (
    result.content &&
    !isGeminiSafetyFinishReason(result.finishReason) &&
    !isShortGeminiMaxTokenOutput(result.finishReason, result.content)
  ) return result.content

  const retryMessages = [
    ...finalMessages,
    {
      role: "user" as const,
      content: `방금 Gemini 응답이 비었거나 safety finish로 중단됐다.
허용 가능한 성인 창작 RP 범위 안에서만 작성하라.
미성년자 성적 내용, 비동의/강압 미화, 착취/불법 성적 내용, 실존 인물 성적화, 자해/위험행위 조장은 쓰지 않는다.
노골적 행위 묘사 대신 현재 장면의 갈등, 대사, 거리감, 조건 제시에 집중해 300~600자로 다시 작성하라.`,
    },
  ]
  result = await generate(retryMessages)
  if (
    result.content &&
    !isGeminiSafetyFinishReason(result.finishReason) &&
    !isShortGeminiMaxTokenOutput(result.finishReason, result.content)
  ) return result.content

  const fallbackModel = buildOpenRouterFallbackModel()
  if (!allowsOpenRouterFallbackForGemini(model)) {
    throw new ChatApiError(`${modelName} returned unusable or truncated content`, 502)
  }
  const fallbackContent = await callOpenRouterRoleplay(finalMessages, fallbackModel)
  if (process.env.NODE_ENV !== "production") {
    console.debug("[Gemini RP fallback]", {
      from: modelName,
      to: getOpenRouterModelName(fallbackModel),
    })
  }
  return fallbackContent
}

async function callFreeRoleplay(finalMessages: ChatMessages, model: ChatModelConfig) {
  const profile = getRoleplayModelProfile(model)
  return runQueued(async () => {
    const postResponse = await withTimeout(fetch("https://text.pollinations.ai/openai?referrer=storychat-local", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "StoryChat Local Dev",
      },
      body: JSON.stringify({
        model: "openai",
        messages: finalMessages,
        temperature: profile.temperature,
        max_tokens: profile.maxOutputTokens || model.maxTokens || 1400,
        stream: false,
      }),
    }), POLLINATIONS_TIMEOUT_MS)

    if (!postResponse.ok) {
      throw new ChatApiError(`Pollinations text API failed: ${postResponse.status}`, postResponse.status)
    }

    const data = await postResponse.json() as {
      choices?: Array<{
        message?: {
          content?: string
        }
      }>
    }
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) throw new ChatApiError("Pollinations returned empty content", 502)

    return content
  })
}

async function callModelProviderRoleplay(
  finalMessages: ChatMessages,
  model: ChatModelConfig,
  mode: ChatModelMode | undefined,
  userName?: string,
) {
  if (model.provider === "openrouter") return callOpenRouterRoleplay(finalMessages, model, userName)
  if (model.provider === "openai") return callOpenAIRoleplay(finalMessages, model)
  if (model.provider === "gemini") {
    return callGeminiRoleplay(finalMessages, model)
  }

  return callFreeRoleplay(finalMessages, model)
}

async function handleRoleplayRulesBypassChat(
  normalizedBody: ReturnType<typeof normalizeBody>,
  model: ChatModelConfig,
) {
  const messages = normalizedBody.messages.some((message) => message.role === "system")
    ? normalizedBody.messages
    : normalizedBody.systemPrompt
      ? [{ role: "system" as const, content: normalizedBody.systemPrompt }, ...normalizedBody.messages]
      : normalizedBody.messages
  const nonSystemMessages = messages.filter((message) => message.role !== "system")

  if (nonSystemMessages.length === 0) {
    throw new ChatApiError("Test bypass requires at least one non-system message", 400)
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[RP test bypass enabled]", {
      provider: model.provider,
      model: getProviderModelName(model),
      messages: nonSystemMessages.length,
      keepsSystemPrompt: messages.some((message) => message.role === "system"),
    })
  }

  const rawResult = await callModelProviderRoleplay(
    messages,
    model,
    normalizedBody.mode,
    normalizedBody.promptContext.userName,
  )
  const result = normalizeOpenRouterOutput(rawResult)
  if (!result) throw new ChatApiError("Provider returned empty content", 502)

  return NextResponse.json({
    result,
    validation_status: "passed" satisfies RoleplayValidationStatus,
    validation_failures: [],
    repair_attempted: false,
    fallback: false,
  })
}

async function handleGeminiChat(messages: NonNullable<ChatRequestBody["messages"]>, mode: Extract<ChatModelMode, "normal" | "premium">) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY가 설정되어 있지 않습니다. .env.local 또는 배포 환경변수에 GEMINI_API_KEY를 추가해 주세요." },
      { status: 503 },
    )
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const prompt = formatMessagesForGemini(messages)
  const modelCandidates = getGeminiModelCandidates(mode)
  let lastError: unknown

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        safetySettings: GEMINI_SAFETY_SETTINGS,
      })
      const response = await withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS)
      const result = response.response.text().trim()

      if (!result) {
        return NextResponse.json({ error: `${modelName} returned empty content` }, { status: 502 })
      }

      return NextResponse.json({ result })
    } catch (error) {
      lastError = error
      if (!isGeminiModelNotFoundError(error)) throw error
    }
  }

  throw new Error(
    `Gemini 모델을 찾지 못했습니다. 시도한 모델: ${modelCandidates.join(", ")}. ${lastError instanceof Error ? lastError.message : ""}`.trim(),
  )
}

async function handleRoleplayChatFromNormalized(
  normalizedBody: ReturnType<typeof normalizeBody>,
  model: ChatModelConfig,
  requestId?: string,
) {
  const { mode, messages, promptContext } = normalizedBody
  if (normalizedBody.bypassRoleplayRules) {
    return handleRoleplayRulesBypassChat(normalizedBody, model)
  }

  const profile = getRoleplayModelProfile(model)
  assertRoleplayRequestAllowed(promptContext, messages)
  const latestRawInput = getLatestUserMessageContent(messages)
  const normalizerOpenRouterModel = model.provider === "openrouter" ? getOpenRouterModelName(model) : undefined
  const userName = promptContext.userName || "사용자"
  const characterName = promptContext.characterName || "캐릭터"
  let normalizedLatestInput = (await normalizeUserInputWithAI({
    rawInput: latestRawInput,
    userName,
    currentScene: promptContext.currentScene || "",
    userSetting: promptContext.userSetting || "",
    latestUserIntent: promptContext.latestUserIntent,
    fallbackOpenRouterModel: normalizerOpenRouterModel,
  })) ?? normalizeUserInputFallback(latestRawInput, userName, promptContext.latestUserIntent, characterName)

  if (isUnderNormalizedUserInput(latestRawInput, normalizedLatestInput)) {
    normalizedLatestInput = (await normalizeUserInputWithAI({
      rawInput: latestRawInput,
      userName,
      currentScene: promptContext.currentScene || "",
      userSetting: promptContext.userSetting || "",
      latestUserIntent: promptContext.latestUserIntent,
      fallbackOpenRouterModel: normalizerOpenRouterModel,
      strictConcrete: true,
    })) ?? normalizeUserInputFallback(latestRawInput, userName, promptContext.latestUserIntent, characterName)
  }

  if (isUnderNormalizedUserInput(latestRawInput, normalizedLatestInput)) {
    normalizedLatestInput = normalizeUserInputFallback(latestRawInput, userName, promptContext.latestUserIntent, characterName)
  }

  if (process.env.DEBUG_RP_NORMALIZER === "1") {
    console.debug("[RP normalizer]", {
      rawInput: latestRawInput,
      normalizedLatestInput,
    })
  }

  const compiledContext = compileRoleplayContext(promptContext, messages, normalizedLatestInput)
  const currentSceneForPrompt = buildTurnCurrentSceneForPrompt(
    promptContext.currentScene,
    compiledContext.latestInput,
    userName,
  )
  const modelBackground = buildModelBackground({
    background: promptContext.background,
    characterName,
    userName,
    latestUserIntent: compiledContext.latestInput.intent,
    currentScene: currentSceneForPrompt,
  })
  const systemPromptText = generateDynamicPrompt({
    characterName,
    userName,
    modelBackground,
    characterSetting: promptContext.characterSetting,
    userSetting: promptContext.userSetting,
    currentScene: currentSceneForPrompt,
    compiledContext,
    profile,
  })
  const finalMessages = buildRoleplayMessages(
    messages,
    systemPromptText,
    userName,
    compiledContext,
  )
  const requestCompletion = (requestMessages: typeof finalMessages) => callModelProviderRoleplay(
    requestMessages,
    model,
    mode,
    userName,
  )

  if (process.env.NODE_ENV !== "production") {
    console.debug("[RP pipeline enabled]", true)
    console.debug("[RP requestId]", requestId)
    console.debug("[RP profile]", profile.id)
    console.debug("[RP provider]", profile.provider)
    console.debug("[RP model]", profile.modelName)
    console.debug("[RP promptStyle]", profile.promptStyle)
    console.debug("[RP outputMode]", profile.outputMode)
    console.debug("[RP normalizedInput]", normalizedLatestInput)
    console.debug("[RP modelBackground]", modelBackground)
    console.debug("[RP final system prompt preview]", systemPromptText.slice(0, 1200))
    console.debug("[RP finalMessages]", finalMessages)
  }

  const rawResult = await requestCompletion(finalMessages)
  let result = normalizeOpenRouterOutput(rawResult)
  let repairAttempted = false
  let fallbackUsed = false
  let validation: RoleplayValidationErrors
  const validationAttempts: RoleplayValidationAttempt[] = []
  let validationSeverityOverrides: Partial<Record<RoleplayValidationKey, "hard" | "repairable" | "soft">> = {}
  const classify = (
    errors: RoleplayValidationErrors,
    severityOverrides = validationSeverityOverrides,
  ) => classifyValidationErrors(errors, profile, severityOverrides)

  if (!result) {
    validationAttempts.push(buildSyntheticValidationAttempt("initial", ["empty-provider-response"]))
    if (!profile.fallback.allowLocalFallback) {
      throw new ChatApiError(
        "Provider returned empty content",
        502,
        ["empty-provider-response"],
        "failed",
        repairAttempted,
        fallbackUsed,
        validationAttempts,
      )
    }
    fallbackUsed = true
    result = buildSafeFallbackReply(compiledContext)
    const validationResult = await validateRoleplayOutputWithJudge(result, compiledContext, profile)
    validation = validationResult.errors
    validationSeverityOverrides = validationResult.severityOverrides
    validationAttempts.push(buildValidationAttempt("fallback", validation, classify(validation)))
  } else {
    const validationResult = await validateRoleplayOutputWithJudge(result, compiledContext, profile)
    validation = validationResult.errors
    validationSeverityOverrides = validationResult.severityOverrides
    let classifiedValidation = classify(validation)
    validationAttempts.push(buildValidationAttempt("initial", validation, classifiedValidation))

    if (hasClassifiedFailures(classifiedValidation)) {
      const originalResult = result
      const originalValidation = validation
      const originalClassifiedValidation = classifiedValidation
      const originalHadHardFail = originalClassifiedValidation.hard.length > 0

      console.warn("[RP validation failed]", {
        requestId,
        failures: getValidationFailureKeys(validation),
        hardFailures: classifiedValidation.hard,
        repairableFailures: classifiedValidation.repairable,
        model: model.provider === "openrouter" ? getOpenRouterModelName(model) : model.id,
        contentPreview: result.slice(0, 300),
      })
      if (process.env.NODE_ENV !== "production") {
        console.debug("[RP validation classified]", classifiedValidation)
      }
      repairAttempted = true
      const retryMessages = [
        ...finalMessages,
        {
          role: "user" as const,
          content: buildRepairPrompt(validation, compiledContext),
        },
      ]
      const retryRawResult = await requestCompletion(retryMessages)
      const retryResult = retryRawResult ? normalizeOpenRouterOutput(retryRawResult) : ""
      const retryValidationResult = retryResult ? await validateRoleplayOutputWithJudge(retryResult, compiledContext, profile) : null
      const retryValidation = retryValidationResult?.errors ?? null
      const retrySeverityOverrides = retryValidationResult?.severityOverrides ?? {}
      const retryClassifiedValidation = retryValidation ? classify(retryValidation, retrySeverityOverrides) : null
      if (retryValidation && retryClassifiedValidation) {
        validationAttempts.push(buildValidationAttempt("repair", retryValidation, retryClassifiedValidation))
      } else {
        validationAttempts.push(buildSyntheticValidationAttempt("repair", ["empty-repair"]))
      }

      if (retryResult && retryValidation && retryClassifiedValidation && retryClassifiedValidation.hard.length === 0) {
        result = retryResult
        validation = retryValidation
        validationSeverityOverrides = retrySeverityOverrides
        classifiedValidation = retryClassifiedValidation

        if (retryClassifiedValidation.repairable.length > 0 && process.env.NODE_ENV !== "production") {
          console.debug("[RP repair accepted with warnings]", {
            requestId,
            failures: getValidationFailureKeys(retryValidation),
            repairableFailures: retryClassifiedValidation.repairable,
            stackedRepairableFailures: retryClassifiedValidation.repairable.length >= 2,
            preview: retryResult.slice(0, 300),
          })
        }
      } else if (originalHadHardFail) {
        const retryFailures = retryValidation ? getValidationFailureKeys(retryValidation) : ["empty-repair"]
        const hardFailures = retryClassifiedValidation?.hard.length
          ? retryClassifiedValidation.hard
          : originalClassifiedValidation.hard
        console.warn("[RP repair failed after hard validation; trying local fallback]", {
          requestId,
          failures: retryFailures,
          hardFailures,
          retryPreview: retryResult.slice(0, 300),
        })
        if (!profile.fallback.allowLocalFallback) {
          throw buildValidationFailedError(hardFailures, {
            repairAttempted,
            fallback: fallbackUsed,
            validationAttempts,
          })
        }
        fallbackUsed = true
        result = buildSafeFallbackReply(compiledContext)
        const fallbackValidationResult = await validateRoleplayOutputWithJudge(result, compiledContext, profile)
        validation = fallbackValidationResult.errors
        validationSeverityOverrides = fallbackValidationResult.severityOverrides
        classifiedValidation = classify(validation)
        validationAttempts.push(buildValidationAttempt("fallback", validation, classifiedValidation))

        if (classifiedValidation.hard.length > 0) {
          throw buildValidationFailedError(classifiedValidation.hard, {
            repairAttempted,
            fallback: fallbackUsed,
            validationAttempts,
          })
        }
      } else {
        result = originalResult
        validation = originalValidation

        if (process.env.NODE_ENV !== "production") {
          console.debug("[RP repair discarded; accepting original with warnings]", {
            requestId,
            failures: getValidationFailureKeys(originalValidation),
            repairableFailures: originalClassifiedValidation.repairable,
            retryFailures: retryValidation ? getValidationFailureKeys(retryValidation) : ["empty-repair"],
            retryPreview: retryResult.slice(0, 300),
          })
        }
      }
    }
  }

  const finalValidationResult = await validateRoleplayOutputWithJudge(result, compiledContext, profile)
  const finalValidation = finalValidationResult.errors
  validationSeverityOverrides = finalValidationResult.severityOverrides
  validation = finalValidation
  const finalClassifiedValidation = classify(finalValidation)
  validationAttempts.push(buildValidationAttempt("final", finalValidation, finalClassifiedValidation))

  if (finalClassifiedValidation.hard.length > 0) {
    const failures = finalClassifiedValidation.hard
    console.warn("[RP final hard validation failed; returning failed response]", {
      requestId,
      failures,
      contentPreview: result.slice(0, 300),
    })
    throw buildValidationFailedError(failures, {
      repairAttempted,
      fallback: fallbackUsed,
      validationAttempts,
    })
  }

  const validationMetadata = buildValidationMetadata({
    errors: validation,
    repairAttempted,
    fallback: fallbackUsed,
  })

  if (
    validationMetadata.validationStatus === "accepted_with_warnings" &&
    process.env.NODE_ENV !== "production"
  ) {
    console.debug("[RP accepted with warnings]", {
      requestId,
      failures: validationMetadata.validationFailures,
      repairAttempted,
      fallback: fallbackUsed,
    })
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[RP repair attempted]", repairAttempted)
    console.debug("[RP fallback used]", fallbackUsed)
    console.debug("[RP final status]", validationMetadata.validationStatus)
  }

  return NextResponse.json({
    result,
    validation_status: validationMetadata.validationStatus,
    validation_failures: validationMetadata.validationFailures,
    validation_attempts: validationAttempts,
    repair_attempted: validationMetadata.repairAttempted,
    fallback: validationMetadata.fallback,
  })
}

async function handleRoleplayChat(body: ChatRequestBody | null, model: ChatModelConfig, requestId?: string) {
  return handleRoleplayChatFromNormalized(normalizeBody(body), model, requestId)
}

export async function runRoleplayPipeline(body: ChatRequestBody | null, model: ChatModelConfig, requestId?: string) {
  return handleRoleplayChat(body, model, requestId)
}

async function handleOpenRouterNsfwChat(
  messages: NonNullable<ChatRequestBody["messages"]>,
  promptContext: DynamicPromptContext,
  model: ChatModelConfig,
) {
  return handleRoleplayChatFromNormalized({
    mode: "nsfw",
    modelId: model.id,
    messages,
    systemPrompt: "",
    fallbackPrompt: messages
      .filter((message) => message.role !== "system")
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n\n"),
    bypassRoleplayRules: false,
    debugRawRoleplayStream: false,
    promptContext: {
      characterName: promptContext.characterName,
      userName: promptContext.userName,
      background: promptContext.background,
      characterSetting: promptContext.characterSetting,
      userSetting: promptContext.userSetting,
      currentScene: promptContext.currentScene || "",
      latestUserIntent: promptContext.latestUserIntent,
      sceneState: promptContext.sceneState,
    },
  }, model)
}

async function handleFreeChat(
  messages: ChatRequestBody["messages"],
  systemPrompt: string,
  fallbackPrompt: string,
  model: ChatModelConfig,
) {
  return runQueued(async () => {
    const postResponse = await withTimeout(fetch("https://text.pollinations.ai/openai?referrer=storychat-local", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "StoryChat Local Dev",
      },
      body: JSON.stringify({
        model: "openai",
        messages,
        temperature: 0.9,
        max_tokens: model.maxTokens ?? 1400,
        stream: false,
      }),
    }), POLLINATIONS_TIMEOUT_MS)

    if (postResponse.ok) {
      const data = await postResponse.json() as {
        choices?: Array<{
          message?: {
            content?: string
          }
        }>
      }
      const content = data.choices?.[0]?.message?.content?.trim()
      if (content) return NextResponse.json({ content })
    }

    if (postResponse.status !== 403 && postResponse.status !== 429) {
      return NextResponse.json(
        { error: `Pollinations text API failed: ${postResponse.status}` },
        { status: postResponse.status },
      )
    }

    const fallbackParams = new URLSearchParams({
      model: "mistral",
      temperature: "0.9",
      system: [
        systemPrompt,
        model.minAnswerChars ? `답변은 한국어 기준 최소 ${model.minAnswerChars}자 이상으로 충분히 작성한다.` : "",
      ].filter(Boolean).join("\n\n"),
      referrer: "storychat-local",
    })
    const fallbackResponse = await withTimeout(fetch(
      `https://text.pollinations.ai/${encodeURIComponent(fallbackPrompt)}?${fallbackParams.toString()}`,
      {
        headers: {
          "User-Agent": "StoryChat Local Dev",
        },
      },
    ), POLLINATIONS_TIMEOUT_MS)

    if (!fallbackResponse.ok) {
      return NextResponse.json(
        { error: `Pollinations fallback text API failed: ${fallbackResponse.status}` },
        { status: fallbackResponse.status },
      )
    }

    const content = (await fallbackResponse.text()).trim()
    if (!content) {
      return NextResponse.json({ error: "Pollinations returned empty content" }, { status: 502 })
    }

    return NextResponse.json({ content })
  })
}

async function handleOpenAIChat(messages: ChatRequestBody["messages"], model: ChatModelConfig) {
  const apiKey = getOpenAIApiKey()
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY가 설정되어 있지 않습니다. .env.local 또는 배포 환경변수에 OPENAI_API_KEY를 추가해 주세요." },
      { status: 503 },
    )
  }

  const response = await withTimeout(fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_CHAT_MODEL || DEFAULT_OPENAI_CHAT_MODEL,
      messages,
      temperature: 0.9,
      max_tokens: model.maxTokens ?? 3200,
    }),
  }), OPENAI_TIMEOUT_MS)

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    return NextResponse.json(
      { error: errorText || `OpenAI chat API failed: ${response.status}` },
      { status: response.status },
    )
  }

  const data = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    return NextResponse.json({ error: "OpenAI returned empty content" }, { status: 502 })
  }

  return NextResponse.json({ result: content })
}

async function handlePlainChat(
  normalizedBody: ReturnType<typeof normalizeBody>,
  model: ChatModelConfig,
) {
  const { mode, messages, systemPrompt, fallbackPrompt } = normalizedBody

  if (model.provider === "openai") {
    return handleOpenAIChat(messages, model)
  }

  if (mode === "premium" || mode === "normal") {
    return handleGeminiChat(messages, mode)
  }

  return handleFreeChat(messages, systemPrompt, fallbackPrompt, model)
}

export async function runPlainChat(
  normalizedBody: ReturnType<typeof normalizeBody>,
  model: ChatModelConfig,
) {
  return handlePlainChat(normalizedBody, model)
}

async function readChatResultFromResponse(response: Response) {
  const data = await response.json().catch(() => null) as {
    result?: string
    content?: string
    error?: string
    validation_status?: RoleplayValidationStatus
    validation_failures?: string[]
    validation_attempts?: RoleplayValidationAttempt[]
    repair_attempted?: boolean
    fallback?: boolean
  } | null

  if (!response.ok) {
    throw new ChatApiError(data?.error || `Chat API failed: ${response.status}`, response.status)
  }

  const content = (data?.result ?? data?.content)?.trim()
  if (!content) throw new ChatApiError("Chat API returned empty result", 502)

  return {
    content,
    validationStatus: data?.validation_status,
    validationFailures: data?.validation_failures ?? [],
    validationAttempts: data?.validation_attempts ?? [],
    repairAttempted: Boolean(data?.repair_attempted),
    fallback: Boolean(data?.fallback),
  }
}

async function streamGeminiRoleplay({
  body,
  normalizedBody,
  model,
  send,
  runId,
  messageId,
  roomId,
  userMessageId,
  startedAt,
}: {
  body: ChatRequestBody | null
  normalizedBody: ReturnType<typeof normalizeBody>
  model: ChatModelConfig
  send: (payload: Record<string, unknown>) => void
  runId: string
  messageId: string
  roomId: string
  userMessageId: string
  startedAt: number
}) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new ChatApiError(
      "GEMINI_API_KEY가 설정되어 있지 않습니다. .env.local 또는 배포 환경변수에 GEMINI_API_KEY를 추가해 주세요.",
      503,
    )
  }

  const sendPhase = (phase: string, phaseLabel: string) => {
    send({
      event_type: "phase",
      phase,
      phase_label: phaseLabel,
      elapsed_ms: Date.now() - startedAt,
      is_final_event: false,
      run_id: runId,
    })
  }

  sendPhase("preparing", "장면을 정리하는 중...")

  const { messages, promptContext } = normalizedBody
  const profile = getRoleplayModelProfile(model)
  let validationSeverityOverrides: Partial<Record<RoleplayValidationKey, "hard" | "repairable" | "soft">> = {}
  const classify = (
    errors: RoleplayValidationErrors,
    severityOverrides = validationSeverityOverrides,
  ) => classifyValidationErrors(errors, profile, severityOverrides)
  assertRoleplayRequestAllowed(promptContext, messages)
  const latestRawInput = getLatestUserMessageContent(messages)
  const userName = promptContext.userName || "사용자"
  const characterName = promptContext.characterName || "캐릭터"
  let normalizedLatestInput = (await normalizeUserInputWithAI({
    rawInput: latestRawInput,
    userName,
    currentScene: promptContext.currentScene || "",
    userSetting: promptContext.userSetting || "",
    latestUserIntent: promptContext.latestUserIntent,
    fallbackOpenRouterModel: undefined,
  })) ?? normalizeUserInputFallback(latestRawInput, userName, promptContext.latestUserIntent, characterName)

  if (isUnderNormalizedUserInput(latestRawInput, normalizedLatestInput)) {
    normalizedLatestInput = (await normalizeUserInputWithAI({
      rawInput: latestRawInput,
      userName,
      currentScene: promptContext.currentScene || "",
      userSetting: promptContext.userSetting || "",
      latestUserIntent: promptContext.latestUserIntent,
      strictConcrete: true,
    })) ?? normalizeUserInputFallback(latestRawInput, userName, promptContext.latestUserIntent, characterName)
  }

  const compiledContext = compileRoleplayContext(promptContext, messages, normalizedLatestInput)
  const currentSceneForPrompt = buildTurnCurrentSceneForPrompt(
    promptContext.currentScene,
    compiledContext.latestInput,
    userName,
  )
  const modelBackground = buildModelBackground({
    background: promptContext.background,
    characterName,
    userName,
    latestUserIntent: compiledContext.latestInput.intent,
    currentScene: currentSceneForPrompt,
  })
  const systemPromptText = generateDynamicPrompt({
    characterName,
    userName,
    modelBackground,
    characterSetting: promptContext.characterSetting,
    userSetting: promptContext.userSetting,
    currentScene: currentSceneForPrompt,
    compiledContext,
    profile,
  })
  const finalMessages = buildRoleplayMessages(messages, systemPromptText, userName, compiledContext)
  const { systemPrompt, contents } = splitGeminiRoleplayMessages(finalMessages)
  const modelName = profile.modelName
  const ai = new GoogleGenAI({ apiKey })

  let ttftMs: number | undefined
  let rawGeminiContent = ""
  let usedFallback = false
  let repairAttempted = false
  const validationAttempts: RoleplayValidationAttempt[] = []
  let fallbackProvider: string | undefined
  let fallbackModel: string | undefined
  let finishReason: string | undefined
  let safetyRatings: unknown

  try {
    sendPhase("generating", "답변을 생성하는 중...")
    const stream = await withTimeout(ai.models.generateContentStream({
      model: modelName,
      contents,
      config: {
        ...buildGeminiRoleplayConfig({
          profile,
          systemPrompt,
          safetySettings: GEMINI_RP_SAFETY_SETTINGS,
        }),
      },
    }), GEMINI_TIMEOUT_MS)

    for await (const chunk of stream) {
      finishReason = chunk.candidates?.[0]?.finishReason || finishReason
      safetyRatings = chunk.candidates?.[0]?.safetyRatings || safetyRatings
      const content = chunk.text || ""
      if (!content) continue
      if (ttftMs === undefined) ttftMs = Date.now() - startedAt
      rawGeminiContent += content
      if (normalizedBody.debugRawRoleplayStream) {
        send({
          event_type: "raw_delta",
          raw_content: content,
          elapsed_ms: Date.now() - startedAt,
          is_final_event: false,
          run_id: runId,
        })
      }
    }
  } catch (error) {
    if (!isGeminiTransientError(error)) throw error
    if (!allowsOpenRouterFallbackForGemini(model)) throw error
    const openRouterFallbackModel = buildOpenRouterFallbackModel()
    usedFallback = true
    fallbackProvider = "openrouter-after-gemini-unavailable"
    fallbackModel = getOpenRouterModelName(openRouterFallbackModel)
    sendPhase("fallback", "대체 응답을 준비하는 중...")
    rawGeminiContent = await callOpenRouterRoleplay(finalMessages, openRouterFallbackModel, userName)
    if (process.env.NODE_ENV !== "production") {
      console.debug("[Gemini RP stream transient fallback]", {
        requestId: runId,
        from: modelName,
        to: fallbackModel,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[Gemini RP model]", modelName)
    console.debug("[Gemini RP safety threshold]", GEMINI_SAFETY_THRESHOLD)
    console.debug("[Gemini RP finish reason]", finishReason)
    console.debug("[Gemini RP safety ratings]", safetyRatings)
    console.debug("[RP normalizedInput]", normalizedLatestInput)
    console.debug("[RP modelBackground]", modelBackground)
    console.debug("[RP final system prompt preview]", systemPromptText.slice(0, 1200))
  }

  sendPhase("validating", "답변을 검수하는 중...")
  let savedContent = normalizeOpenRouterOutput(rawGeminiContent)
  const initialValidationResult = savedContent ? await validateRoleplayOutputWithJudge(savedContent, compiledContext, profile) : null
  const initialValidation = initialValidationResult?.errors ?? null
  const initialSeverityOverrides = initialValidationResult?.severityOverrides ?? {}
  validationSeverityOverrides = initialSeverityOverrides
  const initialClassifiedValidation = initialValidation ? classify(initialValidation, initialSeverityOverrides) : null
  if (initialValidation && initialClassifiedValidation) {
    validationAttempts.push(buildValidationAttempt("initial", initialValidation, initialClassifiedValidation))
  } else if (!savedContent) {
    validationAttempts.push(buildSyntheticValidationAttempt("initial", ["empty-provider-response"]))
  }
  const shortMaxTokenOutput = isShortGeminiMaxTokenOutput(finishReason, savedContent)

  if (shortMaxTokenOutput) {
    if (allowsOpenRouterFallbackForGemini(model)) {
      usedFallback = true
      const openRouterFallbackModel = buildOpenRouterFallbackModel()
      fallbackProvider = "openrouter-after-gemini-truncated"
      fallbackModel = getOpenRouterModelName(openRouterFallbackModel)
      sendPhase("fallback", "끊긴 답변을 다시 준비하는 중...")
      if (process.env.NODE_ENV !== "production") {
        console.debug("[Gemini RP stream truncated fallback]", {
          requestId: runId,
          finishReason,
          rawGeminiPreview: rawGeminiContent.slice(0, 400),
          to: fallbackModel,
        })
      }
      savedContent = normalizeOpenRouterOutput(await callOpenRouterRoleplay(finalMessages, openRouterFallbackModel, userName))
    } else {
      repairAttempted = true
      fallbackProvider = "gemini-retry-after-truncated"
      fallbackModel = modelName
      sendPhase("repairing", "끊긴 답변을 다듬는 중...")
      if (process.env.NODE_ENV !== "production") {
        console.debug("[Gemini RP stream truncated retry]", {
          requestId: runId,
          finishReason,
          rawGeminiPreview: rawGeminiContent.slice(0, 400),
          model: modelName,
        })
      }
      const retryMessages = [
        ...finalMessages,
        {
          role: "user" as const,
          content: `방금 Gemini 응답이 MAX_TOKENS로 너무 짧게 끊겼다.
같은 장면을 처음부터 완성된 한 턴으로 다시 작성하라.
${userName}의 새 행동/감정/대사를 만들지 말고 ${characterName}의 반응만 써라.
300~550자.`,
        },
      ]
      savedContent = normalizeOpenRouterOutput(await callGeminiRoleplay(retryMessages, model))
    }
  } else if (!savedContent || isGeminiSafetyFinishReason(finishReason) || (initialClassifiedValidation && hasClassifiedFailures(initialClassifiedValidation))) {
    const contentBeforeRepair = savedContent
    const validationBeforeRepair = initialValidation
    const canRestoreRepairableOriginal = Boolean(
      contentBeforeRepair &&
      validationBeforeRepair &&
      initialClassifiedValidation &&
      initialClassifiedValidation.hard.length === 0 &&
      initialClassifiedValidation.repairable.length > 0 &&
      !isGeminiSafetyFinishReason(finishReason),
    )
    repairAttempted = true
    const repairFallbackModel = buildOpenRouterFallbackModel()
    const useOpenRouterRepair = fallbackProvider === "openrouter-after-gemini-unavailable"
    fallbackProvider = useOpenRouterRepair ? "openrouter-repair-after-gemini-unavailable" : "gemini-repair"
    fallbackModel = useOpenRouterRepair ? getOpenRouterModelName(repairFallbackModel) : modelName
    sendPhase("repairing", "답변을 다듬는 중...")
    const repairInstruction = initialValidation
      ? `${buildRepairPrompt(initialValidation, compiledContext)}

[끊긴 Gemini stream 초안]
${savedContent || rawGeminiContent.trim() || "(빈 응답)"}

위 초안이 중간에 끊겼다면 분위기와 갈등 지점만 이어받아 완성하라.
초안을 그대로 반복하지 말고, ${characterName}이 ${userName}의 마지막 도발에 반응하는 완성된 한 턴으로 다시 써라.`
      : `방금 Gemini 응답이 비었거나 safety finish로 중단됐다.
허용 가능한 성인 창작 RP 범위 안에서만 작성하라.
미성년자 성적 내용, 비동의/강압 미화, 착취/불법 성적 내용, 실존 인물 성적화, 자해/위험행위 조장은 쓰지 않는다.
현재 장면의 갈등, 대사, 거리감, 조건 제시에 집중해 300~600자로 다시 작성하라.

[끊긴 Gemini stream 초안]
${savedContent || rawGeminiContent.trim() || "(빈 응답)"}

초안이 있다면 그 흐름을 버리지 말고 같은 장면의 완성본으로 정리하라.`

    if (process.env.NODE_ENV !== "production") {
      console.debug("[Gemini RP stream validation failed]", {
        requestId: runId,
        finishReason,
        failures: initialValidation ? getValidationFailureKeys(initialValidation) : ["empty-or-safety"],
        classified: initialClassifiedValidation,
        rawGeminiPreview: rawGeminiContent.slice(0, 400),
      })
    }

    const repairMessages = [
      ...finalMessages,
      {
        role: "user" as const,
        content: repairInstruction,
      },
    ]
    const repairedContent = normalizeOpenRouterOutput(
      useOpenRouterRepair
        ? await callOpenRouterRoleplay(repairMessages, repairFallbackModel, userName)
        : await callGeminiRoleplay(repairMessages, model),
    )
    const repairedValidationResult = repairedContent ? await validateRoleplayOutputWithJudge(repairedContent, compiledContext, profile) : null
    const repairedValidation = repairedValidationResult?.errors ?? null
    const repairedSeverityOverrides = repairedValidationResult?.severityOverrides ?? {}
    const repairedClassifiedValidation = repairedValidation ? classify(repairedValidation, repairedSeverityOverrides) : null
    if (repairedValidation && repairedClassifiedValidation) {
      validationAttempts.push(buildValidationAttempt("repair", repairedValidation, repairedClassifiedValidation))
    } else {
      validationAttempts.push(buildSyntheticValidationAttempt("repair", ["empty-repair"]))
    }

    if (repairedContent && repairedValidation && repairedClassifiedValidation && repairedClassifiedValidation.hard.length === 0) {
      savedContent = repairedContent
      validationSeverityOverrides = repairedSeverityOverrides
      if (repairedClassifiedValidation.repairable.length >= 2 && process.env.NODE_ENV !== "production") {
        console.debug("[Gemini RP repair accepted with stacked warnings]", {
          requestId: runId,
          failures: getValidationFailureKeys(repairedValidation),
          repairableFailures: repairedClassifiedValidation.repairable,
        })
      }
    } else if (canRestoreRepairableOriginal) {
      savedContent = contentBeforeRepair
      if (process.env.NODE_ENV !== "production") {
        console.debug("[Gemini RP repair discarded; accepting original with warnings]", {
          requestId: runId,
          failures: validationBeforeRepair ? getValidationFailureKeys(validationBeforeRepair) : [],
          repairableFailures: initialClassifiedValidation?.repairable ?? [],
          repairedFailures: repairedValidation ? getValidationFailureKeys(repairedValidation) : ["empty-repair"],
          repairedPreview: repairedContent.slice(0, 400),
        })
      }
    } else {
      savedContent = repairedContent
    }
  }

  sendPhase("validating", "다듬은 답변을 검수하는 중...")
  const finalValidationResult = savedContent ? await validateRoleplayOutputWithJudge(savedContent, compiledContext, profile) : null
  const finalValidation = finalValidationResult?.errors ?? null
  const finalSeverityOverrides = finalValidationResult?.severityOverrides ?? {}
  validationSeverityOverrides = finalSeverityOverrides
  const finalClassifiedValidation = finalValidation ? classify(finalValidation, finalSeverityOverrides) : null
  if (
    savedContent &&
    finalValidation &&
    finalClassifiedValidation &&
    !repairAttempted &&
    hasClassifiedFailures(finalClassifiedValidation) &&
    fallbackProvider?.startsWith("openrouter-after-gemini")
  ) {
    repairAttempted = true
    const repairFallbackModel = buildOpenRouterFallbackModel()
    sendPhase("repairing", "대체 응답을 다듬는 중...")
    const repairMessages = [
      ...finalMessages,
      {
        role: "user" as const,
        content: `${buildRepairPrompt(finalValidation, compiledContext)}

방금 답변은 Gemini가 잘려서 OpenRouter fallback으로 생성한 초안이다.
초안의 핵심 반응은 유지하되, ${userName}의 새 행동/감정/대사를 만들지 말고 ${characterName}의 반응만 다시 써라.
허용되지 않은 손 묘사, 새 소품, 전지적 해설을 제거하라.
300~550자.`,
      },
    ]
    const repairedContent = normalizeOpenRouterOutput(await callOpenRouterRoleplay(repairMessages, repairFallbackModel, userName))
    const repairedValidationResult = repairedContent
      ? await validateRoleplayOutputWithJudge(repairedContent, compiledContext, profile)
      : finalValidation
        ? { errors: finalValidation, severityOverrides: finalSeverityOverrides }
        : null
    const repairedValidation = repairedValidationResult?.errors ?? finalValidation
    const repairedSeverityOverrides = repairedValidationResult?.severityOverrides ?? finalSeverityOverrides
    const repairedClassifiedValidation = repairedValidation ? classify(repairedValidation, repairedSeverityOverrides) : null

    if (repairedContent && repairedClassifiedValidation && repairedClassifiedValidation.hard.length === 0) {
      savedContent = repairedContent
      validationSeverityOverrides = repairedSeverityOverrides
      fallbackProvider = `${fallbackProvider}+repair`
      fallbackModel = getOpenRouterModelName(repairFallbackModel)

      if (repairedClassifiedValidation.repairable.length >= 2 && process.env.NODE_ENV !== "production") {
        console.debug("[Gemini RP fallback repair accepted with stacked warnings]", {
          requestId: runId,
          failures: repairedValidation ? getValidationFailureKeys(repairedValidation) : [],
          repairableFailures: repairedClassifiedValidation.repairable,
        })
      }
    }
  }

  let repairedFinalValidationResult = savedContent ? await validateRoleplayOutputWithJudge(savedContent, compiledContext, profile) : null
  let repairedFinalValidation = repairedFinalValidationResult?.errors ?? null
  let repairedFinalSeverityOverrides = repairedFinalValidationResult?.severityOverrides ?? {}
  let repairedFinalClassifiedValidation = repairedFinalValidation ? classify(repairedFinalValidation, repairedFinalSeverityOverrides) : null
  if (!savedContent || (repairedFinalClassifiedValidation && repairedFinalClassifiedValidation.hard.length > 0)) {
    if (!profile.fallback.allowLocalFallback) {
      const failures = repairedFinalClassifiedValidation?.hard ?? ["empty"]
      throw buildValidationFailedError(failures, {
        repairAttempted,
        fallback: usedFallback,
        validationAttempts,
      })
    }
    usedFallback = true
    fallbackProvider = "local-contextual-fallback"
    fallbackModel = "local"
    sendPhase("fallback", "안전한 대체 응답을 준비하는 중...")
    savedContent = buildContextualFallbackReply(compiledContext, rawGeminiContent)
    repairedFinalValidationResult = await validateRoleplayOutputWithJudge(savedContent, compiledContext, profile)
    repairedFinalValidation = repairedFinalValidationResult.errors
    repairedFinalSeverityOverrides = repairedFinalValidationResult.severityOverrides
    validationSeverityOverrides = repairedFinalSeverityOverrides
    repairedFinalClassifiedValidation = classify(repairedFinalValidation, repairedFinalSeverityOverrides)
    validationAttempts.push(buildValidationAttempt("fallback", repairedFinalValidation, repairedFinalClassifiedValidation))
  }

  if (repairedFinalValidation && repairedFinalClassifiedValidation) {
    validationAttempts.push(buildValidationAttempt("final", repairedFinalValidation, repairedFinalClassifiedValidation))
  }

  if (!savedContent || (repairedFinalClassifiedValidation && repairedFinalClassifiedValidation.hard.length > 0)) {
    const failures = repairedFinalClassifiedValidation ? repairedFinalClassifiedValidation.hard : ["empty"]
    if (process.env.NODE_ENV !== "production") {
      console.debug("[Gemini RP final validation failed; returning failed event]", {
        requestId: runId,
        failures,
        rawGeminiPreview: rawGeminiContent.slice(0, 400),
        repairedPreview: savedContent.slice(0, 400),
      })
    }
    send({
      event_type: "final",
      is_final_event: true,
      run_id: runId,
      message_id: messageId,
      saved_content: "",
      provider: "gemini",
      model: modelName,
      prompt_version: PROMPT_VERSION,
      normalizer_version: NORMALIZER_VERSION,
      validator_version: VALIDATOR_VERSION,
      validation_status: "failed",
      validation_failures: failures,
      validation_attempts: validationAttempts,
      repair_attempted: repairAttempted,
      ttft_ms: ttftMs ?? Date.now() - startedAt,
      mismatch: false,
      fallback: usedFallback,
      fallback_provider: fallbackProvider,
      fallback_model: fallbackModel,
      status: "failed",
      error: `RP validation failed: ${failures.join(", ")}`,
      room_id: roomId,
      user_message_id: userMessageId,
    })
    return
  }

  const validationMetadata = buildValidationMetadata({
    errors: repairedFinalValidation,
    repairAttempted,
    fallback: usedFallback,
  })

  if (
    validationMetadata.validationStatus === "accepted_with_warnings" &&
    process.env.NODE_ENV !== "production"
  ) {
    console.debug("[Gemini RP accepted with warnings]", {
      requestId: runId,
      failures: validationMetadata.validationFailures,
      repairAttempted,
      fallback: usedFallback,
    })
  }

  let streamedContent = ""
  sendPhase("finalizing", "답변을 표시하는 중...")
  for (const content of splitStreamContent(savedContent)) {
    if (ttftMs === undefined) ttftMs = Date.now() - startedAt
    streamedContent += content
    send({
      event_type: "delta",
      content,
      is_final_event: false,
    })
  }

  const mismatch = streamedContent !== savedContent
  if (process.env.NODE_ENV !== "production") {
    console.debug("[generation stream final]", {
      requestId: runId,
      runId,
      provider: "gemini",
      model: modelName,
      rawGeminiContentLength: rawGeminiContent.length,
      streamedContentLength: streamedContent.length,
      savedContentLength: savedContent.length,
      mismatch,
      validationStatus: validationMetadata.validationStatus,
      validationFailures: validationMetadata.validationFailures,
      validationAttempts,
      repairAttempted: validationMetadata.repairAttempted,
      fallback: validationMetadata.fallback,
      fallbackProvider,
      fallbackModel,
      ttft_ms: ttftMs ?? Date.now() - startedAt,
    })
  }

  send({
    event_type: "final",
    is_final_event: true,
    run_id: runId,
    message_id: messageId,
    saved_content: savedContent,
    provider: "gemini",
    model: modelName,
    prompt_version: PROMPT_VERSION,
    normalizer_version: NORMALIZER_VERSION,
    validator_version: VALIDATOR_VERSION,
    validation_status: validationMetadata.validationStatus,
    validation_failures: validationMetadata.validationFailures,
    validation_attempts: validationAttempts,
    repair_attempted: validationMetadata.repairAttempted,
    ttft_ms: ttftMs ?? Date.now() - startedAt,
    mismatch,
    fallback: validationMetadata.fallback,
    fallback_provider: fallbackProvider,
    fallback_model: fallbackModel,
    status: "completed",
    room_id: roomId,
    user_message_id: userMessageId,
  })
}

export function runChatEventStream({
  body,
  normalizedBody,
  model,
  roleplayEnabled,
}: {
  body: ChatRequestBody | null
  normalizedBody: ReturnType<typeof normalizeBody>
  model: ChatModelConfig
  roleplayEnabled: boolean
}) {
  const encoder = new TextEncoder()
  const runId = makeServerId("run")
  const messageId = body?.characterMessageId?.trim() || makeServerId("msg")
  const roomId = body?.roomId?.trim() || "local"
  const userMessageId = body?.userMessageId?.trim() || ""
  const provider = model.provider
  const providerModel = getProviderModelName(model)
  const startedAt = Date.now()
  const bypassRoleplayRules = normalizedBody.bypassRoleplayRules

  const stream = new ReadableStream({
    async start(controller) {
      let eventId = 0
      let streamedContent = ""
      let ttftMs: number | undefined

      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(encodeStreamEvent({ event_id: eventId++, ...payload })))
      }

      const sendPhase = (phase: string, phaseLabel: string) => {
        send({
          event_type: "phase",
          phase,
          phase_label: phaseLabel,
          elapsed_ms: Date.now() - startedAt,
          is_final_event: false,
          run_id: runId,
        })
      }

      try {
        if (roleplayEnabled && model.provider === "gemini" && !bypassRoleplayRules) {
          await streamGeminiRoleplay({
            body,
            normalizedBody,
            model,
            send,
            runId,
            messageId,
            roomId,
            userMessageId,
            startedAt,
          })
          return
        }

        sendPhase("generating", roleplayEnabled ? "답변을 생성하는 중..." : "답변을 준비하는 중...")
        const response = roleplayEnabled
          ? await handleRoleplayChat(body, model, runId)
          : await handlePlainChat(normalizedBody, model)
        const chatResult = await readChatResultFromResponse(response)
        const savedContent = chatResult.content
        const chunks = splitStreamContent(savedContent)

        sendPhase("finalizing", "답변을 표시하는 중...")
        for (const chunk of chunks) {
          if (ttftMs === undefined) ttftMs = Date.now() - startedAt
          streamedContent += chunk
          send({
            event_type: "delta",
            content: chunk,
            is_final_event: false,
          })
        }

        const mismatch = streamedContent !== savedContent
        if (process.env.NODE_ENV !== "production") {
          console.debug("[generation stream final]", {
            requestId: runId,
            runId,
            provider,
            model: providerModel,
            streamedContentLength: streamedContent.length,
            savedContentLength: savedContent.length,
            mismatch,
            validationStatus: roleplayEnabled ? chatResult.validationStatus ?? "passed" : undefined,
            validationFailures: roleplayEnabled ? chatResult.validationFailures : undefined,
            validationAttempts: roleplayEnabled ? chatResult.validationAttempts : undefined,
            repairAttempted: roleplayEnabled ? chatResult.repairAttempted : undefined,
            fallback: roleplayEnabled ? chatResult.fallback : undefined,
            ttft_ms: ttftMs ?? Date.now() - startedAt,
          })
        }

        send({
          event_type: "final",
          is_final_event: true,
          run_id: runId,
          message_id: messageId,
          saved_content: savedContent,
          provider,
          model: providerModel,
          prompt_version: PROMPT_VERSION,
          normalizer_version: roleplayEnabled && !bypassRoleplayRules ? NORMALIZER_VERSION : undefined,
          validator_version: roleplayEnabled && !bypassRoleplayRules ? VALIDATOR_VERSION : undefined,
          validation_status: roleplayEnabled ? chatResult.validationStatus ?? "passed" : undefined,
          validation_failures: roleplayEnabled ? chatResult.validationFailures : undefined,
          validation_attempts: roleplayEnabled ? chatResult.validationAttempts : undefined,
          repair_attempted: roleplayEnabled ? chatResult.repairAttempted : undefined,
          ttft_ms: ttftMs ?? Date.now() - startedAt,
          mismatch,
          fallback: roleplayEnabled ? chatResult.fallback : undefined,
          status: "completed",
          room_id: roomId,
          user_message_id: userMessageId,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Chat stream failed"
        const validationFailures = error instanceof ChatApiError ? error.validationFailures : []
        const validationAttempts = error instanceof ChatApiError ? error.validationAttempts : []
        const validationRepairAttempted = error instanceof ChatApiError ? error.repairAttempted : undefined
        const validationFallback = error instanceof ChatApiError ? Boolean(error.fallback) : false
        send({
          event_type: "final",
          is_final_event: true,
          run_id: runId,
          message_id: messageId,
          saved_content: "",
          provider,
          model: providerModel,
          prompt_version: PROMPT_VERSION,
          normalizer_version: roleplayEnabled && !bypassRoleplayRules ? NORMALIZER_VERSION : undefined,
          validator_version: roleplayEnabled && !bypassRoleplayRules ? VALIDATOR_VERSION : undefined,
          validation_status: roleplayEnabled ? "failed" : undefined,
          validation_failures: roleplayEnabled ? validationFailures : undefined,
          validation_attempts: roleplayEnabled ? validationAttempts : undefined,
          repair_attempted: roleplayEnabled ? validationRepairAttempted : undefined,
          fallback: roleplayEnabled ? validationFallback : undefined,
          ttft_ms: ttftMs ?? Date.now() - startedAt,
          mismatch: false,
          status: "failed",
          error: message,
          room_id: roomId,
          user_message_id: userMessageId,
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
