import "server-only"

import type { StoryWorkBundle } from "@/lib/story-work-bundle"
import { getNeonSql } from "@/lib/server/neon-database"
import { ensureUserAccountSchema } from "@/lib/server/user-account-store"

export class StoryWorkConflictError extends Error {}

interface StoryWorkRow {
  work_id: string
  account_id: string
  bundle_data: StoryWorkBundle | string
}

export interface StoredStoryWorkRecord {
  accountId: string
  bundle: StoryWorkBundle
}

let schemaReady: Promise<void> | null = null

export async function ensureStoryWorkSchema() {
  if (schemaReady) return schemaReady

  schemaReady = (async () => {
    await ensureUserAccountSchema()
    const sql = getNeonSql()
    await sql`
      CREATE TABLE IF NOT EXISTS storychat_works (
        work_id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES storychat_accounts(account_id) ON DELETE CASCADE,
        bundle_data JSONB NOT NULL,
        is_public BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS storychat_works_account_updated_idx
      ON storychat_works (account_id, updated_at DESC)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS storychat_works_public_updated_idx
      ON storychat_works (is_public, updated_at DESC)
      WHERE is_public = TRUE
    `
  })().catch((error) => {
    schemaReady = null
    throw error
  })

  return schemaReady
}

function parseBundle(value: StoryWorkRow["bundle_data"]): StoryWorkBundle {
  return typeof value === "string" ? JSON.parse(value) as StoryWorkBundle : value
}

function parseRecord(row: StoryWorkRow): StoredStoryWorkRecord {
  return {
    accountId: row.account_id,
    bundle: parseBundle(row.bundle_data),
  }
}

export async function getVisibleStoryWorks(accountId: string, canViewAll: boolean) {
  await ensureStoryWorkSchema()
  const sql = getNeonSql()
  const rows = await sql.query(
    `SELECT work_id, account_id, bundle_data
     FROM storychat_works
     WHERE account_id = $1 OR is_public = TRUE OR $2 = TRUE
     ORDER BY updated_at DESC`,
    [accountId, canViewAll],
  ) as unknown as StoryWorkRow[]
  return rows.map(parseRecord)
}

export async function getStoredStoryWork(workId: string) {
  await ensureStoryWorkSchema()
  const sql = getNeonSql()
  const rows = await sql.query(
    `SELECT work_id, account_id, bundle_data
     FROM storychat_works
     WHERE work_id = $1
     LIMIT 1`,
    [workId],
  ) as unknown as StoryWorkRow[]
  return rows[0] ? parseRecord(rows[0]) : null
}

export async function createStoredStoryWork(accountId: string, bundle: StoryWorkBundle) {
  await ensureStoryWorkSchema()
  const sql = getNeonSql()

  try {
    await sql.query(
      `INSERT INTO storychat_works (work_id, account_id, bundle_data, is_public)
       VALUES ($1, $2, $3::jsonb, $4)`,
      [bundle.work.id, accountId, JSON.stringify(bundle), bundle.work.isPublic !== false],
    )
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      throw new StoryWorkConflictError("동일한 작품 ID가 이미 존재합니다.")
    }
    throw error
  }
}

export async function updateStoredStoryWork(bundle: StoryWorkBundle) {
  await ensureStoryWorkSchema()
  const sql = getNeonSql()
  const rows = await sql.query(
    `UPDATE storychat_works
     SET bundle_data = $2::jsonb, is_public = $3, updated_at = NOW()
     WHERE work_id = $1
     RETURNING work_id`,
    [bundle.work.id, JSON.stringify(bundle), bundle.work.isPublic !== false],
  ) as unknown as Array<{ work_id: string }>
  return rows.length > 0
}

export async function deleteStoredStoryWork(workId: string) {
  await ensureStoryWorkSchema()
  const sql = getNeonSql()
  const rows = await sql.query(
    `DELETE FROM storychat_works WHERE work_id = $1 RETURNING work_id`,
    [workId],
  ) as unknown as Array<{ work_id: string }>
  return rows.length > 0
}
