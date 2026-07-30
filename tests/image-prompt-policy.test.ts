import assert from "node:assert/strict"
import test from "node:test"

import {
  IMAGE_DEFAULT_ART_STYLE,
  IMAGE_SCENE_SYSTEM_INSTRUCTION,
  IMAGE_STYLE_EXCLUSIONS,
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
  assert.match(IMAGE_DEFAULT_ART_STYLE, /ornate, high-gloss Korean romantic-fantasy illustration/i)
  assert.match(IMAGE_DEFAULT_ART_STYLE, /smooth airbrushed gradient shading/i)
  assert.match(IMAGE_DEFAULT_ART_STYLE, /pearlescent highlights/i)
  assert.doesNotMatch(IMAGE_DEFAULT_ART_STYLE, /painterly realism/i)
  assert.doesNotMatch(IMAGE_DEFAULT_ART_STYLE, /semi-realistic/i)
  assert.match(IMAGE_STYLE_EXCLUSIONS, /Do not use photorealism/i)
  assert.match(IMAGE_STYLE_EXCLUSIONS, /Do not use semi-realistic 2\.5D/i)
  assert.match(prompt, /^\[ART DIRECTION\]/u)
  assert.match(prompt, /\[OUTPUT FORMAT\]/u)
  assert.match(prompt, /\[STORY PRIORITIES\]/u)
  assert.match(prompt, /\[VISUAL PRIORITIES\]/u)
  assert.match(prompt, /\[CURRENT SCENE\]/u)
  assert.ok(prompt.indexOf(IMAGE_DEFAULT_ART_STYLE) < prompt.indexOf(scenePrompt))
  assert.ok(prompt.includes(IMAGE_STYLE_EXCLUSIONS))
  assert.match(prompt, /continuous full-bleed/i)
  assert.match(prompt, /ornate, luminous, high-gloss illustration finish/i)
  assert.match(prompt, new RegExp(scenePrompt.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"))
  assert.doesNotMatch(prompt, /AVOID THESE VISUAL ELEMENTS/i)
})

test("image policy rejects an empty scene prompt", () => {
  assert.throws(() => applyImageScenePolicy("   "), /scenePrompt must not be empty/u)
})
