import type { RoleplayModelProfile, ValidationFailureKey, ValidationSeverity } from "@/lib/rp/model-profiles"

export const DEFAULT_VALIDATION_SEVERITY: Partial<Record<ValidationFailureKey, ValidationSeverity>> = {
  brokenDialogueQuotes: "repairable",
  tooManyDialogues: "repairable",
  internalTokenLeak: "hard",
  overPhysical: "hard",
  foreignScriptLeak: "hard",
  metaLeak: "hard",
  unpromptedHandFocus: "repairable",
  narrationStyleMismatch: "repairable",
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
}

export type ClassifiedValidationFailures = {
  hard: string[]
  repairable: string[]
  soft: string[]
}

export function classifyValidationErrors(
  errors: Record<string, boolean>,
  profile: RoleplayModelProfile,
  severityOverrides: Partial<Record<ValidationFailureKey, ValidationSeverity>> = {},
): ClassifiedValidationFailures {
  const hard: string[] = []
  const repairable: string[] = []
  const soft: string[] = []

  for (const [key, failed] of Object.entries(errors)) {
    if (!failed) continue

    const failureKey = key as ValidationFailureKey
    const severity = severityOverrides[failureKey] ?? profile.validationSensitivity[failureKey] ?? DEFAULT_VALIDATION_SEVERITY[failureKey] ?? "repairable"

    if (severity === "off") continue
    if (severity === "hard") hard.push(key)
    if (severity === "repairable") repairable.push(key)
    if (severity === "soft") soft.push(key)
  }

  return { hard, repairable, soft }
}

export function hasClassifiedFailures(classified: ClassifiedValidationFailures) {
  return classified.hard.length > 0 || classified.repairable.length > 0
}
