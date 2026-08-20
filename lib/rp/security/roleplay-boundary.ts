import {
  assessConversationPromptInjection,
  filterPromptInjectionMessages,
  type PromptInjectionAssessment,
  type PromptSecurityMessage,
} from "@/lib/prompt-security"
import type { RoleplayPromptContextInput } from "./prompt-context"
import {
  extractRequestedSecurityMarkers,
  isBlockedServiceInformationRequest,
} from "./service-information"

export interface RoleplayPromptSecurityInput<T extends PromptSecurityMessage> {
  promptContext: RoleplayPromptContextInput
  messages: T[]
  autoAdvanceDirective?: string
  regenerationAvoidContent?: string
  previousAssistantContent?: string
}

export interface RoleplayPromptSecuritySnapshot<T extends PromptSecurityMessage> {
  assessment: PromptInjectionAssessment
  safeMessages: T[]
  serviceInformationBlocked: boolean
  requestedSecurityMarkers: string[]
}

/**
 * Produces one reusable decision from raw RP inputs. AI normalization and prompt
 * construction must consume this snapshot instead of independently rescanning.
 */
export function prepareRoleplayPromptSecurity<T extends PromptSecurityMessage>({
  promptContext,
  messages,
  autoAdvanceDirective = "",
  regenerationAvoidContent = "",
  previousAssistantContent = "",
}: RoleplayPromptSecurityInput<T>): RoleplayPromptSecuritySnapshot<T> {
  const sceneState = promptContext.sceneState
  const additionalInputs = [
    autoAdvanceDirective,
    regenerationAvoidContent,
    previousAssistantContent,
    promptContext.characterName || "",
    promptContext.userName || "",
    promptContext.background || "",
    promptContext.characterSetting || "",
    promptContext.userSetting || "",
    promptContext.currentScene || "",
    promptContext.latestUserIntent || "",
    sceneState?.location || "",
    sceneState?.time || "",
    sceneState?.mood || "",
    sceneState?.contractMeaning || "",
  ]
  const assessment = assessConversationPromptInjection(messages, additionalInputs)
  const conversationInputs = messages
    .filter((message) => message.role !== "system")
    .map((message) => message.content)
  const serviceInformationInputs = [
    ...conversationInputs,
    ...additionalInputs,
  ].filter((value) => value.trim())
  const combinedServiceInformationInput = serviceInformationInputs.join("\n[untrusted-boundary]\n")

  return {
    assessment,
    safeMessages: filterPromptInjectionMessages(messages, assessment),
    serviceInformationBlocked:
      serviceInformationInputs.some(isBlockedServiceInformationRequest) ||
      (serviceInformationInputs.length > 1 && isBlockedServiceInformationRequest(combinedServiceInformationInput)),
    requestedSecurityMarkers: [...new Set(
      serviceInformationInputs.flatMap(extractRequestedSecurityMarkers),
    )],
  }
}
