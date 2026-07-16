import "server-only"

import {
  MEMBER_PERMISSION_KEYS,
  type ManagedMember,
  type ManagedMemberKind,
  type ManagedWriterTier,
  type MemberPermissionKey,
} from "@/lib/member-admin-types"
import { getNeonSql } from "@/lib/server/neon-database"
import { ensureUserAccountSchema } from "@/lib/server/user-account-store"

interface ManagedMemberRow {
  member_id: string
  email: string
  display_name: string
  birth_date: string | Date
  age: string | number
  member_kind: ManagedMemberKind
  writer_tier: ManagedWriterTier | null
  credit: string | number
  is_blocked: boolean
  unsafe_enabled: boolean
  permissions: MemberPermissionKey[] | null
  created_at: string | Date
  total_count: string | number
}

interface TargetRow {
  target_account_id: string
}

export class MemberNotFoundError extends Error {
  constructor() {
    super("One or more members could not be found")
    this.name = "MemberNotFoundError"
  }
}

export class InsufficientCreditError extends Error {
  constructor() {
    super("The credit adjustment would produce a negative balance")
    this.name = "InsufficientCreditError"
  }
}

function toDateOnly(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10)
  return value.toISOString().slice(0, 10)
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function mapMember(row: ManagedMemberRow): ManagedMember {
  return {
    memberId: row.member_id,
    email: row.email,
    displayName: row.display_name,
    birthDate: toDateOnly(row.birth_date),
    age: Number(row.age),
    memberKind: row.member_kind,
    writerTier: row.writer_tier,
    credit: Number(row.credit),
    isBlocked: row.is_blocked,
    unsafeEnabled: row.unsafe_enabled,
    permissions: row.permissions ?? [],
    createdAt: toIsoString(row.created_at),
  }
}

function normalizeMemberIds(memberIds: string[]) {
  return [...new Set(memberIds.map((memberId) => memberId.trim().toUpperCase()).filter(Boolean))]
}

async function assertUpdatedTargets(rows: TargetRow[], memberIds: string[]) {
  if (rows.length !== memberIds.length) throw new MemberNotFoundError()
}

export async function listManagedMembers({ search = "", limit = 100 }: { search?: string; limit?: number }) {
  await ensureUserAccountSchema()
  const sql = getNeonSql()
  const normalizedSearch = search.trim()
  const searchTokens = normalizedSearch
    ? normalizedSearch.split(",").map((token) => token.trim()).filter(Boolean).slice(0, 50)
    : []
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)))

  const baseSelect = `
    SELECT
      profile.member_id,
      account.email,
      account.display_name,
      TO_CHAR(profile.birth_date, 'YYYY-MM-DD') AS birth_date,
      CASE
        WHEN profile.birth_date IS NULL THEN NULL
        ELSE EXTRACT(YEAR FROM AGE(CURRENT_DATE, profile.birth_date))::int
      END AS age,
      profile.member_kind,
      profile.writer_tier,
      account.credit,
      account.is_blocked,
      profile.unsafe_enabled,
      COALESCE((
        SELECT ARRAY_AGG(permission.permission_key ORDER BY permission.permission_key)
        FROM storychat_member_permissions permission
        WHERE permission.account_id = account.account_id
      ), ARRAY[]::text[]) AS permissions,
      account.created_at,
      COUNT(*) OVER()::int AS total_count
    FROM storychat_accounts account
    JOIN storychat_member_profiles profile ON profile.account_id = account.account_id
    WHERE account.account_type = 'member'
  `

  let rows: ManagedMemberRow[]
  if (searchTokens.length > 1 || normalizedSearch.includes(",")) {
    rows = await sql.query(
      `${baseSelect}
       AND (
         LOWER(account.email) = ANY($1::text[])
         OR UPPER(profile.member_id) = ANY($2::text[])
       )
       ORDER BY account.created_at DESC, profile.member_id
       LIMIT $3`,
      [
        searchTokens.map((token) => token.toLowerCase()),
        searchTokens.map((token) => token.toUpperCase()),
        safeLimit,
      ],
    ) as unknown as ManagedMemberRow[]
  } else if (searchTokens.length === 1) {
    rows = await sql.query(
      `${baseSelect}
       AND (
         account.email ILIKE '%' || $1 || '%'
         OR profile.member_id ILIKE '%' || $1 || '%'
         OR account.display_name ILIKE '%' || $1 || '%'
       )
       ORDER BY account.created_at DESC, profile.member_id
       LIMIT $2`,
      [searchTokens[0], safeLimit],
    ) as unknown as ManagedMemberRow[]
  } else {
    rows = await sql.query(
      `${baseSelect}
       ORDER BY account.created_at DESC, profile.member_id
       LIMIT $1`,
      [safeLimit],
    ) as unknown as ManagedMemberRow[]
  }

  return {
    members: rows.map(mapMember),
    total: Number(rows[0]?.total_count ?? 0),
  }
}

export async function updateMemberProfile({
  actorAccountId,
  memberId,
  email,
  displayName,
  birthDate,
  memberKind,
  writerTier,
}: {
  actorAccountId: string
  memberId: string
  email: string
  displayName: string
  birthDate: string
  memberKind: ManagedMemberKind
  writerTier: ManagedWriterTier | null
}) {
  await ensureUserAccountSchema()
  const sql = getNeonSql()
  const details = JSON.stringify({ email, displayName, birthDate, memberKind, writerTier })
  const rows = await sql.query(
    `WITH target AS (
       SELECT account.account_id
       FROM storychat_accounts account
       JOIN storychat_member_profiles profile ON profile.account_id = account.account_id
       WHERE UPPER(profile.member_id) = UPPER($1)
         AND account.account_type = 'member'
     ), updated_account AS (
       UPDATE storychat_accounts account
       SET email = LOWER($2),
           normalized_identifier = LOWER($2),
           display_name = $3,
           updated_at = NOW()
       FROM target
       WHERE account.account_id = target.account_id
       RETURNING account.account_id
     ), updated_profile AS (
       UPDATE storychat_member_profiles profile
       SET birth_date = $4::date,
           member_kind = $5,
           writer_tier = $6,
           updated_at = NOW()
       FROM target
       WHERE profile.account_id = target.account_id
       RETURNING profile.account_id
     ), audit AS (
       INSERT INTO storychat_member_audit_logs (
         actor_account_id, target_account_id, action, details
       )
       SELECT $7, target.account_id, 'update_profile', $8::jsonb
       FROM target
     )
     SELECT account_id AS target_account_id FROM updated_account`,
    [memberId, email, displayName, birthDate, memberKind, writerTier, actorAccountId, details],
  ) as unknown as TargetRow[]
  await assertUpdatedTargets(rows, [memberId])
}

export async function setMemberAccess({
  actorAccountId,
  memberIds: rawMemberIds,
  allowed,
}: {
  actorAccountId: string
  memberIds: string[]
  allowed: boolean
}) {
  await ensureUserAccountSchema()
  const sql = getNeonSql()
  const memberIds = normalizeMemberIds(rawMemberIds)
  const rows = await sql.query(
    `WITH targets AS (
       SELECT account.account_id
       FROM storychat_accounts account
       JOIN storychat_member_profiles profile ON profile.account_id = account.account_id
       WHERE UPPER(profile.member_id) = ANY($1::text[])
         AND account.account_type = 'member'
     ), guard AS (
       SELECT COUNT(*) = $2::int AS all_found FROM targets
     ), updated AS (
       UPDATE storychat_accounts account
       SET is_blocked = $3,
           updated_at = NOW()
       FROM targets
       WHERE account.account_id = targets.account_id
         AND (SELECT all_found FROM guard)
       RETURNING account.account_id
     ), audit AS (
       INSERT INTO storychat_member_audit_logs (
         actor_account_id, target_account_id, action, details
       )
       SELECT $4, updated.account_id, $5, jsonb_build_object('allowed', $6::boolean)
       FROM updated
     )
     SELECT account_id AS target_account_id FROM updated`,
    [memberIds, memberIds.length, !allowed, actorAccountId, allowed ? "grant_access" : "revoke_access", allowed],
  ) as unknown as TargetRow[]
  await assertUpdatedTargets(rows, memberIds)
}

export async function setMemberUnsafe({
  actorAccountId,
  memberIds: rawMemberIds,
  enabled,
}: {
  actorAccountId: string
  memberIds: string[]
  enabled: boolean
}) {
  await ensureUserAccountSchema()
  const sql = getNeonSql()
  const memberIds = normalizeMemberIds(rawMemberIds)
  const rows = await sql.query(
    `WITH targets AS (
       SELECT profile.account_id
       FROM storychat_member_profiles profile
       WHERE UPPER(profile.member_id) = ANY($1::text[])
     ), guard AS (
       SELECT COUNT(*) = $2::int AS all_found FROM targets
     ), updated AS (
       UPDATE storychat_member_profiles profile
       SET unsafe_enabled = $3,
           updated_at = NOW()
       FROM targets
       WHERE profile.account_id = targets.account_id
         AND (SELECT all_found FROM guard)
       RETURNING profile.account_id
     ), audit AS (
       INSERT INTO storychat_member_audit_logs (
         actor_account_id, target_account_id, action, details
       )
       SELECT $4, updated.account_id, $5, jsonb_build_object('enabled', $6::boolean)
       FROM updated
     )
     SELECT account_id AS target_account_id FROM updated`,
    [memberIds, memberIds.length, enabled, actorAccountId, enabled ? "enable_unsafe" : "disable_unsafe", enabled],
  ) as unknown as TargetRow[]
  await assertUpdatedTargets(rows, memberIds)
}

export async function adjustMemberCredit({
  actorAccountId,
  memberIds: rawMemberIds,
  amount,
}: {
  actorAccountId: string
  memberIds: string[]
  amount: number
}) {
  await ensureUserAccountSchema()
  const sql = getNeonSql()
  const memberIds = normalizeMemberIds(rawMemberIds)
  const targetState = await sql.query(
    `SELECT account.credit
     FROM storychat_accounts account
     JOIN storychat_member_profiles profile ON profile.account_id = account.account_id
     WHERE UPPER(profile.member_id) = ANY($1::text[])
       AND account.account_type = 'member'`,
    [memberIds],
  ) as unknown as Array<{ credit: string | number }>
  if (targetState.length !== memberIds.length) throw new MemberNotFoundError()
  if (targetState.some((target) => Number(target.credit) + amount < 0)) throw new InsufficientCreditError()

  const rows = await sql.query(
    `WITH targets AS (
       SELECT account.account_id, account.credit
       FROM storychat_accounts account
       JOIN storychat_member_profiles profile ON profile.account_id = account.account_id
       WHERE UPPER(profile.member_id) = ANY($1::text[])
         AND account.account_type = 'member'
     ), guard AS (
       SELECT COUNT(*) = $2::int AND BOOL_AND(credit + $3::int >= 0) AS can_apply
       FROM targets
     ), updated AS (
       UPDATE storychat_accounts account
       SET credit = account.credit + $3::int,
           updated_at = NOW()
       FROM targets
       WHERE account.account_id = targets.account_id
         AND (SELECT can_apply FROM guard)
       RETURNING account.account_id, account.credit
     ), audit AS (
       INSERT INTO storychat_member_audit_logs (
         actor_account_id, target_account_id, action, details
       )
       SELECT $4, updated.account_id, 'adjust_credit',
              jsonb_build_object('amount', $3::int, 'balance', updated.credit)
       FROM updated
     )
     SELECT account_id AS target_account_id FROM updated`,
    [memberIds, memberIds.length, amount, actorAccountId],
  ) as unknown as TargetRow[]
  if (rows.length === 0 && memberIds.length > 0) throw new InsufficientCreditError()
  await assertUpdatedTargets(rows, memberIds)
}

export async function setMemberPermission({
  actorAccountId,
  memberIds: rawMemberIds,
  permission,
  granted,
}: {
  actorAccountId: string
  memberIds: string[]
  permission: MemberPermissionKey
  granted: boolean
}) {
  if (!MEMBER_PERMISSION_KEYS.includes(permission)) throw new Error("Unknown member permission")
  await ensureUserAccountSchema()
  const sql = getNeonSql()
  const memberIds = normalizeMemberIds(rawMemberIds)

  const rows = granted
    ? await sql.query(
         `WITH targets AS (
           SELECT profile.account_id
           FROM storychat_member_profiles profile
           WHERE UPPER(profile.member_id) = ANY($1::text[])
         ), guard AS (
           SELECT COUNT(*) = $2::int AS all_found FROM targets
         ), eligible AS (
           SELECT account_id FROM targets WHERE (SELECT all_found FROM guard)
         ), changed AS (
           INSERT INTO storychat_member_permissions (
             account_id, permission_key, granted_by_account_id
           )
           SELECT eligible.account_id, $3, $4 FROM eligible
           ON CONFLICT (account_id, permission_key)
           DO UPDATE SET granted_by_account_id = EXCLUDED.granted_by_account_id,
                         granted_at = NOW()
           RETURNING account_id
         ), audit AS (
           INSERT INTO storychat_member_audit_logs (
             actor_account_id, target_account_id, action, details
           )
           SELECT $4, changed.account_id, 'grant_permission',
                  jsonb_build_object('permission', $3::text)
           FROM changed
         )
         SELECT account_id AS target_account_id FROM changed`,
        [memberIds, memberIds.length, permission, actorAccountId],
      ) as unknown as TargetRow[]
    : await sql.query(
         `WITH targets AS (
           SELECT profile.account_id
           FROM storychat_member_profiles profile
           WHERE UPPER(profile.member_id) = ANY($1::text[])
         ), guard AS (
           SELECT COUNT(*) = $2::int AS all_found FROM targets
         ), eligible AS (
           SELECT account_id FROM targets WHERE (SELECT all_found FROM guard)
         ), changed AS (
           DELETE FROM storychat_member_permissions permission
           USING eligible
           WHERE permission.account_id = eligible.account_id
             AND permission.permission_key = $3
           RETURNING permission.account_id
         ), audit AS (
           INSERT INTO storychat_member_audit_logs (
             actor_account_id, target_account_id, action, details
           )
           SELECT $4, eligible.account_id, 'revoke_permission',
                  jsonb_build_object('permission', $3::text)
           FROM eligible
         )
         SELECT account_id AS target_account_id FROM eligible`,
        [memberIds, memberIds.length, permission, actorAccountId],
      ) as unknown as TargetRow[]
  await assertUpdatedTargets(rows, memberIds)
}
