import type { ImageCommandContext } from "./types"

export type CommandRandom = () => number

export interface RecentCommandScene {
  latestUser: string
  latestCharacter: string
  recentLines: string[]
}

let commandInvocationCounter = 0

export function kp(name: string, withCoda: string, withoutCoda: string): string {
  const lastChar = name.trim().at(-1)
  if (!lastChar) return withoutCoda
  const code = lastChar.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return withoutCoda
  return (code - 0xac00) % 28 === 0 ? withoutCoda : withCoda
}

export function cleanCommandText(value?: string, maxChars = 44) {
  const cleaned = (value ?? "")
    .replace(/\[[^\]\n]{1,40}\]/gu, " ")
    .replace(/[*_`#>]/gu, " ")
    .replace(/(^|\s)@[\p{L}\p{N}_-]+/gu, " ")
    .replace(/["“”]/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
  if (!cleaned) return ""
  const chars = Array.from(cleaned)
  return chars.length > maxChars ? `${chars.slice(0, maxChars - 1).join("")}…` : cleaned
}

export function getRecentCommandScene(context?: ImageCommandContext): RecentCommandScene {
  const narrativeMessages = (context?.recentMessages ?? [])
    .filter((message) => (message.type === "user" || message.type === "ai") && message.content.trim())
    .slice(-8)
  const latestUserMessage = [...narrativeMessages].reverse().find((message) => message.type === "user")
  const latestCharacterMessage = [...narrativeMessages].reverse().find((message) => message.type === "ai")

  return {
    latestUser: cleanCommandText(latestUserMessage?.content, 38),
    latestCharacter: cleanCommandText(latestCharacterMessage?.content, 38),
    recentLines: narrativeMessages
      .slice(-4)
      .map((message) => cleanCommandText(message.content, 46))
      .filter(Boolean),
  }
}

export function createCommandRandom(label: string, context?: ImageCommandContext): CommandRandom {
  const recentKey = (context?.recentMessages ?? [])
    .slice(-5)
    .map((message) => `${message.id}:${message.content.slice(0, 40)}`)
    .join("|")
  const seedText = `${label}|${Date.now()}|${++commandInvocationCounter}|${recentKey}`
  let state = 2166136261
  for (const char of seedText) {
    state ^= char.codePointAt(0) ?? 0
    state = Math.imul(state, 16777619)
  }
  state >>>= 0

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function commandPick<T>(random: CommandRandom, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)] ?? values[0]
}

export function getVisibleCommandContent(content: string) {
  return content
    .replace(
      /<ig-comment (?:nickname|author)="([^"]*)" time="([^"]*)" reply="(?:true|false)"(?: reply-to="[^"]*")?>/gu,
      "$1 $2 ",
    )
    .replace(/<\/?(?:ig|status|phone)(?:-[a-z-]+)?(?:\s+[^>]*)?\s*\/?>/gu, "")
    .replace(/&quot;/gu, "\"")
    .replace(/&apos;/gu, "'")
    .replace(/&gt;/gu, ">")
    .replace(/&lt;/gu, "<")
    .replace(/&amp;/gu, "&")
}

export function escapeCommandMarkup(value: string) {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;")
}

export function asCommandRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} 형식이 올바르지 않습니다.`)
  }
  return value as Record<string, unknown>
}

export function normalizeAiCommandText(value: unknown, label: string, maxChars: number) {
  if (typeof value !== "string") throw new Error(`${label}이(가) 없습니다.`)
  const normalized = value.replace(/\s+/gu, " ").trim()
  if (!normalized) throw new Error(`${label}이(가) 비어 있습니다.`)
  return Array.from(normalized).slice(0, maxChars).join("")
}

export function parseAiCommandJson(rawContent: string, label: string) {
  const withoutFence = rawContent
    .trim()
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "")

  const candidates: string[] = []
  let objectStart = -1
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = 0; index < withoutFence.length; index += 1) {
    const character = withoutFence[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (character === "\\") {
        escaped = true
      } else if (character === "\"") {
        inString = false
      }
      continue
    }
    if (character === "\"") {
      inString = true
    } else if (character === "{") {
      if (depth === 0) objectStart = index
      depth += 1
    } else if (character === "}" && depth > 0) {
      depth -= 1
      if (depth === 0 && objectStart >= 0) {
        candidates.push(withoutFence.slice(objectStart, index + 1))
        objectStart = -1
      }
    }
  }

  if (candidates.length === 0) {
    throw new Error(`${label}에서 JSON을 찾지 못했습니다.`)
  }

  for (const candidate of candidates) {
    for (const source of [candidate, repairAiCommandJson(candidate)]) {
      try {
        return asCommandRecord(JSON.parse(source), label)
      } catch {
        // Try the next bounded object or its minimally repaired form.
      }
    }
  }
  throw new Error(`${label}를 해석하지 못했습니다.`)
}

function repairAiCommandJson(source: string) {
  let repaired = ""
  let inString = false
  let escaped = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (inString) {
      if (escaped) {
        repaired += character
        escaped = false
      } else if (character === "\\") {
        repaired += character
        escaped = true
      } else if (character === "\"") {
        repaired += character
        inString = false
      } else if (character === "\n") {
        repaired += "\\n"
      } else if (character === "\r") {
        if (source[index + 1] === "\n") index += 1
        repaired += "\\n"
      } else if (character === "\t") {
        repaired += "\\t"
      } else {
        repaired += character
      }
      continue
    }

    if (character === "\"") {
      repaired += character
      inString = true
      continue
    }
    if (character === ",") {
      let nextIndex = index + 1
      while (/\s/u.test(source[nextIndex] ?? "")) nextIndex += 1
      if (source[nextIndex] === "}" || source[nextIndex] === "]") continue
    }
    repaired += character
  }

  return repaired
}

export function getCommandBaseDate(context?: ImageCommandContext) {
  const date = new Date()
  const worldDate = context?.status?.worldDate || context?.work?.worldDate || context?.world?.worldDate || ""
  const timeMatch = worldDate.match(/(?:(오전|오후)\s*)?(\d{1,2}):(\d{2})/u)
  if (!timeMatch) return date

  let hour = Number(timeMatch[2])
  const minute = Number(timeMatch[3])
  if (timeMatch[1] === "오후" && hour < 12) hour += 12
  if (timeMatch[1] === "오전" && hour === 12) hour = 0
  if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
    date.setHours(hour, minute, 0, 0)
  }
  return date
}

export function offsetCommandTime(baseDate: Date, minutesAgo: number) {
  return new Date(baseDate.getTime() - minutesAgo * 60_000)
}

export function formatPhoneStatusTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

export function formatStatusDateTime(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}.${month}.${day} ${formatPhoneStatusTime(date)}`
}

export function formatPhoneListTime(date: Date) {
  const hour = date.getHours()
  const period = hour < 12 ? "오전" : "오후"
  const displayHour = hour % 12 || 12
  return `${period} ${displayHour}:${String(date.getMinutes()).padStart(2, "0")}`
}

export function buildAiCommandSource(characterName: string, context?: ImageCommandContext) {
  const recentConversation = (context?.recentMessages ?? [])
    .filter((message) => (message.type === "user" || message.type === "ai") && message.content.trim())
    .slice(-8)
    .map((message) => ({
      speaker: message.type === "user"
        ? message.speakerName || context?.persona?.name || context?.status?.personaName || "유저"
        : message.speakerName || characterName,
      content: Array.from(getVisibleCommandContent(message.content).replace(/\s+/gu, " ").trim())
        .slice(0, 500)
        .join(""),
    }))

  return {
    generatedAt: getCommandBaseDate(context).toISOString(),
    character: {
      name: characterName,
      age: context?.character?.age,
      role: context?.character?.role,
      residence: context?.character?.residence,
      summary: context?.character?.summary,
      personality: context?.character?.personality,
      speechStyle: context?.character?.speechStyle,
      relationship: context?.character?.relationship,
      tags: context?.character?.tags,
    },
    user: {
      name: context?.persona?.name || context?.status?.personaName || "유저",
      role: context?.persona?.role,
      summary: context?.persona?.summary,
      personality: context?.persona?.personality,
      relationship: context?.persona?.relationship,
    },
    world: {
      title: context?.work?.title,
      genre: context?.work?.genre || context?.world?.genre,
      setting: context?.work?.coreSetting || context?.world?.coreSetting,
      mood: context?.work?.mood || context?.world?.mood,
    },
    currentStatus: context?.status,
    memory: context?.memoryMemo,
    recentConversation,
  }
}
