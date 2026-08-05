const NAVIGATION_MARKER_KEY = "__storychatNavigation"
const NAVIGATION_TRAIL_KEY = "__storychatNavigationTrail"
const MAX_NAVIGATION_TRAIL_LENGTH = 40

type HistoryStateRecord = Record<string, unknown>

export type SafeBackTargetSource = "returnTo" | "history" | "referrer" | "fallback"

export interface SafeBackTarget {
  path: string
  source: SafeBackTargetSource
}

interface ResolveSafeBackTargetOptions {
  currentPath: string
  returnTo?: string | null
  navigationTrail?: string[]
  referrerPath?: string | null
  fallbackPath: string
}

let pendingBackTrail: { targetPath: string; trail: string[] } | null = null

function asHistoryState(value: unknown): HistoryStateRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as HistoryStateRecord
}

function trimTrail(trail: string[]): string[] {
  return trail.slice(-MAX_NAVIGATION_TRAIL_LENGTH)
}

function normalizeTrail(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const normalized = value
    .map((path) => normalizeInternalNavigationTarget(typeof path === "string" ? path : null))
    .filter((path): path is string => Boolean(path))

  return trimTrail(normalized.filter((path, index) => index === 0 || path !== normalized[index - 1]))
}

function resolveHistoryUrl(
  value: string | URL | null | undefined,
  fallbackPath: string,
): string {
  if (typeof window === "undefined" || value == null) return fallbackPath

  try {
    const url = new URL(String(value), window.location.href)
    if (url.origin !== window.location.origin) return fallbackPath
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallbackPath
  }
}

function createTrackedState(
  value: unknown,
  trail: string[],
): HistoryStateRecord {
  return {
    ...asHistoryState(value),
    [NAVIGATION_MARKER_KEY]: true,
    [NAVIGATION_TRAIL_KEY]: trimTrail(trail),
  }
}

export function normalizeInternalNavigationTarget(
  value: string | null | undefined,
): string | null {
  const candidate = value?.trim()
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return null
  }

  try {
    const url = new URL(candidate, "https://storychat.local")
    if (url.origin !== "https://storychat.local") return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export function withReturnTo(targetPath: string, returnToPath: string): string {
  const target = normalizeInternalNavigationTarget(targetPath) ?? "/"
  const returnTo = normalizeInternalNavigationTarget(returnToPath)
  if (!returnTo) return target

  const url = new URL(target, "https://storychat.local")
  url.searchParams.set("returnTo", returnTo)
  return `${url.pathname}${url.search}${url.hash}`
}

export function getCurrentAppPath(): string {
  if (typeof window === "undefined") return "/"
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export function getCurrentReturnTo(): string | null {
  if (typeof window === "undefined") return null
  return normalizeInternalNavigationTarget(
    new URLSearchParams(window.location.search).get("returnTo"),
  )
}

export function getSameOriginReferrerPath(): string | null {
  if (typeof window === "undefined" || !document.referrer) return null

  try {
    const referrer = new URL(document.referrer)
    if (referrer.origin !== window.location.origin) return null
    return normalizeInternalNavigationTarget(
      `${referrer.pathname}${referrer.search}${referrer.hash}`,
    )
  } catch {
    return null
  }
}

export function getNavigationTrail(currentPath = getCurrentAppPath()): string[] {
  const current = normalizeInternalNavigationTarget(currentPath) ?? "/"
  if (typeof window === "undefined") return [current]

  const state = asHistoryState(window.history.state)
  const trail = state[NAVIGATION_MARKER_KEY]
    ? normalizeTrail(state[NAVIGATION_TRAIL_KEY])
    : []

  if (trail.length === 0) return [current]
  if (trail[trail.length - 1] === current) return trail
  return trimTrail([...trail, current])
}

export function resolveSafeBackTarget({
  currentPath,
  returnTo,
  navigationTrail = [],
  referrerPath,
  fallbackPath,
}: ResolveSafeBackTargetOptions): SafeBackTarget {
  const current = normalizeInternalNavigationTarget(currentPath) ?? "/"
  const explicitReturnTo = normalizeInternalNavigationTarget(returnTo)
  if (explicitReturnTo && explicitReturnTo !== current) {
    return { path: explicitReturnTo, source: "returnTo" }
  }

  const trail = normalizeTrail(navigationTrail)
  const currentIndex = trail.lastIndexOf(current)
  const previousPath = currentIndex > 0
    ? trail[currentIndex - 1]
    : currentIndex < 0 && trail.length > 0
      ? trail[trail.length - 1]
      : null
  if (previousPath && previousPath !== current) {
    return { path: previousPath, source: "history" }
  }

  const referrer = normalizeInternalNavigationTarget(referrerPath)
  if (referrer && referrer !== current) {
    return { path: referrer, source: "referrer" }
  }

  const fallback = normalizeInternalNavigationTarget(fallbackPath) ?? "/"
  return { path: fallback, source: "fallback" }
}

export function buildBackNavigationTrail(
  currentPath: string,
  targetPath: string,
  navigationTrail: string[],
): string[] {
  const current = normalizeInternalNavigationTarget(currentPath) ?? "/"
  const target = normalizeInternalNavigationTarget(targetPath) ?? "/"
  const trail = normalizeTrail(navigationTrail)
  const currentIndex = trail.lastIndexOf(current)
  const beforeCurrent = currentIndex >= 0 ? trail.slice(0, currentIndex) : trail
  const targetIndex = beforeCurrent.lastIndexOf(target)

  if (targetIndex >= 0) return beforeCurrent.slice(0, targetIndex + 1)

  const nextTrail = [...beforeCurrent, target]
  return trimTrail(nextTrail.filter((path, index) => index === 0 || path !== nextTrail[index - 1]))
}

export function prepareSafeBackNavigation(
  currentPath: string,
  targetPath: string,
  navigationTrail: string[],
) {
  const target = normalizeInternalNavigationTarget(targetPath) ?? "/"
  pendingBackTrail = {
    targetPath: target,
    trail: buildBackNavigationTrail(currentPath, target, navigationTrail),
  }
}

export function installNavigationHistoryTracking(): () => void {
  if (typeof window === "undefined") return () => undefined

  const browserHistory = window.history
  const originalPushState = browserHistory.pushState.bind(browserHistory)
  const originalReplaceState = browserHistory.replaceState.bind(browserHistory)
  const initialPath = getCurrentAppPath()
  const initialState = asHistoryState(browserHistory.state)
  const existingTrail = initialState[NAVIGATION_MARKER_KEY]
    ? normalizeTrail(initialState[NAVIGATION_TRAIL_KEY])
    : []
  const initialTrail = existingTrail.length > 0
    ? existingTrail.slice(0, -1).concat(initialPath)
    : [initialPath]

  originalReplaceState(
    createTrackedState(initialState, initialTrail),
    "",
    window.location.href,
  )

  const trackedPushState: History["pushState"] = function (
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    const currentPath = getCurrentAppPath()
    const targetPath = resolveHistoryUrl(url, currentPath)
    const currentTrail = getNavigationTrail(currentPath)
    const nextTrail = currentTrail[currentTrail.length - 1] === targetPath
      ? currentTrail
      : [...currentTrail, targetPath]

    originalPushState(createTrackedState(data, nextTrail), unused, url)
  }

  const trackedReplaceState: History["replaceState"] = function (
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    const currentPath = getCurrentAppPath()
    const targetPath = resolveHistoryUrl(url, currentPath)
    const currentTrail = getNavigationTrail(currentPath)
    const pendingTrail = pendingBackTrail?.targetPath === targetPath
      ? pendingBackTrail.trail
      : null
    const nextTrail = pendingTrail ?? (
      currentTrail.length > 0
        ? [...currentTrail.slice(0, -1), targetPath]
        : [targetPath]
    )

    if (pendingTrail) pendingBackTrail = null
    originalReplaceState(createTrackedState(data, nextTrail), unused, url)
  }

  browserHistory.pushState = trackedPushState
  browserHistory.replaceState = trackedReplaceState

  const handlePopState = () => {
    const currentPath = getCurrentAppPath()
    const state = asHistoryState(browserHistory.state)
    const trail = state[NAVIGATION_MARKER_KEY]
      ? normalizeTrail(state[NAVIGATION_TRAIL_KEY])
      : []

    if (trail.length > 0 && trail[trail.length - 1] === currentPath) return
    originalReplaceState(
      createTrackedState(state, [currentPath]),
      "",
      window.location.href,
    )
  }

  window.addEventListener("popstate", handlePopState)

  return () => {
    window.removeEventListener("popstate", handlePopState)
    if (browserHistory.pushState === trackedPushState) {
      browserHistory.pushState = originalPushState
    }
    if (browserHistory.replaceState === trackedReplaceState) {
      browserHistory.replaceState = originalReplaceState
    }
  }
}
