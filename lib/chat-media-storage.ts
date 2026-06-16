"use client"

export const STORYCHAT_CHAT_MEDIA_KEY = "storychat_chat_media"

export interface ChatMediaItem {
  id: string
  chatId: string
  title: string
  imageUrl: string
  createdAt: string
}

const sampleImages = [
  "/events/event-silence.png",
  "/placeholder-media-1.jpg",
  "/placeholder-media-2.jpg",
  "/placeholder-media-3.jpg",
  "/placeholder-media-4.jpg",
]

function createMediaId() {
  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function getSampleMedia(chatId: string, characterName?: string): ChatMediaItem {
  const score = chatId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return {
    id: `sample-${chatId}`,
    chatId,
    title: `${characterName || "채팅"} 샘플 이미지`,
    imageUrl: sampleImages[score % sampleImages.length],
    createdAt: new Date().toISOString(),
  }
}

export function getAllChatMedia(): ChatMediaItem[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(STORYCHAT_CHAT_MEDIA_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatMediaItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    window.localStorage.removeItem(STORYCHAT_CHAT_MEDIA_KEY)
    return []
  }
}

export function saveAllChatMedia(items: ChatMediaItem[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORYCHAT_CHAT_MEDIA_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event("storychat-chat-media-updated"))
}

export function getChatMedia(chatId: string, characterName?: string): ChatMediaItem[] {
  const allItems = getAllChatMedia()
  const chatItems = allItems.filter((item) => item.chatId === chatId)
  if (chatItems.length > 0) return chatItems

  const sample = getSampleMedia(chatId, characterName)
  saveAllChatMedia([sample, ...allItems])
  return [sample]
}

export function addChatMedia(chatId: string, imageUrl: string, title?: string) {
  const item: ChatMediaItem = {
    id: createMediaId(),
    chatId,
    title: title?.trim() || "공유 이미지",
    imageUrl: imageUrl.trim(),
    createdAt: new Date().toISOString(),
  }
  saveAllChatMedia([item, ...getAllChatMedia()])
  return item
}

export function deleteChatMedia(chatId: string, mediaId: string) {
  saveAllChatMedia(getAllChatMedia().filter((item) => !(item.chatId === chatId && item.id === mediaId)))
}
