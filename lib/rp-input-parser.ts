export type ParsedInputPart = {
  type: "dialogue" | "action" | "summary"
  text: string
}

export type ComposerPart = {
  type: "dialogue" | "action"
  text: string
}

const SUMMARY_LIKE_ENDING_PATTERN =
  /(한다|했다|도발한다|바라본다|다가간다|내민다|잡는다|웃는다|말한다|묻는다|당긴다|흔든다|건넨다|올린다|내린다)\.?$/u

function trimWrappedText(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export function looksLikeSummaryInput(content: string) {
  const trimmed = content.trim()
  if (!trimmed) return false
  if (/^["“'‘][\s\S]+["”'’]$/.test(trimmed)) return false
  if (/^\*{1,2}[\s\S]+\*{1,2}$/.test(trimmed)) return false
  return SUMMARY_LIKE_ENDING_PATTERN.test(trimmed)
}

function pushTextParts(parts: ParsedInputPart[], text: string) {
  const blocks = text.split(/(?:\r?\n){2,}/).map((block) => block.trim()).filter(Boolean)
  for (const block of blocks) {
    const cleanedText = block
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/[ \t]+/g, " "))
      .filter(Boolean)
      .join("\n")

    if (!cleanedText) continue

    parts.push({
      type: looksLikeSummaryInput(cleanedText) ? "summary" : "dialogue",
      text: cleanedText,
    })
  }
}

export function hasUnclosedActionMarker(content: string) {
  let cursor = 0

  while (cursor < content.length) {
    const markerStart = content.indexOf("*", cursor)
    if (markerStart === -1) return false

    const marker = content.startsWith("**", markerStart) ? "**" : "*"
    const contentStart = markerStart + marker.length
    const markerEnd = content.indexOf(marker, contentStart)
    if (markerEnd === -1) return true
    if (!content.slice(contentStart, markerEnd).trim()) return true

    cursor = markerEnd + marker.length
  }

  return false
}

function parseStructuredModelParts(text: string): ParsedInputPart[] {
  const parts: ParsedInputPart[] = []
  const blockPattern =
    /^\s*\[[^\]\n]{1,40}의\s*(행동|지문|대사|말)\]\s*\n([\s\S]*?)(?=\n\s*\[[^\]\n]{1,40}의\s*(?:행동|지문|대사|말|의도)\]\s*\n|$)/gmu
  let match: RegExpExecArray | null

  while ((match = blockPattern.exec(text)) !== null) {
    const label = match[1]
    const body = match[2]?.trim()
    if (!body) continue

    if (label === "대사" || label === "말") {
      parts.push({
        type: "dialogue",
        text: trimWrappedText(body.replace(/^["“'‘]+|["”'’]+$/g, "")),
      })
      continue
    }

    parts.push({ type: "action", text: trimWrappedText(body) })
  }

  return parts
}

export function parseRoleplayInputParts(raw: string): ParsedInputPart[] {
  const text = raw.trim()
  if (!text) return []

  const structuredModelParts = parseStructuredModelParts(text)
  if (structuredModelParts.length > 0) return structuredModelParts

  const structuredAction = text.match(/^(?:사용자|[가-힣A-Za-z0-9_]{1,24}의)\s*(?:행동\s*요약|행동\/요약|행동|지문)\s*[:：]\s*([\s\S]{1,500})$/u)?.[1]?.trim()
  if (structuredAction) {
    return [{ type: "summary", text: trimWrappedText(structuredAction) }]
  }

  const structuredDialogue = text.match(/^(?:사용자|[가-힣A-Za-z0-9_]{1,24}의)\s*(?:대사|말)\s*[:：]\s*([\s\S]{1,500})$/u)?.[1]?.trim()
  if (structuredDialogue) {
    return [{ type: "dialogue", text: trimWrappedText(structuredDialogue.replace(/^["“'‘]+|["”'’]+$/g, "")) }]
  }

  const wholeAction = text.match(/^\*{1,2}([\s\S]+?)\*{1,2}$/)?.[1]?.trim()
  if (wholeAction) {
    return [{ type: "action", text: trimWrappedText(wholeAction) }]
  }

  const wholeDialogue = text.match(/^["“]([\s\S]+?)["”]$/)?.[1]?.trim()
  if (wholeDialogue) {
    return [{ type: "dialogue", text: trimWrappedText(wholeDialogue) }]
  }

  const parts: ParsedInputPart[] = []
  const tokenPattern = /(\*{1,2}[\s\S]+?\*{1,2}|["“][^"”]+["”])/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = tokenPattern.exec(text)) !== null) {
    const before = text.slice(cursor, match.index).trim()
    if (before) {
      pushTextParts(parts, before)
    }

    const token = match[0]
    const action = token.match(/^\*{1,2}([\s\S]+?)\*{1,2}$/)?.[1]?.trim()
    const dialogue = token.match(/^["“]([\s\S]+?)["”]$/)?.[1]?.trim()
    if (action) {
      parts.push({ type: "action", text: trimWrappedText(action) })
    } else if (dialogue) {
      parts.push({ type: "dialogue", text: trimWrappedText(dialogue) })
    }

    cursor = match.index + token.length
  }

  const tail = text.slice(cursor).trim()
  if (tail) {
    pushTextParts(parts, tail)
  }

  if (parts.length > 0) return parts

  const fallbackParts: ParsedInputPart[] = []
  pushTextParts(fallbackParts, text)
  return fallbackParts
}

export function parseComposerInput(raw: string): ComposerPart[] {
  return parseRoleplayInputParts(raw).map((part) => ({
    type: part.type === "dialogue" ? "dialogue" : "action",
    text: part.text,
  }))
}

export function buildModelUserMessageFromParts(parts: ComposerPart[], userName = "사용자") {
  return parts
    .map((part) => {
      if (part.type === "dialogue") {
        return `[${userName}의 대사]\n"${part.text}"`
      }

      return `[${userName}의 행동]\n${part.text}`
    })
    .join("\n\n")
    .trim()
}

export function buildModelUserMessageFromInput(raw: string, userName = "사용자") {
  const parsedParts = parseComposerInput(raw)
  const hasExplicitAction = parsedParts.some((part) => part.type === "action")
  const parts = !hasExplicitAction && parsedParts.length === 1 && looksLikeSummaryInput(raw)
    ? [{ type: "action" as const, text: parsedParts[0].text }]
    : parsedParts

  return buildModelUserMessageFromParts(parts, userName)
}

export function debugComposerParserCases(userName = "윤재") {
  const cases = [
    "*퇴근을 해서 신이 났다*\n안녕!",
    "안녕 *퇴근해서 신이 났다* 오늘 힘들었어",
    "\"그래. 계약서에 사인할게\"",
    "*먼저 붙잡아보라고 도발한다*",
    "먼저 붙잡아보라고 도발한다",
    "먼저 붙잡아봐.",
  ]

  const results = cases.map((raw) => {
    const parts = parseComposerInput(raw)
    return {
      raw,
      parts,
      modelMessage: buildModelUserMessageFromParts(parts, userName),
    }
  })

  console.debug("[RP composer parser cases]", results)
  return results
}
