import type { RoleplayModelProfile } from "./types"
import { DEFAULT_MAX_ANSWER_CHARS, DEFAULT_MIN_ANSWER_CHARS } from "@/lib/chat-models"

export const openaiRpProfile: RoleplayModelProfile = {
  id: "openai-rp",
  provider: "openai",
  modelName: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
  temperature: 0.75,
  topP: 0.9,
  maxOutputTokens: 4000,
  promptStyle: "concise-direct",
  outputMode: "chat",
  targetChars: { min: DEFAULT_MIN_ANSWER_CHARS, max: DEFAULT_MAX_ANSWER_CHARS },
  maxDialogues: 2,
  validationSensitivity: {
    brokenDialogueQuotes: "repairable",
    tooManyDialogues: "repairable",
    overPhysical: "hard",
    metaLeak: "hard",
    internalTokenLeak: "hard",
    foreignScriptLeak: "hard",
    unpromptedHandFocus: "repairable",
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
