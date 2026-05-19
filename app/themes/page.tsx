"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { ArrowLeft, Check, Sun, Moon, Monitor, MessageCircle, MessageSquare, Send } from "lucide-react"
import { cn } from "@/lib/utils"

type ThemeId = "light" | "dark" | "system"
type ChatThemeId = "light" | "dark" | "message" | "messenger"

interface ThemeConfig {
  id: ThemeId
  label: string
  description: string
  icon: React.ReactNode
}

interface ChatThemeConfig {
  id: ChatThemeId
  label: string
  icon: React.ReactNode
  preview: {
    bg: string
    userBubble: string
    userText: string
    aiBubble: string
    aiText: string
  }
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

const chatThemes: ChatThemeConfig[] = [
  {
    id: "light",
    label: "라이트",
    icon: <Sun className="w-4 h-4" />,
    preview: {
      bg: "#FFFFFF",
      userBubble: "#007AFF",
      userText: "#FFFFFF",
      aiBubble: "#E9E9EB",
      aiText: "#000000",
    },
  },
  {
    id: "dark",
    label: "다크",
    icon: <Moon className="w-4 h-4" />,
    preview: {
      bg: "#121212",
      userBubble: "#333333",
      userText: "#FFFFFF",
      aiBubble: "#1E1E1E",
      aiText: "#E5E5E5",
    },
  },
  {
    id: "message",
    label: "메시지",
    icon: <MessageSquare className="w-4 h-4" />,
    preview: {
      bg: "#F2F2F7",
      userBubble: "#34C759",
      userText: "#FFFFFF",
      aiBubble: "#FFFFFF",
      aiText: "#000000",
    },
  },
  {
    id: "messenger",
    label: "메신저",
    icon: <Send className="w-4 h-4" />,
    preview: {
      bg: "#BACEE0",
      userBubble: "#FEE500",
      userText: "#3C1E1E",
      aiBubble: "#FFFFFF",
      aiText: "#000000",
    },
  },
]

export default function ThemesPage() {
  const router = useRouter()
  const { setTheme, theme: currentTheme, resolvedTheme } = useTheme()
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("dark")
  const [selectedChatTheme, setSelectedChatTheme] = useState<ChatThemeId>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (currentTheme) {
      setSelectedTheme(currentTheme as ThemeId)
    }
    // Load saved chat theme from localStorage
    const savedChatTheme = localStorage.getItem("chat-theme") as ChatThemeId
    if (savedChatTheme) {
      setSelectedChatTheme(savedChatTheme)
    }
  }, [currentTheme])

  const handleApplyTheme = () => {
    setTheme(selectedTheme)
    localStorage.setItem("chat-theme", selectedChatTheme)
    router.back()
  }

  if (!mounted) {
    return null
  }

  // 미리보기에 사용할 테마 (system인 경우 resolvedTheme 사용)
  const previewTheme = selectedTheme === "system" ? resolvedTheme : selectedTheme
  const selectedChatThemeConfig = chatThemes.find(t => t.id === selectedChatTheme)!

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
        {/* App Theme Selection */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">앱 테마</h2>
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

        {/* Chat Theme Selection */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground">채팅 테마</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {chatThemes.map((chatTheme) => {
              const isSelected = selectedChatTheme === chatTheme.id
              return (
                <button
                  key={chatTheme.id}
                  onClick={() => setSelectedChatTheme(chatTheme.id)}
                  className={cn(
                    "relative p-3 rounded-xl transition-all duration-200",
                    "bg-card hover:bg-accent",
                    isSelected && "ring-2 ring-primary"
                  )}
                >
                  {/* Mini Preview */}
                  <div 
                    className="rounded-lg p-3 mb-2"
                    style={{ backgroundColor: chatTheme.preview.bg }}
                  >
                    {/* AI Bubble */}
                    <div 
                      className="w-3/4 h-4 rounded-full mb-1.5"
                      style={{ backgroundColor: chatTheme.preview.aiBubble }}
                    />
                    {/* User Bubble */}
                    <div 
                      className="w-1/2 h-4 rounded-full ml-auto"
                      style={{ backgroundColor: chatTheme.preview.userBubble }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-muted-foreground">{chatTheme.icon}</span>
                    <p className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {chatTheme.label}
                    </p>
                  </div>

                  {/* Selected Check */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
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
            className="rounded-xl overflow-hidden border transition-all duration-300"
            style={{ 
              backgroundColor: selectedChatThemeConfig.preview.bg,
              borderColor: previewTheme === "dark" ? "#262626" : "#e5e5e5"
            }}
          >
            {/* Preview Header */}
            <div
              className="px-4 py-3 flex items-center gap-3 border-b"
              style={{ borderColor: previewTheme === "dark" ? "#262626" : "#e5e5e5" }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: previewTheme === "dark" ? "#262626" : "#e5e5e5" }}
              >
                <MessageCircle 
                  className="w-4 h-4"
                  style={{ color: previewTheme === "dark" ? "#a3a3a3" : "#525252" }}
                />
              </div>
              <span
                className="font-medium text-sm"
                style={{ color: previewTheme === "dark" ? "#f5f5f5" : "#171717" }}
              >
                채팅 미리보기
              </span>
            </div>

            {/* Chat Preview */}
            <div className="p-4 space-y-3">
              {/* AI Message */}
              <div className="flex justify-start">
                <div 
                  className="max-w-[75%] px-4 py-2.5 rounded-2xl"
                  style={{ 
                    backgroundColor: selectedChatThemeConfig.preview.aiBubble,
                    color: selectedChatThemeConfig.preview.aiText
                  }}
                >
                  <p className="text-sm">안녕하세요! 무엇을 도와드릴까요?</p>
                </div>
              </div>

              {/* User Message */}
              <div className="flex justify-end">
                <div 
                  className="max-w-[75%] px-4 py-2.5 rounded-2xl"
                  style={{ 
                    backgroundColor: selectedChatThemeConfig.preview.userBubble,
                    color: selectedChatThemeConfig.preview.userText
                  }}
                >
                  <p className="text-sm">오늘 날씨가 어때요?</p>
                </div>
              </div>

              {/* AI Message */}
              <div className="flex justify-start">
                <div 
                  className="max-w-[75%] px-4 py-2.5 rounded-2xl"
                  style={{ 
                    backgroundColor: selectedChatThemeConfig.preview.aiBubble,
                    color: selectedChatThemeConfig.preview.aiText
                  }}
                >
                  <p className="text-sm">오늘은 맑고 화창한 날씨입니다!</p>
                </div>
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
