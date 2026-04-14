"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { ArrowLeft, Check, Sun, Moon, MessageSquare, Send } from "lucide-react"
import { cn } from "@/lib/utils"

type ThemeId = "light" | "dark" | "message" | "messenger"

interface ThemeConfig {
  id: ThemeId
  label: string
  icon: React.ReactNode
  preview: {
    bg: string
    myBubble: string
    myText: string
    otherBubble: string
    otherText: string
  }
}

const themes: ThemeConfig[] = [
  {
    id: "light",
    label: "라이트",
    icon: <Sun className="w-5 h-5" />,
    preview: {
      bg: "#FFFFFF",
      myBubble: "#007AFF",
      myText: "#FFFFFF",
      otherBubble: "#E9E9EB",
      otherText: "#000000",
    },
  },
  {
    id: "dark",
    label: "다크",
    icon: <Moon className="w-5 h-5" />,
    preview: {
      bg: "#121212",
      myBubble: "#333333",
      myText: "#FFFFFF",
      otherBubble: "#1E1E1E",
      otherText: "#E5E5E5",
    },
  },
  {
    id: "message",
    label: "메시지",
    icon: <MessageSquare className="w-5 h-5" />,
    preview: {
      bg: "#F2F2F7",
      myBubble: "#34C759",
      myText: "#FFFFFF",
      otherBubble: "#FFFFFF",
      otherText: "#000000",
    },
  },
  {
    id: "messenger",
    label: "메신저",
    icon: <Send className="w-5 h-5" />,
    preview: {
      bg: "#BACEE0",
      myBubble: "#FEE500",
      myText: "#3C1E1E",
      otherBubble: "#FFFFFF",
      otherText: "#000000",
    },
  },
]

const previewMessages = [
  { id: 1, isMe: false, text: "오늘 날씨 정말 좋다!" },
  { id: 2, isMe: true, text: "그러게, 산책하기 딱 좋은 날이야" },
  { id: 3, isMe: false, text: "같이 나갈래?" },
]

export default function ThemesPage() {
  const router = useRouter()
  const { setTheme, theme: currentSystemTheme } = useTheme()
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load saved chat theme from localStorage
    const savedChatTheme = localStorage.getItem("chat-theme") as ThemeId | null
    if (savedChatTheme && themes.some(t => t.id === savedChatTheme)) {
      setSelectedTheme(savedChatTheme)
    }
  }, [])

  const currentTheme = themes.find((t) => t.id === selectedTheme)!

  const handleApplyTheme = () => {
    // Save chat theme preference
    localStorage.setItem("chat-theme", selectedTheme)
    
    // Apply system-wide theme (light or dark)
    if (selectedTheme === "light" || selectedTheme === "message") {
      setTheme("light")
    } else {
      setTheme("dark")
    }
    
    router.back()
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-neutral-950 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-4 bg-neutral-950/95 backdrop-blur-sm">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-neutral-800 transition-colors"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-100" />
        </button>
        <h1 className="text-lg font-semibold text-neutral-100">채팅 테마 설정</h1>
      </header>

      <div className="px-4 space-y-8">
        {/* Theme Selection Grid */}
        <section>
          <h2 className="text-sm font-medium text-neutral-400 mb-4">테마 선택</h2>
          <div className="grid grid-cols-2 gap-3">
            {themes.map((theme) => {
              const isSelected = selectedTheme === theme.id
              return (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={cn(
                    "relative flex flex-col items-center gap-3 p-4 rounded-xl transition-all duration-300",
                    "bg-neutral-900 hover:bg-neutral-800",
                    isSelected && "ring-2 ring-neutral-100 bg-neutral-800"
                  )}
                >
                  {/* Theme Preview Icon */}
                  <div
                    className="w-full aspect-[4/3] rounded-lg flex items-center justify-center transition-colors duration-300"
                    style={{ backgroundColor: theme.preview.bg }}
                  >
                    {/* Mini chat bubbles */}
                    <div className="flex flex-col gap-1.5 w-3/4">
                      <div
                        className="self-start px-2.5 py-1.5 rounded-xl rounded-tl-sm text-[10px] transition-colors duration-300"
                        style={{
                          backgroundColor: theme.preview.otherBubble,
                          color: theme.preview.otherText,
                        }}
                      >
                        안녕!
                      </div>
                      <div
                        className="self-end px-2.5 py-1.5 rounded-xl rounded-tr-sm text-[10px] transition-colors duration-300"
                        style={{
                          backgroundColor: theme.preview.myBubble,
                          color: theme.preview.myText,
                        }}
                      >
                        반가워
                      </div>
                    </div>
                  </div>

                  {/* Theme Label */}
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-medium transition-colors duration-300",
                        isSelected ? "text-neutral-100" : "text-neutral-400"
                      )}
                    >
                      {theme.label}
                    </span>
                  </div>

                  {/* Selected Check */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-neutral-100 flex items-center justify-center">
                      <Check className="w-3 h-3 text-neutral-900" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* Live Preview */}
        <section>
          <h2 className="text-sm font-medium text-neutral-400 mb-4">실시간 미리보기</h2>
          <div
            className="rounded-xl overflow-hidden transition-colors duration-500 ease-out"
            style={{ backgroundColor: currentTheme.preview.bg }}
          >
            {/* Preview Header */}
            <div
              className={cn(
                "px-4 py-3 flex items-center gap-3 border-b transition-colors duration-500",
                currentTheme.id === "light" || currentTheme.id === "message"
                  ? "border-neutral-200"
                  : currentTheme.id === "messenger"
                    ? "border-[#9BBBD4]"
                    : "border-neutral-700"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-500",
                  currentTheme.id === "dark" ? "bg-neutral-700" : "bg-neutral-300"
                )}
              >
                <span className="text-sm">🐉</span>
              </div>
              <span
                className={cn(
                  "font-medium text-sm transition-colors duration-500",
                  currentTheme.id === "dark" ? "text-neutral-100" : "text-neutral-900"
                )}
              >
                이무기
              </span>
            </div>

            {/* Preview Messages */}
            <div className="p-4 space-y-3 min-h-[180px]">
              {previewMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.isMe ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] px-3.5 py-2 rounded-2xl text-sm transition-all duration-500 ease-out",
                      msg.isMe ? "rounded-tr-sm" : "rounded-tl-sm"
                    )}
                    style={{
                      backgroundColor: msg.isMe
                        ? currentTheme.preview.myBubble
                        : currentTheme.preview.otherBubble,
                      color: msg.isMe
                        ? currentTheme.preview.myText
                        : currentTheme.preview.otherText,
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Preview Input */}
            <div
              className={cn(
                "px-4 py-3 border-t transition-colors duration-500",
                currentTheme.id === "light" || currentTheme.id === "message"
                  ? "border-neutral-200"
                  : currentTheme.id === "messenger"
                    ? "border-[#9BBBD4]"
                    : "border-neutral-700"
              )}
            >
              <div
                className={cn(
                  "w-full h-9 rounded-full transition-colors duration-500",
                  currentTheme.id === "dark"
                    ? "bg-neutral-700"
                    : currentTheme.id === "messenger"
                      ? "bg-white/80"
                      : "bg-neutral-200"
                )}
              />
            </div>
          </div>
        </section>

        {/* Apply Button */}
        <button 
          onClick={handleApplyTheme}
          className="w-full py-3.5 rounded-xl bg-neutral-100 text-neutral-900 font-medium hover:bg-neutral-200 transition-colors"
        >
          테마 적용하기
        </button>
      </div>
    </div>
  )
}
