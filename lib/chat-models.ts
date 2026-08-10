export type ChatModelId = "free" | "gemini-pro" | "gemini-3-flash-rp" | "openai" | "openai-gpt-5.6-terra" | "cohere/command-r-plus-08-2024" | "google/gemini-2.5-flash"

export type ChatModelProvider = "gemini" | "openai" | "openrouter" | "pollinations"
export type ChatModelMode = "normal" | "premium" | "nsfw"

export type ChatModelConfig = {
  id: ChatModelId
  label: string
  description: string
  provider: ChatModelProvider
  mode?: ChatModelMode
  creditCostPerReply: number
  minAnswerChars?: number
  maxAnswerChars?: number
  maxTokens?: number
  badge?: string
  providerModel?: string
  openRouterModel?: string
}

export const MIN_REPLY_CREDIT_COST = 20
export const MAX_REPLY_CREDIT_COST = 110
const REPLY_CREDIT_STEP = 5
const ESTIMATED_REPLY_INPUT_TOKENS = 10_000
const ESTIMATED_REPLY_OUTPUT_TOKENS = 1_500

// Standard API prices in USD per million tokens, updated 2026-08-10.
export const MODEL_TOKEN_PRICES_USD = {
  gemini25Flash: { input: 0.3, output: 2.5 },
  gemini25Pro: { input: 1.25, output: 10 },
  gpt4oMini: { input: 0.15, output: 0.6 },
  gpt56Terra: { input: 2.5, output: 15 },
  gemini3Flash: { input: 0.5, output: 3 },
  commandRPlus: { input: 2.5, output: 10 },
} as const

type ReplyBillingModel = keyof typeof MODEL_TOKEN_PRICES_USD

function estimateStandardReplyCostUsd(model: ReplyBillingModel) {
  const price = MODEL_TOKEN_PRICES_USD[model]
  return (
    (price.input * ESTIMATED_REPLY_INPUT_TOKENS +
      price.output * ESTIMATED_REPLY_OUTPUT_TOKENS) /
    1_000_000
  )
}

function calculateReplyCreditCost(model: ReplyBillingModel) {
  const maximumCost = estimateStandardReplyCostUsd("gpt56Terra")
  const proportionalCredits =
    (estimateStandardReplyCostUsd(model) / maximumCost) * MAX_REPLY_CREDIT_COST
  const steppedCredits =
    Math.ceil(proportionalCredits / REPLY_CREDIT_STEP) * REPLY_CREDIT_STEP
  return Math.min(
    MAX_REPLY_CREDIT_COST,
    Math.max(MIN_REPLY_CREDIT_COST, steppedCredits),
  )
}

export const REPLY_CREDIT_COSTS = {
  gemini25Flash: calculateReplyCreditCost("gemini25Flash"),
  gemini25Pro: calculateReplyCreditCost("gemini25Pro"),
  gpt4oMini: calculateReplyCreditCost("gpt4oMini"),
  gpt56Terra: calculateReplyCreditCost("gpt56Terra"),
  gemini3Flash: calculateReplyCreditCost("gemini3Flash"),
  commandRPlus: calculateReplyCreditCost("commandRPlus"),
} as const
export const DEFAULT_MIN_ANSWER_CHARS = 700
export const DEFAULT_MAX_ANSWER_CHARS = 1100
export const MAX_TURN_CONTENT_CHARS = 1500

export const CHAT_MODELS: ChatModelConfig[] = [
  {
    id: "free",
    label: "Gemini 2.5 Flash",
    description: "빠른 응답 · 가볍고 자연스러운 기본 대화",
    provider: "gemini",
    mode: "normal",
    creditCostPerReply: REPLY_CREDIT_COSTS.gemini25Flash,
    minAnswerChars: DEFAULT_MIN_ANSWER_CHARS,
    maxAnswerChars: DEFAULT_MAX_ANSWER_CHARS,
    maxTokens: 4000,
    badge: "기본",
  },
  {
    id: "openai",
    label: "GPT-4o mini",
    description: "빠른 대화 호흡 · 명확하고 직설적인 캐릭터 반응",
    provider: "openai",
    creditCostPerReply: REPLY_CREDIT_COSTS.gpt4oMini,
    minAnswerChars: DEFAULT_MIN_ANSWER_CHARS,
    maxAnswerChars: DEFAULT_MAX_ANSWER_CHARS,
    maxTokens: 4000,
    badge: "대화",
    providerModel: "gpt-4o-mini",
  },
  {
    id: "gemini-3-flash-rp",
    label: "Gemini 3 Flash RP",
    description: "몰입형 장면 묘사 · 캐릭터성과 장면 연속성 중심",
    provider: "gemini",
    providerModel: "gemini-3-flash-preview",
    mode: "nsfw",
    creditCostPerReply: REPLY_CREDIT_COSTS.gemini3Flash,
    minAnswerChars: DEFAULT_MIN_ANSWER_CHARS,
    maxAnswerChars: DEFAULT_MAX_ANSWER_CHARS,
    maxTokens: 6000,
    badge: "몰입",
  },
  {
    id: "gemini-pro",
    label: "Gemini 2.5 Pro",
    description: "정교한 서사 · 복잡한 감정선과 긴 맥락에 강함",
    provider: "gemini",
    mode: "premium",
    creditCostPerReply: REPLY_CREDIT_COSTS.gemini25Pro,
    minAnswerChars: DEFAULT_MIN_ANSWER_CHARS,
    maxAnswerChars: DEFAULT_MAX_ANSWER_CHARS,
    maxTokens: 6000,
    badge: "정밀",
    providerModel: "gemini-2.5-pro",
  },
  {
    id: "cohere/command-r-plus-08-2024",
    label: "Command R+",
    description: "자연스러운 한국어 · 담백한 대사와 안정적인 사건 전개",
    provider: "openrouter",
    mode: "nsfw",
    creditCostPerReply: REPLY_CREDIT_COSTS.commandRPlus,
    minAnswerChars: DEFAULT_MIN_ANSWER_CHARS,
    maxAnswerChars: DEFAULT_MAX_ANSWER_CHARS,
    maxTokens: 4000,
    badge: "한국어",
    openRouterModel: "cohere/command-r-plus-08-2024",
  },
  {
    id: "openai-gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    description: "균형 잡힌 서사 · 대사와 행동 중심의 선명한 전개",
    provider: "openai",
    creditCostPerReply: REPLY_CREDIT_COSTS.gpt56Terra,
    minAnswerChars: DEFAULT_MIN_ANSWER_CHARS,
    maxAnswerChars: DEFAULT_MAX_ANSWER_CHARS,
    maxTokens: 4000,
    badge: "균형",
    providerModel: "gpt-5.6-terra",
  },
]

export const DEFAULT_CHAT_MODEL_ID: ChatModelId = "free"
export const CHAT_MODEL_SETTINGS_KEY = "storychat_chat_model_settings"

export function normalizeChatModelId(value: unknown): ChatModelId | null {
  if (value === "openrouter-stheno" || value === "openrouter-euryale") {
    return "cohere/command-r-plus-08-2024"
  }
  if (
    value === "openrouter-stheno-2" ||
    value === "openrouter-lunaris" ||
    value === "openrouter-command-r-plus"
  ) return "cohere/command-r-plus-08-2024"
  if (
    value === "free" ||
    value === "gemini-pro" ||
    value === "gemini-3-flash-rp" ||
    value === "openai" ||
    value === "openai-gpt-5.6-terra" ||
    value === "cohere/command-r-plus-08-2024"
  ) {
    return value
  }
  return null
}

export function getChatModelConfig(modelId?: string | null) {
  const normalizedModelId = normalizeChatModelId(modelId)
  return CHAT_MODELS.find((model) => model.id === normalizedModelId) ?? CHAT_MODELS[0]
}

export function isChatModelId(value: unknown): value is ChatModelId {
  return normalizeChatModelId(value) !== null
}

export function getChatModelId(chatId: string): ChatModelId {
  if (typeof window === "undefined") return DEFAULT_CHAT_MODEL_ID
  const settings = readChatModelSettings()
  return settings[chatId] ?? DEFAULT_CHAT_MODEL_ID
}

export function saveChatModelId(chatId: string, modelId: ChatModelId) {
  if (typeof window === "undefined") return
  const settings = readChatModelSettings()
  settings[chatId] = modelId
  window.localStorage.setItem(CHAT_MODEL_SETTINGS_KEY, JSON.stringify(settings))
  window.dispatchEvent(new Event("storychat-chat-model-updated"))
}

function readChatModelSettings(): Record<string, ChatModelId> {
  const raw = window.localStorage.getItem(CHAT_MODEL_SETTINGS_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return Object.fromEntries(Object.entries(parsed).flatMap(([chatId, value]) => {
      const modelId = normalizeChatModelId(value)
      return modelId ? [[chatId, modelId]] : []
    }))
  } catch {
    return {}
  }
}
