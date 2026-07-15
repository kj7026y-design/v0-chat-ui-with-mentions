export const CHAT_TEXT_SIZE_KEY = "chatTextSize"
export const CHAT_LINE_HEIGHT_KEY = "chatLineHeight"
export const ALWAYS_SHOW_COMMAND_SUGGESTIONS_KEY = "alwaysShowCommandSuggestions"
export const TEST_BYPASS_ROLEPLAY_RULES_KEY = "testBypassRoleplayRules"
export const TEST_RAW_ROLEPLAY_STREAM_KEY = "testRawRoleplayStream"
export const CHAT_TEXT_SIZE_MIN = 10
export const CHAT_TEXT_SIZE_MAX = 16
export const CHAT_LINE_HEIGHT_MIN = 1.2
export const CHAT_LINE_HEIGHT_MAX = 1.8

export interface ChatReadingSettings {
  textSize: number
  textSizeUserSet?: boolean
  lineHeight: number
  showStoryStatus: boolean
  alwaysShowCommandSuggestions: boolean
  selectedCommandIds: string[]
  testBypassRoleplayRules: boolean
  testRawRoleplayStream: boolean
}

export const defaultChatReadingSettings: ChatReadingSettings = {
  textSize: 13,
  textSizeUserSet: false,
  lineHeight: 1.5,
  showStoryStatus: true,
  alwaysShowCommandSuggestions: false,
  selectedCommandIds: [],
  testBypassRoleplayRules: false,
  testRawRoleplayStream: false,
}

export function getChatReadingSettings(chatId?: string): ChatReadingSettings {
  if (typeof window === "undefined") return defaultChatReadingSettings
  const scoped = chatId ? readScopedSettings(chatId) : null
  if (scoped) return scoped

  const rawTextSize = window.localStorage.getItem(CHAT_TEXT_SIZE_KEY)
  const rawLineHeight = window.localStorage.getItem(CHAT_LINE_HEIGHT_KEY)

  return {
    textSize: clampNumber(
      rawTextSize === null ? Number.NaN : Number(rawTextSize),
      CHAT_TEXT_SIZE_MIN,
      CHAT_TEXT_SIZE_MAX,
      defaultChatReadingSettings.textSize,
    ),
    textSizeUserSet: rawTextSize !== null,
    lineHeight: clampNumber(
      rawLineHeight === null ? Number.NaN : Number(rawLineHeight),
      CHAT_LINE_HEIGHT_MIN,
      CHAT_LINE_HEIGHT_MAX,
      defaultChatReadingSettings.lineHeight,
    ),
    showStoryStatus: true,
    alwaysShowCommandSuggestions: window.localStorage.getItem(ALWAYS_SHOW_COMMAND_SUGGESTIONS_KEY) === "true",
    selectedCommandIds: window.localStorage.getItem(ALWAYS_SHOW_COMMAND_SUGGESTIONS_KEY) === "true"
      ? readStringArray(window.localStorage.getItem("selectedCommandIds"), 2)
      : [],
    testBypassRoleplayRules: window.localStorage.getItem(TEST_BYPASS_ROLEPLAY_RULES_KEY) === "true",
    testRawRoleplayStream: window.localStorage.getItem(TEST_RAW_ROLEPLAY_STREAM_KEY) === "true",
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
    window.localStorage.setItem(TEST_BYPASS_ROLEPLAY_RULES_KEY, String(settings.testBypassRoleplayRules))
    window.localStorage.setItem(TEST_RAW_ROLEPLAY_STREAM_KEY, String(settings.testRawRoleplayStream))
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
  const wasAutoEnabled = Boolean(settings.alwaysShowCommandSuggestions)
  const selectedCommandIds = wasAutoEnabled && Array.isArray(settings.selectedCommandIds)
    ? settings.selectedCommandIds.filter((item): item is string => typeof item === "string").slice(0, 2)
    : []
  const textSizeUserSet = Boolean(settings.textSizeUserSet)
  const normalizedTextSize = clampNumber(
    Number(settings.textSize),
    CHAT_TEXT_SIZE_MIN,
    CHAT_TEXT_SIZE_MAX,
    defaultChatReadingSettings.textSize,
  )

  return {
    textSize: !textSizeUserSet && (normalizedTextSize === 16 || normalizedTextSize === CHAT_TEXT_SIZE_MIN)
      ? defaultChatReadingSettings.textSize
      : normalizedTextSize,
    textSizeUserSet,
    lineHeight: clampNumber(Number(settings.lineHeight), CHAT_LINE_HEIGHT_MIN, CHAT_LINE_HEIGHT_MAX, defaultChatReadingSettings.lineHeight),
    showStoryStatus: settings.showStoryStatus === undefined ? true : Boolean(settings.showStoryStatus),
    alwaysShowCommandSuggestions: selectedCommandIds.length > 0,
    selectedCommandIds,
    testBypassRoleplayRules: Boolean(settings.testBypassRoleplayRules),
    testRawRoleplayStream: Boolean(settings.testRawRoleplayStream),
  }
}

function readStringArray(raw: string | null, limit: number): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, limit) : []
  } catch {
    return []
  }
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}
