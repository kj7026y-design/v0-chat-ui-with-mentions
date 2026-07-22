export type ChatModelId = "free" | "gemini-pro" | "gemini-3-flash-rp" | "openai" | "cohere/command-r-plus-08-2024" | "google/gemini-2.5-flash"

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

export const PREMIUM_REPLY_CREDIT_COST = 2
export const OPENAI_REPLY_CREDIT_COST = 2
export const UNSHAPED_REPLY_CREDIT_COST = 3
export const FREE_REPLY_CREDIT_COST = 0
export const DEFAULT_MIN_ANSWER_CHARS = 700
export const DEFAULT_MAX_ANSWER_CHARS = 1100
export const MAX_TURN_CONTENT_CHARS = 1500

export const CHAT_MODELS: ChatModelConfig[] = [
  {
    id: "free",
    label: "Gemini 2.5 Flash",
    description: "일반 채팅 · 빠른 기본 답변",
    provider: "gemini",
    mode: "normal",
    creditCostPerReply: FREE_REPLY_CREDIT_COST,
    minAnswerChars: DEFAULT_MIN_ANSWER_CHARS,
    maxAnswerChars: DEFAULT_MAX_ANSWER_CHARS,
    maxTokens: 4000,
    badge: "일반",
  },
  {
    id: "gemini-pro",
    label: "Gemini 2.5 Pro",
    description: "언셰이프 · 안전 필터를 낮춘 몰입형 서사 답변",
    provider: "gemini",
    mode: "premium",
    creditCostPerReply: PREMIUM_REPLY_CREDIT_COST,
    minAnswerChars: DEFAULT_MIN_ANSWER_CHARS,
    maxAnswerChars: DEFAULT_MAX_ANSWER_CHARS,
    maxTokens: 6000,
    badge: "언셰이프",
    providerModel: "gemini-2.5-pro",
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "OpenAI API · 안정적인 고급 답변",
    provider: "openai",
    creditCostPerReply: OPENAI_REPLY_CREDIT_COST,
    minAnswerChars: DEFAULT_MIN_ANSWER_CHARS,
    maxAnswerChars: DEFAULT_MAX_ANSWER_CHARS,
    maxTokens: 4000,
    badge: "OpenAI",
  },
  {
    id: "gemini-3-flash-rp",
    label: "Gemini 3 Flash RP",
    description: "Gemini RP · 안전 설정을 RP 전용으로 조정한 캐릭터 채팅",
    provider: "gemini",
    providerModel: "gemini-3-flash-preview",
    mode: "nsfw",
    creditCostPerReply: UNSHAPED_REPLY_CREDIT_COST,
    minAnswerChars: DEFAULT_MIN_ANSWER_CHARS,
    maxAnswerChars: DEFAULT_MAX_ANSWER_CHARS,
    maxTokens: 6000,
    badge: "Gemini RP",
  },
  {
    id: "cohere/command-r-plus-08-2024",
    label: "언셰이프2",
    description: "OpenRouter Command R+ · 제한을 낮춘 안정적인 서사 답변",
    provider: "openrouter",
    mode: "nsfw",
    creditCostPerReply: UNSHAPED_REPLY_CREDIT_COST,
    minAnswerChars: DEFAULT_MIN_ANSWER_CHARS,
    maxAnswerChars: DEFAULT_MAX_ANSWER_CHARS,
    maxTokens: 4000,
    badge: "언셰이프2",
    openRouterModel: "cohere/command-r-plus-08-2024",
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
