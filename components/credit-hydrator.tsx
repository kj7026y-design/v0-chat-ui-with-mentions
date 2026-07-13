"use client"

import { useEffect } from "react"
import { useAppStore } from "@/lib/store"

export function CreditHydrator() {
  const hydrateCredits = useAppStore((s) => s.hydrateCredits)

  useEffect(() => {
    hydrateCredits()
  }, [hydrateCredits])

  return null
}
