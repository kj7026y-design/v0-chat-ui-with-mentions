import type { RoleplayModelProfile } from "@/lib/rp/model-profiles"

type GeminiSafetySettings = Array<Record<string, unknown>>

function allowsThinkingDisabled(modelName: string) {
  const normalized = modelName.toLowerCase()
  return normalized.startsWith("gemini-2.5-flash")
}

export function buildGeminiRoleplayConfig({
  profile,
  systemPrompt,
  safetySettings,
}: {
  profile: RoleplayModelProfile
  systemPrompt: string
  safetySettings: GeminiSafetySettings
}) {
  const thinkingConfig = allowsThinkingDisabled(profile.modelName)
    ? { thinkingBudget: 0 }
    : undefined

  return {
    systemInstruction: systemPrompt,
    safetySettings,
    temperature: profile.temperature,
    topP: profile.topP,
    maxOutputTokens: profile.maxOutputTokens,
    ...(thinkingConfig ? { thinkingConfig } : {}),
  }
}
