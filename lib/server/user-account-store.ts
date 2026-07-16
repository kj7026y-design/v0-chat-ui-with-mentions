import "server-only"

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { getNeonSql } from "@/lib/server/neon-database"

export type AccountType = "staff" | "member"
export type AccountRole = "administrator" | "developer" | "operator" | "member"
export type MemberKind = "writer" | "general"
export type WriterTier = "prime" | "gold" | "silver"

export interface AuthenticatedAccount {
  accountId: string
  accountType: AccountType
  role: AccountRole
  identifier: string
  displayName: string
  memberKind?: MemberKind
  writerTier?: WriterTier
}

interface AccountRow {
  account_id: string
  account_type: AccountType
  role: AccountRole
  login_id: string | null
  email: string | null
  password_hash: string
  display_name: string
  member_kind: MemberKind | null
  writer_tier: WriterTier | null
}

interface SampleAccount {
  accountId: string
  accountType: AccountType
  role: AccountRole
  identifier: string
  displayName: string
  memberKind?: MemberKind
  writerTier?: WriterTier
  birthDate?: string
}

const SAMPLE_PASSWORD = "12345"
const SAMPLE_ACCOUNTS: SampleAccount[] = [
  {
    accountId: "staff-admin",
    accountType: "staff",
    role: "administrator",
    identifier: "admin",
    displayName: "관리자",
  },
  {
    accountId: "staff-developer",
    accountType: "staff",
    role: "developer",
    identifier: "developer",
    displayName: "개발자",
  },
  {
    accountId: "staff-operator",
    accountType: "staff",
    role: "operator",
    identifier: "operator",
    displayName: "운영자",
  },
  {
    accountId: "member-writer-prime",
    accountType: "member",
    role: "member",
    identifier: "writer.prime@storychat.test",
    displayName: "프라임 작가",
    memberKind: "writer",
    writerTier: "prime",
    birthDate: "1992-03-14",
  },
  {
    accountId: "member-writer-gold",
    accountType: "member",
    role: "member",
    identifier: "writer.gold@storychat.test",
    displayName: "골드 작가",
    memberKind: "writer",
    writerTier: "gold",
    birthDate: "1995-08-22",
  },
  {
    accountId: "member-writer-silver",
    accountType: "member",
    role: "member",
    identifier: "writer.silver@storychat.test",
    displayName: "실버 작가",
    memberKind: "writer",
    writerTier: "silver",
    birthDate: "1998-11-05",
  },
  {
    accountId: "member-general",
    accountType: "member",
    role: "member",
    identifier: "member@storychat.test",
    displayName: "일반 회원",
    memberKind: "general",
    birthDate: "2000-06-18",
  },
]

let schemaReady: Promise<void> | null = null

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase()
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url")
  const derivedKey = scryptSync(password, salt, 64).toString("base64url")
  return `scrypt$${salt}$${derivedKey}`
}

function verifyPassword(password: string, encodedHash: string) {
  const [algorithm, salt, expectedKey, ...rest] = encodedHash.split("$")
  if (algorithm !== "scrypt" || !salt || !expectedKey || rest.length > 0) return false

  try {
    const actual = scryptSync(password, salt, 64)
    const expected = Buffer.from(expectedKey, "base64url")
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

async function seedSampleAccounts() {
  const sql = getNeonSql()
  const countRows = await sql.query(
    "SELECT COUNT(*)::int AS count FROM storychat_accounts",
  ) as unknown as Array<{ count: number }>
  if ((countRows[0]?.count ?? 0) > 0) return

  const accountQueries = SAMPLE_ACCOUNTS.map((account) => {
    const normalizedIdentifier = normalizeIdentifier(account.identifier)
    return sql.query(
      `INSERT INTO storychat_accounts (
         account_id, account_type, role, login_id, email, normalized_identifier,
         password_hash, display_name
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        account.accountId,
        account.accountType,
        account.role,
        account.accountType === "staff" ? account.identifier : null,
        account.accountType === "member" ? normalizedIdentifier : null,
        normalizedIdentifier,
        hashPassword(SAMPLE_PASSWORD),
        account.displayName,
      ],
    )
  })
  await sql.transaction(accountQueries)

  const profileQueries = SAMPLE_ACCOUNTS
    .filter((account) => account.accountType === "member" && account.memberKind)
    .map((account) => sql.query(
      `INSERT INTO storychat_member_profiles (account_id, member_kind, writer_tier, birth_date)
       VALUES ($1, $2, $3, $4::date)`,
      [account.accountId, account.memberKind, account.writerTier ?? null, account.birthDate ?? null],
    ))
  await sql.transaction(profileQueries)
}

export async function ensureUserAccountSchema() {
  if (schemaReady) return schemaReady

  schemaReady = (async () => {
    const sql = getNeonSql()
    await sql`
      CREATE TABLE IF NOT EXISTS storychat_accounts (
        account_id TEXT PRIMARY KEY,
        account_type TEXT NOT NULL CHECK (account_type IN ('staff', 'member')),
        role TEXT NOT NULL CHECK (role IN ('administrator', 'developer', 'operator', 'member')),
        login_id TEXT,
        email TEXT,
        normalized_identifier TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        credit INTEGER NOT NULL DEFAULT 50 CHECK (credit >= 0),
        is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'withdrawn')),
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (
          (account_type = 'staff' AND role IN ('administrator', 'developer', 'operator') AND login_id IS NOT NULL AND email IS NULL)
          OR
          (account_type = 'member' AND role = 'member' AND login_id IS NULL AND email IS NOT NULL)
        )
      )
    `
    await sql`
      ALTER TABLE storychat_accounts
      ADD COLUMN IF NOT EXISTS credit INTEGER NOT NULL DEFAULT 50 CHECK (credit >= 0)
    `
    await sql`
      ALTER TABLE storychat_accounts
      ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE
    `
    await sql`
      CREATE TABLE IF NOT EXISTS storychat_member_profiles (
        account_id TEXT PRIMARY KEY REFERENCES storychat_accounts(account_id) ON DELETE CASCADE,
        member_id TEXT NOT NULL DEFAULT ('MBR-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 12))),
        member_kind TEXT NOT NULL CHECK (member_kind IN ('writer', 'general')),
        writer_tier TEXT CHECK (writer_tier IN ('prime', 'gold', 'silver')),
        birth_date DATE NOT NULL,
        unsafe_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (
          (member_kind = 'writer' AND writer_tier IS NOT NULL)
          OR
          (member_kind = 'general' AND writer_tier IS NULL)
        )
      )
    `
    await sql`
      ALTER TABLE storychat_member_profiles
      ADD COLUMN IF NOT EXISTS member_id TEXT
    `
    await sql`
      ALTER TABLE storychat_member_profiles
      ALTER COLUMN member_id SET DEFAULT ('MBR-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 12)))
    `
    await sql`
      UPDATE storychat_member_profiles
      SET member_id = 'MBR-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 12))
      WHERE member_id IS NULL OR BTRIM(member_id) = ''
    `
    await sql`ALTER TABLE storychat_member_profiles ALTER COLUMN member_id SET NOT NULL`
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS storychat_member_profiles_member_id_idx
      ON storychat_member_profiles (member_id)
    `
    await sql`
      ALTER TABLE storychat_member_profiles
      ADD COLUMN IF NOT EXISTS birth_date DATE
    `
    await sql`
      ALTER TABLE storychat_member_profiles
      ADD COLUMN IF NOT EXISTS unsafe_enabled BOOLEAN NOT NULL DEFAULT FALSE
    `
    await sql`
      UPDATE storychat_member_profiles
      SET birth_date = CASE account_id
        WHEN 'member-writer-prime' THEN DATE '1992-03-14'
        WHEN 'member-writer-gold' THEN DATE '1995-08-22'
        WHEN 'member-writer-silver' THEN DATE '1998-11-05'
        WHEN 'member-general' THEN DATE '2000-06-18'
        ELSE birth_date
      END
      WHERE birth_date IS NULL
    `
    await sql`ALTER TABLE storychat_member_profiles ALTER COLUMN birth_date SET NOT NULL`
    await sql`
      CREATE TABLE IF NOT EXISTS storychat_member_permissions (
        account_id TEXT NOT NULL REFERENCES storychat_member_profiles(account_id) ON DELETE CASCADE,
        permission_key TEXT NOT NULL CHECK (permission_key IN ('authoring', 'premium_models', 'media_generation')),
        granted_by_account_id TEXT REFERENCES storychat_accounts(account_id) ON DELETE SET NULL,
        granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (account_id, permission_key)
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS storychat_member_audit_logs (
        audit_id BIGSERIAL PRIMARY KEY,
        actor_account_id TEXT REFERENCES storychat_accounts(account_id) ON DELETE SET NULL,
        target_account_id TEXT NOT NULL REFERENCES storychat_accounts(account_id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS storychat_member_audit_target_idx
      ON storychat_member_audit_logs (target_account_id, created_at DESC)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS storychat_accounts_type_role_idx
      ON storychat_accounts (account_type, role, status)
    `
    await seedSampleAccounts()
  })().catch((error) => {
    schemaReady = null
    throw error
  })

  return schemaReady
}

export async function authenticateAccount({
  accountType,
  identifier,
  password,
}: {
  accountType: AccountType
  identifier: string
  password: string
}): Promise<AuthenticatedAccount | null> {
  await ensureUserAccountSchema()
  const sql = getNeonSql()
  const normalizedIdentifier = normalizeIdentifier(identifier)
  if (!normalizedIdentifier || !password) return null

  const rows = await sql.query(
    `SELECT
       account.account_id,
       account.account_type,
       account.role,
       account.login_id,
       account.email,
       account.password_hash,
       account.display_name,
       profile.member_kind,
       profile.writer_tier
     FROM storychat_accounts account
     LEFT JOIN storychat_member_profiles profile ON profile.account_id = account.account_id
     WHERE account.normalized_identifier = $1
       AND account.account_type = $2
       AND account.status = 'active'
       AND account.is_blocked = FALSE
     LIMIT 1`,
    [normalizedIdentifier, accountType],
  ) as unknown as AccountRow[]
  const account = rows[0]
  if (!account || !verifyPassword(password, account.password_hash)) return null

  await sql.query(
    "UPDATE storychat_accounts SET last_login_at = NOW(), updated_at = NOW() WHERE account_id = $1",
    [account.account_id],
  )

  return {
    accountId: account.account_id,
    accountType: account.account_type,
    role: account.role,
    identifier: account.login_id || account.email || normalizedIdentifier,
    displayName: account.display_name,
    memberKind: account.member_kind ?? undefined,
    writerTier: account.writer_tier ?? undefined,
  }
}

export async function getActiveAccountById(accountId: string): Promise<AuthenticatedAccount | null> {
  await ensureUserAccountSchema()
  const sql = getNeonSql()
  const rows = await sql.query(
    `SELECT
       account.account_id,
       account.account_type,
       account.role,
       account.login_id,
       account.email,
       account.password_hash,
       account.display_name,
       profile.member_kind,
       profile.writer_tier
     FROM storychat_accounts account
     LEFT JOIN storychat_member_profiles profile ON profile.account_id = account.account_id
     WHERE account.account_id = $1
       AND account.status = 'active'
       AND account.is_blocked = FALSE
     LIMIT 1`,
    [accountId],
  ) as unknown as AccountRow[]
  const account = rows[0]
  if (!account) return null

  return {
    accountId: account.account_id,
    accountType: account.account_type,
    role: account.role,
    identifier: account.login_id || account.email || account.account_id,
    displayName: account.display_name,
    memberKind: account.member_kind ?? undefined,
    writerTier: account.writer_tier ?? undefined,
  }
}
