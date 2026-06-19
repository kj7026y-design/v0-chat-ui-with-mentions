export const CHAT_TEXT_SIZE_KEY = "chatTextSize"
export const CHAT_LINE_HEIGHT_KEY = "chatLineHeight"
export const ALWAYS_SHOW_COMMAND_SUGGESTIONS_KEY = "alwaysShowCommandSuggestions"
export const CHAT_TEXT_SIZE_MIN = 10
export const CHAT_TEXT_SIZE_MAX = 16
export const CHAT_LINE_HEIGHT_MIN = 1.2
export const CHAT_LINE_HEIGHT_MAX = 1.8

export interface ChatReadingSettings {
  textSize: number
  lineHeight: number
  alwaysShowCommandSuggestions: boolean
  selectedCommandIds: string[]
}

export const defaultChatReadingSettings: ChatReadingSettings = {
  textSize: 16,
  lineHeight: 1.5,
  alwaysShowCommandSuggestions: false,
  selectedCommandIds: [],
}

export function getChatReadingSettings(chatId?: string): ChatReadingSettings {
  if (typeof window === "undefined") return defaultChatReadingSettings
  const scoped = chatId ? readScopedSettings(chatId) : null
  if (scoped) return scoped

  return {
    textSize: clampNumber(
      Number(window.localStorage.getItem(CHAT_TEXT_SIZE_KEY)),
      CHAT_TEXT_SIZE_MIN,
      CHAT_TEXT_SIZE_MAX,
      defaultChatReadingSettings.textSize,
    ),
    lineHeight: clampNumber(
      Number(window.localStorage.getItem(CHAT_LINE_HEIGHT_KEY)),
      CHAT_LINE_HEIGHT_MIN,
      CHAT_LINE_HEIGHT_MAX,
      defaultChatReadingSettings.lineHeight,
    ),
    alwaysShowCommandSuggestions: window.localStorage.getItem(ALWAYS_SHOW_COMMAND_SUGGESTIONS_KEY) === "true",
    selectedCommandIds: readStringArray(window.localStorage.getItem("selectedCommandIds")),
  }
}

export function saveChatReadingSettings(settings: ChatReadingSettings, chatId?: string) {
  if (chatId) {
    window.localStorage.setItem(getScopedSettingsKey(chatId), JSON.stringify(normalizeSettings(settings)))
  } else {
    window.localStorage.setItem(CHAT_TEXT_SIZE_KEY, String(settings.textSize))
    window.localStorage.setItem(CHAT_LINE_HEIGHT_KEY, String(settings.lineHeight))
    window.localStorage.setItem(ALWAYS_SHOW_COMMAND_SUGGESTIONS_KEY, String(settings.alwaysShowCommandSuggestions))
    window.localStorage.setItem("selectedCommandIds", JSON.stringify(settings.selectedCommandIds.slice(0, 2)))
  }
  window.dispatchEvent(new Event("storychat-reading-settings-updated"))
}

function getScopedSettingsKey(chatId: string) {
  return `chat-reading-settings-${chatId}`
}

function readScopedSettings(chatId: string): ChatReadingSettings | null {
  const raw = window.localStorage.getItem(getScopedSettingsKey(chatId))
  if (!raw) return null
  try {
    return normalizeSettings(JSON.parse(raw) as Partial<ChatReadingSettings>)
  } catch {
    return null
  }
}

function normalizeSettings(settings: Partial<ChatReadingSettings>): ChatReadingSettings {
  return {
    textSize: clampNumber(Number(settings.textSize), CHAT_TEXT_SIZE_MIN, CHAT_TEXT_SIZE_MAX, defaultChatReadingSettings.textSize),
    lineHeight: clampNumber(Number(settings.lineHeight), CHAT_LINE_HEIGHT_MIN, CHAT_LINE_HEIGHT_MAX, defaultChatReadingSettings.lineHeight),
    alwaysShowCommandSuggestions: Boolean(settings.alwaysShowCommandSuggestions),
    selectedCommandIds: Array.isArray(settings.selectedCommandIds)
      ? settings.selectedCommandIds.filter((item): item is string => typeof item === "string").slice(0, 2)
      : [],
  }
}

function readStringArray(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 2) : []
  } catch {
    return []
  }
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}
