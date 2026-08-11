import assert from "node:assert/strict"
import test from "node:test"
import {
  STORYCHAT_CHAT_PERSONAS_KEY,
  getChatPersonaId,
  resolveChatPersonaSelection,
  saveChatPersonaId,
} from "../lib/storychat-storage"

function createLocalStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

test("chat persona selections are stored independently for each chat", () => {
  const originalWindow = globalThis.window
  const localStorage = createLocalStorage()
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage, dispatchEvent: () => true },
  })

  try {
    saveChatPersonaId("work-a", "persona-a")
    saveChatPersonaId("work-b", "persona-b")

    assert.equal(getChatPersonaId("work-a"), "persona-a")
    assert.equal(getChatPersonaId("work-b"), "persona-b")
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    })
  }
})

test("saving a chat persona recovers from malformed stored data", () => {
  const originalWindow = globalThis.window
  const localStorage = createLocalStorage()
  localStorage.setItem(STORYCHAT_CHAT_PERSONAS_KEY, "not-json")
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage, dispatchEvent: () => true },
  })

  try {
    assert.equal(getChatPersonaId("work-a"), "")
    saveChatPersonaId("work-a", "persona-a")
    assert.equal(getChatPersonaId("work-a"), "persona-a")
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    })
  }
})

test("an existing chat inherits the work persona when no chat selection was stored", () => {
  assert.deepEqual(resolveChatPersonaSelection({
    persistedPersonaId: "",
    workPersonaId: "author-persona",
    defaultPersonaId: "default-persona",
    availablePersonaIds: ["author-persona", "default-persona"],
    hasExistingConversation: true,
  }), {
    personaId: "author-persona",
    inherited: true,
  })
})

test("a new chat without a stored selection still requests persona selection", () => {
  assert.deepEqual(resolveChatPersonaSelection({
    persistedPersonaId: "",
    workPersonaId: "author-persona",
    defaultPersonaId: "default-persona",
    availablePersonaIds: ["author-persona", "default-persona"],
    hasExistingConversation: false,
  }), {
    personaId: "",
    inherited: false,
  })
})
