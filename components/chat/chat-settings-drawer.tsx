"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { X, Clock, Palette, SlidersHorizontal, Image as ImageIcon, User, Trash2, LogOut, Check, Sun, Moon, MessageSquare, Send, Gem } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { ConfirmModal } from "@/components/ui/app-modal"
import { getChatMedia, type ChatMediaItem } from "@/lib/chat-media-storage"
import { AUTO_COMMAND_IDS, DEFAULT_COMMAND_SUGGESTION_IDS, MAX_COMMAND_SUGGESTIONS, SLASH_COMMANDS } from "@/lib/chat-types"
import {
  CHAT_LINE_HEIGHT_MAX,
  CHAT_LINE_HEIGHT_MIN,
  CHAT_TEXT_SIZE_MAX,
  CHAT_TEXT_SIZE_MIN,
  getChatReadingSettings,
  saveChatReadingSettings,
  type ChatReadingSettings,
} from "@/lib/chat-settings-storage"

type ChatThemeId = "light" | "dark" | "message" | "messenger"

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
  creditBalance?: number
  onChatThemeChange?: (theme: ChatThemeId) => void
  onReadingSettingsChange?: (settings: ChatReadingSettings) => void
  onClearChat?: () => void
  onLeaveChat?: () => void
}

export function ChatSettingsDrawer({ 
  isOpen, 
  onClose, 
  characterName, 
  characterEmoji,
  chatId,
  creditBalance,
  onChatThemeChange,
  onReadingSettingsChange,
  onClearChat,
  onLeaveChat,
}: ChatSettingsDrawerProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [selectedChatTheme, setSelectedChatTheme] = useState<ChatThemeId>("light")
  const [readingSettings, setReadingSettings] = useState<ChatReadingSettings>({
    textSize: 16,
    lineHeight: 1.5,
    showStoryStatus: true,
    alwaysShowCommandSuggestions: false,
    selectedCommandIds: [],
  })
  const [sharedMedia, setSharedMedia] = useState<ChatMediaItem[]>([])
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)
  const autoCommandOptions = SLASH_COMMANDS.filter((command) => AUTO_COMMAND_IDS.includes(command.id))
  const validSelectedCommandIds = readingSettings.selectedCommandIds.filter((id) =>
    autoCommandOptions.some((command) => command.id === id),
  )

  // Load chat-specific theme on mount
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem(`chat-theme-${chatId}`)
    if (savedTheme && chatThemes.some((theme) => theme.id === savedTheme)) {
      setSelectedChatTheme(savedTheme as ChatThemeId)
    } else {
      localStorage.setItem(`chat-theme-${chatId}`, "light")
      setSelectedChatTheme("light")
    }
    const savedReadingSettings = getChatReadingSettings(chatId)
    setReadingSettings(savedReadingSettings)
    onReadingSettingsChange?.(savedReadingSettings)
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
    localStorage.setItem(`chat-theme-${chatId}`, theme)
    onChatThemeChange?.(theme)
  }

  const updateReadingSettings = (nextSettings: ChatReadingSettings) => {
    setReadingSettings(nextSettings)
    saveChatReadingSettings(nextSettings, chatId)
    onReadingSettingsChange?.(nextSettings)
  }

  const toggleAlwaysShowCommands = () => {
    const nextEnabled = !readingSettings.alwaysShowCommandSuggestions
    updateReadingSettings({
      ...readingSettings,
      alwaysShowCommandSuggestions: nextEnabled,
      selectedCommandIds: nextEnabled && validSelectedCommandIds.length === 0
        ? DEFAULT_COMMAND_SUGGESTION_IDS
        : validSelectedCommandIds,
    })
  }

  const toggleCommandSelection = (commandId: string) => {
    const selected = validSelectedCommandIds
    const nextSelected = selected.includes(commandId)
      ? selected.filter((id) => id !== commandId)
      : selected.length < MAX_COMMAND_SUGGESTIONS
        ? [...selected, commandId]
        : selected

    updateReadingSettings({
      ...readingSettings,
      selectedCommandIds: nextSelected,
    })
  }

  // Get the actual preview theme based on system setting
  const getPreviewTheme = (themeConfig: ChatThemeConfig) => {
    void mounted
    void resolvedTheme
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

        <div className="px-4 py-3 space-y-4">
          <Link
            href="/credits"
            onClick={onClose}
            className="flex items-center justify-between rounded-full border border-border bg-muted px-3 py-2 transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-2">
              <Gem className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">크레딧</span>
            </div>
            <span className="text-sm font-bold tabular-nums text-foreground">
              {(creditBalance ?? 0).toLocaleString()}
            </span>
          </Link>

          <section className="space-y-3">
            <SectionTitle icon={<Palette className="h-4 w-4" />} title="채팅 표시" />
            <div className="space-y-3 rounded-xl border border-border bg-muted/70 p-3">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">채팅 테마</p>
                  <p className="text-[11px] text-muted-foreground">채팅방에만 적용되는 테마입니다.</p>
                </div>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
                  {chatThemes.map((theme) => {
                    const isSelected = selectedChatTheme === theme.id
                    const previewColors = getPreviewTheme(theme)
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleChatThemeChange(theme.id)}
                        className={cn(
                          "relative flex min-w-[72px] flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background/60 text-muted-foreground hover:bg-accent",
                        )}
                      >
                        <div className="h-7 w-10 rounded-md p-1" style={{ backgroundColor: previewColors.bg }}>
                          <div className="mb-1 h-1.5 w-7 rounded-full" style={{ backgroundColor: previewColors.aiBubble }} />
                          <div className="ml-auto h-1.5 w-5 rounded-full" style={{ backgroundColor: previewColors.userBubble }} />
                        </div>
                        <span className="truncate font-medium">{theme.label}</span>
                        {isSelected && (
                          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                            <Check className="h-2.5 w-2.5 text-primary-foreground" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <SliderSetting
                label="글자 크기"
                valueText={`${readingSettings.textSize}px`}
                min={CHAT_TEXT_SIZE_MIN}
                max={CHAT_TEXT_SIZE_MAX}
                value={readingSettings.textSize}
                onChange={(value) => updateReadingSettings({ ...readingSettings, textSize: value })}
              />
              <SliderSetting
                label="줄간격"
                valueText={readingSettings.lineHeight.toFixed(1)}
                min={CHAT_LINE_HEIGHT_MIN}
                max={CHAT_LINE_HEIGHT_MAX}
                step={0.1}
                value={readingSettings.lineHeight}
                onChange={(value) => updateReadingSettings({ ...readingSettings, lineHeight: value })}
              />
              <ToggleRow
                title="상태창 표시"
                description="현재 장면과 진행 상태를 상단에 표시합니다."
                checked={readingSettings.showStoryStatus}
                onClick={() => updateReadingSettings({ ...readingSettings, showStoryStatus: !readingSettings.showStoryStatus })}
              />
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle icon={<SlidersHorizontal className="h-4 w-4" />} title="대화 보조" />
            <div className="space-y-3 rounded-xl border border-border bg-muted/70 p-3">
              <ToggleRow
                title="명령어 자동 실행"
                description="선택한 명령어를 답변 뒤에 실행합니다."
                checked={readingSettings.alwaysShowCommandSuggestions}
                onClick={toggleAlwaysShowCommands}
              />
              {readingSettings.alwaysShowCommandSuggestions && (
                <div className="rounded-lg border border-border bg-background/50 px-2.5 py-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">표시할 명령어 선택</p>
                    <span className="text-[11px] text-muted-foreground">
                      {validSelectedCommandIds.length}/{MAX_COMMAND_SUGGESTIONS}
                    </span>
                  </div>
                  <div className="grid gap-1">
                    {autoCommandOptions.map((command) => {
                      const checked = validSelectedCommandIds.includes(command.id)
                      const disabled = !checked && validSelectedCommandIds.length >= MAX_COMMAND_SUGGESTIONS
                      return (
                        <label
                          key={command.id}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                            disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:bg-accent",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleCommandSelection(command.id)}
                            className="h-4 w-4 accent-primary"
                          />
                          <span className="text-base leading-none">{command.icon}</span>
                          <span className="font-medium text-foreground">/{command.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
              <CompactInfoRow
                icon={<User className="h-4 w-4" />}
                title="현재 자아"
                description="지은 · 22세 · 대학생"
                action={
                  <Link
                    href="/my-works?tab=personas"
                    onClick={onClose}
                    className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
                  >
                    변경
                  </Link>
                }
              />
            </div>
          </section>

          <section className="space-y-3 pb-5">
            <SectionTitle icon={<ImageIcon className="h-4 w-4" />} title="관리" />
            <div className="space-y-2 rounded-xl border border-border bg-muted/70 p-3">
              <CompactInfoRow
                icon={<ImageIcon className="h-4 w-4" />}
                title="공유 미디어"
                description={
                  sharedMedia.length > 0
                    ? `생성/업로드 이미지 ${sharedMedia.length}개`
                    : "아직 공유된 미디어가 없어요."
                }
                action={
                  <Link
                    href={`/chat/${chatId}/media`}
                    onClick={onClose}
                    className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
                  >
                    전체 보기
                  </Link>
                }
              />
              {sharedMedia.length > 0 && (
                <div className="flex gap-1.5 pl-8">
                  {sharedMedia.slice(0, 3).map((media) => (
                    <MediaThumb key={media.id} media={media} />
                  ))}
                </div>
              )}

              <CompactInfoRow
                icon={<Clock className="h-4 w-4" />}
                title="타임라인"
                description="중요한 대화 흐름을 확인합니다."
                action={
                  <Link
                    href="/timeline"
                    onClick={onClose}
                    className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
                  >
                    보기
                  </Link>
                }
              />

              <div className="border-t border-border pt-2">
                <DangerRow
                  icon={<Trash2 className="h-4 w-4" />}
                  title="대화 초기화"
                  description="현재 채팅 메시지를 모두 삭제합니다."
                  buttonText="초기화"
                  onClick={onClearChat}
                />
                <DangerRow
                  icon={<LogOut className="h-4 w-4" />}
                  title="채팅방 나가기"
                  description="이 채팅방에서 나갑니다."
                  buttonText="나가기"
                  onClick={() => setIsLeaveConfirmOpen(true)}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
      <ConfirmModal
        open={isLeaveConfirmOpen}
        title="채팅방 나가기"
        message="이 채팅방에서 나갈까요?"
        confirmText="나가기"
        destructive
        onOpenChange={setIsLeaveConfirmOpen}
        onConfirm={() => {
          setIsLeaveConfirmOpen(false)
          onLeaveChat?.()
        }}
      />
    </>
  )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  )
}

function SliderSetting({
  label,
  valueText,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  valueText: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{valueText}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-background accent-primary [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
      />
    </div>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onClick,
}: {
  title: string
  description: string
  checked: boolean
  onClick: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-background/50 px-2.5 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors",
          checked ? "bg-primary" : "bg-border",
        )}
        aria-pressed={checked}
      >
        <span
          className={cn(
            "block h-5 w-5 rounded-full bg-white transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  )
}

function CompactInfoRow({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-background/50 px-2.5 py-2">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

function DangerRow({
  icon,
  title,
  description,
  buttonText,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  buttonText: string
  onClick?: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2.5 py-2">
      <span className="shrink-0 text-red-600 dark:text-red-300">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="rounded-md border border-red-700 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-950 transition-colors hover:bg-red-100 dark:border-red-500 dark:bg-red-950 dark:text-red-50 dark:hover:bg-red-900"
      >
        {buttonText}
      </button>
    </div>
  )
}

function MediaThumb({ media }: { media: ChatMediaItem }) {
  const [failed, setFailed] = useState(false)

  return (
    <div className="h-12 w-12 overflow-hidden rounded-md border border-border bg-background">
      {!failed ? (
        <img
          src={media.imageUrl}
          alt={media.title}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}
