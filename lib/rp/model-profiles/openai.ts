import type { RoleplayModelProfile } from "./types"
import { DEFAULT_MAX_ANSWER_CHARS, DEFAULT_MIN_ANSWER_CHARS } from "@/lib/chat-models"

const sharedOpenAIRpSettings = {
  provider: "openai",
  temperature: 0.75,
  topP: 0.9,
  maxOutputTokens: 4000,
  promptStyle: "concise-direct",
  outputMode: "chat",
  targetChars: { min: DEFAULT_MIN_ANSWER_CHARS, max: DEFAULT_MAX_ANSWER_CHARS },
  minDialogues: 2,
  preferredDialogues: 3,
  maxDialogues: 4,
  validationSensitivity: {
    brokenDialogueQuotes: "repairable",
    tooFewDialogues: "repairable",
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
    // A deterministic scene-level regression is unsafe to return. Semantic
    // judge findings can still override this to repairable per finding.
    responseMissedUserIntent: "hard",
    lowContentDensity: "repairable",
    excessiveAbstractMood: "repairable",
    characterVoiceWeak: "repairable",
    // A material undershoot gets one model repair. Near-boundary responses are
    // accepted by the OpenAI-specific length tolerance in the validator.
    tooShort: "repairable",
    tooLong: "repairable",
    // Repeated scene beats get one repair pass; they remain non-terminal after
    // that bounded attempt so they cannot create an endless repair loop.
    previousResponseDuplicate: "repairable",
    regenerationDuplicate: "soft",
    incompleteEnding: "repairable",
  },
  repair: {
    maxAttempts: 1,
    acceptRepairableAfterAttempt: true,
  },
  fallback: {
    providerOrder: ["same", "local"],
    allowLocalFallback: false,
  },
} satisfies Omit<RoleplayModelProfile, "id" | "modelName">

export const openaiRpProfile: RoleplayModelProfile = {
  id: "openai-rp",
  modelName: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
  ...sharedOpenAIRpSettings,
}

export const openaiTerraRpProfile: RoleplayModelProfile = {
  id: "openai-gpt-5.6-terra-rp",
  modelName: process.env.OPENAI_TERRA_MODEL || "gpt-5.6-terra",
  ...sharedOpenAIRpSettings,
}
