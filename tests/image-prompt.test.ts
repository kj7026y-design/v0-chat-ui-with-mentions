import assert from "node:assert/strict"
import test from "node:test"

import { buildImagePrompt, type ImageCommandContext } from "../lib/chat-engine"
import type { StoryCharacter, StoryPersona, StoryWork } from "../lib/storychat-storage"

test("scene image prompts omit title-card copy and private character names", () => {
  const context: ImageCommandContext = {
    work: {
      title: "강태현 캐릭터 소개",
      tagline: "차가운 남자의 비밀",
      genre: "현대 로맨스",
      coreSetting: "비 오는 밤의 조용한 아파트",
    } as StoryWork,
    character: {
      name: "강태현",
      role: "건축가",
      appearance: "검은 머리와 짙은 회색 셔츠",
      summary: "말보다 행동으로 마음을 드러내는 인물",
      visualTags: ["차분한 눈빛", "긴 손가락"],
    } as StoryCharacter,
    persona: {
      name: "김여자",
      role: "편집자",
      appearance: "젖은 갈색 코트와 짧은 머리",
      relationship: "오랫동안 감정을 숨긴 친구",
    } as StoryPersona,
  }

  const prompt = buildImagePrompt("강태현", context)

  assert.doesNotMatch(prompt, /강태현 캐릭터 소개/u)
  assert.doesNotMatch(prompt, /차가운 남자의 비밀/u)
  assert.doesNotMatch(prompt, /강태현/u)
  assert.doesNotMatch(prompt, /김여자/u)
  assert.match(prompt, /검은 머리와 짙은 회색 셔츠/u)
  assert.match(prompt, /젖은 갈색 코트와 짧은 머리/u)
  assert.match(prompt, /not a character introduction/i)
  assert.match(prompt, /no visible text in any language/i)
})
