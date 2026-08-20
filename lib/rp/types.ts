import type { ChatModelId, ChatModelMode } from "@/lib/chat-models"
import type { SceneStateSnapshot } from "@/lib/context-window"

// ---------- API request contract ----------
export interface ChatRequestBody {
  mode?: ChatModelMode
  modelId?: ChatModelId
  roleplayEnabled?: boolean
  redZoneEnabled?: boolean
  responseMimeType?: "application/json"
  stream?: boolean
  roomId?: string
  userMessageId?: string
  userMessageContent?: string
  userMessageTimestamp?: string
  characterMessageId?: string
  regenerationAvoidContent?: string
  retryAttempt?: boolean
  previousAssistantContent?: string
  autoAdvance?: boolean
  autoAdvanceDirective?: string
  bypassRoleplayRules?: boolean
  debugRawRoleplayStream?: boolean
  answerLength?: {
    minChars?: number
    maxChars?: number
    dialogueAssistChars?: number
    totalMaxChars?: number
  }
  firstMessage?: string
  messages?: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }>
  systemPrompt?: string
  fallbackPrompt?: string
  characterName?: string
  userName?: string
  background?: string
  characterSetting?: string
  userSetting?: string
  currentScene?: string
  latestUserIntent?: string
  comedicPacing?: boolean
  sceneState?: SceneStateSnapshot
  statusPanel?: {
    visible?: boolean
    text?: string
  }
  opening?: {
    title?: string
    scene?: string
    firstMessage?: string
  }
}

export type DynamicPromptContext = Pick<
  ChatRequestBody,
  "characterName" | "userName" | "background" | "characterSetting" | "userSetting" | "currentScene" | "latestUserIntent" | "comedicPacing" | "sceneState"
>

// ---------- Normalized turn contract ----------
export type UserInputKind = "dialogue" | "action" | "dialogue_action" | "intent_summary" | "ooc_instruction" | "character_line"
export type SceneEscalation = "none" | "verbal" | "romantic" | "physical"
export type FlirtChannel = "dialogue" | "power_play" | "proximity" | "touch"
export type NormalizedInputType = "dialogue" | "action" | "summary" | "mixed" | "auto_advance"
export type NormalizedContactLevel = "none" | "near" | "touch"

export interface NormalizedUserInput {
  inputType: NormalizedInputType
  actor: string
  action: string | null
  dialogue: string | null
  intent: string
  contactLevel: NormalizedContactLevel
  tone: string
}

export interface ParsedUserInput {
  kind: UserInputKind
  raw: string
  actor: string
  dialogue?: string
  action?: string
  intent: string
  physicalContactRequested: boolean
  physicalContactPermitted: boolean
  proximityRequested: boolean
  asksOtherToAct: boolean
  contactLevel: NormalizedContactLevel
  sceneEscalation: SceneEscalation
  flirtChannel: FlirtChannel
}

export interface TurnPolicy {
  escalation: SceneEscalation
  flirtChannel: FlirtChannel
  allowPhysicalContact: boolean
  autoAdvance: boolean
  guidedAutoAdvance: boolean
  continuesExistingPhysicalContact: boolean
  allowNewProps: boolean
  minChars: number
  maxChars: number
  paragraphCount: string
  comedicPacing: boolean
  allowedActions: string[]
  bannedActions: string[]
}

// ---------- Compiled RP contract ----------
export interface CompiledRoleplayContext {
  characterName: string
  userName: string
  worldBrief: string
  characterBrief: string
  userBrief: string
  currentSceneBrief: string
  sceneStateBrief: string
  latestInput: ParsedUserInput
  turnPolicy: TurnPolicy
  allowedProps: string[]
  responseGoal: string
  toneRules: string[]
  bannedThisTurn: string[]
  serviceRequestBlocked: boolean
  readonly promptInjectionReasons: readonly string[]
  readonly requestedSecurityMarkers: readonly string[]
  readonly protectedPromptTexts: readonly string[]
  readonly promptCanary: string
  autoAdvanceContinuityState: string[]
  recentSceneContinuity: string
  preferExtendedDialogue: boolean
  autoAdvanceDirective: string
  recentAssistantOpenings: string[]
  avoidCharacterNameOpening: boolean
  regenerationAvoidContent: string
  previousAssistantContent: string
  mentionTargets: string[]
  redZoneEnabled: boolean
}
