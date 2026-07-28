import assert from "node:assert/strict"
import test from "node:test"

import {
  IMAGE_SCENE_SYSTEM_INSTRUCTION,
  IMAGE_TEXT_NEGATIVE_PROMPT,
  applyImageScenePolicy,
} from "../lib/image-prompt-policy"
import {
  DEFAULT_IMAGE_MODEL,
  FALLBACK_IMAGE_MODEL,
  IMAGE_ASPECT_RATIO,
  IMAGE_MODEL_TIMEOUT_MS,
  IMAGE_OUTPUT_MIME_TYPE,
  IMAGE_OUTPUT_SIZE,
  buildGeminiImageInteractionRequest,
} from "../lib/google-image-config"

test("Gemini image generation defaults to the current stable 1K model", () => {
  const request = buildGeminiImageInteractionRequest("  scene  ")

  assert.equal(request.model, DEFAULT_IMAGE_MODEL)
  assert.equal(DEFAULT_IMAGE_MODEL, "gemini-3.1-flash-image")
  assert.equal(FALLBACK_IMAGE_MODEL, "gemini-3.1-flash-lite-image")
  assert.equal(request.input, applyImageScenePolicy("scene"))
  assert.equal(request.system_instruction, IMAGE_SCENE_SYSTEM_INSTRUCTION)
  assert.deepEqual(request.response_format, {
    type: "image",
    mime_type: "image/jpeg",
    aspect_ratio: "1:1",
    image_size: "1K",
  })
  assert.equal(IMAGE_ASPECT_RATIO, "1:1")
  assert.equal(IMAGE_OUTPUT_MIME_TYPE, "image/jpeg")
  assert.equal(IMAGE_OUTPUT_SIZE, 1024)
  assert.equal(IMAGE_MODEL_TIMEOUT_MS, 25_000)
})

test("Gemini image model can be overridden without changing output settings", () => {
  const request = buildGeminiImageInteractionRequest("scene", "gemini-test-image")

  assert.equal(request.model, "gemini-test-image")
  assert.equal(request.response_format.aspect_ratio, "1:1")
  assert.equal(request.response_format.image_size, "1K")
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
