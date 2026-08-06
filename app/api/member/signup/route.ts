import { NextResponse } from "next/server"
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
} from "@/lib/server/admin-auth"
import { DatabaseNotConfiguredError } from "@/lib/server/neon-database"
import { createMemberAccount } from "@/lib/server/user-account-store"
import { generateMemberNickname, getMemberNicknameLength } from "@/lib/member-nickname"

export const runtime = "nodejs"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u

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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    email?: unknown
    password?: unknown
    nickname?: unknown
    birthDate?: unknown
  } | null
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = typeof body?.password === "string" ? body.password : ""
  const requestedNickname = typeof body?.nickname === "string" ? body.nickname.trim() : ""
  const nickname = requestedNickname || generateMemberNickname()
  const birthDate = typeof body?.birthDate === "string" ? body.birthDate : ""

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ error: "올바른 이메일 주소를 입력해 주세요." }, { status: 400 })
  }
  if (getMemberNicknameLength(nickname) > 8) {
    return NextResponse.json({ error: "닉네임은 최대 8자까지 입력할 수 있습니다." }, { status: 400 })
  }
  if (password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: "비밀번호는 8자 이상 72자 이하로 입력해 주세요." }, { status: 400 })
  }
  if (!isValidBirthDate(birthDate)) {
    return NextResponse.json({ error: "생년월일을 확인해 주세요." }, { status: 400 })
  }

  try {
    const account = await createMemberAccount({ email, password, nickname, birthDate })
    const response = NextResponse.json({
      authenticated: true,
      accountId: account.accountId,
      accountType: account.accountType,
      role: account.role,
      username: account.identifier,
      displayName: account.displayName,
      memberKind: account.memberKind,
    }, { status: 201 })
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      createAdminSessionToken(account),
      getAdminSessionCookieOptions(),
    )
    return response
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Neon DATABASE_URL이 설정되지 않았습니다." }, { status: 503 })
    }
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 })
    }
    console.error("[member signup failed]", error)
    return NextResponse.json({ error: "회원가입 DB 요청에 실패했습니다." }, { status: 500 })
  }
}
