import type { RoleplayModelProfile } from "./types"
import { DEFAULT_MAX_ANSWER_CHARS, DEFAULT_MIN_ANSWER_CHARS } from "@/lib/chat-models"

const geminiSafetyThreshold = (process.env.GEMINI_SAFETY_THRESHOLD || "BLOCK_NONE") as NonNullable<RoleplayModelProfile["safety"]>["geminiSafetyThreshold"]

export const geminiFlashRpProfile: RoleplayModelProfile = {
  id: "gemini-flash-rp",
  provider: "gemini",
  modelName: process.env.GEMINI_RP_MODEL || "gemini-3-flash-preview",
  temperature: 0.72,
  topP: 0.9,
  maxOutputTokens: 6000,
  promptStyle: "immersive-controlled",
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
    tooLong: "repairable",
  },
  repair: {
    maxAttempts: 1,
    acceptRepairableAfterAttempt: true,
  },
  fallback: {
    providerOrder: ["same", "openrouter", "local"],
    allowLocalFallback: true,
  },
  safety: {
    geminiSafetyThreshold,
  },
}
