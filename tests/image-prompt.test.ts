import assert from "node:assert/strict"
import test from "node:test"

import {
  buildImagePrompt,
  generateImagePromptWithGeminiPro,
  IMAGE_PROMPT_MODEL_ID,
  normalizeImagePromptModelOutput,
  type ImageCommandContext,
} from "../lib/chat-engine"
import type { StoryCharacter, StoryPersona, StoryWork } from "../lib/storychat-storage"

test("scene context omits title-card copy, private names, and rendering-style keywords", () => {
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
  assert.doesNotMatch(
    prompt,
    /concept art|digital illustration|masterpiece|best quality|ultra high res|cinematic film still|book cover style/i,
  )
})

test("image prompt model output cleanup removes wrappers and trigger syntax", () => {
  assert.equal(
    normalizeImagePromptModelOutput(
      "[TRIGGER_IMG: two fictional adults sharing an umbrella, cinematic rainy street]",
    ),
    "two fictional adults sharing an umbrella, cinematic rainy street",
  )
  assert.equal(
    normalizeImagePromptModelOutput("```prompt\nImage prompt: moonlit apartment interior\n```"),
    "moonlit apartment interior",
  )
})

test("image prompt generation always uses Gemini 2.5 Pro", async () => {
  let requestBody: Record<string, unknown> | undefined
  const fetcher: typeof fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
    return new Response(JSON.stringify({
      result: "two fictional adults facing each other in a quiet apartment, warm ceiling light keeping both faces clearly visible",
    }), { status: 200 })
  }

  const prompt = await generateImagePromptWithGeminiPro(
    "Private scene context",
    fetcher,
  )

  assert.equal(IMAGE_PROMPT_MODEL_ID, "gemini-pro")
  assert.equal(requestBody?.modelId, IMAGE_PROMPT_MODEL_ID)
  assert.equal(requestBody?.roleplayEnabled, false)
  assert.equal(
    prompt,
    "two fictional adults facing each other in a quiet apartment, warm ceiling light keeping both faces clearly visible",
  )
  const messages = requestBody?.messages as Array<{ role: string; content: string }>
  assert.match(messages[0]?.content || "", /renderer prepends the visual style separately/i)
  assert.match(messages[0]?.content || "", /Do not add or repeat art-style/i)
})
