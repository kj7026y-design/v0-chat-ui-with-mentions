import { ThinkingLevel } from "@google/genai"
import type { RoleplayModelProfile } from "@/lib/rp/model-profiles"

type GeminiSafetySettings = Array<Record<string, unknown>>

function allowsThinkingDisabled(modelName: string) {
  const normalized = modelName.toLowerCase()
  return normalized.startsWith("gemini-2.5-flash")
}

function usesThinkingLevel(modelName: string) {
  return modelName.toLowerCase().startsWith("gemini-3")
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
    : usesThinkingLevel(profile.modelName)
      ? { thinkingLevel: ThinkingLevel.MINIMAL, includeThoughts: false }
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
