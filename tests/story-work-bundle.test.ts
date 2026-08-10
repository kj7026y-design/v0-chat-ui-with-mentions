import assert from "node:assert/strict"
import test from "node:test"
import {
  buildStoryWorkBundle,
  mergeStoryWorkBundles,
} from "../lib/story-work-bundle"
import type {
  StoryCharacter,
  StoryChatLibrary,
  StoryPersona,
  StoryWork,
  StoryWorld,
} from "../lib/storychat-storage"

const character = { id: "character-1", name: "캐릭터" } as StoryCharacter
const world = { id: "world-1", name: "세계관" } as StoryWorld
const persona = { id: "persona-1", name: "자아" } as StoryPersona
const work = {
  id: "work-1",
  title: "작품",
  characterId: character.id,
  worldId: world.id,
  personaId: persona.id,
} as StoryWork

function library(overrides: Partial<StoryChatLibrary> = {}): StoryChatLibrary {
  return {
    characters: [character],
    worlds: [world],
    personas: [persona],
    works: [work],
    ...overrides,
  }
}

test("a database work bundle includes every referenced snapshot", () => {
  assert.deepEqual(buildStoryWorkBundle(library(), work), {
    work,
    characters: [character],
    world,
    persona,
  })
})

test("a work with a missing primary character or world is rejected", () => {
  assert.equal(buildStoryWorkBundle(library({ characters: [] }), work), null)
  assert.equal(buildStoryWorkBundle(library({ worlds: [] }), work), null)
  assert.equal(buildStoryWorkBundle(library({ personas: [] }), work), null)
})

test("database works replace cache entries while existing local reference edits are preserved", () => {
  const nextWork = { ...work, title: "DB 작품" }
  const nextCharacter = { ...character, name: "DB 캐릭터" }
  const merged = mergeStoryWorkBundles(library(), [{
    work: nextWork,
    characters: [nextCharacter],
    world,
    persona,
  }])

  assert.equal(merged.works.length, 1)
  assert.equal(merged.works[0].title, "DB 작품")
  assert.equal(merged.characters.length, 1)
  assert.equal(merged.characters[0].name, "캐릭터")
})
