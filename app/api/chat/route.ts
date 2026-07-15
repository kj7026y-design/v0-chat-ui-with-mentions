import { NextResponse } from "next/server"
import { getChatModelConfig } from "@/lib/chat-models"
import {
  ChatApiError,
  type ChatRequestBody,
  isRoleplayRequest,
  normalizeBody,
  runChatEventStream,
  runPlainChat,
  runRoleplayPipeline,
} from "@/lib/rp/pipeline"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as ChatRequestBody | null
  const normalizedBody = normalizeBody(body)
  const { modelId, messages, fallbackPrompt } = normalizedBody

  if (messages.length === 0 && !fallbackPrompt) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 })
  }

  const model = getChatModelConfig(modelId)
  const roleplayEnabled = isRoleplayRequest(body)

  try {
    if (body?.stream) {
      return runChatEventStream({ body, normalizedBody, model, roleplayEnabled })
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
