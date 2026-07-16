import { NextResponse } from "next/server"
import { ADMIN_SESSION_COOKIE, getAdminSessionCookieOptions } from "@/lib/server/admin-auth"

export const runtime = "nodejs"

export async function POST() {
  const response = NextResponse.json({ authenticated: false })
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  })
  return response
}
