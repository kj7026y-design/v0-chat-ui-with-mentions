import assert from "node:assert/strict"
import test from "node:test"
import {
  CHAT_MODELS,
  MAX_REPLY_CREDIT_COST,
  MIN_REPLY_CREDIT_COST,
  REPLY_CREDIT_COSTS,
  getChatModelConfig,
  normalizeChatModelId,
} from "../lib/chat-models"
import { getRoleplayModelProfile } from "../lib/rp/model-profiles"
import { buildOpenAIChatCompletionRequest } from "../lib/rp/providers"

test("GPT-5.6 Terra is a selectable OpenAI chat model", () => {
  assert.equal(normalizeChatModelId("openai-gpt-5.6-terra"), "openai-gpt-5.6-terra")

  const model = getChatModelConfig("openai-gpt-5.6-terra")
  assert.equal(model.provider, "openai")
  assert.equal(model.providerModel, "gpt-5.6-terra")
  assert.equal(model.label, "GPT-5.6 Terra")
  const terraProfile = getRoleplayModelProfile(model)
  assert.equal(
    terraProfile.modelName,
    process.env.OPENAI_TERRA_MODEL || "gpt-5.6-terra",
  )

  const openAIProfile = getRoleplayModelProfile(getChatModelConfig("openai"))
  const { id: _openAIId, modelName: _openAIModel, ...openAISettings } = openAIProfile
  const { id: _terraId, modelName: _terraModel, ...terraSettings } = terraProfile
  assert.deepEqual(terraSettings, openAISettings)
})

test("chat model metadata describes output style without legacy unshaped labels", () => {
  assert.deepEqual(
    CHAT_MODELS.map(({ label, description, badge }) => ({ label, description, badge })),
    [
      {
        label: "Gemini 2.5 Flash",
        description: "빠른 응답 · 가볍고 자연스러운 기본 대화",
        badge: "기본",
      },
      {
        label: "GPT-4o mini",
        description: "빠른 대화 호흡 · 명확하고 직설적인 캐릭터 반응",
        badge: "대화",
      },
      {
        label: "Gemini 3 Flash RP",
        description: "몰입형 장면 묘사 · 캐릭터성과 장면 연속성 중심",
        badge: "몰입",
      },
      {
        label: "Gemini 2.5 Pro",
        description: "정교한 서사 · 복잡한 감정선과 긴 맥락에 강함",
        badge: "정밀",
      },
      {
        label: "Command R+",
        description: "자연스러운 한국어 · 담백한 대사와 안정적인 사건 전개",
        badge: "한국어",
      },
      {
        label: "GPT-5.6 Terra",
        description: "균형 잡힌 서사 · 대사와 행동 중심의 선명한 전개",
        badge: "균형",
      },
    ],
  )
  assert.equal(JSON.stringify(CHAT_MODELS).includes("언셰이프"), false)
})

test("reply credit costs follow provider price order within the 20 to 110 range", () => {
  assert.equal(Math.min(...CHAT_MODELS.map((model) => model.creditCostPerReply)), MIN_REPLY_CREDIT_COST)
  assert.equal(Math.max(...CHAT_MODELS.map((model) => model.creditCostPerReply)), MAX_REPLY_CREDIT_COST)
  assert.deepEqual(REPLY_CREDIT_COSTS, {
    gemini25Flash: 20,
    gemini25Pro: 65,
    gpt4oMini: 20,
    gpt56Terra: 110,
    gemini3Flash: 25,
    commandRPlus: 95,
  })
  assert.ok(REPLY_CREDIT_COSTS.gemini3Flash < REPLY_CREDIT_COSTS.gemini25Pro)
  assert.ok(REPLY_CREDIT_COSTS.gemini25Pro < REPLY_CREDIT_COSTS.commandRPlus)
  assert.ok(REPLY_CREDIT_COSTS.commandRPlus < REPLY_CREDIT_COSTS.gpt56Terra)
  assert.deepEqual(
    CHAT_MODELS.map((model) => model.creditCostPerReply),
    [...CHAT_MODELS]
      .sort((left, right) => left.creditCostPerReply - right.creditCostPerReply)
      .map((model) => model.creditCostPerReply),
  )
})

test("GPT-5.6 uses reasoning-compatible Chat Completions parameters", () => {
  const request = buildOpenAIChatCompletionRequest({
    modelName: "gpt-5.6-terra",
    messages: [{ role: "user", content: "다음 장면을 이어줘." }],
    maxOutputTokens: 4000,
    temperature: 0.9,
    topP: 0.9,
  })

  assert.equal(request.model, "gpt-5.6-terra")
  assert.equal(request.temperature, 0.9)
  assert.equal(request.top_p, 0.9)
  assert.equal(request.reasoning_effort, "none")
  assert.equal(request.max_completion_tokens, 4000)
  assert.equal("max_tokens" in request, false)
})

test("legacy OpenAI models keep sampling and max_tokens parameters", () => {
  const request = buildOpenAIChatCompletionRequest({
    modelName: "gpt-4o-mini",
    messages: [{ role: "user", content: "안녕" }],
    maxOutputTokens: 4000,
    temperature: 0.75,
    topP: 0.9,
  })

  assert.equal(request.model, "gpt-4o-mini")
  assert.equal(request.temperature, 0.75)
  assert.equal(request.top_p, 0.9)
  assert.equal(request.max_tokens, 4000)
  assert.equal("reasoning_effort" in request, false)
  assert.equal("max_completion_tokens" in request, false)
})
