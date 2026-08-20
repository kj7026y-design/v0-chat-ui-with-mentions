import type { SceneStateSnapshot } from "@/lib/context-window"
import { sanitizeUntrustedPromptField } from "@/lib/prompt-security"

export interface RoleplayPromptContextInput {
  characterName?: string
  userName?: string
  background?: string
  characterSetting?: string
  userSetting?: string
  currentScene?: string
  latestUserIntent?: string
  comedicPacing?: boolean
  sceneState?: SceneStateSnapshot
}

export interface SanitizedRoleplayPromptContext {
  characterName: string
  userName: string
  background: string
  characterSetting: string
  userSetting: string
  currentScene: string
  latestUserIntent: string
  comedicPacing: boolean
  sceneState?: Required<SceneStateSnapshot>
}

function sanitizeRoleplayDisplayName(value: string | undefined) {
  return sanitizeUntrustedPromptField(value, 80)
    .replace(/[^\p{L}\p{N}\s._'·-]/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 80)
}

/**
 * Applies one set of field limits everywhere RP context enters the pipeline.
 * Security assessment still runs on the raw request before these values are
 * used, so an empty result means the field was missing or quarantined.
 */
export function sanitizeRoleplayPromptContext(
  input: RoleplayPromptContextInput,
): SanitizedRoleplayPromptContext {
  return {
    // Names are the only user-originated values referenced by static prompt
    // grammar, so restrict them to display-name characters after assessment.
    characterName: sanitizeRoleplayDisplayName(input.characterName),
    userName: sanitizeRoleplayDisplayName(input.userName),
    background: sanitizeUntrustedPromptField(input.background),
    characterSetting: sanitizeUntrustedPromptField(input.characterSetting),
    userSetting: sanitizeUntrustedPromptField(input.userSetting),
    currentScene: sanitizeUntrustedPromptField(input.currentScene, 2_000),
    latestUserIntent: sanitizeUntrustedPromptField(input.latestUserIntent, 2_000),
    comedicPacing: input.comedicPacing === true,
    sceneState: input.sceneState ? {
      location: sanitizeUntrustedPromptField(input.sceneState.location, 300),
      time: sanitizeUntrustedPromptField(input.sceneState.time, 300),
      mood: sanitizeUntrustedPromptField(input.sceneState.mood, 500),
      contractMeaning: sanitizeUntrustedPromptField(input.sceneState.contractMeaning, 1_000),
    } : undefined,
  }
}

/** Stable serialization used by the user-role story-data envelope. */
export function serializeRoleplaySceneState(sceneState?: Required<SceneStateSnapshot>) {
  return sceneState ? JSON.stringify(sceneState) : ""
}
