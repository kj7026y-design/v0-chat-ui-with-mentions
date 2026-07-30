import assert from "node:assert/strict"
import test from "node:test"

import {
  findChatSearchResultIds,
  isSearchableChatMessage,
  normalizeChatSearchQuery,
} from "../lib/chat-search"
import type { ChatMessage } from "../lib/chat-types"

function message(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: "message",
    type: "ai",
    content: "",
    timestamp: new Date("2026-07-30T12:00:00.000Z"),
    ...overrides,
  }
}

test("chat search normalizes input and returns matching narrative messages in order", () => {
  const messages = [
    message({ id: "user-1", type: "user", content: "오늘 옥상에 갈까?" }),
    message({ id: "ai-1", content: "옥상 문 앞에서 기다릴게." }),
    message({ id: "ai-2", content: "다른 장소도 괜찮아." }),
  ]

  assert.equal(normalizeChatSearchQuery("  옥상  "), "옥상")
  assert.deepEqual(findChatSearchResultIds(messages, "옥상"), ["user-1", "ai-1"])
})

test("chat search includes visible command text and excludes image metadata", () => {
  const commandMessage = message({
    id: "phone",
    type: "status",
    commandId: "phone",
    content: "옥상에서 온 문자",
  })
  const imageMessage = message({
    id: "image",
    type: "status_img",
    commandId: "image",
    content: "옥상 이미지",
  })

  assert.equal(isSearchableChatMessage(commandMessage), true)
  assert.equal(isSearchableChatMessage(imageMessage), false)
  assert.deepEqual(
    findChatSearchResultIds([commandMessage, imageMessage], "옥상"),
    ["phone"],
  )
})

test("chat search finds messages by stored speaker name", () => {
  const speakerMessage = message({
    id: "speaker-match",
    type: "ai",
    speakerName: "박민규",
    content: "그는 천천히 고개를 들었다.",
  })

  assert.deepEqual(findChatSearchResultIds([speakerMessage], "박민규"), [
    "speaker-match",
  ])
})

test("chat search finds a person inside generated phone content", () => {
  const phoneMessage = message({
    id: "phone-content",
    type: "status",
    commandId: "phone",
    content:
      "💬 최근 문자 목록\n박민규 | ㅋㅋㅋㅋㅋㅋ 얘가 어딜 갔겠냐. 김여자네 집 앞이지",
  })

  assert.deepEqual(findChatSearchResultIds([phoneMessage], "박민규"), [
    "phone-content",
  ])
})
