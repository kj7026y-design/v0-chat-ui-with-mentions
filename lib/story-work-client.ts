"use client"

import {
  defaultLibrary,
  getStoryChatLibrary,
  saveStoryChatLibrary,
  type StoryChatLibrary,
} from "@/lib/storychat-storage"
import {
  buildStoryWorkBundle,
  mergeStoryWorkBundles,
  type StoryWorkBundle,
} from "@/lib/story-work-bundle"

const DB_WORK_IDS_KEY = "storychat_db_work_ids"
const DB_CHARACTER_IDS_KEY = "storychat_db_character_ids"
const DB_WORLD_IDS_KEY = "storychat_db_world_ids"
const DB_PERSONA_IDS_KEY = "storychat_db_persona_ids"
const DB_ACTIVE_ACCOUNT_KEY = "storychat_db_active_account"
const DB_MIGRATION_KEY_PREFIX = "storychat_work_db_migrated:"

interface WorkListResponse {
  accountId: string
  bundles: StoryWorkBundle[]
}

let activeSync: Promise<StoryChatLibrary> | null = null

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || "작품 DB 요청을 처리하지 못했어요.")
  return data
}

function getKnownIds(key: string) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]")
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [])
  } catch {
    return new Set<string>()
  }
}

function rememberIds(key: string, ids: Iterable<string>) {
  const known = getKnownIds(key)
  for (const id of ids) known.add(id)
  window.localStorage.setItem(key, JSON.stringify([...known]))
}

function rememberBundleIds(bundles: StoryWorkBundle[]) {
  rememberIds(DB_WORK_IDS_KEY, bundles.map((bundle) => bundle.work.id))
  rememberIds(DB_CHARACTER_IDS_KEY, bundles.flatMap((bundle) => bundle.characters.map((item) => item.id)))
  rememberIds(DB_WORLD_IDS_KEY, bundles.map((bundle) => bundle.world.id))
  rememberIds(
    DB_PERSONA_IDS_KEY,
    bundles.flatMap((bundle) => bundle.persona ? [bundle.persona.id] : []),
  )
}

async function requestBundle(method: "POST" | "PUT", bundle: StoryWorkBundle) {
  const response = await fetch("/api/works", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bundle }),
  })
  return readResponse<{ bundle: StoryWorkBundle }>(response)
}

async function waitForStoryWorkSync() {
  const sync = activeSync
  if (sync) await sync
}

export async function createStoryWorkInDatabase(bundle: StoryWorkBundle) {
  await waitForStoryWorkSync()
  const result = await requestBundle("POST", bundle)
  rememberBundleIds([result.bundle])
  return result.bundle
}

export async function updateStoryWorkInDatabase(bundle: StoryWorkBundle) {
  await waitForStoryWorkSync()
  const result = await requestBundle("PUT", bundle)
  rememberBundleIds([result.bundle])
  return result.bundle
}

export async function deleteStoryWorkFromDatabase(workId: string) {
  await waitForStoryWorkSync()
  const response = await fetch("/api/works", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workId }),
  })
  await readResponse<{ deleted: true }>(response)
  rememberIds(DB_WORK_IDS_KEY, [workId])
}

export function syncStoryWorksFromDatabase(): Promise<StoryChatLibrary> {
  if (activeSync) return activeSync
  activeSync = performStoryWorkSync().finally(() => {
    activeSync = null
  })
  return activeSync
}

async function performStoryWorkSync(): Promise<StoryChatLibrary> {
  const localLibrary = getStoryChatLibrary()
  const response = await fetch("/api/works", { cache: "no-store" })
  const result = await readResponse<WorkListResponse>(response)
  const defaultWorkIds = new Set(defaultLibrary.works.map((work) => work.id))
  const knownWorkIds = getKnownIds(DB_WORK_IDS_KEY)
  const migrationKey = `${DB_MIGRATION_KEY_PREFIX}${result.accountId}`
  const migrationCompleted = window.localStorage.getItem(migrationKey) === "true"
  const migratedBundles: StoryWorkBundle[] = []

  if (!migrationCompleted) {
    const remoteIds = new Set(result.bundles.map((bundle) => bundle.work.id))
    const migrationCandidates = localLibrary.works.filter((work) =>
      !defaultWorkIds.has(work.id) &&
      !knownWorkIds.has(work.id) &&
      !remoteIds.has(work.id) &&
      (!work.authorId || work.authorId === result.accountId),
    )

    let migrationIncomplete = false
    for (const work of migrationCandidates) {
      const bundle = buildStoryWorkBundle(localLibrary, work)
      if (!bundle) {
        migrationIncomplete = true
        continue
      }
      const migrated = await requestBundle("POST", bundle)
      rememberBundleIds([migrated.bundle])
      migratedBundles.push(migrated.bundle)
    }
    if (!migrationIncomplete) window.localStorage.setItem(migrationKey, "true")
  }

  const bundles = [...migratedBundles, ...result.bundles]
  rememberBundleIds(bundles)

  const staleWorkIds = getKnownIds(DB_WORK_IDS_KEY)
  const staleCharacterIds = getKnownIds(DB_CHARACTER_IDS_KEY)
  const staleWorldIds = getKnownIds(DB_WORLD_IDS_KEY)
  const stalePersonaIds = getKnownIds(DB_PERSONA_IDS_KEY)
  const previousAccountId = window.localStorage.getItem(DB_ACTIVE_ACCOUNT_KEY)
  const accountChanged = Boolean(previousAccountId && previousAccountId !== result.accountId)
  const defaultCharacterIds = new Set(defaultLibrary.characters.map((item) => item.id))
  const defaultWorldIds = new Set(defaultLibrary.worlds.map((item) => item.id))
  const defaultPersonaIds = new Set(defaultLibrary.personas.map((item) => item.id))
  const cacheWithoutDatabaseWorks: StoryChatLibrary = {
    characters: accountChanged
      ? localLibrary.characters.filter((item) =>
          defaultCharacterIds.has(item.id) || !staleCharacterIds.has(item.id),
        )
      : localLibrary.characters,
    worlds: accountChanged
      ? localLibrary.worlds.filter((item) =>
          defaultWorldIds.has(item.id) || !staleWorldIds.has(item.id),
        )
      : localLibrary.worlds,
    personas: accountChanged
      ? localLibrary.personas.filter((item) =>
          defaultPersonaIds.has(item.id) || !stalePersonaIds.has(item.id),
        )
      : localLibrary.personas,
    works: localLibrary.works.filter((work) =>
      !staleWorkIds.has(work.id) &&
      (!accountChanged || defaultWorkIds.has(work.id) || !work.authorId || work.authorId === result.accountId),
    ),
  }
  const nextLibrary = mergeStoryWorkBundles(cacheWithoutDatabaseWorks, bundles)
  window.localStorage.setItem(DB_ACTIVE_ACCOUNT_KEY, result.accountId)
  saveStoryChatLibrary(nextLibrary)
  return nextLibrary
}

export function requireStoryWorkBundle(library: StoryChatLibrary, workId: string) {
  const work = library.works.find((item) => item.id === workId)
  const bundle = work ? buildStoryWorkBundle(library, work) : null
  if (!bundle) throw new Error("작품의 캐릭터 또는 세계관 연결 정보를 찾을 수 없습니다.")
  return bundle
}
