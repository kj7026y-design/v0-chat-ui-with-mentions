export type ChatModelId = "free" | "openai"

export type ChatModelProvider = "pollinations" | "openai"

export type ChatModelConfig = {
  id: ChatModelId
  label: string
  description: string
  provider: ChatModelProvider
  creditCostPerReply: number
  minAnswerChars?: number
  maxTokens?: number
  badge?: string
}

export const OPENAI_REPLY_CREDIT_COST = 2
export const FREE_REPLY_CREDIT_COST = 0
export const DEFAULT_MIN_ANSWER_CHARS = 1100

export const CHAT_MODELS: ChatModelConfig[] = [
  {
    id: "free",
    label: "무료 모델",
    description: "기본 답변 생성 · 무료/저비용",
    provider: "pollinations",
    creditCostPerReply: FREE_REPLY_CREDIT_COST,
    minAnswerChars: DEFAULT_MIN_ANSWER_CHARS,
    maxTokens: 1400,
    badge: "무료",
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "더 자연스러운 답변 · 크레딧 사용",
    provider: "openai",
    creditCostPerReply: OPENAI_REPLY_CREDIT_COST,
    minAnswerChars: DEFAULT_MIN_ANSWER_CHARS,
    maxTokens: 1600,
    badge: "고급",
  },
]

export const DEFAULT_CHAT_MODEL_ID: ChatModelId = "free"
export const CHAT_MODEL_SETTINGS_KEY = "storychat_chat_model_settings"

export function getChatModelConfig(modelId?: string | null) {
  return CHAT_MODELS.find((model) => model.id === modelId) ?? CHAT_MODELS[0]
}

export function isChatModelId(value: unknown): value is ChatModelId {
  return value === "free" || value === "openai"
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
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, ChatModelId] => isChatModelId(entry[1])),
    )
  } catch {
    return {}
  }
}
