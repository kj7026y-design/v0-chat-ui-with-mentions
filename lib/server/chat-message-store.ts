import "server-only"

import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

export interface StoredChatMessage {
  id: string
  type: string
  content: string
  timestamp: string
  [key: string]: unknown
}

interface MessageRow {
  message_seq: string | number
  message_data: StoredChatMessage | string
  client_timestamp: string | Date
}

export interface ChatMessagePage {
  messages: StoredChatMessage[]
  nextCursor: string | null
  hasMore: boolean
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("Neon database URL is not configured")
    this.name = "DatabaseNotConfiguredError"
  }
}

let sqlClient: NeonQueryFunction<false, false> | null = null
let schemaReady: Promise<void> | null = null

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ""
  ).trim()
}

function getSql() {
  if (sqlClient) return sqlClient
  const databaseUrl = getDatabaseUrl()
  if (!databaseUrl) throw new DatabaseNotConfiguredError()
  sqlClient = neon(databaseUrl)
  return sqlClient
}

async function ensureSchema() {
  if (schemaReady) return schemaReady

  schemaReady = (async () => {
    const sql = getSql()
    await sql`
      CREATE TABLE IF NOT EXISTS storychat_messages (
        message_seq BIGSERIAL PRIMARY KEY,
        admin_id TEXT NOT NULL,
        room_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        message_type TEXT NOT NULL,
        content TEXT NOT NULL,
        message_data JSONB NOT NULL,
        client_timestamp TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (admin_id, room_id, message_id)
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS storychat_messages_room_cursor_idx
      ON storychat_messages (admin_id, room_id, message_seq DESC)
    `
  })().catch((error) => {
    schemaReady = null
    throw error
  })

  return schemaReady
}

function parseMessageData(row: MessageRow): StoredChatMessage {
  const data = typeof row.message_data === "string"
    ? JSON.parse(row.message_data) as StoredChatMessage
    : row.message_data
  const timestamp = data.timestamp || new Date(row.client_timestamp).toISOString()
  return { ...data, timestamp }
}

export async function getChatMessagePage({
  adminId,
  roomId,
  cursor,
  limit,
}: {
  adminId: string
  roomId: string
  cursor?: string
  limit: number
}): Promise<ChatMessagePage> {
  await ensureSchema()
  const sql = getSql()
  const queryLimit = limit + 1
  const rows = cursor
    ? await sql.query(
        `SELECT message_seq, message_data, client_timestamp
         FROM storychat_messages
         WHERE admin_id = $1 AND room_id = $2 AND message_seq < $3::bigint
         ORDER BY message_seq DESC
         LIMIT $4`,
        [adminId, roomId, cursor, queryLimit],
      ) as unknown as MessageRow[]
    : await sql.query(
        `SELECT message_seq, message_data, client_timestamp
         FROM storychat_messages
         WHERE admin_id = $1 AND room_id = $2
         ORDER BY message_seq DESC
         LIMIT $3`,
        [adminId, roomId, queryLimit],
      ) as unknown as MessageRow[]

  const hasMore = rows.length > limit
  const selectedRows = rows.slice(0, limit)
  const oldestRow = selectedRows.at(-1)

  return {
    messages: selectedRows.map(parseMessageData).reverse(),
    nextCursor: hasMore && oldestRow ? String(oldestRow.message_seq) : null,
    hasMore,
  }
}

export async function upsertChatMessages({
  adminId,
  roomId,
  messages,
}: {
  adminId: string
  roomId: string
  messages: StoredChatMessage[]
}) {
  await ensureSchema()
  const sql = getSql()
  const queries = messages.map((message) => sql.query(
    `INSERT INTO storychat_messages (
       admin_id, room_id, message_id, message_type, content, message_data, client_timestamp
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz)
     ON CONFLICT (admin_id, room_id, message_id)
     DO UPDATE SET
       message_type = EXCLUDED.message_type,
       content = EXCLUDED.content,
       message_data = EXCLUDED.message_data,
       client_timestamp = EXCLUDED.client_timestamp,
       updated_at = NOW()`,
    [
      adminId,
      roomId,
      message.id,
      message.type,
      message.content,
      JSON.stringify(message),
      message.timestamp,
    ],
  ))

  await sql.transaction(queries)
}

export async function deleteChatMessages({
  adminId,
  roomId,
  messageIds,
}: {
  adminId: string
  roomId: string
  messageIds: string[]
}) {
  if (messageIds.length === 0) return
  await ensureSchema()
  const sql = getSql()
  await sql.query(
    `DELETE FROM storychat_messages
     WHERE admin_id = $1 AND room_id = $2 AND message_id = ANY($3::text[])`,
    [adminId, roomId, messageIds],
  )
}

export async function clearChatMessages({ adminId, roomId }: { adminId: string; roomId: string }) {
  await ensureSchema()
  const sql = getSql()
  await sql.query(
    `DELETE FROM storychat_messages WHERE admin_id = $1 AND room_id = $2`,
    [adminId, roomId],
  )
}
