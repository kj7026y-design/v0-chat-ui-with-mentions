import { GoogleGenAI, type GenerateImagesResponse } from "@google/genai"
import { NextResponse } from "next/server"
import {
  DEFAULT_IMAGEN_MODEL,
  FALLBACK_IMAGEN_MODEL,
  IMAGEN_OUTPUT_MIME_TYPE,
  IMAGEN_OUTPUT_SIZE,
  NATIVE_IMAGE_FALLBACK_MODEL,
  buildGeminiImageInteractionRequest,
  buildImagenGenerateRequest,
} from "@/lib/imagen-config"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_IMAGE_PROMPT_LENGTH = 4_000

function getImagenModel() {
  return process.env.GOOGLE_IMAGEN_MODEL?.trim() || DEFAULT_IMAGEN_MODEL
}

function getImagenFallbackModel() {
  return process.env.GOOGLE_IMAGEN_FALLBACK_MODEL?.trim() || FALLBACK_IMAGEN_MODEL
}

function getNativeImageFallbackModel() {
  return process.env.GOOGLE_GEMINI_IMAGE_MODEL?.trim() || NATIVE_IMAGE_FALLBACK_MODEL
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return 502
  const value = error as { status?: unknown; code?: unknown }
  const status = Number(value.status ?? value.code)
  if (status === 400 || status === 401 || status === 403 || status === 429) return status
  return 502
}

function isModelUnavailableError(error: unknown) {
  if (!error || typeof error !== "object") return false
  const value = error as { status?: unknown; code?: unknown; message?: unknown }
  const status = Number(value.status ?? value.code)
  const message = typeof value.message === "string" ? value.message : ""
  return status === 404 || /NOT_FOUND|not found|does not exist|not supported/i.test(message)
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

  const model = getImagenModel()

  try {
    const ai = new GoogleGenAI({ apiKey })
    const imagenModels = [...new Set([model, getImagenFallbackModel()])]
    let imagenResponse: GenerateImagesResponse | undefined
    let outputModel = model

    for (const imagenModel of imagenModels) {
      try {
        outputModel = imagenModel
        imagenResponse = await ai.models.generateImages(
          buildImagenGenerateRequest(prompt, imagenModel),
        )
        break
      } catch (error) {
        if (!isModelUnavailableError(error)) throw error
        console.warn(`[Imagen model unavailable] ${imagenModel}`)
      }
    }

    if (imagenResponse) {
      const generatedImage = imagenResponse.generatedImages?.find(
        (item) => Boolean(item.image?.imageBytes),
      )
      const imageBytes = generatedImage?.image?.imageBytes

      if (!imageBytes) {
        const filterReason = imagenResponse.generatedImages
          ?.map((item) => item.raiFilteredReason?.trim())
          .find(Boolean)
        return NextResponse.json(
          {
            error: filterReason
              ? `안전 정책으로 이미지를 생성하지 못했습니다: ${filterReason}`
              : "Imagen이 이미지 데이터를 반환하지 않았습니다.",
          },
          { status: 422 },
        )
      }

      const mimeType = generatedImage.image?.mimeType || IMAGEN_OUTPUT_MIME_TYPE
      return NextResponse.json(
        {
          imageUrl: `data:${mimeType};base64,${imageBytes}`,
          mimeType,
          model: outputModel,
          requestedModel: model,
          provider: "google-imagen",
          width: IMAGEN_OUTPUT_SIZE,
          height: IMAGEN_OUTPUT_SIZE,
        },
      )
    }

    const nativeImageModel = getNativeImageFallbackModel()
    console.warn(`[Imagen unavailable] retrying with native image model ${nativeImageModel}`)
    const interaction = await ai.interactions.create(
      buildGeminiImageInteractionRequest(prompt, nativeImageModel),
    )
    const imageBytes = interaction.output_image?.data
    if (!imageBytes) {
      return NextResponse.json(
        { error: "Gemini 이미지 모델이 이미지 데이터를 반환하지 않았습니다." },
        { status: 422 },
      )
    }

    const mimeType = interaction.output_image?.mime_type || IMAGEN_OUTPUT_MIME_TYPE
    return NextResponse.json({
      imageUrl: `data:${mimeType};base64,${imageBytes}`,
      mimeType,
      model: nativeImageModel,
      requestedModel: model,
      provider: "google-gemini-image",
      width: IMAGEN_OUTPUT_SIZE,
      height: IMAGEN_OUTPUT_SIZE,
    })
  } catch (error) {
    console.error("[Google image generation failed]", error)
    return NextResponse.json(
      { error: "Google 이미지 생성에 실패했습니다." },
      { status: getErrorStatus(error) },
    )
  }
}
