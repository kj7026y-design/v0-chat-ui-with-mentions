import { type ChatMessage } from "@/lib/chat-types"

export type MessageSegment =
  | {
      type: "narration"
      content: string
    }
  | {
      type: "dialogue"
      speakerName?: string
      speakerId?: string
      content: string
    }

const QUOTED_DIALOGUE_PATTERN = /["“]([\s\S]*?)["”]/g
const SPEAKER_LINE_PATTERN = /^([\p{L}\p{N}_ .·-]{1,24})[:：]\s*(\S[\s\S]*)$/u

function pushNarration(segments: MessageSegment[], content: string) {
  const trimmed = content.trim()
  if (!trimmed) return
  segments.push({ type: "narration", content: trimmed })
}

function pushDialogue(
  segments: MessageSegment[],
  content: string,
  speaker?: Pick<ChatMessage, "speakerId" | "speakerName">,
) {
  const trimmed = content.trim()
  if (!trimmed) return
  segments.push({
    type: "dialogue",
    speakerId: speaker?.speakerId,
    speakerName: speaker?.speakerName,
    content: trimmed,
  })
}

function parseUnquotedChunk(
  content: string,
  speaker?: Pick<ChatMessage, "speakerId" | "speakerName">,
): MessageSegment[] {
  const segments: MessageSegment[] = []
  const narrationLines: string[] = []

  content.split(/\r?\n/).forEach((line) => {
    const match = line.trim().match(SPEAKER_LINE_PATTERN)

    if (!match) {
      narrationLines.push(line)
      return
    }

    pushNarration(segments, narrationLines.join("\n"))
    narrationLines.length = 0
    pushDialogue(segments, match[2], { ...speaker, speakerName: match[1].trim() })
  })

  pushNarration(segments, narrationLines.join("\n"))
  return segments
}

export function parseMessageSegments(message: ChatMessage): MessageSegment[] {
  if (message.speakerType === "character") {
    const content = message.content.trim()
    return content
      ? [{
          type: "dialogue",
          speakerId: message.speakerId,
          speakerName: message.speakerName,
          content,
        }]
      : []
  }

  const speaker = {
    speakerId: message.speakerId,
    speakerName: message.speakerName,
  }
  const segments: MessageSegment[] = []
  let cursor = 0

  QUOTED_DIALOGUE_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = QUOTED_DIALOGUE_PATTERN.exec(message.content)) !== null) {
    segments.push(...parseUnquotedChunk(message.content.slice(cursor, match.index), speaker))
    pushDialogue(segments, match[1], speaker)
    cursor = match.index + match[0].length
  }

  segments.push(...parseUnquotedChunk(message.content.slice(cursor), speaker))

  if (segments.length > 0) return segments

  const trimmed = message.content.trim()
  return trimmed ? [{ type: "narration", content: trimmed }] : []
}

export function shouldRenderMessageSegments(message: ChatMessage, segments: MessageSegment[]) {
  if (message.speakerType === "character") return true
  if (message.type !== "ai") return false
  return segments.some((segment) => segment.type === "dialogue")
}
