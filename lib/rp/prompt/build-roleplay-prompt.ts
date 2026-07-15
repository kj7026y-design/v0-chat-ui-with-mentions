import type { RoleplayModelProfile } from "@/lib/rp/model-profiles"

export { generateDynamicPrompt } from "@/lib/rp/pipeline"

export type RoleplayPromptBuildOptions = {
  characterName: string
  userName: string
  profile: RoleplayModelProfile
}
