import type { ChatMessage } from "@/lib/chat-types"

type CommandId = NonNullable<ChatMessage["commandId"]>

const DEFAULT_COMMAND_TITLES: Record<CommandId, string> = {
  phone: "📱 휴대폰",
  sns: "🅾 INSTAGRAM",
  status: "📊 상태창",
  audience: "시청자 반응",
  summary: "요약",
}

function decodeCommandMarkup(value: string) {
  return value
    .replace(/&quot;/gu, "\"")
    .replace(/&apos;/gu, "'")
    .replace(/&gt;/gu, ">")
    .replace(/&lt;/gu, "<")
    .replace(/&amp;/gu, "&")
}

function isCommandTitleLine(line: string, commandId: CommandId) {
  if (commandId === "phone") return /휴대폰/u.test(line)
  if (commandId === "sns") return /INSTAGRAM/iu.test(line)
  if (commandId === "status") return /상태창/u.test(line)
  if (commandId === "audience") return /시청자\s*반응/u.test(line)
  return /요약/u.test(line)
}

export function getCommandTitle(content: string, commandId: CommandId) {
  const taggedTitle = commandId === "sns"
    ? content.match(/<ig-title>(.*?)<\/ig-title>/u)?.[1]
    : commandId === "status"
      ? content.match(/<status-title>(.*?)<\/status-title>/u)?.[1]
      : content.match(/<phone-title>(.*?)<\/phone-title>/u)?.[1]
  if (taggedTitle) return decodeCommandMarkup(taggedTitle)

  const firstLine = content.split(/\r?\n/u).find((line) => line.trim())?.trim()
  return firstLine && isCommandTitleLine(firstLine, commandId)
    ? decodeCommandMarkup(firstLine)
    : DEFAULT_COMMAND_TITLES[commandId]
}

function trimBodyLines(lines: string[]) {
  while (lines[0]?.trim() === "") lines.shift()
  while (lines.at(-1)?.trim() === "") lines.pop()
  return lines.join("\n").replace(/\n{3,}/gu, "\n\n")
}

export function getCommandEditableContent(content: string, commandId: CommandId) {
  const title = getCommandTitle(content, commandId)
  const bodyLines: string[] = []

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim()
    if (!line) {
      bodyLines.push("")
      continue
    }
    if (line === title) continue

    const statusDivider = line.match(
      /^<status-divider tone="(strong|muted)"><\/status-divider>$/u,
    )
    if (statusDivider) {
      if (statusDivider[1] === "muted") bodyLines.push("")
      continue
    }
    const statusContent = line.match(
      /^<status-(title|date|meta|summary|thought)>(.*)<\/status-\1>$/u,
    )
    if (statusContent) {
      if (statusContent[1] !== "title") {
        bodyLines.push(decodeCommandMarkup(statusContent[2]))
      }
      continue
    }
    if (/^<\/?status>$/u.test(line)) continue

    const instagramContent = line.match(
      /^<ig-(title|divider|image|caption|stats)>(.*)<\/ig-\1>$/u,
    )
    if (instagramContent) {
      if (
        instagramContent[1] !== "title" &&
        instagramContent[1] !== "divider"
      ) {
        bodyLines.push(decodeCommandMarkup(instagramContent[2]))
      }
      continue
    }
    const instagramComment = line.match(
      /^<ig-comment (?:nickname|author)="([^"]*)" time="([^"]*)" reply="(true|false)"(?: reply-to="[^"]*")?>(.*)<\/ig-comment>$/u,
    )
    if (instagramComment) {
      bodyLines.push(
        `${instagramComment[3] === "true" ? "ㄴ " : ""}${decodeCommandMarkup(instagramComment[1])} · ${decodeCommandMarkup(instagramComment[2])}`,
        decodeCommandMarkup(instagramComment[4]),
      )
      continue
    }
    if (line === "<ig-gap />") {
      bodyLines.push("")
      continue
    }
    if (/^<\/?ig(?:>|-post>)/u.test(line)) continue

    const phoneStatus = line.match(
      /^<phone-status><phone-time>(.*)<\/phone-time><phone-icons>(.*)<\/phone-icons><\/phone-status>$/u,
    )
    if (phoneStatus) {
      bodyLines.push(
        `${decodeCommandMarkup(phoneStatus[1])}  ${decodeCommandMarkup(phoneStatus[2])}`,
      )
      continue
    }
    if (
      line === "<phone-divider></phone-divider>" ||
      /^<phone-title>.*<\/phone-title>$/u.test(line)
    ) {
      continue
    }

    const visibleLine = decodeCommandMarkup(
      line
        .replace(/<phone-time>(.*?)<\/phone-time>/gu, "$1")
        .replace(/<\/?(?:ig|status|phone)(?:-[a-z-]+)?(?:\s+[^>]*)?\s*\/?>/gu, ""),
    )
    if (visibleLine) bodyLines.push(visibleLine)
  }

  return trimBodyLines(bodyLines)
}

export function formatEditedCommandContent(
  originalContent: string,
  commandId: CommandId,
  editedBody: string,
) {
  const title = getCommandTitle(originalContent, commandId)
  const normalizedBodyLines = editedBody
    .replace(/\r\n?|\u2028|\u2029/gu, "\n")
    .split("\n")
  if (
    normalizedBodyLines[0] &&
    isCommandTitleLine(normalizedBodyLines[0].trim(), commandId)
  ) {
    normalizedBodyLines.shift()
  }
  const normalizedBody = trimBodyLines(normalizedBodyLines)
  return `${title}\n${normalizedBody}`
}
