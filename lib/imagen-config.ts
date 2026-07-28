import { PersonGeneration, type GenerateImagesParameters } from "@google/genai"

export const DEFAULT_IMAGEN_MODEL = "imagen-3.0-generate-001"
export const FALLBACK_IMAGEN_MODEL = "imagen-4.0-generate-001"
export const IMAGEN_ASPECT_RATIO = "1:1"
export const IMAGEN_OUTPUT_MIME_TYPE = "image/jpeg"
export const IMAGEN_OUTPUT_SIZE = 1024

export function buildImagenGenerateRequest(
  prompt: string,
  model = DEFAULT_IMAGEN_MODEL,
): GenerateImagesParameters {
  return {
    model,
    prompt: prompt.trim(),
    config: {
      numberOfImages: 1,
      aspectRatio: IMAGEN_ASPECT_RATIO,
      outputMimeType: IMAGEN_OUTPUT_MIME_TYPE,
      personGeneration: PersonGeneration.ALLOW_ADULT,
      includeRaiReason: true,
    },
  }
}
