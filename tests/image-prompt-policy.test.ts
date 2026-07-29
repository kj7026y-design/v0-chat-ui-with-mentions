import assert from "node:assert/strict"
import test from "node:test"

import {
  IMAGE_SCENE_SYSTEM_INSTRUCTION,
  IMAGE_TEXT_NEGATIVE_PROMPT,
  applyImageScenePolicy,
} from "../lib/image-prompt-policy"

test("image policy forbids character introductions and all visible writing", () => {
  const prompt = applyImageScenePolicy("A character named Mina waits under a station sign.")

  assert.match(IMAGE_SCENE_SYSTEM_INSTRUCTION, /character introduction/i)
  assert.match(IMAGE_SCENE_SYSTEM_INSTRUCTION, /Never render visible text/i)
  assert.match(IMAGE_SCENE_SYSTEM_INSTRUCTION, /speech bubbles/i)
  assert.match(IMAGE_TEXT_NEGATIVE_PROMPT, /profile card/i)
  assert.match(IMAGE_TEXT_NEGATIVE_PROMPT, /Hangul glyphs/i)
  assert.doesNotMatch(IMAGE_TEXT_NEGATIVE_PROMPT, /Korean characters/i)
  assert.match(prompt, /private production context/i)
  assert.match(prompt, /zero visible writing/i)
})
