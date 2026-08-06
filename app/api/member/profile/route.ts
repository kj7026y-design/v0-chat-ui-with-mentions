import { NextResponse } from "next/server"
import { getAdminSession } from "@/lib/server/admin-auth"
import { DatabaseNotConfiguredError } from "@/lib/server/neon-database"
import {
  getMemberAccountProfile,
  updateMemberAccountProfile,
} from "@/lib/server/user-account-store"

export const runtime = "nodejs"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

async function requireMember() {
  const session = await getAdminSession()
  if (!session) return { error: "로그인이 필요합니다.", status: 401 as const }
  if (session.accountType !== "member") {
    return { error: "회원 계정만 이용할 수 있습니다.", status: 403 as const }
  }
  return { session }
}

function errorResponse(error: unknown) {
  if (error instanceof DatabaseNotConfiguredError) {
    return NextResponse.json({ error: "회원 DB가 설정되지 않았습니다." }, { status: 503 })
  }
  if (typeof error === "object" && error && "code" in error && error.code === "23505") {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 })
  }
  console.error("[member profile API failed]", error)
  return NextResponse.json({ error: "회원 정보를 처리하지 못했습니다." }, { status: 500 })
}

export async function GET() {
  const auth = await requireMember()
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const profile = await getMemberAccountProfile(auth.session.accountId)
    if (!profile) return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 404 })
    return NextResponse.json({ profile })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: Request) {
  const auth = await requireMember()
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => null) as { email?: unknown; nickname?: unknown } | null
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : ""
  if (!EMAIL_PATTERN.test(email) || email.length > 254 || !nickname || nickname.length > 50) {
    return NextResponse.json({ error: "닉네임과 이메일을 확인해 주세요." }, { status: 400 })
  }

  try {
    const profile = await updateMemberAccountProfile({
      accountId: auth.session.accountId,
      email,
      nickname,
    })
    if (!profile) return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 404 })
    return NextResponse.json({ profile })
  } catch (error) {
    return errorResponse(error)
  }
}
