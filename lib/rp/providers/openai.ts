import type { ChatMessages } from "./types"
import type { RoleplayModelProfile } from "@/lib/rp/model-profiles"

export function buildOpenAIRoleplayRequest(profile: RoleplayModelProfile, messages: ChatMessages) {
  return {
    model: profile.modelName,
    messages,
    temperature: profile.temperature,
    top_p: profile.topP,
    max_tokens: profile.maxOutputTokens,
  }
}
