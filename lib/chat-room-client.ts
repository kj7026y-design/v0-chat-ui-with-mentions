"use client"

export interface ChatRoomMetadata {
  roomId: string
  roomName: string
  characterName: string
  updatedAt: string
  lastMessage?: string
  lastMessageAt?: string
  isGenerating?: boolean
}

async function readResponse(response: Response) {
  const data = await response.json().catch(() => ({})) as {
    error?: string
    room?: ChatRoomMetadata
    rooms?: ChatRoomMetadata[]
  }
  if (!response.ok) throw new Error(data.error || "채팅방 정보를 불러오지 못했습니다.")
  return data
}

export async function getChatRooms(roomId?: string) {
  const query = roomId ? `?roomId=${encodeURIComponent(roomId)}` : ""
  const data = await readResponse(await fetch(`/api/chat-rooms${query}`, { cache: "no-store" }))
  return data.rooms ?? []
}

export async function ensureChatRoom(roomId: string, characterName: string) {
  const data = await readResponse(await fetch("/api/chat-rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, characterName }),
  }))
  return data.room ?? null
}

export async function renameChatRoom(roomId: string, roomName: string, characterName: string) {
  const data = await readResponse(await fetch("/api/chat-rooms", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, roomName, characterName }),
  }))
  return data.room ?? null
}
