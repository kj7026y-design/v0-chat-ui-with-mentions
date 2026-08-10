import assert from "node:assert/strict"
import test from "node:test"
import { useAppStore } from "../lib/store"

function createLocalStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

test("an unauthenticated charge rejection never increases local credits", async () => {
  const originalWindow = globalThis.window
  const originalFetch = globalThis.fetch
  const localStorage = createLocalStorage()
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage,
      dispatchEvent: () => true,
    },
  })
  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: "크레딧 충전은 로그인이 필요합니다." }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  )

  try {
    useAppStore.setState({ credits: 100 })
    const charged = await useAppStore.getState().chargeCredit(500)

    assert.equal(charged, false)
    assert.equal(useAppStore.getState().credits, 100)
    assert.equal(localStorage.getItem("storychat_credit_balance"), null)
  } finally {
    globalThis.fetch = originalFetch
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    })
  }
})
