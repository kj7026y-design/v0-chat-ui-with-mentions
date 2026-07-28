import assert from "node:assert/strict"
import test from "node:test"

import {
  MAX_KEEPALIVE_REQUEST_BYTES,
  canUseKeepalive,
} from "../lib/chat-history-client"

test("small chat history requests can use fetch keepalive", () => {
  const body = JSON.stringify({
    roomId: "room-1",
    messages: [{ id: "message-1", content: "짧은 메시지" }],
  })

  assert.equal(canUseKeepalive(body), true)
})

test("Base64 image messages disable keepalive before the browser rejects fetch", () => {
  const body = JSON.stringify({
    roomId: "room-1",
    messages: [{
      id: "image-1",
      imageUrl: `data:image/jpeg;base64,${"a".repeat(MAX_KEEPALIVE_REQUEST_BYTES)}`,
    }],
  })

  assert.equal(canUseKeepalive(body), false)
})

test("keepalive limit is measured in UTF-8 bytes instead of JavaScript characters", () => {
  const multibyteBody = "가".repeat(Math.ceil(MAX_KEEPALIVE_REQUEST_BYTES / 3) + 1)

  assert.equal(multibyteBody.length < MAX_KEEPALIVE_REQUEST_BYTES, true)
  assert.equal(canUseKeepalive(multibyteBody), false)
})
