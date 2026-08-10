import "server-only"

import { toKoreaIsoString } from "@/lib/korea-time"
import { getNeonSql } from "@/lib/server/neon-database"
import { ensureUserAccountSchema } from "@/lib/server/user-account-store"

export interface StoredGeneratedMedia {
  id: string
  type: "image"
  imageUrl: string
  prompt: string
  provider?: string
  workId?: string
  chatId?: string
  characterId?: string
  userId: string
  messageId?: string
  title?: string
  createdAt: string
  isPublic?: boolean
  source?: "uploaded" | "generated"
}

interface GeneratedMediaRow {
  media_id: string
  image_url: string
  prompt: string
  provider: string | null
  work_id: string | null
  room_key: string | null
  character_id: string | null
  message_id: string | null
  title: string | null
  created_at: string | Date
  is_public: boolean
  source: "uploaded" | "generated"
}

let schemaReady: Promise<void> | null = null

export async function ensureGeneratedMediaSchema() {
  if (schemaReady) return schemaReady
  schemaReady = (async () => {
    await ensureUserAccountSchema()
    const sql = getNeonSql()
    await sql`
      CREATE TABLE IF NOT EXISTS storychat_generated_media (
        generated_media_id BIGSERIAL PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES storychat_accounts(account_id) ON DELETE CASCADE,
        media_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        prompt TEXT NOT NULL DEFAULT '',
        provider VARCHAR(30),
        work_id TEXT,
        room_key TEXT,
        character_id TEXT,
        message_id TEXT,
        title VARCHAR(200),
        client_created_at TIMESTAMPTZ NOT NULL,
        is_public BOOLEAN NOT NULL DEFAULT FALSE,
        source VARCHAR(20) NOT NULL DEFAULT 'generated',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (account_id, media_id)
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS storychat_generated_media_account_created_idx
      ON storychat_generated_media (account_id, client_created_at DESC)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS storychat_generated_media_account_room_idx
      ON storychat_generated_media (account_id, room_key, client_created_at DESC)
    `
  })().catch((error) => {
    schemaReady = null
    throw error
  })
  return schemaReady
}

function parseRow(row: GeneratedMediaRow, accountId: string): StoredGeneratedMedia {
  return {
    id: row.media_id,
    type: "image",
    imageUrl: row.image_url,
    prompt: row.prompt,
    provider: row.provider || undefined,
    workId: row.work_id || undefined,
    chatId: row.room_key || undefined,
    characterId: row.character_id || undefined,
    userId: accountId,
    messageId: row.message_id || undefined,
    title: row.title || undefined,
    createdAt: toKoreaIsoString(row.created_at),
    isPublic: row.is_public,
    source: row.source,
  }
}

export async function getGeneratedMedia(accountId: string) {
  await ensureGeneratedMediaSchema()
  const sql = getNeonSql()
  const rows = await sql.query(
    `SELECT media_id, image_url, prompt, provider, work_id, room_key, character_id,
            message_id, title, client_created_at AS created_at, is_public, source
     FROM storychat_generated_media
     WHERE account_id = $1
     ORDER BY client_created_at DESC`,
    [accountId],
  ) as unknown as GeneratedMediaRow[]
  return rows.map((row) => parseRow(row, accountId))
}

export async function upsertGeneratedMedia(accountId: string, items: StoredGeneratedMedia[]) {
  if (items.length === 0) return
  await ensureGeneratedMediaSchema()
  const sql = getNeonSql()
  await sql.transaction(items.map((item) => sql.query(
    `INSERT INTO storychat_generated_media (
       account_id, media_id, image_url, prompt, provider, work_id, room_key,
       character_id, message_id, title, client_created_at, is_public, source
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz, $12, $13)
     ON CONFLICT (account_id, media_id)
     DO UPDATE SET
       image_url = EXCLUDED.image_url,
       prompt = EXCLUDED.prompt,
       provider = EXCLUDED.provider,
       work_id = EXCLUDED.work_id,
       room_key = EXCLUDED.room_key,
       character_id = EXCLUDED.character_id,
       message_id = EXCLUDED.message_id,
       title = EXCLUDED.title,
       client_created_at = EXCLUDED.client_created_at,
       is_public = EXCLUDED.is_public,
       source = EXCLUDED.source,
       updated_at = NOW()`,
    [
      accountId, item.id, item.imageUrl, item.prompt, item.provider || null,
      item.workId || null, item.chatId || null, item.characterId || null,
      item.messageId || null, item.title || null, toKoreaIsoString(item.createdAt),
      item.isPublic === true, item.source || "generated",
    ],
  )))
}

export async function deleteGeneratedMedia(accountId: string, mediaId: string) {
  await ensureGeneratedMediaSchema()
  const sql = getNeonSql()
  await sql.query(
    `DELETE FROM storychat_generated_media WHERE account_id = $1 AND media_id = $2`,
    [accountId, mediaId],
  )
}
