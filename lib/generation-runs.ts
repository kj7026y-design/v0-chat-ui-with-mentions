export type GenerationRunStatus = "streaming" | "completed" | "failed"
export type GenerationValidationStatus = "passed" | "accepted_with_warnings" | "repaired" | "fallback" | "failed"
export type GenerationProviderOutcome = "empty-visible-output"
export type GenerationTimeoutStage =
  | "request"
  | "input-normalizer"
  | "gemini-initial"
  | "gemini-first-chunk"
  | "gemini-stream-idle"
  | "gemini-stream-overall"
  | "gemini-empty-retry"
  | "gemini-repair"
  | "openrouter-fallback"
  | "quality-judge"
  | "openai"
  | "pollinations"
export type GenerationValidationAttempt = {
  stage: "initial" | "repair" | "fallback" | "final"
  status: GenerationValidationStatus
  failures: string[]
  hardFailures: string[]
  repairableFailures: string[]
  softFailures: string[]
}

export type GenerationRun = {
  id: string
  roomId: string
  userMessageId: string
  characterMessageId?: string
  provider: string
  model: string
  attemptedModel?: string
  outputModel?: string
  promptVersion: string
  normalizerVersion?: string
  validatorVersion?: string
  validationStatus?: GenerationValidationStatus
  validationFailures?: string[]
  validationAttempts?: GenerationValidationAttempt[]
  repairAttempted?: boolean
  ttftMs?: number
  rawOutput?: string
  savedContent?: string
  mismatch?: boolean
  fallback?: boolean
  fallbackProvider?: string
  fallbackModel?: string
  providerOutcome?: GenerationProviderOutcome
  timeoutStage?: GenerationTimeoutStage
  status: GenerationRunStatus
  createdAt: string
  completedAt?: string
}

const GENERATION_RUNS_KEY = "storychat_generation_runs"
const MAX_GENERATION_RUNS = 80

function readGenerationRuns(): GenerationRun[] {
  if (typeof window === "undefined") return []

  try {
    const parsed = JSON.parse(window.localStorage.getItem(GENERATION_RUNS_KEY) || "[]") as GenerationRun[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getGenerationRuns(roomId?: string) {
  const runs = readGenerationRuns()
  return roomId ? runs.filter((run) => run.roomId === roomId) : runs
}

export function saveGenerationRun(run: GenerationRun) {
  if (typeof window === "undefined") return

  const runs = readGenerationRuns().filter((item) => item.id !== run.id)
  const nextRuns = [run, ...runs].slice(0, MAX_GENERATION_RUNS)
  window.localStorage.setItem(GENERATION_RUNS_KEY, JSON.stringify(nextRuns))
}
