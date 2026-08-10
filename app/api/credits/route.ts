import { NextResponse } from "next/server"
import { getAdminSession } from "@/lib/server/admin-auth"
import { DatabaseNotConfiguredError } from "@/lib/server/neon-database"
import { adjustUserCreditInDb, getUserCreditData } from "@/lib/server/user-credit-store"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ isGuest: true, credits: 100, history: [] })
    }

    const data = await getUserCreditData(session.accountId)
    return NextResponse.json({ isGuest: false, ...data })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ isGuest: true, credits: 100, history: [] })
    }
    const message = error instanceof Error ? error.message : "Failed to fetch credits"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let requestedAction: "spend" | "charge" | undefined

  try {
    const body = await request.json().catch(() => null) as unknown
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { action, amount, title, description } = body as {
      action?: "spend" | "charge"
      amount?: number
      title?: string
      description?: string
    }

    if ((action !== "spend" && action !== "charge") || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid credit action parameters" }, { status: 400 })
    }
    requestedAction = action

    const session = await getAdminSession()
    if (!session) {
      if (action === "charge") {
        return NextResponse.json({ error: "크레딧 충전은 로그인이 필요합니다." }, { status: 401 })
      }
      // 게스트의 기존 체험 크레딧 사용은 로컬 fallback으로 유지한다.
      return NextResponse.json({ isGuest: true, success: true })
    }

    const type = action === "spend" ? "spent" : "earned"
    const data = await adjustUserCreditInDb({
      accountId: session.accountId,
      amount,
      type,
      title: title || (action === "spend" ? "크레딧 사용" : "크레딧 충전"),
      description,
    })

    return NextResponse.json({ isGuest: false, success: true, ...data })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      if (requestedAction === "charge") {
        return NextResponse.json({ error: "크레딧 충전 DB를 사용할 수 없습니다." }, { status: 503 })
      }
      return NextResponse.json({ isGuest: true, success: true })
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json({ error: "크레딧이 부족합니다." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Failed to update credit"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
