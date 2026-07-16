import type { ChatMessage } from "@/lib/chat-types"

export interface AdminSessionState {
  authenticated: boolean
  username?: string
  accountId?: string
  accountType?: "staff" | "member"
  role?: "administrator" | "developer" | "operator" | "member"
  displayName?: string
  memberKind?: "writer" | "general"
  writerTier?: "prime" | "gold" | "silver"
}

export interface ChatHistoryPage {
  messages: ChatMessage[]
  nextCursor: string | null
  hasMore: boolean
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || "요청을 처리하지 못했어요.")
  return data
}

function hydrateMessage(value: ChatMessage & { timestamp: Date | string }): ChatMessage {
  const timestamp = new Date(value.timestamp)
  return {
    ...value,
    timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
  }
}

export async function getAdminSessionState() {
  const response = await fetch("/api/admin/session", { cache: "no-store" })
  return readJsonResponse<AdminSessionState>(response)
}

export async function loadChatHistoryPage(
  roomId: string,
  cursor?: string,
  characterName?: string,
): Promise<ChatHistoryPage> {
  const params = new URLSearchParams({ roomId, limit: "30" })
  if (cursor) params.set("cursor", cursor)
  if (characterName) params.set("characterName", characterName)
  const response = await fetch(`/api/messages?${params.toString()}`, { cache: "no-store" })
  const page = await readJsonResponse<Omit<ChatHistoryPage, "messages"> & { messages: ChatMessage[] }>(response)
  return {
    ...page,
    messages: page.messages.map(hydrateMessage),
  }
}

export async function saveChatMessages(roomId: string, messages: ChatMessage[], characterName?: string) {
  const response = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, characterName, messages }),
    keepalive: true,
  })
  return readJsonResponse<{ saved: number }>(response)
}

export async function deleteChatMessages(roomId: string, messageIds: string[]) {
  const response = await fetch("/api/messages", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, messageIds }),
    keepalive: true,
  })
  return readJsonResponse<{ deleted: number }>(response)
}

export async function clearChatHistory(roomId: string) {
  const response = await fetch("/api/messages", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, clear: true }),
    keepalive: true,
  })
  return readJsonResponse<{ cleared: boolean }>(response)
}
