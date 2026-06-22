export const CHAT_MEMORY_MEMO_MAX_LENGTH = 1000

const CHAT_MEMORY_MEMO_KEY_PREFIX = "storychat_memory_memo"

export function getChatMemoryMemoKey(chatId: string) {
  return `${CHAT_MEMORY_MEMO_KEY_PREFIX}_${chatId}`
}

export function normalizeChatMemoryMemo(value: string) {
  return value.slice(0, CHAT_MEMORY_MEMO_MAX_LENGTH)
}

export function getChatMemoryMemo(chatId: string) {
  if (typeof window === "undefined") return ""
  return normalizeChatMemoryMemo(window.localStorage.getItem(getChatMemoryMemoKey(chatId)) ?? "")
}

export function saveChatMemoryMemo(chatId: string, value: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(getChatMemoryMemoKey(chatId), normalizeChatMemoryMemo(value))
  window.dispatchEvent(new CustomEvent("storychat-memory-memo-updated", { detail: { chatId } }))
}
