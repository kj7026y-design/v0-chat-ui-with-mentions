import { NextResponse } from "next/server"
import { getAdminSession } from "@/lib/server/admin-auth"
import {
  DatabaseNotConfiguredError,
  ensureChatRoom,
  getChatRooms,
  updateChatRoomName,
} from "@/lib/server/chat-message-store"

export const runtime = "nodejs"

function getRoomId(value: unknown) {
  if (typeof value !== "string") return null
  const roomId = value.trim()
  return roomId && roomId.length <= 200 ? roomId : null
}

function getRoomName(value: unknown) {
  if (typeof value !== "string") return null
  const roomName = value.trim()
  return roomName && roomName.length <= 100 ? roomName : null
}

function getCharacterName(value: unknown) {
  if (typeof value !== "string") return undefined
  const characterName = value.trim()
  return characterName && characterName.length <= 100 ? characterName : undefined
}

function errorResponse(error: unknown) {
  if (error instanceof DatabaseNotConfiguredError) {
    return NextResponse.json({ error: "Neon DATABASE_URL이 설정되지 않았습니다." }, { status: 503 })
  }
  console.error("[chat rooms API failed]", error)
  return NextResponse.json({ error: "채팅방 DB 요청에 실패했습니다." }, { status: 500 })
}

export async function GET(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })

  const roomId = getRoomId(new URL(request.url).searchParams.get("roomId")) || undefined

  try {
    const rooms = await getChatRooms(session.accountId, roomId)
    return NextResponse.json({ rooms })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })

  const body = await request.json().catch(() => null) as {
    roomId?: unknown
    characterName?: unknown
  } | null
  const roomId = getRoomId(body?.roomId)
  const characterName = getCharacterName(body?.characterName)
  if (!roomId) return NextResponse.json({ error: "올바른 채팅방 ID가 필요합니다." }, { status: 400 })

  try {
    await ensureChatRoom({ accountId: session.accountId, roomId, characterName })
    const room = (await getChatRooms(session.accountId, roomId))[0]
    return NextResponse.json({ room })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })

  const body = await request.json().catch(() => null) as {
    roomId?: unknown
    roomName?: unknown
    characterName?: unknown
  } | null
  const roomId = getRoomId(body?.roomId)
  const roomName = getRoomName(body?.roomName)
  const characterName = getCharacterName(body?.characterName)
  if (!roomId) return NextResponse.json({ error: "올바른 채팅방 ID가 필요합니다." }, { status: 400 })
  if (!roomName) return NextResponse.json({ error: "채팅방 이름은 1~100자로 입력해 주세요." }, { status: 400 })

  try {
    const room = await updateChatRoomName({
      accountId: session.accountId,
      roomId,
      roomName,
      characterName,
    })
    return NextResponse.json({ room })
  } catch (error) {
    return errorResponse(error)
  }
}
