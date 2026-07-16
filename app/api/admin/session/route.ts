import { NextResponse } from "next/server"
import { getAdminSession } from "@/lib/server/admin-auth"

export const runtime = "nodejs"

export async function GET() {
  const session = await getAdminSession()
  return NextResponse.json(
    session
      ? {
          authenticated: true,
          username: session.username,
          accountId: session.accountId,
          accountType: session.accountType,
          role: session.role,
          displayName: session.displayName,
          memberKind: session.memberKind,
          writerTier: session.writerTier,
        }
      : { authenticated: false },
  )
}
