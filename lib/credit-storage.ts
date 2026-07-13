"use client"

export type CreditHistoryType = "earned" | "spent"

export interface CreditHistoryItem {
  id: string
  type: CreditHistoryType
  title: string
  amount: number
  description?: string
  createdAt: string
}

const CREDIT_BALANCE_KEY = "storychat_credit_balance"
const CREDIT_HISTORY_KEY = "storychat_credit_history"
const CREDIT_UPDATED_EVENT = "storychat-credit-updated"

export function getStoredCredits(fallback: number) {
  if (typeof window === "undefined") return fallback
  const value = Number(window.localStorage.getItem(CREDIT_BALANCE_KEY))
  return Number.isFinite(value) ? value : fallback
}

export function saveStoredCredits(credits: number) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(CREDIT_BALANCE_KEY, String(Math.max(0, credits)))
  window.dispatchEvent(new Event(CREDIT_UPDATED_EVENT))
}

export function getCreditHistory(): CreditHistoryItem[] {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CREDIT_HISTORY_KEY) || "[]") as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCreditHistoryItem)
  } catch {
    return []
  }
}

export function addCreditHistory(item: Omit<CreditHistoryItem, "id" | "createdAt">) {
  if (typeof window === "undefined" || item.amount === 0) return
  const nextItem: CreditHistoryItem = {
    ...item,
    id: `credit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  }
  const nextHistory = [nextItem, ...getCreditHistory()].slice(0, 100)
  window.localStorage.setItem(CREDIT_HISTORY_KEY, JSON.stringify(nextHistory))
  window.dispatchEvent(new Event(CREDIT_UPDATED_EVENT))
}

export function subscribeCreditUpdates(listener: () => void) {
  if (typeof window === "undefined") return () => undefined
  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === CREDIT_BALANCE_KEY || event.key === CREDIT_HISTORY_KEY) listener()
  }
  window.addEventListener(CREDIT_UPDATED_EVENT, listener)
  window.addEventListener("storage", handleStorage)
  return () => {
    window.removeEventListener(CREDIT_UPDATED_EVENT, listener)
    window.removeEventListener("storage", handleStorage)
  }
}

function isCreditHistoryItem(item: unknown): item is CreditHistoryItem {
  if (!item || typeof item !== "object") return false
  const value = item as Partial<CreditHistoryItem>
  return (
    typeof value.id === "string" &&
    (value.type === "earned" || value.type === "spent") &&
    typeof value.title === "string" &&
    typeof value.amount === "number" &&
    typeof value.createdAt === "string"
  )
}
