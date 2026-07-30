import type { ChatMessage } from "@/lib/chat-types"

export function normalizeChatSearchQuery(value: string) {
  return value.trim().replace(/\s+/gu, " ")
}

export function isSearchableChatMessage(message: ChatMessage) {
  return (
    message.type !== "status_img" &&
    Boolean(message.content.trim() || message.speakerName?.trim())
  )
}

export function getChatSearchableText(message: ChatMessage) {
  return [
    message.speakerName,
    ...(message.mentionCharacterNames ?? []),
    message.content,
    message.eventDescription,
  ]
    .filter(Boolean)
    .join("\n")
}

export function findChatSearchResultIds(
  messages: ChatMessage[],
  rawQuery: string,
) {
  const query = normalizeChatSearchQuery(rawQuery).toLocaleLowerCase("ko-KR")
  if (!query) return []

  return messages
    .filter(isSearchableChatMessage)
    .filter((message) =>
      getChatSearchableText(message)
        .toLocaleLowerCase("ko-KR")
        .includes(query),
    )
    .map((message) => message.id)
}
