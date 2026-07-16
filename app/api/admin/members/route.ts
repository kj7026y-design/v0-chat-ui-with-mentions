import { NextResponse } from "next/server"
import {
  MEMBER_PERMISSION_KEYS,
  type ManagedMemberKind,
  type ManagedWriterTier,
  type MemberAdminAction,
  type MemberPermissionKey,
} from "@/lib/member-admin-types"
import { getAdminSession } from "@/lib/server/admin-auth"
import {
  adjustMemberCredit,
  InsufficientCreditError,
  listManagedMembers,
  MemberNotFoundError,
  setMemberAccess,
  setMemberPermission,
  setMemberUnsafe,
  updateMemberProfile,
} from "@/lib/server/member-admin-store"
import { DatabaseNotConfiguredError } from "@/lib/server/neon-database"

export const runtime = "nodejs"

const STAFF_ROLES = new Set(["administrator", "developer", "operator"])
const MEMBER_ID_PATTERN = /^MBR-[A-Z0-9]{12}$/u
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u

async function requireStaff() {
  const session = await getAdminSession()
  if (!session) return { error: "로그인이 필요합니다.", status: 401 as const }
  if (session.accountType !== "staff" || !STAFF_ROLES.has(session.role)) {
    return { error: "회원 관리 권한이 없습니다.", status: 403 as const }
  }
  return { session }
}

function getMemberIds(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return null
  const memberIds = [...new Set(value
    .filter((memberId): memberId is string => typeof memberId === "string")
    .map((memberId) => memberId.trim().toUpperCase()))]
  if (memberIds.length === 0 || memberIds.some((memberId) => !MEMBER_ID_PATTERN.test(memberId))) return null
  return memberIds
}

function isValidBirthDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  const earliest = new Date("1900-01-01T00:00:00Z")
  const today = new Date()
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date >= earliest &&
    date <= today
  )
}

function isMemberKind(value: unknown): value is ManagedMemberKind {
  return value === "writer" || value === "general"
}

function isWriterTier(value: unknown): value is ManagedWriterTier {
  return value === "prime" || value === "gold" || value === "silver"
}

function isPermission(value: unknown): value is MemberPermissionKey {
  return typeof value === "string" && MEMBER_PERMISSION_KEYS.some((permission) => permission === value)
}

function errorResponse(error: unknown) {
  if (error instanceof DatabaseNotConfiguredError) {
    return NextResponse.json({ error: "Neon DATABASE_URL이 설정되지 않았습니다." }, { status: 503 })
  }
  if (error instanceof MemberNotFoundError) {
    return NextResponse.json({ error: "선택한 회원 중 존재하지 않는 회원이 있습니다." }, { status: 404 })
  }
  if (error instanceof InsufficientCreditError) {
    return NextResponse.json({ error: "차감 후 크레딧이 0보다 작아지는 회원이 있습니다." }, { status: 409 })
  }
  if (typeof error === "object" && error && "code" in error && error.code === "23505") {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 })
  }
  console.error("[member admin API failed]", error)
  return NextResponse.json({ error: "회원 관리 DB 요청에 실패했습니다." }, { status: 500 })
}

export async function GET(request: Request) {
  const auth = await requireStaff()
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const url = new URL(request.url)
  const search = (url.searchParams.get("search") || "").trim()
  if (search.length > 2_000) {
    return NextResponse.json({ error: "검색어가 너무 깁니다." }, { status: 400 })
  }

  try {
    return NextResponse.json(await listManagedMembers({ search, limit: 100 }))
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: Request) {
  const auth = await requireStaff()
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => null) as Partial<MemberAdminAction> | null
  const memberIds = getMemberIds(body?.memberIds)
  if (!body?.action || !memberIds) {
    return NextResponse.json({ error: "회원 관리 요청 형식이 올바르지 않습니다." }, { status: 400 })
  }

  try {
    if (body.action === "update_profile") {
      if (memberIds.length !== 1 || !body.values || typeof body.values !== "object") {
        return NextResponse.json({ error: "수정할 회원 한 명과 회원 정보가 필요합니다." }, { status: 400 })
      }
      const values = body.values
      const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : ""
      const displayName = typeof values.displayName === "string" ? values.displayName.trim() : ""
      const birthDate = typeof values.birthDate === "string" ? values.birthDate : ""
      const memberKind = values.memberKind
      const writerTier = values.writerTier
      if (
        !EMAIL_PATTERN.test(email) || email.length > 254 ||
        !displayName || displayName.length > 100 ||
        !isValidBirthDate(birthDate) ||
        !isMemberKind(memberKind) ||
        (memberKind === "writer" && !isWriterTier(writerTier)) ||
        (memberKind === "general" && writerTier !== null)
      ) {
        return NextResponse.json({ error: "수정할 회원 정보를 확인해 주세요." }, { status: 400 })
      }
      await updateMemberProfile({
        actorAccountId: auth.session.accountId,
        memberId: memberIds[0],
        email,
        displayName,
        birthDate,
        memberKind,
        writerTier,
      })
    } else if (body.action === "set_access") {
      if (typeof body.allowed !== "boolean") {
        return NextResponse.json({ error: "접근 허용 여부가 필요합니다." }, { status: 400 })
      }
      await setMemberAccess({ actorAccountId: auth.session.accountId, memberIds, allowed: body.allowed })
    } else if (body.action === "set_unsafe") {
      if (typeof body.enabled !== "boolean") {
        return NextResponse.json({ error: "unsafe 허용 여부가 필요합니다." }, { status: 400 })
      }
      await setMemberUnsafe({ actorAccountId: auth.session.accountId, memberIds, enabled: body.enabled })
    } else if (body.action === "adjust_credit") {
      const amount = Number(body.amount)
      if (!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > 1_000_000) {
        return NextResponse.json({ error: "크레딧 증감값을 확인해 주세요." }, { status: 400 })
      }
      await adjustMemberCredit({ actorAccountId: auth.session.accountId, memberIds, amount })
    } else if (body.action === "set_permission") {
      if (!isPermission(body.permission) || typeof body.granted !== "boolean") {
        return NextResponse.json({ error: "권한 정보를 확인해 주세요." }, { status: 400 })
      }
      await setMemberPermission({
        actorAccountId: auth.session.accountId,
        memberIds,
        permission: body.permission,
        granted: body.granted,
      })
    } else {
      return NextResponse.json({ error: "지원하지 않는 회원 관리 작업입니다." }, { status: 400 })
    }

    return NextResponse.json({ updated: memberIds.length })
  } catch (error) {
    return errorResponse(error)
  }
}
