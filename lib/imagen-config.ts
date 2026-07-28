import { PersonGeneration, type GenerateImagesParameters } from "@google/genai"
import {
  IMAGE_SCENE_SYSTEM_INSTRUCTION,
  applyImageScenePolicy,
} from "@/lib/image-prompt-policy"

export const DEFAULT_IMAGEN_MODEL = "imagen-3.0-generate-001"
export const FALLBACK_IMAGEN_MODEL = "imagen-4.0-generate-001"
export const NATIVE_IMAGE_FALLBACK_MODEL = "gemini-3.1-flash-image"
export const IMAGEN_ASPECT_RATIO = "1:1"
export const IMAGEN_OUTPUT_MIME_TYPE = "image/jpeg"
export const IMAGEN_OUTPUT_SIZE = 1024

export function buildImagenGenerateRequest(
  prompt: string,
  model = DEFAULT_IMAGEN_MODEL,
): GenerateImagesParameters {
  return {
    model,
    prompt: applyImageScenePolicy(prompt),
    config: {
      numberOfImages: 1,
      aspectRatio: IMAGEN_ASPECT_RATIO,
      outputMimeType: IMAGEN_OUTPUT_MIME_TYPE,
      personGeneration: PersonGeneration.ALLOW_ADULT,
      includeRaiReason: true,
    },
  }
}

export function buildGeminiImageInteractionRequest(
  prompt: string,
  model = NATIVE_IMAGE_FALLBACK_MODEL,
) {
  return {
    model,
    input: applyImageScenePolicy(prompt),
    system_instruction: IMAGE_SCENE_SYSTEM_INSTRUCTION,
    response_format: {
      type: "image" as const,
      mime_type: IMAGEN_OUTPUT_MIME_TYPE as "image/jpeg",
      aspect_ratio: IMAGEN_ASPECT_RATIO,
      image_size: "1K" as const,
    },
  }
}
