"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { X, Clock, Palette, SlidersHorizontal, Image as ImageIcon, User, Trash2, LogOut, ChevronRight, Check, Sun, Moon, MessageSquare, Send, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { getChatMedia, type ChatMediaItem } from "@/lib/chat-media-storage"

type ChatThemeId = "system" | "light" | "dark" | "message" | "messenger"

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

const chatThemes: ChatThemeConfig[] = [
  {
    id: "system",
    label: "앱 설정",
    icon: <RotateCcw className="w-4 h-4" />,
    preview: {
      bg: "#1a1a1a",
      userBubble: "#333333",
      userText: "#FFFFFF",
      aiBubble: "#1E1E1E",
      aiText: "#E5E5E5",
    },
  },
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

interface ChatSettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  characterName: string
  characterEmoji: string
  chatId: string
  onChatThemeChange?: (theme: ChatThemeId) => void
  onClearChat?: () => void
  onLeaveChat?: () => void
}

const timelineEvents = [
  { id: "1", title: "첫 만남", date: "2024년 3월 1일" },
  { id: "2", title: "이무기의 생일", date: "2024년 4월 15일" },
  { id: "3", title: "우리의 100일", date: "2024년 6월 9일" },
]

export function ChatSettingsDrawer({ 
  isOpen, 
  onClose, 
  characterName, 
  characterEmoji,
  chatId,
  onChatThemeChange,
  onClearChat,
  onLeaveChat,
}: ChatSettingsDrawerProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [selectedChatTheme, setSelectedChatTheme] = useState<ChatThemeId>("system")
  const [spicyLevel, setSpicyLevel] = useState(50)
  const [uniqueLevel, setUniqueLevel] = useState(70)
  const [sharedMedia, setSharedMedia] = useState<ChatMediaItem[]>([])

  // Load chat-specific theme on mount
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem(`chat-theme-${chatId}`) as ChatThemeId
    if (savedTheme) {
      setSelectedChatTheme(savedTheme)
    }
    const syncMedia = () => setSharedMedia(getChatMedia(chatId, characterName))
    syncMedia()
    window.addEventListener("storychat-chat-media-updated", syncMedia)
    window.addEventListener("storage", syncMedia)
    return () => {
      window.removeEventListener("storychat-chat-media-updated", syncMedia)
      window.removeEventListener("storage", syncMedia)
    }
  }, [characterName, chatId])

  const handleChatThemeChange = (theme: ChatThemeId) => {
    setSelectedChatTheme(theme)
    if (theme === "system") {
      localStorage.removeItem(`chat-theme-${chatId}`)
    } else {
      localStorage.setItem(`chat-theme-${chatId}`, theme)
    }
    onChatThemeChange?.(theme)
  }

  // Get the actual preview theme based on system setting
  const getPreviewTheme = (themeConfig: ChatThemeConfig) => {
    if (themeConfig.id === "system") {
      // Before mount, default to light preview to match SSR output
      if (!mounted) return chatThemes[1].preview
      // Return preview based on current app theme
      return resolvedTheme === "dark" ? chatThemes[2].preview : chatThemes[1].preview
    }
    return themeConfig.preview
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/70 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 w-[80%] max-w-sm overflow-y-auto border-l border-border bg-card shadow-2xl shadow-black/60 transition-transform duration-300 ease-out dark:border-white/25 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12),-24px_0_48px_rgba(0,0,0,0.72)]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card px-4 py-4 flex items-center justify-between border-b border-border dark:border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <span className="text-lg">{characterEmoji}</span>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{characterName}</h2>
              <p className="text-xs text-muted-foreground">세계관 날짜: 2024년 6월 15일</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-6">
          {/* Chat Theme Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">채팅 테마</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {chatThemes.map((theme) => {
                const isSelected = selectedChatTheme === theme.id
                const previewColors = getPreviewTheme(theme)
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleChatThemeChange(theme.id)}
                    className={cn(
                      "relative p-2 rounded-lg transition-all duration-200",
                      "bg-muted hover:bg-muted",
                      isSelected && "ring-2 ring-primary"
                    )}
                  >
                    {/* Mini Preview */}
                    <div 
                      className="rounded-md p-2 mb-1.5 aspect-[4/3]"
                      style={{ backgroundColor: previewColors.bg }}
                    >
                      {/* AI Bubble */}
                      <div 
                        className="w-3/4 h-2 rounded-full mb-1"
                        style={{ backgroundColor: previewColors.aiBubble }}
                      />
                      {/* User Bubble */}
                      <div 
                        className="w-1/2 h-2 rounded-full ml-auto"
                        style={{ backgroundColor: previewColors.userBubble }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-muted-foreground">{theme.icon}</span>
                      <p className={cn(
                        "text-xs font-medium",
                        isSelected ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {theme.label}
                      </p>
                    </div>

                    {/* Selected Check */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {selectedChatTheme === "system" 
                ? "앱의 라이트/다크 모드 설정을 따릅니다" 
                : "이 채팅방에서만 적용됩니다"}
            </p>
          </section>

          {/* Timeline Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">타임라인</h3>
            </div>
            <div className="bg-muted rounded-lg overflow-hidden">
              {timelineEvents.map((event, index) => (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5",
                    index !== timelineEvents.length - 1 && "border-b border-border"
                  )}
                >
                  <span className="text-sm text-foreground">{event.title}</span>
                  <span className="text-xs text-muted-foreground">{event.date}</span>
                </div>
              ))}
            </div>
            <Link
              href="/timeline"
              onClick={onClose}
              className="block w-full mt-2 py-2 text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              전체 보기 →
            </Link>
          </section>

          {/* Personality Tuning Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">성격 튜닝</h3>
            </div>
            <div className="space-y-4">
              {/* Spicy Level */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">매운맛</span>
                  <span className="text-xs text-muted-foreground">{spicyLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={spicyLevel}
                  onChange={(e) => setSpicyLevel(Number(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                />
              </div>

              {/* Unique Level */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">독특함</span>
                  <span className="text-xs text-muted-foreground">{uniqueLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={uniqueLevel}
                  onChange={(e) => setUniqueLevel(Number(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                />
              </div>
            </div>
          </section>

          {/* Shared Media Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">공유 미디어</h3>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {sharedMedia.slice(0, 3).map((media) => (
                <div
                  key={media.id}
                  className="aspect-square overflow-hidden rounded-md bg-muted"
                >
                  <img src={media.imageUrl} alt={media.title} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
            <Link
              href={`/chat/${chatId}/media`}
              onClick={onClose}
              className="block w-full mt-2 py-2 text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              전체 보기 →
            </Link>
          </section>

          {/* My Persona Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">내 자아</h3>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">지은</p>
                  <p className="text-xs text-muted-foreground">22세 / 대학생</p>
                </div>
                <Link
                  href="/my-works?tab=personas"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-foreground bg-muted hover:bg-accent rounded-md transition-colors"
                >
                  수정
                </Link>
              </div>
            </div>
          </section>
        </div>

        {/* Danger Zone */}
        <div className="px-4 py-6 mt-4 border-t border-border dark:border-white/20 space-y-2">
          <button
            onClick={onClearChat}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-700 bg-red-50 py-3 text-sm font-semibold text-red-950 transition-colors hover:bg-red-100 dark:border-red-500 dark:bg-red-950 dark:text-red-50 dark:hover:bg-red-900"
          >
            <Trash2 className="w-4 h-4" />
            대화 초기화
          </button>
          <button
            onClick={onLeaveChat}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-700 bg-red-50 py-3 text-sm font-semibold text-red-950 transition-colors hover:bg-red-100 dark:border-red-500 dark:bg-red-950 dark:text-red-50 dark:hover:bg-red-900"
          >
            <LogOut className="w-4 h-4" />
            채팅방 나가기
          </button>
        </div>
      </div>
    </>
  )
}
