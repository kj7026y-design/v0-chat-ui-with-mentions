import assert from "node:assert/strict"
import test from "node:test"
import { PersonGeneration } from "@google/genai"

import {
  DEFAULT_IMAGEN_MODEL,
  FALLBACK_IMAGEN_MODEL,
  IMAGEN_ASPECT_RATIO,
  IMAGEN_OUTPUT_MIME_TYPE,
  IMAGEN_OUTPUT_SIZE,
  buildImagenGenerateRequest,
} from "../lib/imagen-config"

test("Imagen 3 uses one standard square JPEG image", () => {
  const request = buildImagenGenerateRequest("  cinematic character scene  ")

  assert.equal(request.model, DEFAULT_IMAGEN_MODEL)
  assert.equal(request.prompt, "cinematic character scene")
  assert.equal(request.config?.numberOfImages, 1)
  assert.equal(request.config?.aspectRatio, IMAGEN_ASPECT_RATIO)
  assert.equal(request.config?.outputMimeType, IMAGEN_OUTPUT_MIME_TYPE)
  assert.equal(request.config?.personGeneration, PersonGeneration.ALLOW_ADULT)
  assert.equal(request.config?.includeRaiReason, true)
  assert.equal(IMAGEN_OUTPUT_SIZE, 1024)
  assert.equal(FALLBACK_IMAGEN_MODEL, "imagen-4.0-generate-001")
})

test("Imagen model can be overridden without changing standard output settings", () => {
  const request = buildImagenGenerateRequest("scene", "imagen-test-model")

  assert.equal(request.model, "imagen-test-model")
  assert.equal(request.config?.numberOfImages, 1)
  assert.equal(request.config?.aspectRatio, "1:1")
})
