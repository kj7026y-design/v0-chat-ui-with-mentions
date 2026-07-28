import assert from "node:assert/strict"
import test from "node:test"
import { PersonGeneration } from "@google/genai"

import {
  IMAGE_SCENE_SYSTEM_INSTRUCTION,
  IMAGE_TEXT_NEGATIVE_PROMPT,
  applyImageScenePolicy,
} from "../lib/image-prompt-policy"
import {
  DEFAULT_IMAGEN_MODEL,
  FALLBACK_IMAGEN_MODEL,
  IMAGEN_ASPECT_RATIO,
  IMAGEN_OUTPUT_MIME_TYPE,
  IMAGEN_OUTPUT_SIZE,
  NATIVE_IMAGE_FALLBACK_MODEL,
  buildGeminiImageInteractionRequest,
  buildImagenGenerateRequest,
} from "../lib/imagen-config"

test("Imagen 3 uses one standard square JPEG image", () => {
  const request = buildImagenGenerateRequest("  cinematic character scene  ")

  assert.equal(request.model, DEFAULT_IMAGEN_MODEL)
  assert.equal(request.prompt, applyImageScenePolicy("cinematic character scene"))
  assert.equal(request.config?.numberOfImages, 1)
  assert.equal(request.config?.aspectRatio, IMAGEN_ASPECT_RATIO)
  assert.equal(request.config?.outputMimeType, IMAGEN_OUTPUT_MIME_TYPE)
  assert.equal(request.config?.personGeneration, PersonGeneration.ALLOW_ADULT)
  assert.equal(request.config?.includeRaiReason, true)
  assert.equal(request.config?.negativePrompt, undefined)
  assert.match(request.prompt, /character introduction/i)
  assert.equal(IMAGEN_OUTPUT_SIZE, 1024)
  assert.equal(FALLBACK_IMAGEN_MODEL, "imagen-4.0-generate-001")
})

test("Imagen model can be overridden without changing standard output settings", () => {
  const request = buildImagenGenerateRequest("scene", "imagen-test-model")

  assert.equal(request.model, "imagen-test-model")
  assert.equal(request.config?.numberOfImages, 1)
  assert.equal(request.config?.aspectRatio, "1:1")
})

test("native Gemini fallback requests one 1K square JPEG image", () => {
  const request = buildGeminiImageInteractionRequest("  scene  ")

  assert.equal(request.model, NATIVE_IMAGE_FALLBACK_MODEL)
  assert.equal(request.input, applyImageScenePolicy("scene"))
  assert.equal(request.system_instruction, IMAGE_SCENE_SYSTEM_INSTRUCTION)
  assert.deepEqual(request.response_format, {
    type: "image",
    mime_type: "image/jpeg",
    aspect_ratio: "1:1",
    image_size: "1K",
  })
})

test("image policy forbids character introductions and all visible writing", () => {
  const prompt = applyImageScenePolicy("A character named Mina waits under a station sign.")

  assert.match(IMAGE_SCENE_SYSTEM_INSTRUCTION, /character introduction/i)
  assert.match(IMAGE_SCENE_SYSTEM_INSTRUCTION, /Never render visible text/i)
  assert.match(IMAGE_SCENE_SYSTEM_INSTRUCTION, /speech bubbles/i)
  assert.match(IMAGE_TEXT_NEGATIVE_PROMPT, /profile card/i)
  assert.match(prompt, /private production context/i)
  assert.match(prompt, /zero visible writing/i)
})
