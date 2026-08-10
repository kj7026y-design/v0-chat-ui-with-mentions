import "server-only"

import { toKoreaIsoString } from "@/lib/korea-time"
import { getNeonSql } from "@/lib/server/neon-database"
import { ensureUserAccountSchema } from "@/lib/server/user-account-store"

export type CreditTransactionType = "earned" | "spent"

export interface UserCreditTransaction {
  id: string
  type: CreditTransactionType
  title: string
  amount: number
  description?: string
  createdAt: string
}

export interface UserCreditData {
  credits: number
  history: UserCreditTransaction[]
}

let creditSchemaReady: Promise<void> | null = null

export async function ensureCreditSchema() {
  if (creditSchemaReady) return creditSchemaReady

  creditSchemaReady = (async () => {
    await ensureUserAccountSchema()
    const sql = getNeonSql()
    await sql`
      CREATE TABLE IF NOT EXISTS storychat_credit_transactions (
        transaction_id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES storychat_accounts(account_id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('earned', 'spent')),
        title TEXT NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS storychat_credit_tx_account_idx
      ON storychat_credit_transactions (account_id, created_at DESC)
    `
  })().catch((error) => {
    creditSchemaReady = null
    throw error
  })

  return creditSchemaReady
}

export async function getUserCreditData(accountId: string): Promise<UserCreditData> {
  await ensureCreditSchema()
  const sql = getNeonSql()

  const accountRows = await sql.query(
    "SELECT credit FROM storychat_accounts WHERE account_id = $1 LIMIT 1",
    [accountId],
  ) as unknown as Array<{ credit: number | string }>

  if (accountRows.length === 0) {
    return { credits: 100, history: [] }
  }

  const credits = Number(accountRows[0].credit)

  const historyRows = await sql.query(
    `SELECT transaction_id, type, title, amount, description, created_at
     FROM storychat_credit_transactions
     WHERE account_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [accountId],
  ) as unknown as Array<{
    transaction_id: string
    type: CreditTransactionType
    title: string
    amount: number | string
    description: string | null
    created_at: string | Date
  }>

  const history: UserCreditTransaction[] = historyRows.map((row) => ({
    id: row.transaction_id,
    type: row.type,
    title: row.title,
    amount: Number(row.amount),
    description: row.description ?? undefined,
    createdAt: toKoreaIsoString(row.created_at),
  }))

  return { credits, history }
}

export async function adjustUserCreditInDb({
  accountId,
  amount,
  type,
  title,
  description,
}: {
  accountId: string
  amount: number
  type: CreditTransactionType
  title: string
  description?: string
}): Promise<UserCreditData> {
  await ensureCreditSchema()
  const sql = getNeonSql()

  const delta = type === "spent" ? -Math.abs(amount) : Math.abs(amount)

  const updatedRows = await sql.query(
    `UPDATE storychat_accounts
     SET credit = credit + $1::int,
         updated_at = NOW()
     WHERE account_id = $2
       AND (credit + $1::int) >= 0
     RETURNING credit`,
    [delta, accountId],
  ) as unknown as Array<{ credit: number | string }>

  if (updatedRows.length === 0) {
    throw new Error("INSUFFICIENT_CREDITS")
  }

  const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  await sql.query(
    `INSERT INTO storychat_credit_transactions (transaction_id, account_id, type, title, amount, description)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [txId, accountId, type, title, delta, description ?? null],
  )

  return getUserCreditData(accountId)
}
