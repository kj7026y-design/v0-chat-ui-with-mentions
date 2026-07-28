import type {
  ChatMessage,
  ChatMessageCandidate,
  ChatMessageCandidateCompanion,
} from "@/lib/chat-types"

const MAX_REGENERATION_AVOID_CHARS = 12_000

function toIsoTimestamp(value: Date | string) {
  const timestamp = value instanceof Date ? value : new Date(value)
  return Number.isNaN(timestamp.getTime()) ? new Date().toISOString() : timestamp.toISOString()
}

function hydrateTimestamp(value: string) {
  const timestamp = new Date(value)
  return Number.isNaN(timestamp.getTime()) ? new Date() : timestamp
}

function createCandidateId(message: ChatMessage) {
  const sourceId = message.generationRunId || message.id || "answer"
  return `candidate-${sourceId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function snapshotCompanionMessage(message: ChatMessage): ChatMessageCandidateCompanion {
  return {
    messageId: message.id,
    commandId: message.commandId,
    content: message.content,
    timestamp: toIsoTimestamp(message.timestamp),
    status: message.status,
  }
}

export function createMessageCandidate(
  message: ChatMessage,
  companionMessages: ChatMessage[] = [],
  id = createCandidateId(message),
): ChatMessageCandidate {
  return {
    id,
    content: message.content,
    timestamp: toIsoTimestamp(message.timestamp),
    status: message.status,
    generationRunId: message.generationRunId,
    provider: message.provider,
    model: message.model,
    attemptedModel: message.attemptedModel,
    outputModel: message.outputModel,
    validationStatus: message.validationStatus,
    validationFailures: message.validationFailures,
    validationAttempts: message.validationAttempts,
    repairAttempted: message.repairAttempted,
    fallback: message.fallback,
    fallbackProvider: message.fallbackProvider,
    fallbackModel: message.fallbackModel,
    providerOutcome: message.providerOutcome,
    timeoutStage: message.timeoutStage,
    geminiErrorCode: message.geminiErrorCode,
    geminiErrorStatus: message.geminiErrorStatus,
    generationErrorCode: message.generationErrorCode,
    generationErrorStatus: message.generationErrorStatus,
    generationErrorMessage: message.generationErrorMessage,
    streamedContent: message.streamedContent,
    savedContent: message.savedContent ?? message.content,
    speakerId: message.speakerId,
    speakerName: message.speakerName,
    companionMessages: companionMessages.map(snapshotCompanionMessage),
  }
}

function applyCandidateToMessage(
  message: ChatMessage,
  candidate: ChatMessageCandidate,
  candidates: ChatMessageCandidate[],
): ChatMessage {
  return {
    ...message,
    content: candidate.content,
    timestamp: hydrateTimestamp(candidate.timestamp),
    status: candidate.status ?? "completed",
    generationRunId: candidate.generationRunId,
    provider: candidate.provider,
    model: candidate.model,
    attemptedModel: candidate.attemptedModel,
    outputModel: candidate.outputModel,
    validationStatus: candidate.validationStatus,
    validationFailures: candidate.validationFailures,
    validationAttempts: candidate.validationAttempts,
    repairAttempted: candidate.repairAttempted,
    fallback: candidate.fallback,
    fallbackProvider: candidate.fallbackProvider,
    fallbackModel: candidate.fallbackModel,
    providerOutcome: candidate.providerOutcome,
    timeoutStage: candidate.timeoutStage,
    geminiErrorCode: candidate.geminiErrorCode,
    geminiErrorStatus: candidate.geminiErrorStatus,
    generationErrorCode: candidate.generationErrorCode,
    generationErrorStatus: candidate.generationErrorStatus,
    generationErrorMessage: candidate.generationErrorMessage,
    streamedContent: candidate.streamedContent,
    savedContent: candidate.savedContent ?? candidate.content,
    speakerId: candidate.speakerId ?? message.speakerId,
    speakerName: candidate.speakerName ?? message.speakerName,
    isGenerationError: false,
    retryPayload: undefined,
    messageCandidates: candidates,
    selectedCandidateId: candidate.id,
  }
}

export function appendMessageCandidate(
  message: ChatMessage,
  generatedMessage: ChatMessage,
  {
    currentCompanionMessages = [],
    generatedCompanionMessages = [],
  }: {
    currentCompanionMessages?: ChatMessage[]
    generatedCompanionMessages?: ChatMessage[]
  } = {},
) {
  const existingCandidates = message.messageCandidates?.length
    ? message.messageCandidates
    : [
        createMessageCandidate(
          message,
          currentCompanionMessages,
          `${message.id}-candidate-initial`,
        ),
      ]
  const nextCandidate = createMessageCandidate(generatedMessage, generatedCompanionMessages)
  const candidates = [...existingCandidates, nextCandidate]

  return applyCandidateToMessage(message, nextCandidate, candidates)
}

export function selectMessageCandidate(
  messages: ChatMessage[],
  messageId: string,
  candidateId: string,
) {
  const target = messages.find((message) => message.id === messageId)
  const candidates = target?.messageCandidates
  const candidate = candidates?.find((item) => item.id === candidateId)
  if (!target || !candidates || !candidate) return messages

  const companionMessages = new Map(
    (candidate.companionMessages ?? []).map((message) => [message.messageId, message]),
  )

  return messages.map((message) => {
    if (message.id === messageId) {
      return applyCandidateToMessage(message, candidate, candidates)
    }

    const companion = companionMessages.get(message.id)
    if (!companion) return message

    return {
      ...message,
      content: companion.content,
      timestamp: hydrateTimestamp(companion.timestamp),
      status: companion.status,
    }
  })
}

export function finalizeMessageCandidates(messages: ChatMessage[]): ChatMessage[] {
  let changed = false
  const finalized: ChatMessage[] = messages.map((message) => {
    if (!message.messageCandidates?.length && !message.selectedCandidateId) return message
    changed = true
    const {
      messageCandidates: _messageCandidates,
      selectedCandidateId: _selectedCandidateId,
      ...confirmedMessage
    } = message
    return confirmedMessage as ChatMessage
  })

  return changed ? finalized : messages
}

export function getMessageCandidateContents(message: ChatMessage) {
  if (message.messageCandidates?.length) {
    return message.messageCandidates.map((candidate) => candidate.content.trim()).filter(Boolean)
  }
  const content = message.content.trim()
  return content ? [content] : []
}

export function buildRegenerationAvoidContent(message: ChatMessage) {
  const blocks = getMessageCandidateContents(message)
    .reverse()
    .map((content, index) => `[기존 전개 ${index + 1}]\n${content}`)

  return blocks.join("\n\n").slice(0, MAX_REGENERATION_AVOID_CHARS)
}
