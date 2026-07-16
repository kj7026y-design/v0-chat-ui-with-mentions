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

function requiresThinkingBudget(modelName: string) {
  return modelName.toLowerCase().startsWith("gemini-2.5-pro")
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
    ? { thinkingBudget: 0, includeThoughts: false }
    : usesThinkingLevel(profile.modelName)
      ? { thinkingLevel: ThinkingLevel.MINIMAL, includeThoughts: false }
      : requiresThinkingBudget(profile.modelName)
        ? { thinkingBudget: 128, includeThoughts: false }
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
