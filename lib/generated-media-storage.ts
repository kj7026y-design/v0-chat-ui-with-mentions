"use client"

export const GENERATED_MEDIA_KEY = "storychat_generated_media"
export const IMAGE_USAGE_KEY = "storychat_image_generation_usage"
export const FREE_IMAGE_GENERATION_LIMIT = 5
export const IMAGE_GENERATION_CREDIT_COST = 1
export const DEFAULT_USER_ID = "local-user"

export interface GeneratedMedia {
  id: string
  type: "image"
  imageUrl: string
  prompt: string
  provider?: "pollinations" | "openai" | "replicate" | "custom"
  workId?: string
  chatId?: string
  characterId?: string
  userId?: string
  messageId?: string
  title?: string
  createdAt: string
  isPublic?: boolean
  source?: "uploaded" | "generated"
}

export interface UserUsage {
  userId: string
  freeImageGenerationsUsed: number
  paidImageGenerationsUsed?: number
  updatedAt: string
}

export function getCurrentUserId() {
  if (typeof window === "undefined") return DEFAULT_USER_ID
  try {
    const raw = window.localStorage.getItem("storychat_profile")
    if (!raw) return DEFAULT_USER_ID
    const profile = JSON.parse(raw) as { email?: string; name?: string }
    return profile.email?.trim() || profile.name?.trim() || DEFAULT_USER_ID
  } catch {
    return DEFAULT_USER_ID
  }
}

function createMediaId() {
  return `generated-media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function readGeneratedMedia(): GeneratedMedia[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(GENERATED_MEDIA_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GeneratedMedia[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    window.localStorage.removeItem(GENERATED_MEDIA_KEY)
    return []
  }
}

function writeGeneratedMedia(items: GeneratedMedia[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(GENERATED_MEDIA_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event("storychat-generated-media-updated"))
  window.dispatchEvent(new Event("storychat-chat-media-updated"))
}

function readUsageList(): UserUsage[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(IMAGE_USAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as UserUsage[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    window.localStorage.removeItem(IMAGE_USAGE_KEY)
    return []
  }
}

function writeUsageList(items: UserUsage[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(IMAGE_USAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event("storychat-image-usage-updated"))
}

export function getImageGenerationUsage(userId = getCurrentUserId()): UserUsage {
  return readUsageList().find((item) => item.userId === userId) ?? {
    userId,
    freeImageGenerationsUsed: 0,
    paidImageGenerationsUsed: 0,
    updatedAt: new Date().toISOString(),
  }
}

export function canGenerateImage(userId = getCurrentUserId()) {
  return getImageGenerationUsage(userId).freeImageGenerationsUsed < FREE_IMAGE_GENERATION_LIMIT
}

export function getRemainingFreeImageGenerations(userId = getCurrentUserId()) {
  return Math.max(0, FREE_IMAGE_GENERATION_LIMIT - getImageGenerationUsage(userId).freeImageGenerationsUsed)
}

export function incrementFreeImageGenerationUsage(userId = getCurrentUserId()) {
  const items = readUsageList()
  const current = getImageGenerationUsage(userId)
  const next: UserUsage = {
    ...current,
    freeImageGenerationsUsed: Math.min(FREE_IMAGE_GENERATION_LIMIT, current.freeImageGenerationsUsed + 1),
    updatedAt: new Date().toISOString(),
  }
  writeUsageList(items.some((item) => item.userId === userId) ? items.map((item) => item.userId === userId ? next : item) : [next, ...items])
  return next
}

export function chargeImageGenerationCredit(userId = getCurrentUserId()) {
  const items = readUsageList()
  const current = getImageGenerationUsage(userId)
  const next: UserUsage = {
    ...current,
    paidImageGenerationsUsed: (current.paidImageGenerationsUsed ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  }
  writeUsageList(items.some((item) => item.userId === userId) ? items.map((item) => item.userId === userId ? next : item) : [next, ...items])
  return next
}

export function saveGeneratedMedia(media: Omit<GeneratedMedia, "id" | "type" | "createdAt" | "source"> & Partial<Pick<GeneratedMedia, "id" | "createdAt">>) {
  const item: GeneratedMedia = {
    id: media.id || createMediaId(),
    type: "image",
    imageUrl: media.imageUrl,
    prompt: media.prompt,
    provider: media.provider,
    workId: media.workId,
    chatId: media.chatId,
    characterId: media.characterId,
    userId: media.userId || getCurrentUserId(),
    messageId: media.messageId,
    title: media.title || "AI 생성 이미지",
    createdAt: media.createdAt || new Date().toISOString(),
    isPublic: media.isPublic,
    source: "generated",
  }
  writeGeneratedMedia([item, ...readGeneratedMedia().filter((current) => current.id !== item.id)])
  return item
}

export function getGeneratedMediaByChat(chatId: string) {
  return readGeneratedMedia()
    .filter((item) => item.chatId === chatId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getGeneratedMediaByUser(userId = getCurrentUserId()) {
  return readGeneratedMedia()
    .filter((item) => item.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function deleteGeneratedMedia(mediaId: string) {
  writeGeneratedMedia(readGeneratedMedia().filter((item) => item.id !== mediaId))
}

export function attachMediaToMessage(messageId: string, mediaId: string) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("storychat-message-media-attached", {
    detail: { messageId, mediaId },
  }))
}
