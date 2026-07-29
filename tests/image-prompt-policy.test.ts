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

  assert.match(IMAGE_SCENE_SYSTEM_INSTRUCTION, /character introduction/i)
  assert.match(IMAGE_SCENE_SYSTEM_INSTRUCTION, /Never render visible text/i)
  assert.match(IMAGE_SCENE_SYSTEM_INSTRUCTION, /speech bubbles/i)
  assert.match(IMAGE_TEXT_NEGATIVE_PROMPT, /profile card/i)
  assert.match(IMAGE_TEXT_NEGATIVE_PROMPT, /Hangul glyphs/i)
  assert.doesNotMatch(IMAGE_TEXT_NEGATIVE_PROMPT, /Korean characters/i)
  assert.match(IMAGE_DEFAULT_ART_STYLE, /refined semi-realistic 2\.5D digital art/i)
  assert.doesNotMatch(IMAGE_DEFAULT_ART_STYLE, /Korean romance web novel cover style/i)
  assert.match(prompt, /^\[VISUAL STYLE\]/u)
  assert.match(prompt, /\[SCENE FORMAT\]/u)
  assert.match(prompt, /\[VISUAL PRIORITIES\]/u)
  assert.match(prompt, /\[CURRENT STORY SCENE\]/u)
  assert.ok(prompt.indexOf(IMAGE_DEFAULT_ART_STYLE) < prompt.indexOf(scenePrompt))
  assert.match(prompt, /continuous full-bleed cinematic narrative illustration/i)
  assert.match(prompt, /faces must remain softly and clearly illuminated/i)
  assert.match(prompt, new RegExp(scenePrompt.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"))
  assert.doesNotMatch(prompt, /AVOID THESE VISUAL ELEMENTS/i)
})

test("image policy rejects an empty scene prompt", () => {
  assert.throws(() => applyImageScenePolicy("   "), /scenePrompt must not be empty/u)
})
