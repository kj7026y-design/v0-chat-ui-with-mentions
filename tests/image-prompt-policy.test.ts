import assert from "node:assert/strict"
import test from "node:test"

import {
  IMAGE_DEFAULT_ART_STYLE,
  IMAGE_SCENE_SYSTEM_INSTRUCTION,
  IMAGE_TEXT_NEGATIVE_PROMPT,
  applyImageScenePolicy,
} from "../lib/image-prompt-policy"

test("image policy prepends a fixed rendering style before the scene", () => {
  const scenePrompt = "Two fictional adults face each other beside a rain-streaked window."
  const prompt = applyImageScenePolicy(scenePrompt)

  assert.match(IMAGE_SCENE_SYSTEM_INSTRUCTION, /BOTH characters/i)
  assert.match(IMAGE_TEXT_NEGATIVE_PROMPT, /wedding dress/i)
  assert.match(IMAGE_TEXT_NEGATIVE_PROMPT, /photorealistic/i)
  assert.match(IMAGE_DEFAULT_ART_STYLE, /classic Korean romance-fantasy manhwa influence/i)
  assert.match(IMAGE_DEFAULT_ART_STYLE, /smooth luminous gradient shading/i)
  assert.match(IMAGE_DEFAULT_ART_STYLE, /CHARACTER IDEALIZATION/i)
  assert.ok(prompt.indexOf(IMAGE_DEFAULT_ART_STYLE) < prompt.indexOf(scenePrompt))
  assert.match(prompt, /continuous full-bleed/i)
  assert.match(prompt, new RegExp(scenePrompt.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"))
})

test("image policy rejects an empty scene prompt", () => {
  assert.throws(() => applyImageScenePolicy("   "), /scenePrompt must not be empty/u)
})
