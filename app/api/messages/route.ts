import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const roomId = url.searchParams.get("roomId") || url.searchParams.get("chatId") || ""

  return NextResponse.json({
    roomId,
    messages: [],
    source: "client-local-final-messages",
  })
}
