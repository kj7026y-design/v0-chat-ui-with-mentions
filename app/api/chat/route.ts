import { NextResponse } from "next/server"
import { getChatModelConfig } from "@/lib/chat-models"
import { getAdminSession } from "@/lib/server/admin-auth"
import { upsertChatMessages, type StoredChatMessage } from "@/lib/server/chat-message-store"
import { getStoredStoryWork } from "@/lib/server/story-work-store"
import { isStoryWorkRedZoneEnabled } from "@/lib/storychat-storage"
import {
  HybridChatError,
  hasHybridChatRequestShape,
  runHybridChat,
} from "@/lib/hybrid-chat"
import {
  ChatApiError,
  type ChatRequestBody,
  isRoleplayRequest,
  normalizeBody,
  runChatEventStream,
  runPlainChat,
  runRoleplayPipeline,
} from "@/lib/rp/pipeline"

export const maxDuration = 180

async function resolveWorkRedZoneEnabled(workId: string | undefined) {
  const normalizedWorkId = workId?.trim()
  if (!normalizedWorkId) return false

  const storedWork = await getStoredStoryWork(normalizedWorkId).catch(() => null)
  return isStoryWorkRedZoneEnabled(storedWork?.bundle.work ?? { id: normalizedWorkId })
}

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null) as unknown

  if (hasHybridChatRequestShape(rawBody)) {
    try {
      return NextResponse.json(await runHybridChat(rawBody))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Hybrid chat API failed"
      const status = error instanceof HybridChatError ? error.status : 502
      return NextResponse.json({ error: message }, { status })
    }
  }

  const requestedBody = rawBody as ChatRequestBody | null
  const roleplayEnabled = isRoleplayRequest(requestedBody)
  const redZoneEnabled = roleplayEnabled
    ? await resolveWorkRedZoneEnabled(requestedBody?.roomId)
    : false
  const body = requestedBody ? { ...requestedBody, redZoneEnabled } : null
  const normalizedBody = normalizeBody(body)
  const { modelId, messages, fallbackPrompt } = normalizedBody

  if (messages.length === 0 && !fallbackPrompt) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 })
  }

  const model = getChatModelConfig(modelId)
  try {
    if (body?.stream) {
      const session = await getAdminSession().catch(() => null)
      const roomId = body.roomId?.trim()
      const characterName = body.characterName?.trim()
      const userMessageId = body.userMessageId?.trim()
      const userMessageContent = body.userMessageContent?.trim()
      const characterMessageId = body.characterMessageId?.trim()
      const requestedUserTimestamp = new Date(body.userMessageTimestamp || "")
      const userTimestamp = Number.isNaN(requestedUserTimestamp.getTime())
        ? new Date()
        : requestedUserTimestamp

      if (session && roomId) {
        const pendingMessages: StoredChatMessage[] = []
        if (userMessageId && userMessageContent) {
          pendingMessages.push({
            id: userMessageId,
            type: "user",
            content: userMessageContent,
            timestamp: userTimestamp.toISOString(),
            status: "completed",
          })
        }
        if (characterMessageId) {
          pendingMessages.push({
            id: characterMessageId,
            type: "ai",
            content: "",
            timestamp: new Date().toISOString(),
            status: "streaming",
          })
        }
        if (pendingMessages.length > 0) {
        await upsertChatMessages({
          accountId: session.accountId,
          roomId,
          characterName,
            messages: pendingMessages,
        })
        }
      }

      return runChatEventStream({
        body,
        normalizedBody,
        model,
        roleplayEnabled,
        onFinalEvent: session && roomId
          ? async (event) => {
              const messageId = typeof event.message_id === "string" ? event.message_id : ""
              const content = typeof event.saved_content === "string" ? event.saved_content.trim() : ""
              const completed = event.status === "completed" && Boolean(content)
              if (!messageId) return

              const message: StoredChatMessage = {
                id: messageId,
                type: "ai",
                content: completed ? content : "답변 생성에 실패했어요. 다시 시도해 주세요.",
                timestamp: new Date().toISOString(),
                status: completed ? "completed" : "failed",
                generationRunId: event.run_id,
                provider: event.provider,
                model: event.model,
                attemptedModel: event.attempted_model,
                outputModel: event.output_model,
                validationStatus: event.validation_status,
                validationFailures: event.validation_failures,
                validationAttempts: event.validation_attempts,
                repairAttempted: event.repair_attempted,
                fallback: event.fallback,
                fallbackProvider: event.fallback_provider,
                fallbackModel: event.fallback_model,
                providerOutcome: event.provider_outcome,
                timeoutStage: event.timeout_stage,
              }
              await upsertChatMessages({
                accountId: session.accountId,
                roomId,
                characterName,
                messages: [message],
              })
            }
          : undefined,
      })
    }

    if (roleplayEnabled) {
      return await runRoleplayPipeline(body, model)
    }

    if (process.env.NODE_ENV !== "production") {
      console.debug("[RP pipeline enabled]", false)
    }

    return await runPlainChat(normalizedBody, model)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat API failed"
    const isTimeout = /timed out/i.test(message)
    const status = error instanceof ChatApiError
      ? error.status
      : isTimeout
        ? 504
        : model.provider === "openai"
          ? 502
          : 504

    return NextResponse.json(
      { error: isTimeout ? `${model.label} 응답 시간이 초과됐습니다. 잠시 후 다시 시도해 주세요.` : message },
      { status },
    )
  }
}
