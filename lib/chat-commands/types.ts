import type { ChatMessage } from "@/lib/chat-types"
import type { StoryCharacter, StoryPersona, StoryWork, StoryWorld } from "@/lib/storychat-storage"

export interface ImageCommandStatusContext {
  currentChapterTitle?: string
  chapterProgress?: number
  currentMission?: string
  currentGoal?: string
  worldDate?: string
  currentLocation?: string
  weather?: string
  characterName?: string
  characterEmotion?: string
  characterStatus?: string
  personaName?: string
  personaEmotion?: string
  personaStatus?: string
  nextEventCondition?: string
}

export interface ImageCommandContext {
  work?: StoryWork
  world?: StoryWorld
  character?: StoryCharacter
  persona?: StoryPersona
  status?: ImageCommandStatusContext
  recentMessages?: ChatMessage[]
  memoryMemo?: string
}
