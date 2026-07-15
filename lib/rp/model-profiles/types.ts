import type { ChatModelProvider } from "@/lib/chat-models"

export type RoleplayProvider = Extract<ChatModelProvider, "openai" | "gemini" | "openrouter"> | "free"

export type ValidationFailureKey =
  | "brokenDialogueQuotes"
  | "tooManyDialogues"
  | "objectiveUserStateAssertion"
  | "responseMissedUserIntent"
  | "lowContentDensity"
  | "excessiveAbstractMood"
  | "characterVoiceWeak"
  | "userControlByNarration"
  | "controlsUser"
  | "contractClosureBias"
  | "futureClosure"
  | "internalTokenLeak"
  | "overPhysical"
  | "tooLong"
  | "foreignScriptLeak"
  | "metaLeak"
  | "unpromptedHandFocus"
  | "narrationStyleMismatch"

export type ValidationSeverity = "hard" | "repairable" | "soft" | "off"

export type RoleplayModelProfile = {
  id: string
  provider: RoleplayProvider
  modelName: string
  temperature: number
  topP?: number
  maxOutputTokens: number
  promptStyle: "concise-direct" | "immersive-controlled" | "korean-clean-direct" | "unfiltered-novel"
  outputMode: "chat" | "novel" | "inner_monologue"
  targetChars: {
    min: number
    max: number
  }
  maxDialogues: number
  validationSensitivity: Partial<Record<ValidationFailureKey, ValidationSeverity>>
  repair: {
    maxAttempts: number
    acceptRepairableAfterAttempt: boolean
  }
  fallback: {
    providerOrder: Array<"same" | "openrouter" | "local">
    allowLocalFallback: boolean
  }
  safety?: {
    geminiSafetyThreshold?: "OFF" | "BLOCK_NONE" | "BLOCK_ONLY_HIGH" | "BLOCK_MEDIUM_AND_ABOVE"
  }
}
