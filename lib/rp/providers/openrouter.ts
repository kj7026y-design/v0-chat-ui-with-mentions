import type { ChatMessages } from "./types"
import type { RoleplayModelProfile } from "@/lib/rp/model-profiles"

export function buildOpenRouterRoleplayRequest({
  profile,
  messages,
  baseParams,
  stop,
}: {
  profile: RoleplayModelProfile
  messages: ChatMessages
  baseParams: Record<string, unknown>
  stop: string[]
}) {
  return {
    model: profile.modelName,
    messages,
    ...baseParams,
    temperature: profile.temperature,
    top_p: profile.topP,
    max_tokens: profile.maxOutputTokens,
    stop,
  }
}
