/**
 * Stable facade for the prompt-security boundary. Callers import this file;
 * detector internals stay private so implementation changes do not spread.
 */
export {
  assessConversationPromptInjection,
  demoteUntrustedAssistantMessages,
  filterPromptInjectionMessages,
  formatUntrustedPromptData,
  looksLikePromptLeakOrCompliance,
  projectUntrustedPromptMessages,
  sanitizeUntrustedPromptField,
} from "./prompt-security/conversation-boundary"
export { assessPromptInjection } from "./prompt-security/injection-detector"
export { canonicalizePromptSecurityText } from "./prompt-security/normalization"
export { containsProtectedPromptLeak } from "./prompt-security/output-leak-detector"
export {
  preparePlainChatBoundary,
  type PlainChatBoundaryInput,
} from "./prompt-security/plain-chat-boundary"
export {
  PROMPT_SECURITY_SAFE_FALLBACK,
  SERVICE_INFO_PROTECTION_PROMPT,
  buildServiceProtectionSection,
  createPromptCanary,
} from "./prompt-security/policy"
export type {
  PromptInjectionAssessment,
  PromptSecurityMessage,
  ProtectedPromptLeakOptions,
} from "./prompt-security/types"
