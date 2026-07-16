import { NextResponse } from "next/server"
import { getAdminSession } from "@/lib/server/admin-auth"
import {
  DatabaseNotConfiguredError,
  clearChatMessages,
  deleteChatMessages,
  getChatMessagePage,
  upsertChatMessages,
  type StoredChatMessage,
} from "@/lib/server/chat-message-store"

export const runtime = "nodejs"

const MESSAGE_TYPES = new Set(["user", "ai", "event", "inner-thought", "status"])

function getRoomId(value: unknown) {
  if (typeof value !== "string") return null
  const roomId = value.trim()
  return roomId && roomId.length <= 200 ? roomId : null
}

function normalizeMessage(value: unknown): StoredChatMessage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const message = value as Record<string, unknown>
  if (typeof message.id !== "string" || !message.id || message.id.length > 300) return null
  if (typeof message.type !== "string" || !MESSAGE_TYPES.has(message.type)) return null
  if (typeof message.content !== "string" || message.content.length > 250_000) return null

  const timestamp = new Date(typeof message.timestamp === "string" ? message.timestamp : "")
  if (Number.isNaN(timestamp.getTime())) return null

  return {
    ...message,
    id: message.id,
    type: message.type,
    content: message.content,
    timestamp: timestamp.toISOString(),
  }
}

function errorResponse(error: unknown) {
  if (error instanceof DatabaseNotConfiguredError) {
    return NextResponse.json(
      { error: "Neon DATABASE_URL이 설정되지 않았습니다." },
      { status: 503 },
    )
  }
  console.error("[chat history API failed]", error)
  return NextResponse.json({ error: "채팅 내역 DB 요청에 실패했습니다." }, { status: 500 })
}

async function requireAccount() {
  const session = await getAdminSession()
  return session
}

export async function GET(request: Request) {
  const session = await requireAccount()
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })

  const url = new URL(request.url)
  const roomId = getRoomId(url.searchParams.get("roomId") || url.searchParams.get("chatId"))
  const cursor = url.searchParams.get("cursor") || undefined
  const requestedLimit = Number(url.searchParams.get("limit") || 30)
  const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, Math.floor(requestedLimit))) : 30

  if (!roomId) return NextResponse.json({ error: "올바른 채팅방 ID가 필요합니다." }, { status: 400 })
  if (cursor && !/^\d+$/.test(cursor)) {
    return NextResponse.json({ error: "올바른 페이지 커서가 필요합니다." }, { status: 400 })
  }

  try {
    const page = await getChatMessagePage({ adminId: session.username, roomId, cursor, limit })
    return NextResponse.json({ roomId, ...page, source: "neon" })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  const session = await requireAccount()
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })

  const body = await request.json().catch(() => null) as { roomId?: unknown; messages?: unknown } | null
  const roomId = getRoomId(body?.roomId)
  const rawMessages = Array.isArray(body?.messages) ? body.messages : []
  const messages = rawMessages.map(normalizeMessage)

  if (!roomId) return NextResponse.json({ error: "올바른 채팅방 ID가 필요합니다." }, { status: 400 })
  if (rawMessages.length === 0 || rawMessages.length > 50 || messages.some((message) => !message)) {
    return NextResponse.json({ error: "저장할 메시지 형식이 올바르지 않습니다." }, { status: 400 })
  }

  try {
    await upsertChatMessages({
      adminId: session.username,
      roomId,
      messages: messages as StoredChatMessage[],
    })
    return NextResponse.json({ saved: messages.length })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(request: Request) {
  const session = await requireAccount()
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })

  const body = await request.json().catch(() => null) as {
    roomId?: unknown
    messageIds?: unknown
    clear?: unknown
  } | null
  const roomId = getRoomId(body?.roomId)
  if (!roomId) return NextResponse.json({ error: "올바른 채팅방 ID가 필요합니다." }, { status: 400 })

  try {
    if (body?.clear === true) {
      await clearChatMessages({ adminId: session.username, roomId })
      return NextResponse.json({ cleared: true })
    }

    const messageIds = Array.isArray(body?.messageIds)
      ? body.messageIds.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 300)
      : []
    if (messageIds.length === 0 || messageIds.length > 100) {
      return NextResponse.json({ error: "삭제할 메시지 ID가 필요합니다." }, { status: 400 })
    }

    await deleteChatMessages({ adminId: session.username, roomId, messageIds })
    return NextResponse.json({ deleted: messageIds.length })
  } catch (error) {
    return errorResponse(error)
  }
}
