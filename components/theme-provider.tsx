"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  enableSystem?: boolean
  attribute?: "class"
  disableTransitionOnChange?: boolean
}

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function getSystemTheme() {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getStoredTheme(defaultTheme: Theme) {
  if (typeof window === "undefined") return defaultTheme
  const stored = window.localStorage.getItem("theme")
  return stored === "light" || stored === "dark" || stored === "system" ? stored : defaultTheme
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">("dark")

  React.useEffect(() => {
    // Next.js Dev Overlay 및 외부 포인터 캡처 이벤트 시 발생할 수 있는 releasePointerCapture 예외를 안전하게 가로챔
    if (typeof window !== "undefined" && Element.prototype.releasePointerCapture) {
      const originalRelease = Element.prototype.releasePointerCapture
      Element.prototype.releasePointerCapture = function (pointerId: number) {
        try {
          originalRelease.call(this, pointerId)
        } catch {
          // 이미 포인터 캡처가 해제되었거나 유효하지 않은 포인터인 경우 예외를 무시하여 동작 보장
        }
      }
    }

    setThemeState(getStoredTheme(defaultTheme))
    setSystemTheme(getSystemTheme())

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleSystemThemeChange = () => setSystemTheme(getSystemTheme())
    mediaQuery.addEventListener("change", handleSystemThemeChange)

    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange)
  }, [defaultTheme])

  const resolvedTheme = theme === "system" && enableSystem ? systemTheme : theme === "light" ? "light" : "dark"

  React.useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = React.useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
    window.localStorage.setItem("theme", nextTheme)
  }, [])

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = React.useContext(ThemeContext)
  if (!value) {
    return {
      theme: "dark" as Theme,
      resolvedTheme: "dark" as const,
      setTheme: () => undefined,
    }
  }
  return value
}
