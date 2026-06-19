export const WORK_COMMENTS_KEY = "storychat_work_comments"
export const LIKED_WORK_IDS_KEY = "likedWorkIds"

export interface WorkComment {
  id: string
  workId: string
  parentId?: string
  authorName: string
  content: string
  createdAt: string
  updatedAt?: string
}

export function getWorkComments(): WorkComment[] {
  if (typeof window === "undefined") return []
  const raw = window.localStorage.getItem(WORK_COMMENTS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isWorkComment) : []
  } catch {
    return []
  }
}

export function saveWorkComments(comments: WorkComment[]) {
  window.localStorage.setItem(WORK_COMMENTS_KEY, JSON.stringify(comments))
  window.dispatchEvent(new Event("storychat-work-comments-updated"))
}

export function getLikedWorkIds(): string[] {
  if (typeof window === "undefined") return []
  const raw = window.localStorage.getItem(LIKED_WORK_IDS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

export function saveLikedWorkIds(ids: string[]) {
  window.localStorage.setItem(LIKED_WORK_IDS_KEY, JSON.stringify([...new Set(ids)]))
  window.dispatchEvent(new Event("storychat-liked-works-updated"))
}

function isWorkComment(value: unknown): value is WorkComment {
  if (!value || typeof value !== "object") return false
  const item = value as WorkComment
  return Boolean(item.id && item.workId && item.content && item.createdAt)
}
