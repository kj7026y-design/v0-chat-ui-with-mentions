import { NextResponse } from "next/server"
import { getAdminSession } from "@/lib/server/admin-auth"
import { DatabaseNotConfiguredError } from "@/lib/server/neon-database"
import {
  deleteGeneratedMedia,
  getGeneratedMedia,
  upsertGeneratedMedia,
  type StoredGeneratedMedia,
} from "@/lib/server/generated-media-store"

export const runtime = "nodejs"

const PROVIDERS = new Set(["pollinations", "fal", "openai", "replicate", "custom"])

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined
  const normalized = value.trim()
  return normalized ? normalized.slice(0, maxLength) : undefined
}

function normalizeMedia(value: unknown): StoredGeneratedMedia | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const item = value as Record<string, unknown>
  const id = optionalText(item.id, 300)
  const imageUrl = typeof item.imageUrl === "string" ? item.imageUrl.trim() : ""
  const prompt = typeof item.prompt === "string" ? item.prompt.slice(0, 250_000) : ""
  const createdAt = new Date(typeof item.createdAt === "string" ? item.createdAt : "")
  if (!id || !imageUrl || imageUrl.length > 5_000_000 || Number.isNaN(createdAt.getTime())) return null

  const provider = optionalText(item.provider, 30)
  return {
    id,
    type: "image",
    imageUrl,
    prompt,
    provider: provider && PROVIDERS.has(provider) ? provider : undefined,
    workId: optionalText(item.workId, 300),
    chatId: optionalText(item.chatId, 200),
    characterId: optionalText(item.characterId, 300),
    userId: "",
    messageId: optionalText(item.messageId, 300),
    title: optionalText(item.title, 200),
    createdAt: createdAt.toISOString(),
    isPublic: item.isPublic === true,
    source: item.source === "uploaded" ? "uploaded" : "generated",
  }
}

function errorResponse(error: unknown) {
  if (error instanceof DatabaseNotConfiguredError) {
    return NextResponse.json({ error: "Neon DATABASE_URL이 설정되지 않았습니다." }, { status: 503 })
  }
  console.error("[generated media API failed]", error)
  return NextResponse.json({ error: "생성 이미지 DB 요청에 실패했습니다." }, { status: 500 })
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })

  try {
    return NextResponse.json({ media: await getGeneratedMedia(session.accountId) })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })

  const body = await request.json().catch(() => null) as { media?: unknown } | null
  const rawItems = Array.isArray(body?.media) ? body.media : body?.media ? [body.media] : []
  const items = rawItems.map(normalizeMedia)
  if (rawItems.length === 0 || rawItems.length > 200 || items.some((item) => !item)) {
    return NextResponse.json({ error: "저장할 이미지 형식이 올바르지 않습니다." }, { status: 400 })
  }

  try {
    await upsertGeneratedMedia(session.accountId, items as StoredGeneratedMedia[])
    return NextResponse.json({ saved: items.length })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })

  const body = await request.json().catch(() => null) as { mediaId?: unknown } | null
  const mediaId = optionalText(body?.mediaId, 300)
  if (!mediaId) return NextResponse.json({ error: "삭제할 이미지 ID가 필요합니다." }, { status: 400 })

  try {
    await deleteGeneratedMedia(session.accountId, mediaId)
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return errorResponse(error)
  }
}
