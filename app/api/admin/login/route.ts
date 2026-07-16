import { NextResponse } from "next/server"
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
} from "@/lib/server/admin-auth"
import { DatabaseNotConfiguredError } from "@/lib/server/chat-message-store"
import { authenticateAccount, type AccountType } from "@/lib/server/user-account-store"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    accountType?: unknown
    identifier?: unknown
    username?: unknown
    password?: unknown
  } | null
  const accountType: AccountType = body?.accountType === "member" ? "member" : "staff"
  const identifier = typeof body?.identifier === "string"
    ? body.identifier.trim()
    : typeof body?.username === "string"
      ? body.username.trim()
      : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!identifier || identifier.length > 254 || !password || password.length > 200) {
    return NextResponse.json({ error: "로그인 정보를 확인해 주세요." }, { status: 400 })
  }
  if (accountType === "member" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(identifier)) {
    return NextResponse.json({ error: "올바른 이메일 주소를 입력해 주세요." }, { status: 400 })
  }

  let account
  try {
    account = await authenticateAccount({ accountType, identifier, password })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Neon DATABASE_URL이 설정되지 않았습니다." }, { status: 503 })
    }
    console.error("[account login failed]", error)
    return NextResponse.json({ error: "로그인 DB 요청에 실패했습니다." }, { status: 500 })
  }

  if (!account) {
    const identifierLabel = accountType === "member" ? "이메일" : "아이디"
    return NextResponse.json({ error: `${identifierLabel} 또는 비밀번호가 올바르지 않습니다.` }, { status: 401 })
  }

  const response = NextResponse.json({
    authenticated: true,
    username: account.identifier,
    accountId: account.accountId,
    accountType: account.accountType,
    role: account.role,
    displayName: account.displayName,
    memberKind: account.memberKind,
    writerTier: account.writerTier,
  })
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    createAdminSessionToken(account),
    getAdminSessionCookieOptions(),
  )
  return response
}
