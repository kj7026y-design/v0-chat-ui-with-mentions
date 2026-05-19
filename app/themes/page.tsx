"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { ArrowLeft, Check, Sun, Moon, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

type ThemeId = "light" | "dark" | "system"

interface ThemeConfig {
  id: ThemeId
  label: string
  description: string
  icon: React.ReactNode
}

const themes: ThemeConfig[] = [
  {
    id: "light",
    label: "라이트 모드",
    description: "밝은 배경, 어두운 텍스트",
    icon: <Sun className="w-6 h-6" />,
  },
  {
    id: "dark",
    label: "다크 모드",
    description: "어두운 배경, 밝은 텍스트",
    icon: <Moon className="w-6 h-6" />,
  },
  {
    id: "system",
    label: "시스템 설정",
    description: "기기 설정에 따라 자동 전환",
    icon: <Monitor className="w-6 h-6" />,
  },
]

export default function ThemesPage() {
  const router = useRouter()
  const { setTheme, theme: currentTheme, resolvedTheme } = useTheme()
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (currentTheme) {
      setSelectedTheme(currentTheme as ThemeId)
    }
  }, [currentTheme])

  const handleApplyTheme = () => {
    setTheme(selectedTheme)
    router.back()
  }

  if (!mounted) {
    return null
  }

  // 미리보기에 사용할 테마 (system인 경우 resolvedTheme 사용)
  const previewTheme = selectedTheme === "system" ? resolvedTheme : selectedTheme

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-4 bg-background/95 backdrop-blur-sm border-b border-border">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-accent transition-colors"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">테마 설정</h1>
      </header>

      <div className="px-4 space-y-8 pt-6">
        {/* Theme Selection */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">테마 선택</h2>
          <div className="space-y-3">
            {themes.map((theme) => {
              const isSelected = selectedTheme === theme.id
              return (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={cn(
                    "relative w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200",
                    "bg-card hover:bg-accent",
                    isSelected && "ring-2 ring-primary"
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {theme.icon}
                  </div>

                  {/* Label & Description */}
                  <div className="flex-1 text-left">
                    <p className={cn(
                      "font-medium transition-colors",
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {theme.label}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {theme.description}
                    </p>
                  </div>

                  {/* Selected Check */}
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* Live Preview */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">미리보기</h2>
          <div
            className={cn(
              "rounded-xl overflow-hidden border transition-all duration-300",
              previewTheme === "dark" ? "bg-[#121212] border-neutral-800" : "bg-white border-neutral-200"
            )}
          >
            {/* Preview Header */}
            <div
              className={cn(
                "px-4 py-3 flex items-center gap-3 border-b",
                previewTheme === "dark" ? "border-neutral-800" : "border-neutral-200"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  previewTheme === "dark" ? "bg-neutral-800" : "bg-neutral-200"
                )}
              >
                <span className="text-sm">🎨</span>
              </div>
              <span
                className={cn(
                  "font-medium text-sm",
                  previewTheme === "dark" ? "text-neutral-100" : "text-neutral-900"
                )}
              >
                앱 미리보기
              </span>
            </div>

            {/* Preview Content */}
            <div className="p-4 space-y-3">
              {/* Card Preview */}
              <div
                className={cn(
                  "p-4 rounded-lg",
                  previewTheme === "dark" ? "bg-neutral-900" : "bg-neutral-100"
                )}
              >
                <p
                  className={cn(
                    "text-sm font-medium mb-1",
                    previewTheme === "dark" ? "text-neutral-100" : "text-neutral-900"
                  )}
                >
                  카드 제목
                </p>
                <p
                  className={cn(
                    "text-xs",
                    previewTheme === "dark" ? "text-neutral-400" : "text-neutral-600"
                  )}
                >
                  이것은 카드 설명 텍스트입니다.
                </p>
              </div>

              {/* Button Preview */}
              <div className="flex gap-2">
                <div
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium",
                    previewTheme === "dark"
                      ? "bg-neutral-100 text-neutral-900"
                      : "bg-neutral-900 text-neutral-100"
                  )}
                >
                  주요 버튼
                </div>
                <div
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium",
                    previewTheme === "dark"
                      ? "bg-neutral-800 text-neutral-300"
                      : "bg-neutral-200 text-neutral-700"
                  )}
                >
                  보조 버튼
                </div>
              </div>

              {/* List Preview */}
              <div
                className={cn(
                  "rounded-lg overflow-hidden",
                  previewTheme === "dark" ? "bg-neutral-900" : "bg-neutral-100"
                )}
              >
                {["메뉴 항목 1", "메뉴 항목 2"].map((item, index) => (
                  <div
                    key={item}
                    className={cn(
                      "px-4 py-3 flex items-center justify-between",
                      index === 0 && (previewTheme === "dark" ? "border-b border-neutral-800" : "border-b border-neutral-200")
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm",
                        previewTheme === "dark" ? "text-neutral-200" : "text-neutral-800"
                      )}
                    >
                      {item}
                    </span>
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full",
                        previewTheme === "dark" ? "bg-neutral-700" : "bg-neutral-300"
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Apply Button */}
        <button
          onClick={handleApplyTheme}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          테마 적용하기
        </button>
      </div>
    </div>
  )
}
