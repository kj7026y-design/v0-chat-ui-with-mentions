import assert from "node:assert/strict"
import test from "node:test"

import type { ChatMessage } from "../lib/chat-types"
import {
  appendMessageCandidate,
  buildRegenerationAvoidContent,
  finalizeMessageCandidates,
  selectMessageCandidate,
} from "../lib/message-candidates"

function makeMessage(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: "assistant-turn-1",
    type: "ai",
    content: "원래 답변",
    timestamp: new Date("2026-07-28T09:00:00.000Z"),
    status: "completed",
    turnId: "turn-1",
    ...overrides,
  }
}

test("regeneration keeps the original and auto-selects the new candidate", () => {
  const original = makeMessage({})
  const originalStatus = makeMessage({
    id: "status-turn-1",
    type: "status",
    commandId: "status",
    content: "원래 상태창",
  })
  const regenerated = makeMessage({
    id: "generated-answer",
    content: "새로운 답변",
    timestamp: new Date("2026-07-28T09:01:00.000Z"),
    generationRunId: "run-2",
  })
  const regeneratedStatus = makeMessage({
    id: originalStatus.id,
    type: "status",
    commandId: "status",
    content: "새로운 상태창",
  })

  const message = appendMessageCandidate(original, regenerated, {
    currentCompanionMessages: [originalStatus],
    generatedCompanionMessages: [regeneratedStatus],
  })

  assert.equal(message.content, "새로운 답변")
  assert.equal(message.messageCandidates?.length, 2)
  assert.equal(message.selectedCandidateId, message.messageCandidates?.[1].id)
  assert.equal(message.messageCandidates?.[0].content, "원래 답변")
})

test("selecting a candidate restores its answer and companion command messages", () => {
  const original = makeMessage({})
  const originalPhone = makeMessage({
    id: "phone-turn-1",
    type: "status",
    commandId: "phone",
    content: "원래 휴대폰",
  })
  const regenerated = makeMessage({
    id: "generated-answer",
    content: "새로운 답변",
    timestamp: new Date("2026-07-28T09:01:00.000Z"),
  })
  const regeneratedPhone = makeMessage({
    id: originalPhone.id,
    type: "status",
    commandId: "phone",
    content: "새로운 휴대폰",
  })
  const withCandidate = appendMessageCandidate(original, regenerated, {
    currentCompanionMessages: [originalPhone],
    generatedCompanionMessages: [regeneratedPhone],
  })
  const initialCandidateId = withCandidate.messageCandidates?.[0].id ?? ""

  const selected = selectMessageCandidate(
    [withCandidate, regeneratedPhone],
    original.id,
    initialCandidateId,
  )

  assert.equal(selected[0].content, "원래 답변")
  assert.equal(selected[0].selectedCandidateId, initialCandidateId)
  assert.equal(selected[1].content, "원래 휴대폰")
})

test("finalizing candidates keeps only the selected top-level answer", () => {
  const original = makeMessage({})
  const regenerated = makeMessage({
    id: "generated-answer",
    content: "확정할 새 답변",
  })
  const withCandidate = appendMessageCandidate(original, regenerated)
  const finalized = finalizeMessageCandidates([withCandidate])

  assert.equal(finalized[0].content, "확정할 새 답변")
  assert.equal(finalized[0].messageCandidates, undefined)
  assert.equal(finalized[0].selectedCandidateId, undefined)
  assert.doesNotMatch(JSON.stringify(finalized[0]), /원래 답변/u)
})

test("regeneration avoidance includes every existing candidate", () => {
  const original = makeMessage({})
  const firstRegeneration = appendMessageCandidate(
    original,
    makeMessage({ id: "generated-1", content: "첫 번째 새 전개" }),
  )
  const secondRegeneration = appendMessageCandidate(
    firstRegeneration,
    makeMessage({ id: "generated-2", content: "두 번째 새 전개" }),
  )

  const avoidContent = buildRegenerationAvoidContent(secondRegeneration)

  assert.match(avoidContent, /원래 답변/u)
  assert.match(avoidContent, /첫 번째 새 전개/u)
  assert.match(avoidContent, /두 번째 새 전개/u)
})
