import assert from "node:assert/strict"
import test from "node:test"
import { getChatModelConfig, normalizeChatModelId } from "../lib/chat-models"
import { getRoleplayModelProfile } from "../lib/rp/model-profiles"
import { buildOpenAIChatCompletionRequest } from "../lib/rp/providers"

test("GPT-5.6 Terra is a selectable OpenAI chat model", () => {
  assert.equal(normalizeChatModelId("openai-gpt-5.6-terra"), "openai-gpt-5.6-terra")

  const model = getChatModelConfig("openai-gpt-5.6-terra")
  assert.equal(model.provider, "openai")
  assert.equal(model.providerModel, "gpt-5.6-terra")
  assert.equal(model.label, "OpenAI GPT-5.6 Terra")
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
