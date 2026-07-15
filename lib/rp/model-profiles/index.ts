import type { ChatModelConfig } from "@/lib/chat-models"
import { commandRRpProfile } from "./command-r"
import { euryaleRpProfile } from "./euryale"
import { freeRpProfile } from "./free"
import { geminiFlashRpProfile } from "./gemini"
import { openaiRpProfile } from "./openai"
import type { RoleplayModelProfile } from "./types"

export type { RoleplayModelProfile, ValidationFailureKey, ValidationSeverity } from "./types"

export function getRoleplayModelProfile(model: ChatModelConfig): RoleplayModelProfile {
  if (model.provider === "openai") return openaiRpProfile
  if (model.provider === "gemini") {
    return {
      ...geminiFlashRpProfile,
      modelName: model.id === "gemini-3-flash-rp"
        ? process.env.GEMINI_RP_MODEL || model.providerModel || geminiFlashRpProfile.modelName
        : model.mode === "premium"
          ? process.env.GEMINI_PREMIUM_MODEL || model.providerModel || "gemini-2.5-pro"
          : process.env.GEMINI_NORMAL_MODEL || model.providerModel || "gemini-2.5-flash",
    }
  }
  if (model.provider === "openrouter") {
    if (model.id === "cohere/command-r-plus-08-2024") {
      return {
        ...commandRRpProfile,
        modelName: process.env.OPENROUTER_UNSHAPED2_MODEL || model.openRouterModel || commandRRpProfile.modelName,
      }
    }

    return {
      ...euryaleRpProfile,
      modelName: process.env.OPENROUTER_UNSHAPED_MODEL || model.openRouterModel || euryaleRpProfile.modelName,
    }
  }

  return freeRpProfile
}
