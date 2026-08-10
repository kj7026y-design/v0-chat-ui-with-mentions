import assert from "node:assert/strict"
import test from "node:test"
import {
  canEditAnyStoryWork,
  canEditStoryWork,
  getStoryWorkAuthor,
} from "../lib/work-permissions"

const creator = {
  authenticated: true,
  accountId: "member-creator",
  accountType: "member" as const,
  role: "member" as const,
  displayName: "작가",
}

test("only the creator and approved elevated accounts can edit a work", () => {
  const work = { authorId: creator.accountId }

  assert.equal(canEditStoryWork(work, creator), true)
  assert.equal(canEditStoryWork(work, { ...creator, accountId: "member-other" }), false)
  assert.equal(canEditStoryWork(work, { ...creator, accountId: "staff-admin", role: "administrator" }), true)
  assert.equal(canEditStoryWork(work, { ...creator, accountId: "staff-developer", role: "developer" }), true)
  assert.equal(canEditStoryWork(work, { ...creator, accountId: "member-tester" }), true)
  assert.equal(canEditStoryWork(work, { ...creator, accountId: "staff-operator", role: "operator" }), false)
  assert.equal(canEditStoryWork(work, { authenticated: false }), false)
})

test("tester privilege is account based and new work ownership uses account id", () => {
  assert.equal(canEditAnyStoryWork({ ...creator, accountId: "member-tester" }), true)
  assert.equal(canEditAnyStoryWork({ ...creator, displayName: "테스터" }), false)
  assert.deepEqual(getStoryWorkAuthor(creator), {
    authorId: "member-creator",
    authorName: "작가",
  })
})
