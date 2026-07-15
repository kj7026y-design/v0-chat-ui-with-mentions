import type { RoleplayModelProfile, ValidationFailureKey, ValidationSeverity } from "@/lib/rp/model-profiles"

export type AiQualityJudgeKey =
  | "objectiveUserStateAssertion"
  | "responseMissedUserIntent"
  | "lowContentDensity"
  | "excessiveAbstractMood"
  | "characterVoiceWeak"
  | "userControlByNarration"

export type AiQualityJudgeItem = {
  failed: boolean
  reason: string
  severity: Exclude<ValidationSeverity, "off">
}

export type AiQualityJudgeResult = Record<AiQualityJudgeKey, AiQualityJudgeItem>
type AiQualityJudgeSanitizeContext = {
  output: string
  userName: string
  characterName: string
}

const AI_JUDGE_KEYS: AiQualityJudgeKey[] = [
  "objectiveUserStateAssertion",
  "responseMissedUserIntent",
  "lowContentDensity",
  "excessiveAbstractMood",
  "characterVoiceWeak",
  "userControlByNarration",
]

const PASS_ITEM: AiQualityJudgeItem = {
  failed: false,
  reason: "",
  severity: "soft",
}

const EVIDENCE_REQUIRED_KEYS = new Set<AiQualityJudgeKey>([
  "objectiveUserStateAssertion",
  "userControlByNarration",
])

function hasQuotedEvidence(reason: string) {
  return /["'“”‘’「」『』]/.test(reason)
}

function normalizeEvidenceText(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function stripDialogue(value: string) {
  return value
    .replace(/"[^"]*"/g, " ")
    .replace(/“[^”]*”/g, " ")
    .replace(/「[^」]*」/g, " ")
    .replace(/『[^』]*』/g, " ")
}

function extractQuotedEvidence(reason: string) {
  const evidence: string[] = []
  const patterns = [
    /"([^"]{2,180})"/g,
    /'([^']{2,180})'/g,
    /“([^”]{2,180})”/g,
    /‘([^’]{2,180})’/g,
    /「([^」]{2,180})」/g,
    /『([^』]{2,180})』/g,
  ]

  for (const pattern of patterns) {
    for (const match of reason.matchAll(pattern)) {
      const text = match[1]?.trim()
      if (text) evidence.push(text)
    }
  }

  return [...new Set(evidence)]
}

function isEvidenceInNarration(evidence: string, output: string) {
  const normalizedEvidence = normalizeEvidenceText(evidence)
  if (!normalizedEvidence) return false
  return normalizeEvidenceText(stripDialogue(output)).includes(normalizedEvidence)
}

function isEvidenceInCharacterDialogue(evidence: string, output: string, characterName: string) {
  const normalizedEvidence = normalizeEvidenceText(evidence)
  if (!normalizedEvidence) return false

  const dialogueBlocks = [
    ...Array.from(output.matchAll(/"([^"\n]{1,500})"/gu), (match) => match[1] || ""),
    ...Array.from(output.matchAll(/“([^”\n]{1,500})”/gu), (match) => match[1] || ""),
    ...Array.from(output.matchAll(/「([^」\n]{1,500})」/gu), (match) => match[1] || ""),
    ...Array.from(output.matchAll(/『([^』\n]{1,500})』/gu), (match) => match[1] || ""),
  ].map(normalizeEvidenceText)
  if (dialogueBlocks.some((dialogue) => dialogue.includes(normalizedEvidence))) return true

  const escapedEvidence = escapeRegExp(normalizedEvidence)
  const escapedCharacterName = escapeRegExp(characterName.trim())
  return (
    new RegExp(`(?:^|\\n)\\s*["“'‘][^\\n]{0,80}${escapedEvidence}`, "u").test(output) ||
    Boolean(escapedCharacterName && new RegExp(`${escapedCharacterName}\\s*[:：][^\\n]{0,80}${escapedEvidence}`, "u").test(output))
  )
}

function hasUserReference(text: string, userName: string) {
  const name = userName.trim()
  return (
    Boolean(name && text.includes(name)) ||
    /(?:너|네|그|그녀|상대|사용자|유저)(?:는|가|의|를|에게|한테|도|와|과)?/.test(text)
  )
}

function hasFirstPersonMarker(text: string) {
  return /(?:나|내|나는|내가|나를|나에게|내게|내 안|내면|마음속)/.test(text)
}

function hasExplicitUserStatePredicate(text: string) {
  return /(느끼|생각하|여기|원하|바라|싶어|욕망|의도|속내|심리|마음|확신|결심|작정|기대하|두려|불안|긴장|흥분|당황|초조|기뻐|슬퍼|화가|후회|망설|끌리|질투|부끄러|수치|안도|만족|싫어|좋아|사랑|미워)/.test(text)
}

function hasObservableUserSurface(text: string) {
  return /(대답|말|어조|목소리|표정|눈빛|시선|태도|반응|미소|침묵|몸짓|고개)/.test(text)
}

function hasCharacterInterpretationFrame(text: string) {
  return /(듯|처럼|같|알 수 없|보이|읽|짐작|기다리|궁금|기대|바라보|살피)/.test(text)
}

function isClearObjectiveUserStateAssertion(evidence: string, ctx: AiQualityJudgeSanitizeContext) {
  if (isEvidenceInCharacterDialogue(evidence, ctx.output, ctx.characterName)) return false
  if (!isEvidenceInNarration(evidence, ctx.output)) return false
  if (!hasUserReference(evidence, ctx.userName)) return false
  if (!hasExplicitUserStatePredicate(evidence)) return false
  const escapedUserName = escapeRegExp(ctx.userName.trim())
  if (hasFirstPersonMarker(evidence) && (!escapedUserName || !new RegExp(`${escapedUserName}(?:은|는|이|가)`).test(evidence))) return false
  if (hasObservableUserSurface(evidence) && hasCharacterInterpretationFrame(evidence)) return false
  return true
}

function isClearUserControlByNarration(evidence: string, ctx: AiQualityJudgeSanitizeContext) {
  if (isEvidenceInCharacterDialogue(evidence, ctx.output, ctx.characterName)) return false
  if (!isEvidenceInNarration(evidence, ctx.output)) return false
  if (!hasUserReference(evidence, ctx.userName)) return false
  if (hasCharacterInterpretationFrame(evidence)) return false
  return /(말했|대답했|선택했|결정했|움직였|다가왔|물러났|잡았|놓았|끄덕였|웃었|울었|느꼈|생각했|원했|받아들였|거절했)/.test(evidence)
}

export function sanitizeAiQualityJudgeResult(
  result: AiQualityJudgeResult,
  ctx: AiQualityJudgeSanitizeContext,
): AiQualityJudgeResult {
  const next: AiQualityJudgeResult = {
    ...result,
    objectiveUserStateAssertion: { ...result.objectiveUserStateAssertion },
    userControlByNarration: { ...result.userControlByNarration },
  }

  const objectiveEvidence = extractQuotedEvidence(next.objectiveUserStateAssertion.reason)
  if (
    next.objectiveUserStateAssertion.failed &&
    !objectiveEvidence.some((evidence) => isClearObjectiveUserStateAssertion(evidence, ctx))
  ) {
    next.objectiveUserStateAssertion = {
      ...next.objectiveUserStateAssertion,
      failed: false,
      severity: "soft",
    }
  }

  const controlEvidence = extractQuotedEvidence(next.userControlByNarration.reason)
  if (
    next.userControlByNarration.failed &&
    !controlEvidence.some((evidence) => isClearUserControlByNarration(evidence, ctx))
  ) {
    next.userControlByNarration = {
      ...next.userControlByNarration,
      failed: false,
      severity: "soft",
    }
  }

  return next
}

export function emptyAiQualityJudgeResult(): AiQualityJudgeResult {
  return Object.fromEntries(AI_JUDGE_KEYS.map((key) => [key, { ...PASS_ITEM }])) as AiQualityJudgeResult
}

export function buildAiQualityJudgePrompt({
  output,
  characterName,
  userName,
  latestUserInput,
  userIntent,
  currentScene,
  worldSetting,
  characterSetting,
  userSetting,
  profile,
}: {
  output: string
  characterName: string
  userName: string
  latestUserInput: string
  userIntent: string
  currentScene: string
  worldSetting: string
  characterSetting: string
  userSetting: string
  profile: RoleplayModelProfile
}) {
  return `You are a strict JSON-only quality judge for Korean roleplay output.
Return ONLY a JSON object. No markdown. No explanation outside JSON.

Judge only context-sensitive quality issues. Do not judge quote balance, length, scripts, token leaks, or physical contact; those are rule-based checks.

Definitions:
- objectiveUserStateAssertion fails only when non-dialogue narration states the user's emotions, desire, intent, or mental state as omniscient objective fact.
- Never fail objectiveUserStateAssertion for claims, teasing, accusations, confidence, guesses, or mind-reading language spoken by ${characterName} in dialogue. Assertive dialogue such as saying that ${userName} does not dislike the situation is character voice, not objective narration.
- objectiveUserStateAssertion is allowed when ${characterName} reads, guesses, expects, misunderstands, or judges ${userName}'s state as the character's own interpretation.
- Do not fail objectiveUserStateAssertion merely because a sentence describes ${characterName}'s own state, reaction, tension, curiosity, desire, or decision. First-person character narration may separately violate the rule-based narrationStyleMismatch check, but it is not an objective assertion about ${userName}.
- Do not fail objectiveUserStateAssertion for observable or interpretive descriptions of ${userName}'s speech, expression, look, tone, posture, or response when framed as what ${characterName} sees or infers.
- responseMissedUserIntent fails when the response ignores or reverses the latest user input or intent.
- When ${userName} asks about a concrete subject, requests permission, or asks for a reason, the response should answer that subject first in character. Merely asking why ${userName} is curious, restating the question, or switching to a generic relationship question misses the intent unless the character/world canon explicitly requires evasiveness.
- Low-stakes, scene-plausible embellishment in character dialogue is allowed when it supports the direct answer and does not contradict context. Do not fail just because every minor observation was not explicitly written in prior messages.
- An unsupported high-impact claim that contradicts or derails the scene can fail responseMissedUserIntent as repairable. This includes invented crime, poisoning, theft intent, fixed preference, secret knowledge, or prior history absent from the supplied settings/history.
- Facts explicitly present in character, user, or world settings are canonical and allowed even if the latest user message does not repeat them.
- lowContentDensity fails when the response adds no concrete action, condition, conflict point, rejection, acceptance, or specific question.
- excessiveAbstractMood fails when abstract atmosphere or relationship commentary dominates over concrete scene action/dialogue.
- characterVoiceWeak fails when ${characterName}'s voice is generic and not a distinct in-character reaction.
- userControlByNarration fails when the response narrates new user action, speech, decision, or emotion.
- A character's spoken claim about what ${userName} did, felt, wanted, or seemed to do is not narration control by itself. Judge implausible or contradictory dialogue claims under responseMissedUserIntent instead.
- Do not fail userControlByNarration for commands, requests, threats, questions, or pressure spoken by ${characterName} inside dialogue. A quoted line telling ${userName} to choose, answer, move, stop, or decide is character dialogue, not narration control.
- Do not fail userControlByNarration for ${characterName} waiting for, watching for, expecting, or wondering about ${userName}'s reaction.

Hard-fail threshold:
- Mark objectiveUserStateAssertion or userControlByNarration as failed only when the offending phrase is explicit and appears in narration, not merely implied by the scene.
- If failed is true for either key, the reason must quote the exact offending Korean phrase and explain why it asserts or controls ${userName}, not ${characterName}. If you cannot quote an exact phrase, set failed to false.
- Ambiguous cases must pass. Prefer repairable quality warnings over hard failures unless ${userName}'s inner state/action is clearly imposed as fact.

Severity:
- hard: unsafe to show as-is because it controls the user or asserts user state/objective intent.
- repairable: quality issue that can be repaired once.
- soft: minor warning.
- responseMissedUserIntent is normally repairable. It may be hard only when the response directly contradicts supplied canonical settings or invents a major criminal, dangerous, or history-changing fact about ${userName} as settled truth.
- characterVoiceWeak should compare the response against the supplied characterSetting instead of enforcing a generic neutral voice.

Required JSON shape:
{
  "objectiveUserStateAssertion": { "failed": boolean, "reason": string, "severity": "hard" | "repairable" | "soft" },
  "responseMissedUserIntent": { "failed": boolean, "reason": string, "severity": "hard" | "repairable" | "soft" },
  "lowContentDensity": { "failed": boolean, "reason": string, "severity": "hard" | "repairable" | "soft" },
  "excessiveAbstractMood": { "failed": boolean, "reason": string, "severity": "hard" | "repairable" | "soft" },
  "characterVoiceWeak": { "failed": boolean, "reason": string, "severity": "hard" | "repairable" | "soft" },
  "userControlByNarration": { "failed": boolean, "reason": string, "severity": "hard" | "repairable" | "soft" }
}

Profile:
- promptStyle: ${profile.promptStyle}
- outputMode: ${profile.outputMode}
- targetChars: ${profile.targetChars.min}-${profile.targetChars.max}

Context:
- characterName: ${characterName}
- userName: ${userName}
- currentScene: ${currentScene || "(none)"}
- latestUserInput: ${latestUserInput || "(none)"}
- userIntent: ${userIntent || "(none)"}
- worldSetting: ${worldSetting || "(none)"}
- characterSetting: ${characterSetting || "(none)"}
- userSetting: ${userSetting || "(none)"}

Output to judge:
${output}`
}

export function parseAiQualityJudgeResult(raw: string): AiQualityJudgeResult {
  const jsonText = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()
  const parsed = JSON.parse(jsonText) as Partial<Record<AiQualityJudgeKey, Partial<AiQualityJudgeItem>>>
  const result = emptyAiQualityJudgeResult()

  for (const key of AI_JUDGE_KEYS) {
    const item = parsed[key]
    if (!item || typeof item !== "object") continue
    const severity = item.severity === "hard" || item.severity === "repairable" || item.severity === "soft"
      ? item.severity
      : result[key].severity
    const reason = typeof item.reason === "string" ? item.reason.slice(0, 240) : ""
    const failed = Boolean(item.failed) && (!EVIDENCE_REQUIRED_KEYS.has(key) || hasQuotedEvidence(reason))
    result[key] = {
      failed,
      reason,
      severity,
    }
  }

  return result
}

export function aiQualityJudgeResultToValidation(result: AiQualityJudgeResult): Partial<Record<ValidationFailureKey, boolean>> {
  return Object.fromEntries(
    AI_JUDGE_KEYS.map((key) => [key, result[key].failed]),
  ) as Partial<Record<ValidationFailureKey, boolean>>
}

export function aiQualityJudgeSeverityOverrides(result: AiQualityJudgeResult): Partial<Record<ValidationFailureKey, Exclude<ValidationSeverity, "off">>> {
  return Object.fromEntries(
    AI_JUDGE_KEYS
      .filter((key) => result[key].failed)
      .map((key) => [key, result[key].severity]),
  ) as Partial<Record<ValidationFailureKey, Exclude<ValidationSeverity, "off">>>
}
