import {
  assessConversationPromptInjection,
  demoteUntrustedAssistantMessages,
  filterPromptInjectionMessages,
  formatUntrustedPromptData,
  projectUntrustedPromptMessages,
} from "./conversation-boundary"
import { SERVICE_INFO_PROTECTION_PROMPT } from "./policy"
import type { PromptSecurityMessage } from "./types"

export type PlainChatBoundaryInput = {
  messages?: unknown
  systemPrompt?: string
  fallbackPrompt?: string
}

/**
 * Keeps the server policy as the only system message. Legacy system/fallback
 * fields remain usable, but are demoted to ordinary user task data.
 */
export function preparePlainChatBoundary(input: PlainChatBoundaryInput) {
  const requestMessages = projectUntrustedPromptMessages(input.messages)
  const conversationMessages = requestMessages.filter((message) => message.role !== "system")
  const taskValues = [
    ...requestMessages.filter((message) => message.role === "system").map((message) => message.content),
    input.systemPrompt || "",
    input.fallbackPrompt || "",
  ]
    .map((value) => value.trim().slice(0, 20_000))
    .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index)
  const rawTaskMessages = taskValues.map((value) => ({
    role: "user" as const,
    content: value,
  }))
  // Assess raw legacy prompt text before JSON escaping changes whitespace.
  const untrustedMessages = [...rawTaskMessages, ...conversationMessages]
  const assessment = assessConversationPromptInjection(untrustedMessages)
  const safeRawMessages = filterPromptInjectionMessages(untrustedMessages, assessment)
  const safeReferences = new Set<PromptSecurityMessage>(safeRawMessages)
  const safeTaskMessages = rawTaskMessages
    .filter((message) => safeReferences.has(message))
    .map((message) => ({
      role: "user" as const,
      content: formatUntrustedPromptData("plain_task_specification", message.content),
    }))
  const safeConversationMessages = demoteUntrustedAssistantMessages(
    conversationMessages.filter((message) => safeReferences.has(message)),
  )
  const safeMessages = [...safeTaskMessages, ...safeConversationMessages]
  // Keep the server policy present even when every untrusted message is
  // quarantined. The caller uses `assessment` to return before provider use.
  const messages = untrustedMessages.length > 0
    ? [{ role: "system" as const, content: SERVICE_INFO_PROTECTION_PROMPT }, ...safeMessages]
    : []

  return {
    messages,
    fallbackPrompt: safeMessages
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n\n"),
    assessment,
  }
}
