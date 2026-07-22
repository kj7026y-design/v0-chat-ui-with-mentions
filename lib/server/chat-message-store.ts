import "server-only"

import { getNeonSql } from "@/lib/server/neon-database"
import { ensureUserAccountSchema } from "@/lib/server/user-account-store"

export { DatabaseNotConfiguredError } from "@/lib/server/neon-database"

export interface StoredChatMessage {
  id: string
  type: string
  content: string
  timestamp: string
  [key: string]: unknown
}

interface MessageRow {
  message_seq: string | number
  message_id: string
  message_type: string
  content: string
  message_data: Record<string, unknown> | string
  client_timestamp: string | Date
}

interface ChatRoomRow {
  chat_room_id: string | number
}

export interface ChatMessagePage {
  messages: StoredChatMessage[]
  nextCursor: string | null
  hasMore: boolean
}

const UNKNOWN_CHARACTER_NAME = "알 수 없는 캐릭터"

let schemaReady: Promise<void> | null = null

async function ensureSchema() {
  if (schemaReady) return schemaReady

  schemaReady = (async () => {
    await ensureUserAccountSchema()
    const sql = getNeonSql()

    await sql`
      CREATE TABLE IF NOT EXISTS storychat_chat_rooms (
        chat_room_id BIGSERIAL PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES storychat_accounts(account_id) ON DELETE CASCADE,
        room_key TEXT NOT NULL,
        character_name VARCHAR(100) NOT NULL DEFAULT '알 수 없는 캐릭터',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (account_id, room_key)
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS storychat_chat_rooms_account_idx
      ON storychat_chat_rooms (account_id, updated_at DESC)
    `
    await sql`
      CREATE TABLE IF NOT EXISTS storychat_messages (
        message_seq BIGSERIAL PRIMARY KEY,
        chat_room_id BIGINT NOT NULL REFERENCES storychat_chat_rooms(chat_room_id) ON DELETE CASCADE,
        message_id TEXT NOT NULL,
        message_type TEXT NOT NULL,
        content TEXT NOT NULL,
        message_data JSONB NOT NULL,
        client_timestamp TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      ALTER TABLE storychat_messages
      ADD COLUMN IF NOT EXISTS chat_room_id BIGINT REFERENCES storychat_chat_rooms(chat_room_id) ON DELETE CASCADE
    `
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS storychat_messages_room_message_idx
      ON storychat_messages (chat_room_id, message_id)
      WHERE chat_room_id IS NOT NULL
    `
    await sql`
      CREATE INDEX IF NOT EXISTS storychat_messages_room_cursor_v2_idx
      ON storychat_messages (chat_room_id, message_seq DESC)
      WHERE chat_room_id IS NOT NULL
    `
    await sql.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM storychat_messages WHERE chat_room_id IS NULL) THEN
          ALTER TABLE storychat_messages ALTER COLUMN chat_room_id SET NOT NULL;
        END IF;
      END
      $$
    `)
  })().catch((error) => {
    schemaReady = null
    throw error
  })

  return schemaReady
}

function normalizeCharacterName(characterName?: string) {
  const normalized = characterName?.trim()
  return normalized ? normalized.slice(0, 100) : UNKNOWN_CHARACTER_NAME
}

async function findChatRoomId(accountId: string, roomId: string) {
  const sql = getNeonSql()
  const rows = await sql.query(
    `SELECT chat_room_id
     FROM storychat_chat_rooms
     WHERE account_id = $1 AND room_key = $2
     LIMIT 1`,
    [accountId, roomId],
  ) as unknown as ChatRoomRow[]
  return rows[0] ? String(rows[0].chat_room_id) : null
}

async function ensureChatRoom({
  accountId,
  roomId,
  characterName,
}: {
  accountId: string
  roomId: string
  characterName?: string
}) {
  const sql = getNeonSql()
  const normalizedCharacterName = normalizeCharacterName(characterName)
  const rows = await sql.query(
    `INSERT INTO storychat_chat_rooms (account_id, room_key, character_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (account_id, room_key)
     DO UPDATE SET
       character_name = CASE
         WHEN EXCLUDED.character_name = $4 THEN storychat_chat_rooms.character_name
         ELSE EXCLUDED.character_name
       END,
       updated_at = NOW()
     RETURNING chat_room_id`,
    [accountId, roomId, normalizedCharacterName, UNKNOWN_CHARACTER_NAME],
  ) as unknown as ChatRoomRow[]
  return String(rows[0].chat_room_id)
}

const MESSAGE_COLUMN_KEYS = new Set(["id", "type", "content", "timestamp"])

function parseStoredMetadata(messageData: MessageRow["message_data"]): Record<string, unknown> {
  if (typeof messageData !== "string") return messageData

  try {
    const parsed = JSON.parse(messageData) as unknown
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function serializeMessageMetadata(message: StoredChatMessage) {
  return JSON.stringify(Object.fromEntries(
    Object.entries(message).filter(([key]) => !MESSAGE_COLUMN_KEYS.has(key)),
  ))
}

function parseMessageData(row: MessageRow): StoredChatMessage {
  const metadata = parseStoredMetadata(row.message_data)

  // The dedicated columns are canonical. Spreading them last also keeps legacy
  // rows readable when message_data still contains a full message snapshot.
  return {
    ...metadata,
    id: row.message_id,
    type: row.message_type,
    content: row.content,
    timestamp: new Date(row.client_timestamp).toISOString(),
  }
}

export async function getChatMessagePage({
  accountId,
  roomId,
  characterName,
  cursor,
  limit,
}: {
  accountId: string
  roomId: string
  characterName?: string
  cursor?: string
  limit: number
}): Promise<ChatMessagePage> {
  await ensureSchema()
  const sql = getNeonSql()
  const chatRoomId = characterName
    ? await ensureChatRoom({ accountId, roomId, characterName })
    : await findChatRoomId(accountId, roomId)
  if (!chatRoomId) return { messages: [], nextCursor: null, hasMore: false }

  const queryLimit = limit + 1
  const rows = cursor
    ? await sql.query(
        `SELECT message_seq, message_id, message_type, content, message_data, client_timestamp
         FROM storychat_messages
         WHERE chat_room_id = $1::bigint AND message_seq < $2::bigint
         ORDER BY message_seq DESC
         LIMIT $3`,
        [chatRoomId, cursor, queryLimit],
      ) as unknown as MessageRow[]
    : await sql.query(
        `SELECT message_seq, message_id, message_type, content, message_data, client_timestamp
         FROM storychat_messages
         WHERE chat_room_id = $1::bigint
         ORDER BY message_seq DESC
         LIMIT $2`,
        [chatRoomId, queryLimit],
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
  accountId,
  roomId,
  characterName,
  messages,
}: {
  accountId: string
  roomId: string
  characterName?: string
  messages: StoredChatMessage[]
}) {
  await ensureSchema()
  const sql = getNeonSql()
  const chatRoomId = await ensureChatRoom({ accountId, roomId, characterName })
  const queries = messages.map((message) => sql.query(
    `INSERT INTO storychat_messages (
       chat_room_id, message_id, message_type, content, message_data, client_timestamp
     ) VALUES ($1::bigint, $2, $3, $4, $5::jsonb, $6::timestamptz)
     ON CONFLICT (chat_room_id, message_id) WHERE chat_room_id IS NOT NULL
     DO UPDATE SET
       message_type = EXCLUDED.message_type,
       content = EXCLUDED.content,
       message_data = EXCLUDED.message_data,
       client_timestamp = EXCLUDED.client_timestamp,
       updated_at = NOW()`,
    [
      chatRoomId,
      message.id,
      message.type,
      message.content,
      serializeMessageMetadata(message),
      message.timestamp,
    ],
  ))

  await sql.transaction(queries)
}

export async function deleteChatMessages({
  accountId,
  roomId,
  messageIds,
}: {
  accountId: string
  roomId: string
  messageIds: string[]
}) {
  if (messageIds.length === 0) return
  await ensureSchema()
  const sql = getNeonSql()
  const chatRoomId = await findChatRoomId(accountId, roomId)
  if (!chatRoomId) return

  await sql.query(
    `DELETE FROM storychat_messages
     WHERE chat_room_id = $1::bigint AND message_id = ANY($2::text[])`,
    [chatRoomId, messageIds],
  )
}

export async function clearChatMessages({ accountId, roomId }: { accountId: string; roomId: string }) {
  await ensureSchema()
  const sql = getNeonSql()
  const chatRoomId = await findChatRoomId(accountId, roomId)
  if (!chatRoomId) return

  await sql.query(
    `DELETE FROM storychat_messages WHERE chat_room_id = $1::bigint`,
    [chatRoomId],
  )
}
