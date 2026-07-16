export const MEMBER_PERMISSION_KEYS = [
  "authoring",
  "premium_models",
  "media_generation",
] as const

export type MemberPermissionKey = (typeof MEMBER_PERMISSION_KEYS)[number]
export type ManagedMemberKind = "writer" | "general"
export type ManagedWriterTier = "prime" | "gold" | "silver"

export interface ManagedMember {
  memberId: string
  email: string
  displayName: string
  birthDate: string
  age: number
  memberKind: ManagedMemberKind
  writerTier: ManagedWriterTier | null
  credit: number
  isBlocked: boolean
  unsafeEnabled: boolean
  permissions: MemberPermissionKey[]
  createdAt: string
}

export interface ManagedMemberListResponse {
  members: ManagedMember[]
  total: number
}

export type MemberAdminAction =
  | {
      action: "update_profile"
      memberIds: string[]
      values: {
        email: string
        displayName: string
        birthDate: string
        memberKind: ManagedMemberKind
        writerTier: ManagedWriterTier | null
      }
    }
  | {
      action: "set_access"
      memberIds: string[]
      allowed: boolean
    }
  | {
      action: "set_unsafe"
      memberIds: string[]
      enabled: boolean
    }
  | {
      action: "adjust_credit"
      memberIds: string[]
      amount: number
    }
  | {
      action: "set_permission"
      memberIds: string[]
      permission: MemberPermissionKey
      granted: boolean
    }
