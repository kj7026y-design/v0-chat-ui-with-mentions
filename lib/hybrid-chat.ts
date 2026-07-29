import { generateTextWithSelectedChatModel } from "@/lib/rp/pipeline"
import {
  IMAGE_TEXT_NEGATIVE_PROMPT,
  applyImageScenePolicy,
} from "@/lib/image-prompt-policy"

const DEFAULT_FAL_IMAGE_ENDPOINT = "https://fal.run/fal-ai/pony-v7"
const DEFAULT_FAL_FALLBACK_IMAGE_ENDPOINT = "https://fal.run/fal-ai/fast-sdxl"
const DEFAULT_FAL_IMAGE_TIMEOUT_MS = 15_000
const DEFAULT_FAL_FALLBACK_TIMEOUT_MS = 15_000
const MIN_FAL_TIMEOUT_MS = 1
const MAX_FAL_TIMEOUT_MS = 120_000
const MAX_MESSAGE_LENGTH = 20_000
const MAX_HISTORY_ITEMS = 40
const MAX_HISTORY_ITEM_LENGTH = 12_000
const MAX_IMAGE_PROMPT_LENGTH = 2_000

export const IMAGE_TRIGGER_PATTERN = /\[TRIGGER_IMG:\s*([\s\S]*?)\]/i
const IMAGE_TRIGGER_GLOBAL_PATTERN = /\[TRIGGER_IMG:\s*[\s\S]*?\]/gi

const HYBRID_SYSTEM_PROMPT = [
  "Reply naturally in the user's language and continue the supplied conversation.",
  "When an image would materially improve the response, append exactly one tag at the end in this format: [TRIGGER_IMG: concise English visual prompt].",
  "The visual prompt must describe the scene, subjects, composition, lighting, mood, and relevant appearance details in English.",
  "Do not mention or explain the tag. Do not emit the tag when an image is unnecessary.",
  "Any requested image must comply with the image provider's policies.",
].join(" ")

type HybridChatRole = "user" | "assistant"

interface HybridChatMessage {
  role: HybridChatRole
  content: string
}

export interface HybridChatRequest {
  message: string
  chatHistory?: unknown
  modelId?: string
  selectedModelId?: string
}

export interface HybridChatResult {
  text: string
  image: string | null
}

interface HybridChatDependencies {
  fetcher?: typeof fetch
  env?: Partial<NodeJS.ProcessEnv>
  textGenerator?: typeof generateTextWithSelectedChatModel
}

interface FalImageDependencies {
  fetcher?: typeof fetch
  env?: Partial<NodeJS.ProcessEnv>
}

interface FalImageResponse {
  images?: Array<{ url?: string }>
  image?: { url?: string }
}

interface FalImageRequestOptions {
  endpoint: string
  fallback: boolean
  timeoutMs: number
}

export interface FalGeneratedImage {
  imageUrl: string
  model: string
  provider: "fal"
  usedFallback: boolean
}

export class HybridChatError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = "HybridChatError"
  }
}

export function hasHybridChatRequestShape(value: unknown): value is HybridChatRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return Object.prototype.hasOwnProperty.call(record, "message")
    && !Object.prototype.hasOwnProperty.call(record, "messages")
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function normalizeHistory(value: unknown): HybridChatMessage[] {
  if (!Array.isArray(value)) return []

  return value
    .slice(-MAX_HISTORY_ITEMS)
    .flatMap((item): HybridChatMessage[] => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return []
      const record = item as Record<string, unknown>
      const content = normalizeText(record.content, MAX_HISTORY_ITEM_LENGTH)
      if (!content) return []

      const role = record.role === "assistant" || record.type === "ai"
        ? "assistant"
        : record.role === "user" || record.type === "user"
          ? "user"
          : null

      return role ? [{ role, content }] : []
    })
}

function normalizeHybridRequest(body: HybridChatRequest) {
  const message = normalizeText(body.message, MAX_MESSAGE_LENGTH)
  if (!message) {
    throw new HybridChatError("message가 필요합니다.", 400)
  }

  return {
    message,
    chatHistory: normalizeHistory(body.chatHistory),
    modelId: normalizeText(body.modelId || body.selectedModelId, 100) || undefined,
  }
}

function normalizeTimeout(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(MAX_FAL_TIMEOUT_MS, Math.max(MIN_FAL_TIMEOUT_MS, Math.round(parsed)))
}

async function getUpstreamErrorMessage(response: Response) {
  const raw = await response.text().catch(() => "")
  if (!raw) return `${response.status} ${response.statusText}`.trim()

  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: unknown } | string
      detail?: unknown
    }
    if (typeof parsed.error === "object" && typeof parsed.error?.message === "string") {
      return parsed.error.message
    }
    if (typeof parsed.error === "string") return parsed.error
    if (typeof parsed.detail === "string") return parsed.detail
  } catch {
    // Preserve a short non-JSON provider response for diagnostics.
  }

  return raw.slice(0, 500)
}

async function fetchWithTimeout(
  fetcher: typeof fetch,
  input: string,
  init: RequestInit,
  timeoutMs: number,
  label: string,
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetcher(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new HybridChatError(`${label} 응답 시간이 초과됐습니다.`, 504)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export function extractImageTrigger(aiText: string) {
  const match = aiText.match(IMAGE_TRIGGER_PATTERN)
  const imagePrompt = match
    ? normalizeText(match[1], MAX_IMAGE_PROMPT_LENGTH)
    : ""
  const text = aiText
    .replace(IMAGE_TRIGGER_GLOBAL_PATTERN, "")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim()

  return {
    text,
    imagePrompt: imagePrompt || null,
  }
}

function buildFalImageRequestBody(
  endpoint: string,
  prompt: string,
  fallback: boolean,
) {
  const usesFastSdxlSchema = /\/fast-sdxl\/?$/u.test(endpoint)
  const usesPonyV7Schema = /\/pony-v7\/?$/u.test(endpoint)
  const tuning = fallback
    ? {
        num_inference_steps: 4,
        guidance_scale: 1.75,
      }
    : usesPonyV7Schema
      ? {
          num_inference_steps: 40,
          guidance_scale: 3.5,
          noise_source: "gpu",
        }
      : {
        num_inference_steps: 25,
        guidance_scale: 3.5,
      }

  return {
    prompt,
    image_size: "square_hd",
    num_images: 1,
    ...tuning,
    enable_safety_checker: true,
    ...(usesFastSdxlSchema ? { negative_prompt: IMAGE_TEXT_NEGATIVE_PROMPT } : {}),
    ...(usesFastSdxlSchema ? { format: "jpeg" } : { output_format: "jpeg" }),
  }
}

function getFalModelName(endpoint: string) {
  try {
    return new URL(endpoint).pathname.replace(/^\/+|\/+$/gu, "")
  } catch {
    return endpoint
  }
}

async function requestFalImage(
  imagePrompt: string,
  fetcher: typeof fetch,
  apiKey: string,
  options: FalImageRequestOptions,
) {
  const prompt = applyImageScenePolicy(
    `masterpiece, best quality, highly detailed, 8k, ${imagePrompt}`,
  )
  const response = await fetchWithTimeout(
    fetcher,
    options.endpoint,
    {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildFalImageRequestBody(
        options.endpoint,
        prompt,
        options.fallback,
      )),
    },
    options.timeoutMs,
    options.fallback ? "Fal.ai 폴백 모델" : "Fal.ai 메인 모델",
  )

  if (!response.ok) {
    const detail = await getUpstreamErrorMessage(response)
    throw new Error(
      `Fal.ai ${options.fallback ? "폴백" : "메인"} 모델 요청에 실패했습니다: ${detail}`,
    )
  }

  const data = await response.json().catch(() => null) as FalImageResponse | null
  const imageUrl = data?.images?.find((image) => Boolean(image.url))?.url || data?.image?.url
  if (!imageUrl) {
    throw new Error("Fal.ai가 이미지 URL을 반환하지 않았습니다.")
  }
  return {
    imageUrl,
    model: getFalModelName(options.endpoint),
    provider: "fal" as const,
    usedFallback: options.fallback,
  }
}

export async function generateFalImageFromPrompt(
  imagePrompt: string,
  dependencies: FalImageDependencies = {},
): Promise<FalGeneratedImage> {
  const fetcher = dependencies.fetcher || fetch
  const env = dependencies.env || process.env
  const apiKey = env.FAL_KEY?.trim()
  if (!apiKey) {
    throw new Error("FAL_KEY가 설정되어 있지 않습니다.")
  }

  const mainOptions: FalImageRequestOptions = {
    endpoint: env.FAL_IMAGE_ENDPOINT?.trim() || DEFAULT_FAL_IMAGE_ENDPOINT,
    fallback: false,
    timeoutMs: normalizeTimeout(
      env.FAL_IMAGE_TIMEOUT_MS,
      DEFAULT_FAL_IMAGE_TIMEOUT_MS,
    ),
  }
  const fallbackOptions: FalImageRequestOptions = {
    endpoint: env.FAL_FALLBACK_IMAGE_ENDPOINT?.trim()
      || DEFAULT_FAL_FALLBACK_IMAGE_ENDPOINT,
    fallback: true,
    timeoutMs: normalizeTimeout(
      env.FAL_FALLBACK_TIMEOUT_MS,
      DEFAULT_FAL_FALLBACK_TIMEOUT_MS,
    ),
  }

  try {
    return await requestFalImage(imagePrompt, fetcher, apiKey, mainOptions)
  } catch (mainError) {
    console.warn(
      "[hybrid chat main image generation failed; using fallback]",
      mainError instanceof Error ? mainError.message : mainError,
    )
  }

  return requestFalImage(imagePrompt, fetcher, apiKey, fallbackOptions)
}

export async function runHybridChat(
  body: HybridChatRequest,
  dependencies: HybridChatDependencies = {},
): Promise<HybridChatResult> {
  const { message, chatHistory, modelId } = normalizeHybridRequest(body)
  const fetcher = dependencies.fetcher || fetch
  const env = dependencies.env || process.env
  const textGenerator = dependencies.textGenerator || generateTextWithSelectedChatModel
  const generatedText = await textGenerator({
    modelId,
    messages: [
      { role: "system", content: HYBRID_SYSTEM_PROMPT },
      ...chatHistory,
      { role: "user", content: message },
    ],
  })
  const aiText = generatedText.content
  const { text, imagePrompt } = extractImageTrigger(aiText)

  if (!imagePrompt) {
    return { text, image: null }
  }

  try {
    const generatedImage = await generateFalImageFromPrompt(imagePrompt, {
      fetcher,
      env,
    })
    return { text, image: generatedImage.imageUrl }
  } catch (error) {
    console.error(
      "[hybrid chat image generation failed]",
      error instanceof Error ? error.message : error,
    )
    return { text, image: null }
  }
}
