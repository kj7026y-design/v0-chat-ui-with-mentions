/** Shared data shapes used by the prompt-security boundary. */
export type PromptSecurityMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type PromptInjectionAssessment = {
  blocked: boolean
  reasons: string[]
  requestedMarkers: string[]
  riskyMessageIndexes: number[]
}

export type ProtectedPromptLeakOptions = {
  requestedMarkers?: string[]
  protectedTexts?: string[]
  canary?: string
}
