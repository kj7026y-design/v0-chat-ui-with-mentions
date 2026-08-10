"use client"

import { useEffect, useState } from "react"
import {
  getAdminSessionState,
  type AdminSessionState,
} from "@/lib/chat-history-client"

export function useAccountSession() {
  const [session, setSession] = useState<AdminSessionState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void getAdminSessionState()
      .then((nextSession) => {
        if (!cancelled) setSession(nextSession)
      })
      .catch(() => {
        if (!cancelled) setSession({ authenticated: false })
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { session, isLoading }
}
