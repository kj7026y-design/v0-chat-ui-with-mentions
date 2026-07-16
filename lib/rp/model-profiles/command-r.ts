import type { RoleplayModelProfile } from "./types"
import { DEFAULT_MAX_ANSWER_CHARS, DEFAULT_MIN_ANSWER_CHARS } from "@/lib/chat-models"

export const commandRRpProfile: RoleplayModelProfile = {
  id: "command-r-plus-rp",
  provider: "openrouter",
  modelName: process.env.OPENROUTER_UNSHAPED2_MODEL || "cohere/command-r-plus-08-2024",
  temperature: 0.6,
  topP: 0.9,
  maxOutputTokens: 4000,
  promptStyle: "korean-clean-direct",
  outputMode: "novel",
  targetChars: { min: DEFAULT_MIN_ANSWER_CHARS, max: DEFAULT_MAX_ANSWER_CHARS },
  maxDialogues: 2,
  validationSensitivity: {
    brokenDialogueQuotes: "repairable",
    tooManyDialogues: "repairable",
    overPhysical: "hard",
    metaLeak: "hard",
    internalTokenLeak: "hard",
    foreignScriptLeak: "hard",
    unpromptedHandFocus: "soft",
    objectiveUserStateAssertion: "hard",
    userControlByNarration: "hard",
    controlsUser: "hard",
    contractClosureBias: "repairable",
    futureClosure: "repairable",
    responseMissedUserIntent: "repairable",
    lowContentDensity: "repairable",
    excessiveAbstractMood: "repairable",
    characterVoiceWeak: "repairable",
    tooShort: "repairable",
    tooLong: "soft",
  },
  repair: {
    maxAttempts: 1,
    acceptRepairableAfterAttempt: true,
  },
  fallback: {
    providerOrder: ["same", "local"],
    allowLocalFallback: false,
  },
}
