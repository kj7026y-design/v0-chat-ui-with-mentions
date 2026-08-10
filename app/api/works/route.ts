import { NextResponse } from "next/server"
import type { StoryCharacter, StoryPersona, StoryWork, StoryWorld } from "@/lib/storychat-storage"
import type { StoryWorkBundle } from "@/lib/story-work-bundle"
import { canEditAnyStoryWork, canEditStoryWork } from "@/lib/work-permissions"
import { getAdminSession } from "@/lib/server/admin-auth"
import { DatabaseNotConfiguredError } from "@/lib/server/neon-database"
import {
  StoryWorkConflictError,
  createStoredStoryWork,
  deleteStoredStoryWork,
  getStoredStoryWork,
  getVisibleStoryWorks,
  updateStoredStoryWork,
} from "@/lib/server/story-work-store"

export const runtime = "nodejs"

const MAX_REQUEST_BYTES = 6_000_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function validId(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 300
}

function normalizeBundle(value: unknown): StoryWorkBundle | null {
  if (!isRecord(value) || !isRecord(value.work) || !isRecord(value.world)) return null
  const work = value.work
  const world = value.world
  const characters = Array.isArray(value.characters) ? value.characters.filter(isRecord) : []
  const persona = value.persona

  if (
    !validId(work.id) ||
    !validId(work.characterId) ||
    !validId(work.worldId) ||
    typeof work.personaId !== "string" ||
    typeof work.title !== "string" ||
    !work.title.trim() ||
    work.title.length > 200 ||
    !validId(world.id) ||
    world.id !== work.worldId ||
    characters.length === 0 ||
    characters.length > 10 ||
    characters.some((character) => !validId(character.id)) ||
    !characters.some((character) => character.id === work.characterId) ||
    (persona !== undefined && (!isRecord(persona) || !validId(persona.id))) ||
    (work.personaId && (!isRecord(persona) || persona.id !== work.personaId))
  ) {
    return null
  }

  return {
    work: work as unknown as StoryWork,
    characters: characters as unknown as StoryCharacter[],
    world: world as unknown as StoryWorld,
    persona: persona as StoryPersona | undefined,
  }
}

async function readBundle(request: Request) {
  const text = await request.text()
  if (!text || new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) return null
  try {
    const body = JSON.parse(text) as { bundle?: unknown }
    return normalizeBundle(body.bundle)
  } catch {
    return null
  }
}

function sessionForPermission(session: NonNullable<Awaited<ReturnType<typeof getAdminSession>>>) {
  return { authenticated: true, ...session }
}

function errorResponse(error: unknown) {
  if (error instanceof DatabaseNotConfiguredError) {
    return NextResponse.json({ error: "Neon DATABASE_URL이 설정되지 않았습니다." }, { status: 503 })
  }
  if (error instanceof StoryWorkConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 })
  }
  console.error("[story works API failed]", error)
  return NextResponse.json({ error: "작품 DB 요청에 실패했습니다." }, { status: 500 })
}

export async function GET() {
  const session = await getAdminSession()
  const accountId = session?.accountId || ""
  const permissionSession = session ? sessionForPermission(session) : undefined

  try {
    const records = await getVisibleStoryWorks(
      accountId,
      canEditAnyStoryWork(permissionSession),
    )
    return NextResponse.json({
      accountId,
      bundles: records.map((record) => record.bundle),
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "로그인한 사용자만 작품을 생성할 수 있습니다." }, { status: 401 })

  const bundle = await readBundle(request)
  if (!bundle) return NextResponse.json({ error: "저장할 작품 형식이 올바르지 않습니다." }, { status: 400 })

  const canonicalBundle: StoryWorkBundle = {
    ...bundle,
    work: {
      ...bundle.work,
      authorId: session.accountId,
      authorName: session.displayName,
    },
  }

  try {
    await createStoredStoryWork(session.accountId, canonicalBundle)
    return NextResponse.json({ bundle: canonicalBundle }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "로그인한 사용자만 작품을 수정할 수 있습니다." }, { status: 401 })

  const bundle = await readBundle(request)
  if (!bundle) return NextResponse.json({ error: "수정할 작품 형식이 올바르지 않습니다." }, { status: 400 })

  try {
    const stored = await getStoredStoryWork(bundle.work.id)
    if (!stored) return NextResponse.json({ error: "작품을 찾을 수 없습니다." }, { status: 404 })
    if (!canEditStoryWork({ authorId: stored.accountId }, sessionForPermission(session))) {
      return NextResponse.json({ error: "작품 수정 권한이 없습니다." }, { status: 403 })
    }

    const canonicalBundle: StoryWorkBundle = {
      ...bundle,
      work: {
        ...bundle.work,
        authorId: stored.accountId,
        authorName: stored.bundle.work.authorName || bundle.work.authorName,
      },
    }
    await updateStoredStoryWork(canonicalBundle)
    return NextResponse.json({ bundle: canonicalBundle })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "로그인한 사용자만 작품을 삭제할 수 있습니다." }, { status: 401 })

  const body = await request.json().catch(() => null) as { workId?: unknown } | null
  const workId = validId(body?.workId) ? String(body?.workId) : null
  if (!workId) return NextResponse.json({ error: "삭제할 작품 ID가 필요합니다." }, { status: 400 })

  try {
    const stored = await getStoredStoryWork(workId)
    if (!stored) return NextResponse.json({ error: "작품을 찾을 수 없습니다." }, { status: 404 })
    if (!canEditStoryWork({ authorId: stored.accountId }, sessionForPermission(session))) {
      return NextResponse.json({ error: "작품 삭제 권한이 없습니다." }, { status: 403 })
    }

    await deleteStoredStoryWork(workId)
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return errorResponse(error)
  }
}
