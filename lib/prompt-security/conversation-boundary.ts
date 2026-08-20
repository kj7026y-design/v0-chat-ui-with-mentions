import { assessPromptInjection } from "./injection-detector"
import {
  CONTROL_AND_ZERO_WIDTH_PATTERN,
  canonicalizePromptSecurityText,
  compactPromptSecurityText,
  uniquePromptSecurityValues,
} from "./normalization"
import type { PromptInjectionAssessment, PromptSecurityMessage } from "./types"

/**
 * Runtime projection for JSON requests. Only role and string content survive;
 * unknown privileged roles are treated like legacy system input so the plain
 * boundary can demote them and the RP boundary can discard them.
 */
export function projectUntrustedPromptMessages(value: unknown): PromptSecurityMessage[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return []
    const record = entry as Record<string, unknown>
    if (typeof record.content !== "string" || !record.content.trim()) return []
    const role = record.role === "user" || record.role === "assistant"
      ? record.role
      : "system"
    return [{ role, content: record.content }]
  })
}

/** Scan the full supplied history plus non-message context fields. */
export function assessConversationPromptInjection(
  messages: PromptSecurityMessage[],
  additionalInputs: string[] = [],
): PromptInjectionAssessment {
  const reasons: string[] = []
  const requestedMarkers: string[] = []
  const riskyMessageIndexes: number[] = []
  const conversationEntries: Array<{ index: number; content: string }> = []

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]
    if (message.role === "system" || !message.content.trim()) continue
    conversationEntries.push({ index, content: message.content })
    const assessment = assessPromptInjection(message.content)
    if (!assessment.blocked) continue
    riskyMessageIndexes.push(index)
    reasons.push(...assessment.reasons)
    requestedMarkers.push(...assessment.requestedMarkers)
  }

  for (const input of additionalInputs) {
    if (!input?.trim()) continue
    const assessment = assessPromptInjection(input)
    if (!assessment.blocked) continue
    reasons.push(...assessment.reasons.map((reason) => `context:${reason}`))
    requestedMarkers.push(...assessment.requestedMarkers)
  }

  // Cross-turn detection catches attacks that split their target, action, and
  // trigger across otherwise incomplete user and assistant messages. If the
  // combined request is unsafe, quarantine the whole combined conversation;
  // callers return a fallback instead of sending a partially cleaned attack.
  const combinedInputs = [
    ...conversationEntries.map((entry) => entry.content),
    ...additionalInputs.filter((input) => input?.trim()),
  ]
  if (combinedInputs.length > 1) {
    const combinedAssessment = assessPromptInjection(combinedInputs.join("\n[untrusted-boundary]\n"))
    if (combinedAssessment.blocked) {
      reasons.push(...combinedAssessment.reasons.map((reason) => `combined:${reason}`))
      requestedMarkers.push(...combinedAssessment.requestedMarkers)
      riskyMessageIndexes.push(...conversationEntries.map((entry) => entry.index))
    }
  }

  return {
    blocked: riskyMessageIndexes.length > 0 || reasons.length > 0,
    reasons: uniquePromptSecurityValues(reasons),
    requestedMarkers: uniquePromptSecurityValues(requestedMarkers),
    riskyMessageIndexes: [...new Set(riskyMessageIndexes)],
  }
}

/** Remove instructions from context fields before they reach any model call. */
export function sanitizeUntrustedPromptField(value: string | undefined, maxChars = 12_000) {
  const normalized = value?.normalize("NFKC").replace(CONTROL_AND_ZERO_WIDTH_PATTERN, "").trim() || ""
  if (!normalized || assessPromptInjection(normalized).blocked) return ""
  return normalized.slice(0, maxChars)
}

/** Serialize data instead of interpolating it as free-form prompt syntax. */
export function formatUntrustedPromptData(label: string, value: string) {
  return JSON.stringify({ kind: "untrusted_story_data", label, value })
}

/** Client-supplied assistant history is quoted data, never provider authority. */
export function demoteUntrustedAssistantMessages(messages: PromptSecurityMessage[]) {
  return messages.map((message): PromptSecurityMessage => message.role === "assistant"
    ? {
        role: "user",
        content: formatUntrustedPromptData("quoted_assistant_history", message.content),
      }
    : { role: message.role, content: message.content })
}

export function looksLikePromptLeakOrCompliance(content: string) {
  const normalized = canonicalizePromptSecurityText(content)
  const compact = compactPromptSecurityText(content)
  return (
    assessPromptInjection(content).blocked ||
    /(?:모든\s*준비가\s*완료|시작이라는\s*말을\s*기다|최우선\s*과제|코어\s*프롬프트|프롬프트\s*추출)/u.test(normalized) ||
    /(?:securestartprompt|secureendprompt|beginsystemprompt|endsystemprompt|serviceinternalinformationprotection|서비스내부정보보호|프롬프트컴파일결과)/u.test(compact)
  )
}

/** Drop attack turns and assistant replies that appear to have complied. */
export function filterPromptInjectionMessages<T extends PromptSecurityMessage>(
  messages: T[],
  assessment = assessConversationPromptInjection(messages),
) {
  const riskyIndexes = new Set(assessment.riskyMessageIndexes)
  let attackSeen = false
  return messages.filter((message, index) => {
    if (message.role === "system") return false
    const risky = riskyIndexes.has(index) || assessPromptInjection(message.content).blocked
    if (risky) attackSeen = true
    if (risky) return false
    if (message.role === "user") return true
    if (attackSeen && looksLikePromptLeakOrCompliance(message.content)) return false
    return !looksLikePromptLeakOrCompliance(message.content)
  })
}
