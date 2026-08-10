export const KOREA_TIME_ZONE = "Asia/Seoul"
export const KOREA_UTC_OFFSET = "+09:00"

const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000
const TIME_COMPONENT_PATTERN = /(?:T|\s)\d{2}:\d{2}/u
const POSTGRES_TIME_ZONE_OPTION_PATTERN = /(?:^|\s)-c(?:\s+|=)(?:timezone|TimeZone)=[^\s]+/giu

function asValidDate(value: Date | string | number) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid date value")
  return date
}

export function toKoreaIsoString(value: Date | string | number = new Date()) {
  const date = asValidDate(value)
  const koreaLocalIso = new Date(date.getTime() + KOREA_OFFSET_MS).toISOString()
  return `${koreaLocalIso.slice(0, -1)}${KOREA_UTC_OFFSET}`
}

export function toKoreaDateString(value: Date | string | number = new Date()) {
  return toKoreaIsoString(value).slice(0, 10)
}

export function normalizeKoreaIsoTimestamp(value: string | undefined) {
  if (!value || !TIME_COMPONENT_PATTERN.test(value)) return value
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : toKoreaIsoString(date)
}

export function withKoreaTimeZoneDatabaseUrl(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl)
    const existingOptions = url.searchParams.get("options") || ""
    const preservedOptions = existingOptions
      .replace(POSTGRES_TIME_ZONE_OPTION_PATTERN, " ")
      .trim()
      .replace(/\s+/g, " ")
    const koreaTimeZoneOption = `-c timezone=${KOREA_TIME_ZONE}`
    url.searchParams.set(
      "options",
      [preservedOptions, koreaTimeZoneOption].filter(Boolean).join(" "),
    )
    return url.toString()
  } catch {
    return databaseUrl
  }
}
