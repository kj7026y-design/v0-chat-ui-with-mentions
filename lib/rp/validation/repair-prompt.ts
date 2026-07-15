import type { ValidationFailureKey } from "@/lib/rp/model-profiles"

export { buildRepairPrompt } from "@/lib/rp/pipeline"

export type RepairPromptInput = {
  failures: ValidationFailureKey[]
  maxChars: number
}
