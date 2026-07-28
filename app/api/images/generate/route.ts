import { GoogleGenAI } from "@google/genai"
import { NextResponse } from "next/server"
import {
  DEFAULT_IMAGE_MODEL,
  FALLBACK_IMAGE_MODEL,
  IMAGE_MODEL_TIMEOUT_MS,
  IMAGE_OUTPUT_MIME_TYPE,
  IMAGE_OUTPUT_SIZE,
  buildGeminiImageInteractionRequest,
} from "@/lib/google-image-config"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_IMAGE_PROMPT_LENGTH = 4_000

function getImageModel() {
  return (
    process.env.GOOGLE_IMAGE_MODEL?.trim()
    || process.env.GOOGLE_GEMINI_IMAGE_MODEL?.trim()
    || DEFAULT_IMAGE_MODEL
  )
}

function getImageFallbackModel() {
  return process.env.GOOGLE_IMAGE_FALLBACK_MODEL?.trim() || FALLBACK_IMAGE_MODEL
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return 502
  const value = error as { status?: unknown; code?: unknown }
  const status = Number(value.status ?? value.code)
  if (status === 400 || status === 401 || status === 403 || status === 429) return status
  return 502
}

function isRetryableImageModelError(error: unknown) {
  if (!error || typeof error !== "object") return false
  const value = error as { status?: unknown; code?: unknown; message?: unknown }
  const status = Number(value.status ?? value.code)
  const message = typeof value.message === "string" ? value.message : ""
  return (
    status === 404
    || status === 429
    || status >= 500
    || /NOT_FOUND|not found|does not exist|not supported|unavailable|overloaded|timed out|timeout/i.test(message)
  )
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { prompt?: unknown } | null
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : ""

  if (!prompt) {
    return NextResponse.json({ error: "이미지 생성 프롬프트가 필요합니다." }, { status: 400 })
  }
  if (prompt.length > MAX_IMAGE_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `이미지 생성 프롬프트는 ${MAX_IMAGE_PROMPT_LENGTH}자 이하여야 합니다.` },
      { status: 400 },
    )
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY가 설정되어 있지 않습니다." },
      { status: 503 },
    )
  }

  const model = getImageModel()

  try {
    const ai = new GoogleGenAI({ apiKey })
    const imageModels = [...new Set([model, getImageFallbackModel()])]
    let lastModelError: unknown

    for (const imageModel of imageModels) {
      try {
        const interaction = await ai.interactions.create(
          buildGeminiImageInteractionRequest(prompt, imageModel),
          {
            timeout: IMAGE_MODEL_TIMEOUT_MS,
            maxRetries: 0,
          },
        )
        const imageBytes = interaction.output_image?.data
        if (!imageBytes) {
          lastModelError = new Error(`${imageModel}이 이미지 데이터를 반환하지 않았습니다.`)
          console.warn(`[Google image model returned no image] ${imageModel}`)
          continue
        }

        const mimeType = interaction.output_image?.mime_type || IMAGE_OUTPUT_MIME_TYPE
        return NextResponse.json({
          imageUrl: `data:${mimeType};base64,${imageBytes}`,
          mimeType,
          model: imageModel,
          requestedModel: model,
          provider: "google-gemini-image",
          width: IMAGE_OUTPUT_SIZE,
          height: IMAGE_OUTPUT_SIZE,
        })
      } catch (error) {
        lastModelError = error
        if (!isRetryableImageModelError(error)) throw error
        console.warn(`[Google image model unavailable] ${imageModel}`)
      }
    }

    if (lastModelError) throw lastModelError
    return NextResponse.json(
      { error: "사용 가능한 Google 이미지 모델이 없습니다." },
      { status: 503 },
    )
  } catch (error) {
    console.error("[Google image generation failed]", error)
    return NextResponse.json(
      { error: "Google 이미지 생성에 실패했습니다." },
      { status: getErrorStatus(error) },
    )
  }
}
