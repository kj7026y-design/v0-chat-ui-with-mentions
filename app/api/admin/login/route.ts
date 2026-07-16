import { NextResponse } from "next/server"
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  validateAdminCredentials,
} from "@/lib/server/admin-auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { username?: unknown; password?: unknown } | null
  const username = typeof body?.username === "string" ? body.username : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!validateAdminCredentials(username, password)) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 })
  }

  const response = NextResponse.json({ authenticated: true, username: username.trim() })
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    createAdminSessionToken(username.trim()),
    getAdminSessionCookieOptions(),
  )
  return response
}
