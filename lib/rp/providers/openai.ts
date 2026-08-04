import type { ChatMessages } from "./types"
import type { RoleplayModelProfile } from "@/lib/rp/model-profiles"

interface OpenAIChatCompletionRequestOptions {
  modelName: string
  messages: ChatMessages
  maxOutputTokens: number
  temperature?: number
  topP?: number
  responseMimeType?: "application/json"
}

export interface OpenAIChatCompletionRequest {
  model: string
  messages: ChatMessages
  response_format?: { type: "json_object" }
  temperature?: number
  top_p?: number
  max_tokens?: number
  reasoning_effort?: "none"
  max_completion_tokens?: number
}

export function buildOpenAIChatCompletionRequest({
  modelName,
  messages,
  maxOutputTokens,
  temperature,
  topP,
  responseMimeType,
}: OpenAIChatCompletionRequestOptions): OpenAIChatCompletionRequest {
  const common = {
    model: modelName,
    messages,
    ...(responseMimeType ? { response_format: { type: "json_object" as const } } : {}),
  }

  if (/^gpt-5\.6(?:-|$)/u.test(modelName)) {
    return {
      ...common,
      temperature,
      top_p: topP,
      reasoning_effort: "none" as const,
      max_completion_tokens: maxOutputTokens,
    }
  }

  return {
    ...common,
    temperature,
    top_p: topP,
    max_tokens: maxOutputTokens,
  }
}

export function buildOpenAIRoleplayRequest(profile: RoleplayModelProfile, messages: ChatMessages) {
  return buildOpenAIChatCompletionRequest({
    modelName: profile.modelName,
    messages,
    temperature: profile.temperature,
    topP: profile.topP,
    maxOutputTokens: profile.maxOutputTokens,
  })
}
