"use client"

import { useEffect } from "react"
import { installNavigationHistoryTracking } from "@/lib/safe-navigation"

export function NavigationHistoryTracker() {
  useEffect(() => installNavigationHistoryTracking(), [])
  return null
}
