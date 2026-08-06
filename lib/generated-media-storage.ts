"use client"

export const GENERATED_MEDIA_KEY = "storychat_generated_media"
export const IMAGE_USAGE_KEY = "storychat_image_generation_usage"
export const MEDIA_USER_ID_KEY = "storychat_media_user_id"
export const FREE_IMAGE_GENERATION_LIMIT = 5
export const IMAGE_GENERATION_CREDIT_COST = 1
export const DEFAULT_USER_ID = "local-user"

export interface GeneratedMedia {
  id: string
  type: "image"
  imageUrl: string
  prompt: string
  provider?: "pollinations" | "fal" | "openai" | "replicate" | "custom"
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
  const accountId = window.localStorage.getItem(MEDIA_USER_ID_KEY)?.trim()
  if (accountId) return accountId
  try {
    const raw = window.localStorage.getItem("storychat_profile")
    if (!raw) return DEFAULT_USER_ID
    const profile = JSON.parse(raw) as { email?: string; name?: string }
    return profile.email?.trim() || profile.name?.trim() || DEFAULT_USER_ID
  } catch {
    return DEFAULT_USER_ID
  }
}

export function setGeneratedMediaUserId(accountId: string, legacyUserIds: string[] = []) {
  if (typeof window === "undefined") return
  const normalizedAccountId = accountId.trim()
  if (!normalizedAccountId) return

  const previousUserId = getCurrentUserId()
  window.localStorage.setItem(MEDIA_USER_ID_KEY, normalizedAccountId)

  const legacyIds = new Set(
    [previousUserId, DEFAULT_USER_ID, ...legacyUserIds]
      .map((value) => value.trim())
      .filter((value) => value && value !== normalizedAccountId),
  )
  if (legacyIds.size === 0) return

  const items = readGeneratedMedia()
  let changed = false
  const migratedItems = items.map((item) => {
    if (item.userId && !legacyIds.has(item.userId)) return item
    changed = true
    return { ...item, userId: normalizedAccountId }
  })
  if (changed) writeGeneratedMedia(migratedItems)
}

export function clearGeneratedMediaUserId() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(MEDIA_USER_ID_KEY)
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

async function saveGeneratedMediaToDatabase(items: GeneratedMedia[]) {
  if (items.length === 0) return
  const response = await fetch("/api/generated-media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media: items }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error || "생성 이미지를 DB에 저장하지 못했습니다.")
  }
}

async function loadGeneratedMediaFromDatabase() {
  const response = await fetch("/api/generated-media", { cache: "no-store" })
  const data = await response.json().catch(() => ({})) as { media?: GeneratedMedia[]; error?: string }
  if (!response.ok) throw new Error(data.error || "생성 이미지를 DB에서 불러오지 못했습니다.")
  return Array.isArray(data.media) ? data.media : []
}

export async function syncGeneratedMediaWithServer(userId = getCurrentUserId()) {
  const localItems = getGeneratedMediaByUser(userId)
  for (let index = 0; index < localItems.length; index += 200) {
    await saveGeneratedMediaToDatabase(localItems.slice(index, index + 200))
  }

  const remoteItems = await loadGeneratedMediaFromDatabase()
  const mergedItems = new Map<string, GeneratedMedia>()
  localItems.forEach((item) => mergedItems.set(item.id, { ...item, userId }))
  remoteItems.forEach((item) => mergedItems.set(item.id, { ...item, userId }))
  const syncedItems = Array.from(mergedItems.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const otherUsersItems = readGeneratedMedia().filter((item) => item.userId !== userId)
  writeGeneratedMedia([...syncedItems, ...otherUsersItems])
  return syncedItems
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
  void saveGeneratedMediaToDatabase([item]).catch(() => undefined)
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
  void fetch("/api/generated-media", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaId }),
  }).catch(() => undefined)
}

export function attachMediaToMessage(messageId: string, mediaId: string) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("storychat-message-media-attached", {
    detail: { messageId, mediaId },
  }))
}
