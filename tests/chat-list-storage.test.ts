import assert from "node:assert/strict"
import test from "node:test"
import {
  type ChatListItemData,
  reconcileChatListWithStoryWorks,
  upsertChatListItem,
} from "../lib/chat-list-storage"
import { deleteChatRoom } from "../lib/chat-room-client"
import { defaultLibrary } from "../lib/storychat-storage"

const existingChat = (overrides: Partial<ChatListItemData> = {}): ChatListItemData => ({
  id: "existing",
  characterName: "기존 캐릭터",
  characterEmoji: "🙂",
  roomName: "사용자 지정 방 이름",
  lastMessage: "기존 메시지",
  timestamp: new Date("2026-08-10T10:00:00+09:00"),
  unreadCount: 3,
  ...overrides,
})

test("upsertChatListItem creates a missing work chat", () => {
  const chats = upsertChatListItem([], {
    id: "w10",
    characterName: "김버그",
    characterEmoji: "💻",
    lastMessage: "드립을 시작한다.",
    timestamp: new Date("2026-08-11T12:00:00+09:00"),
  })

  assert.equal(chats.length, 1)
  assert.deepEqual(chats[0], {
    id: "w10",
    characterName: "김버그",
    characterEmoji: "💻",
    roomName: undefined,
    roomNameCustomized: undefined,
    lastMessage: "드립을 시작한다.",
    timestamp: new Date("2026-08-11T12:00:00+09:00"),
    unreadCount: 0,
    isGenerating: undefined,
  })
})

test("reconcileChatListWithStoryWorks replaces stale Imugi metadata for Kim Bug", () => {
  const staleChat = existingChat({
    id: "w10",
    characterName: "이무기",
    characterEmoji: "🐉",
    roomName: "이무기",
  })

  const chats = reconcileChatListWithStoryWorks([staleChat], defaultLibrary)

  assert.equal(chats[0]?.characterName, "김버그")
  assert.equal(chats[0]?.characterEmoji, "💻")
  assert.equal(chats[0]?.roomName, "김버그")
})

test("reconcileChatListWithStoryWorks preserves an explicitly customized room name", () => {
  const customChat = existingChat({
    id: "w10",
    characterName: "이무기",
    characterEmoji: "🐉",
    roomName: "개발팀 야근방",
    roomNameCustomized: true,
  })

  const chats = reconcileChatListWithStoryWorks([customChat], defaultLibrary)

  assert.equal(chats[0]?.characterName, "김버그")
  assert.equal(chats[0]?.characterEmoji, "💻")
  assert.equal(chats[0]?.roomName, "개발팀 야근방")
  assert.equal(chats[0]?.roomNameCustomized, true)
})

test("QA smoke rooms resolve to the Kang Taehyun work instead of Imugi", () => {
  const staleChat = existingChat({
    id: "qa-regeneration",
    characterName: "이무기",
    characterEmoji: "🐉",
    roomName: "이무기",
  })

  const chats = reconcileChatListWithStoryWorks([staleChat], defaultLibrary)

  assert.equal(chats[0]?.characterName, "강태현")
  assert.equal(chats[0]?.characterEmoji, "🔥")
  assert.equal(chats[0]?.roomName, "강태현")
})

test("upsertChatListItem preserves local room settings while applying remote activity", () => {
  const chats = upsertChatListItem([existingChat()], {
    id: "existing",
    characterName: "수정된 캐릭터",
    characterEmoji: "🛠️",
    lastMessage: "새 메시지",
    timestamp: new Date("2026-08-11T13:00:00+09:00"),
    isGenerating: true,
  })

  assert.equal(chats[0]?.roomName, "사용자 지정 방 이름")
  assert.equal(chats[0]?.unreadCount, 3)
  assert.equal(chats[0]?.characterName, "수정된 캐릭터")
  assert.equal(chats[0]?.lastMessage, "새 메시지")
  assert.equal(chats[0]?.isGenerating, true)
})

test("deleteChatRoom deletes the persisted room for authenticated users", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.method, "DELETE")
    assert.equal(init?.body, JSON.stringify({ roomId: "w10" }))
    return new Response(JSON.stringify({ deleted: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    assert.deepEqual(await deleteChatRoom("w10"), {
      deleted: true,
      localOnly: false,
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("deleteChatRoom keeps guest deletion local instead of failing", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: "로그인이 필요합니다." }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  )

  try {
    assert.deepEqual(await deleteChatRoom("guest-room"), {
      deleted: false,
      localOnly: true,
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})
