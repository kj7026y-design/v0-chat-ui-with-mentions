import {
  IMAGE_SCENE_SYSTEM_INSTRUCTION,
  applyImageScenePolicy,
} from "@/lib/image-prompt-policy"

export const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image"
export const FALLBACK_IMAGE_MODEL = "gemini-3.1-flash-lite-image"
export const IMAGE_ASPECT_RATIO = "1:1"
export const IMAGE_OUTPUT_MIME_TYPE = "image/jpeg"
export const IMAGE_OUTPUT_SIZE = 1024
export const IMAGE_MODEL_TIMEOUT_MS = 25_000

export function buildGeminiImageInteractionRequest(
  prompt: string,
  model = DEFAULT_IMAGE_MODEL,
) {
  return {
    model,
    input: applyImageScenePolicy(prompt),
    system_instruction: IMAGE_SCENE_SYSTEM_INSTRUCTION,
    response_format: {
      type: "image" as const,
      mime_type: IMAGE_OUTPUT_MIME_TYPE as "image/jpeg",
      aspect_ratio: IMAGE_ASPECT_RATIO,
      image_size: "1K" as const,
    },
  }
}
