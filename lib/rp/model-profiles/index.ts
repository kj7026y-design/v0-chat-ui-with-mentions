import type { ChatModelConfig } from "@/lib/chat-models"
import { commandRRpProfile } from "./command-r"
import { freeRpProfile } from "./free"
import { geminiFlashRpProfile, geminiProUnshapedProfile } from "./gemini"
import { openaiRpProfile } from "./openai"
import type { RoleplayModelProfile } from "./types"

export type { RoleplayModelProfile, ValidationFailureKey, ValidationSeverity } from "./types"

function withModelOutputLimit(
  profile: RoleplayModelProfile,
  model: ChatModelConfig,
  modelName: string,
): RoleplayModelProfile {
  return {
    ...profile,
    modelName,
    maxOutputTokens: model.maxTokens ?? profile.maxOutputTokens,
  }
}

export function getRoleplayModelProfile(model: ChatModelConfig): RoleplayModelProfile {
  if (model.provider === "openai") return openaiRpProfile
  if (model.provider === "gemini") {
    const modelName = model.id === "gemini-3-flash-rp"
      ? process.env.GEMINI_RP_MODEL || model.providerModel || geminiFlashRpProfile.modelName
      : model.mode === "premium"
        ? process.env.GEMINI_PREMIUM_MODEL || model.providerModel || "gemini-2.5-pro"
        : process.env.GEMINI_NORMAL_MODEL || model.providerModel || "gemini-2.5-flash"

    if (model.id === "gemini-3-flash-rp") {
      return withModelOutputLimit(geminiFlashRpProfile, model, modelName)
    }
    if (model.id === "gemini-pro") {
      return withModelOutputLimit(geminiProUnshapedProfile, model, modelName)
    }
    return withModelOutputLimit(geminiFlashRpProfile, model, modelName)
  }
  if (model.provider === "openrouter") {
    const modelName = process.env.OPENROUTER_UNSHAPED2_MODEL || model.openRouterModel || commandRRpProfile.modelName
    if (modelName.includes("gemini")) {
      return withModelOutputLimit(geminiFlashRpProfile, model, modelName)
    }
    return withModelOutputLimit(commandRRpProfile, model, modelName)
  }

  return freeRpProfile
}
