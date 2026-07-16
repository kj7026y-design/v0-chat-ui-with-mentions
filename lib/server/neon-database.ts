import "server-only"

import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("Neon database URL is not configured")
    this.name = "DatabaseNotConfiguredError"
  }
}

let sqlClient: NeonQueryFunction<false, false> | null = null

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ""
  ).trim()
}

export function getNeonSql() {
  if (sqlClient) return sqlClient
  const databaseUrl = getDatabaseUrl()
  if (!databaseUrl) throw new DatabaseNotConfiguredError()
  sqlClient = neon(databaseUrl)
  return sqlClient
}
