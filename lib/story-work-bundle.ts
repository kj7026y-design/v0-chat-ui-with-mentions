import {
  isStoryWorkRedZoneEnabled,
  type StoryCharacter,
  type StoryChatLibrary,
  type StoryPersona,
  type StoryWork,
  type StoryWorld,
} from "@/lib/storychat-storage"

export interface StoryWorkBundle {
  work: StoryWork
  characters: StoryCharacter[]
  world: StoryWorld
  persona?: StoryPersona
}

export function buildStoryWorkBundle(
  library: StoryChatLibrary,
  work: StoryWork,
): StoryWorkBundle | null {
  const characterIds = new Set(
    [work.characterId, work.defaultCharacterId].filter((id): id is string => Boolean(id)),
  )
  const characters = library.characters.filter((character) => characterIds.has(character.id))
  const world = library.worlds.find((item) => item.id === work.worldId)
  if (!world || !characters.some((character) => character.id === work.characterId)) return null

  const persona = work.personaId
    ? library.personas.find((item) => item.id === work.personaId)
    : undefined
  if (work.personaId && !persona) return null

  return { work, characters, world, persona }
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const incomingIds = new Set(incoming.map((item) => item.id))
  return [...incoming, ...current.filter((item) => !incomingIds.has(item.id))]
}

function appendMissingById<T extends { id: string }>(current: T[], incoming: T[]) {
  const currentIds = new Set(current.map((item) => item.id))
  return [...current, ...incoming.filter((item) => !currentIds.has(item.id))]
}

export function mergeStoryWorkBundles(
  library: StoryChatLibrary,
  bundles: StoryWorkBundle[],
): StoryChatLibrary {
  return {
    characters: appendMissingById(library.characters, bundles.flatMap((bundle) => bundle.characters)),
    worlds: appendMissingById(library.worlds, bundles.map((bundle) => bundle.world)),
    personas: appendMissingById(
      library.personas,
      bundles.flatMap((bundle) => bundle.persona ? [bundle.persona] : []),
    ),
    works: mergeById(
      library.works,
      bundles.map((bundle) => ({
        ...bundle.work,
        redZoneEnabled: isStoryWorkRedZoneEnabled(bundle.work),
      })),
    ),
  }
}
