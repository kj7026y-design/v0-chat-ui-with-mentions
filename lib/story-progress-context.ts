import type { StoryChapter, StoryProgressSettings } from "@/lib/storychat-storage"

export interface ChatStoryStatusContext {
  useChapters: boolean
  currentChapterId?: string
  currentChapterTitle?: string
  chapterProgress?: number
  currentMission?: string
  currentGoal?: string
  characterEmotion?: string
  personaEmotion?: string
  nextEventCondition?: string
}

export interface StoryProgressAiContext {
  useChapters: boolean
  currentChapter?: StoryChapter
  chapterProgress?: number
  currentMission?: string
  currentGoal?: string
  characterEmotion?: string
  personaEmotion?: string
  nextEventCondition?: string
}

export function buildStoryProgressAiContext(
  settings: StoryProgressSettings | undefined,
  status: ChatStoryStatusContext,
): StoryProgressAiContext {
  if (!settings?.useChapters || !status.useChapters) {
    return { useChapters: false }
  }

  const currentChapter =
    settings.chapters.find((chapter) => chapter.id === status.currentChapterId) ??
    settings.chapters.find((chapter) => chapter.title === status.currentChapterTitle) ??
    settings.chapters[0]

  return {
    useChapters: true,
    currentChapter,
    chapterProgress: status.chapterProgress,
    currentMission: status.currentMission ?? currentChapter?.mission,
    currentGoal: status.currentGoal ?? currentChapter?.goal,
    characterEmotion: status.characterEmotion,
    personaEmotion: status.personaEmotion,
    nextEventCondition: status.nextEventCondition ?? currentChapter?.nextChapterCondition,
  }
}
