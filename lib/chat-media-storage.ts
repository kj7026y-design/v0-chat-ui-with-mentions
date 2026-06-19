"use client"

import { deleteGeneratedMedia, getCurrentUserId, getGeneratedMediaByChat, type GeneratedMedia } from "@/lib/generated-media-storage"

export const STORYCHAT_CHAT_MEDIA_KEY = "storychat_chat_media"

export interface ChatMediaItem {
  id: string
  chatId: string
  title: string
  imageUrl: string
  createdAt: string
  source?: "uploaded" | "generated"
  prompt?: string
  provider?: GeneratedMedia["provider"]
  messageId?: string
  userId?: string
}

const sampleImages = [
  "/events/event-silence.png",
  "/placeholder.jpg",
  "/placeholder-user.jpg",
  "/placeholder-logo.png",
  "/events/event-silence.png",
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
  const generatedItems: ChatMediaItem[] = getGeneratedMediaByChat(chatId).map((item) => ({
    id: item.id,
    chatId: item.chatId || chatId,
    title: item.title || "AI 생성 이미지",
    imageUrl: item.imageUrl,
    createdAt: item.createdAt,
    source: "generated",
    prompt: item.prompt,
    provider: item.provider,
    messageId: item.messageId,
    userId: item.userId,
  }))
  const chatItems = [
    ...generatedItems,
    ...allItems.filter((item) => item.chatId === chatId),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
    source: "uploaded",
    userId: getCurrentUserId(),
  }
  saveAllChatMedia([item, ...getAllChatMedia()])
  return item
}

export function deleteChatMedia(chatId: string, mediaId: string) {
  deleteGeneratedMedia(mediaId)
  saveAllChatMedia(getAllChatMedia().filter((item) => !(item.chatId === chatId && item.id === mediaId)))
}
