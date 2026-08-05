"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  getCurrentAppPath,
  getCurrentReturnTo,
  getNavigationTrail,
  getSameOriginReferrerPath,
  prepareSafeBackNavigation,
  resolveSafeBackTarget,
} from "@/lib/safe-navigation"

export function useSafeBack(fallbackPath: string) {
  const router = useRouter()

  return useCallback(() => {
    const currentPath = getCurrentAppPath()
    const navigationTrail = getNavigationTrail(currentPath)
    const target = resolveSafeBackTarget({
      currentPath,
      returnTo: getCurrentReturnTo(),
      navigationTrail,
      referrerPath: getSameOriginReferrerPath(),
      fallbackPath,
    })

    prepareSafeBackNavigation(currentPath, target.path, navigationTrail)
    router.replace(target.path)
  }, [fallbackPath, router])
}
