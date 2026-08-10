import type { StoryWork } from "@/lib/storychat-storage"

export interface StoryWorkPermissionSession {
  authenticated: boolean
  accountId?: string
  role?: "administrator" | "developer" | "operator" | "member"
  displayName?: string
  username?: string
}

const GLOBAL_WORK_EDITOR_ROLES = new Set(["administrator", "developer"])
const TESTER_ACCOUNT_IDS = new Set(["member-tester"])

export function canEditAnyStoryWork(session?: StoryWorkPermissionSession | null) {
  if (!session?.authenticated || !session.accountId) return false
  return Boolean(
    (session.role && GLOBAL_WORK_EDITOR_ROLES.has(session.role)) ||
      TESTER_ACCOUNT_IDS.has(session.accountId),
  )
}

export function canEditStoryWork(
  work?: Pick<StoryWork, "authorId"> | null,
  session?: StoryWorkPermissionSession | null,
) {
  if (!work || !session?.authenticated || !session.accountId) return false
  return canEditAnyStoryWork(session) || work.authorId === session.accountId
}

export function getStoryWorkAuthor(session?: StoryWorkPermissionSession | null) {
  if (!session?.authenticated || !session.accountId || session.accountId === "guest_user") return null
  return {
    authorId: session.accountId,
    authorName: session.displayName || session.username || "작품 생성자",
  }
}
