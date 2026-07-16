import "server-only"

import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import type {
  AccountRole,
  AccountType,
  AuthenticatedAccount,
  MemberKind,
  WriterTier,
} from "@/lib/server/user-account-store"

export const ADMIN_SESSION_COOKIE = "storychat_admin_session"
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7

export interface AdminSessionPayload {
  accountId: string
  accountType: AccountType
  role: AccountRole
  username: string
  displayName: string
  memberKind?: MemberKind
  writerTier?: WriterTier
  expiresAt: number
}

function getAdminUsername() {
  return process.env.ADMIN_USERNAME?.trim() || "admin"
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "12345"
}

function canUseDevelopmentAdminSession() {
  if (process.env.NODE_ENV !== "development") return false
  if (process.env.DISABLE_LOCAL_ADMIN_SESSION === "true") return false

  return Boolean(
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING,
  )
}

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    `${getAdminPassword()}:storychat-admin-session`
  )
}

function digest(value: string) {
  return createHash("sha256").update(value).digest()
}

function constantTimeEqual(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right))
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url")
}

export function createAdminSessionToken(account: AuthenticatedAccount) {
  const payload: AdminSessionPayload = {
    accountId: account.accountId,
    accountType: account.accountType,
    role: account.role,
    username: account.identifier,
    displayName: account.displayName,
    memberKind: account.memberKind,
    writerTier: account.writerTier,
    expiresAt: Date.now() + ADMIN_SESSION_MAX_AGE * 1000,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${encodedPayload}.${signPayload(encodedPayload)}`
}

function parseAdminSessionToken(token: string | undefined): AdminSessionPayload | null {
  if (!token) return null

  const [encodedPayload, signature, ...rest] = token.split(".")
  if (!encodedPayload || !signature || rest.length > 0) return null
  if (!constantTimeEqual(signature, signPayload(encodedPayload))) return null

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<AdminSessionPayload>
    if (typeof payload.accountId !== "string" || !payload.accountId) return null
    if (payload.accountType !== "staff" && payload.accountType !== "member") return null
    if (!payload.role || !["administrator", "developer", "operator", "member"].includes(payload.role)) return null
    if (typeof payload.username !== "string" || !payload.username) return null
    if (typeof payload.displayName !== "string" || !payload.displayName) return null
    if (typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now()) return null
    return payload as AdminSessionPayload
  } catch {
    return null
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies()
  const session = parseAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)
  if (session) return session

  if (canUseDevelopmentAdminSession()) {
    return {
      accountId: "staff-admin",
      accountType: "staff" as const,
      role: "administrator" as const,
      username: getAdminUsername(),
      displayName: "관리자",
      expiresAt: Date.now() + ADMIN_SESSION_MAX_AGE * 1000,
    }
  }

  return null
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  }
}
