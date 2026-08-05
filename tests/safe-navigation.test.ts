import assert from "node:assert/strict"
import test from "node:test"

import {
  buildBackNavigationTrail,
  normalizeInternalNavigationTarget,
  resolveSafeBackTarget,
  withReturnTo,
} from "../lib/safe-navigation"

test("safe navigation accepts only app-relative return targets", () => {
  assert.equal(
    normalizeInternalNavigationTarget("/chat/work-1?tab=media#latest"),
    "/chat/work-1?tab=media#latest",
  )
  assert.equal(normalizeInternalNavigationTarget("https://example.com"), null)
  assert.equal(normalizeInternalNavigationTarget("//example.com/path"), null)
  assert.equal(normalizeInternalNavigationTarget("javascript:alert(1)"), null)
  assert.equal(normalizeInternalNavigationTarget("/chat\\work-1"), null)
})

test("returnTo preserves each source in a nested navigation flow", () => {
  const timelinePath = withReturnTo("/timeline", "/chat/work-1")
  const editPath = withReturnTo("/timeline/event-1/edit", timelinePath)

  assert.equal(timelinePath, "/timeline?returnTo=%2Fchat%2Fwork-1")
  assert.equal(
    new URL(editPath, "https://storychat.local").searchParams.get("returnTo"),
    timelinePath,
  )
})

test("explicit returnTo wins over list history for a chat persona detail", () => {
  const target = resolveSafeBackTarget({
    currentPath: "/my-works?tab=personas&detailType=personas&detailId=p1&returnTo=%2Fchat%2Fw1",
    returnTo: "/chat/w1",
    navigationTrail: [
      "/my-works?tab=personas",
      "/my-works?tab=personas&detailType=personas&detailId=p1",
    ],
    referrerPath: "/my-works?tab=personas",
    fallbackPath: "/my-works?tab=personas",
  })

  assert.deepEqual(target, { path: "/chat/w1", source: "returnTo" })
})

test("safe back follows internal trail and ignores an external-style return target", () => {
  const target = resolveSafeBackTarget({
    currentPath: "/timeline/event-1/edit",
    returnTo: "https://example.com",
    navigationTrail: ["/chat/w1", "/timeline", "/timeline/event-1/edit"],
    referrerPath: null,
    fallbackPath: "/timeline",
  })

  assert.deepEqual(target, { path: "/timeline", source: "history" })
})

test("direct and external entries use the screen fallback instead of browser history", () => {
  const target = resolveSafeBackTarget({
    currentPath: "/chat/w1",
    navigationTrail: ["/chat/w1"],
    referrerPath: null,
    fallbackPath: "/chats",
  })

  assert.deepEqual(target, { path: "/chats", source: "fallback" })
})

test("logical back removes the current route and keeps the earlier route chain", () => {
  const timelinePath = "/timeline?returnTo=%2Fchat%2Fw1"
  const editPath = `/timeline/event-1/edit?returnTo=${encodeURIComponent(timelinePath)}`
  const trail = ["/chats", "/chat/w1", timelinePath, editPath]

  assert.deepEqual(
    buildBackNavigationTrail(editPath, timelinePath, trail),
    ["/chats", "/chat/w1", timelinePath],
  )
  assert.deepEqual(
    buildBackNavigationTrail("/direct", "/chats", ["/direct"]),
    ["/chats"],
  )
})
