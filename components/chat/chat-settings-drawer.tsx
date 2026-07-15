"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { X, Palette, SlidersHorizontal, Trash2, LogOut, Check, Sun, Moon, MessageSquare, Send, Gem } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { ConfirmModal } from "@/components/ui/app-modal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CHAT_MEMORY_MEMO_MAX_LENGTH,
  getChatMemoryMemo,
  normalizeChatMemoryMemo,
  saveChatMemoryMemo,
} from "@/lib/chat-memory-storage"
import { getChatMedia, type ChatMediaItem } from "@/lib/chat-media-storage"
import type { StoryPersona } from "@/lib/storychat-storage"
import { AUTO_COMMAND_IDS, MAX_COMMAND_SUGGESTIONS, SLASH_COMMANDS } from "@/lib/chat-types"
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
type AppThemeMode = "light" | "dark"

const CHAT_THEME_MODE_SUGGESTION_DISMISSED_KEY = "storychat_chat_theme_mode_suggestion_dismissed"

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
      aiBubble: "#363636",
      aiText: "#F5F5F5",
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

function getPreferredAppThemeForChatTheme(chatTheme: ChatThemeId): AppThemeMode {
  return chatTheme === "dark" ? "dark" : "light"
}

function getAppThemeLabel(theme: AppThemeMode) {
  return theme === "dark" ? "다크 모드" : "라이트 모드"
}

function getChatThemeLabel(themeId: ChatThemeId) {
  return chatThemes.find((theme) => theme.id === themeId)?.label ?? "선택한"
}

interface ChatSettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  characterName: string
  characterEmoji: string
  chatId: string
  creditBalance?: number
  currentPersona?: StoryPersona
  canShowProgressStatus?: boolean
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
  currentPersona,
  canShowProgressStatus = false,
  onChatThemeChange,
  onReadingSettingsChange,
  onClearChat,
  onLeaveChat,
}: ChatSettingsDrawerProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [selectedChatTheme, setSelectedChatTheme] = useState<ChatThemeId>("light")
  const [themeModeSuggestion, setThemeModeSuggestion] = useState<{
    chatTheme: ChatThemeId
    targetTheme: AppThemeMode
  } | null>(null)
  const [dontShowThemeModeSuggestion, setDontShowThemeModeSuggestion] = useState(false)
  const [readingSettings, setReadingSettings] = useState<ChatReadingSettings>({
    textSize: 13,
    textSizeUserSet: false,
    lineHeight: 1.5,
    showStoryStatus: true,
    alwaysShowCommandSuggestions: false,
    selectedCommandIds: [],
    testBypassRoleplayRules: false,
    testRawRoleplayStream: false,
  })
  const [sharedMedia, setSharedMedia] = useState<ChatMediaItem[]>([])
  const [isMemoryMemoOpen, setIsMemoryMemoOpen] = useState(false)
  const [memoryMemoDraft, setMemoryMemoDraft] = useState("")
  const memoryTextareaRef = useRef<HTMLTextAreaElement>(null)
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
    if (theme === selectedChatTheme) return

    setSelectedChatTheme(theme)
    localStorage.setItem(`chat-theme-${chatId}`, theme)
    onChatThemeChange?.(theme)

    const targetTheme = getPreferredAppThemeForChatTheme(theme)
    const isDismissed = localStorage.getItem(CHAT_THEME_MODE_SUGGESTION_DISMISSED_KEY) === "true"
    if (!isDismissed && targetTheme !== resolvedTheme) {
      setDontShowThemeModeSuggestion(false)
      setThemeModeSuggestion({ chatTheme: theme, targetTheme })
    }
  }

  const closeThemeModeSuggestion = () => {
    if (dontShowThemeModeSuggestion) {
      localStorage.setItem(CHAT_THEME_MODE_SUGGESTION_DISMISSED_KEY, "true")
    }
    setThemeModeSuggestion(null)
  }

  const confirmThemeModeSuggestion = () => {
    if (!themeModeSuggestion) return
    if (dontShowThemeModeSuggestion) {
      localStorage.setItem(CHAT_THEME_MODE_SUGGESTION_DISMISSED_KEY, "true")
    }
    setTheme(themeModeSuggestion.targetTheme)
    setThemeModeSuggestion(null)
  }

  const updateReadingSettings = (nextSettings: ChatReadingSettings) => {
    setReadingSettings(nextSettings)
    saveChatReadingSettings(nextSettings, chatId)
    onReadingSettingsChange?.(nextSettings)
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
      alwaysShowCommandSuggestions: nextSelected.length > 0,
      selectedCommandIds: nextSelected,
    })
  }

  // Get the actual preview theme based on system setting
  const getPreviewTheme = (themeConfig: ChatThemeConfig) => {
    void mounted
    void resolvedTheme
    return themeConfig.preview
  }

  const openMemoryMemo = () => {
    setMemoryMemoDraft(getChatMemoryMemo(chatId))
    setIsMemoryMemoOpen(true)
  }

  const insertMemoryToken = (token: string) => {
    const textarea = memoryTextareaRef.current
    const selectionStart = textarea?.selectionStart ?? memoryMemoDraft.length
    const selectionEnd = textarea?.selectionEnd ?? memoryMemoDraft.length
    const nextValue = normalizeChatMemoryMemo(
      `${memoryMemoDraft.slice(0, selectionStart)}${token}${memoryMemoDraft.slice(selectionEnd)}`,
    )

    setMemoryMemoDraft(nextValue)
    window.requestAnimationFrame(() => {
      textarea?.focus()
      const nextCursor = Math.min(selectionStart + token.length, nextValue.length)
      textarea?.setSelectionRange(nextCursor, nextCursor)
    })
  }

  const saveMemoryMemo = () => {
    saveChatMemoryMemo(chatId, memoryMemoDraft.trim())
    setIsMemoryMemoOpen(false)
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
          isOpen ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 dark:border-white/20">
          <h2 className="text-base font-bold text-foreground">채팅방 설정</h2>
          <div className="flex items-center gap-2">
            <Link
              href="/credits"
              onClick={onClose}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <Gem className="h-3.5 w-3.5 text-primary" />
              <span className="tabular-nums">{mounted ? (creditBalance ?? 0).toLocaleString() : "-"} 크레딧</span>
            </Link>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <SettingsSquareLink
              href={`/chat/${chatId}/media`}
              label="갤러리"
              onClick={onClose}
              backgroundImage={sharedMedia[0]?.imageUrl}
            />
            <PersonaSquareButton
              persona={currentPersona}
              href={
                currentPersona
                  ? `/my-works?tab=personas&detailType=personas&detailId=${currentPersona.id}`
                  : "/my-works?tab=personas"
              }
              onClick={onClose}
            />
            <div className="grid aspect-square min-h-[82px] gap-2">
              <SettingsMiniLink href="/timeline" label="타임라인" onClick={onClose} />
              <SettingsMiniButton label="기억 메모" onClick={openMemoryMemo} />
            </div>
          </div>

          <section className="space-y-3">
            <SectionTitle icon={<Palette className="h-4 w-4" />} title="채팅 표시" />
            <div className="space-y-3 rounded-xl border border-border bg-muted/70 p-3">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">채팅 테마</p>
                  <p className="text-[11px] text-muted-foreground">현재 채팅방에만 적용되는 테마입니다.</p>
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
                onChange={(value) => updateReadingSettings({ ...readingSettings, textSize: value, textSizeUserSet: true })}
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
              {canShowProgressStatus && (
                <ToggleRow
                  title="진행상황 표시"
                  description="챕터나 퀘스트 진행 상태를 상단에 표시합니다."
                  checked={readingSettings.showStoryStatus}
                  onClick={() => updateReadingSettings({ ...readingSettings, showStoryStatus: !readingSettings.showStoryStatus })}
                />
              )}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle icon={<SlidersHorizontal className="h-4 w-4" />} title="대화 보조" />
            <div className="space-y-3 rounded-xl border border-border bg-muted/70 p-3">
              <div>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">자동 실행할 명령어 선택</p>
                    <p className="text-[11px] text-muted-foreground">선택한 명령어를 답변 뒤에 실행합니다. 선택하지 않으면 실행하지 않습니다.</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {validSelectedCommandIds.length}/{MAX_COMMAND_SUGGESTIONS}
                  </span>
                </div>
                <div className="rounded-lg border border-border bg-background/50 px-2.5 py-2">
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
              </div>
              {process.env.NODE_ENV !== "production" && (
                <>
                  <ToggleRow
                    title="테스트: 검수/수리 우회"
                    description="기본 문체는 유지하고 앱 검수만 건너뜁니다."
                    checked={readingSettings.testBypassRoleplayRules}
                    onClick={() => updateReadingSettings({
                      ...readingSettings,
                      testBypassRoleplayRules: !readingSettings.testBypassRoleplayRules,
                    })}
                  />
                  <ToggleRow
                    title="테스트: 검수 전 원문 로그"
                    description="Gemini 생성 청크를 브라우저 콘솔에 실시간 기록합니다."
                    checked={readingSettings.testRawRoleplayStream}
                    onClick={() => updateReadingSettings({
                      ...readingSettings,
                      testRawRoleplayStream: !readingSettings.testRawRoleplayStream,
                    })}
                  />
                </>
              )}
            </div>
          </section>

          <section className="pb-5">
            <div className="space-y-2 rounded-xl border border-border bg-muted/70 p-3">
              <div>
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
      <Dialog open={isMemoryMemoOpen} onOpenChange={setIsMemoryMemoOpen}>
        <DialogContent className="max-h-[86dvh] overflow-y-auto border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>기억 메모</DialogTitle>
            <DialogDescription>
              작품이나 캐릭터 설정을 덮어쓰고 싶은 내용을 적어두면 다음 답변 생성에 우선 반영됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border border-border/70 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <div className="mb-2 font-semibold text-foreground">작성 예시</div>
              <pre className="whitespace-pre-wrap font-sans">{`#{유저} 정보
- 30살

#{유저}와 {캐릭터}의 관계
- {유저}는 {캐릭터}와 친구이다.

#이무기와 산신령의 관계
- 산신령은 이무기가 선한일 100개를 하면 용으로 승격시켜 주기로 한다.`}</pre>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => insertMemoryToken("{유저}")}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {"{유저}"} 입력
              </button>
              <button
                type="button"
                onClick={() => insertMemoryToken("{캐릭터}")}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {"{캐릭터}"} 입력
              </button>
            </div>

            <div className="space-y-1.5">
              <textarea
                ref={memoryTextareaRef}
                value={memoryMemoDraft}
                maxLength={CHAT_MEMORY_MEMO_MAX_LENGTH}
                onChange={(event) => setMemoryMemoDraft(normalizeChatMemoryMemo(event.target.value))}
                placeholder="#{유저} 정보&#10;- 30살&#10;&#10;#{유저}와 {캐릭터}의 관계&#10;- {유저}는 {캐릭터}와 친구이다."
                className="min-h-[220px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
              />
              <div className="text-right text-xs text-muted-foreground">
                {memoryMemoDraft.length}/{CHAT_MEMORY_MEMO_MAX_LENGTH}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsMemoryMemoOpen(false)}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              취소
            </button>
            <button
              type="button"
              onClick={saveMemoryMemo}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              저장
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(themeModeSuggestion)}
        onOpenChange={(open) => {
          if (!open) closeThemeModeSuggestion()
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="w-[min(calc(100vw-2rem),340px)] gap-0 rounded-[20px] border-0 bg-[#FFFFFF] px-5 pb-5 pt-6 text-[#1A1A1A] shadow-2xl shadow-black/25 dark:bg-[#2E2E2C] dark:text-[#F5F5F3]"
        >
          <button
            type="button"
            onClick={closeThemeModeSuggestion}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[#9B9A93] transition-colors hover:bg-black/5 hover:text-[#1A1A1A] dark:text-[#888780] dark:hover:bg-white/10 dark:hover:text-[#F5F5F3]"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-[14px] flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary">
            <Palette className="h-[22px] w-[22px]" />
          </div>

          <DialogHeader className="gap-2 text-left">
            <DialogTitle className="text-[18px] font-medium leading-tight tracking-normal text-[#1A1A1A] dark:text-[#F5F5F3]">
              앱 테마도 맞출까요?
            </DialogTitle>
            <DialogDescription className="text-[14px] font-normal leading-[1.6] text-[#6B6B68] dark:text-[#B4B2A9]">
              {themeModeSuggestion
                ? `${getChatThemeLabel(themeModeSuggestion.chatTheme)} 채팅 테마는 ${getAppThemeLabel(themeModeSuggestion.targetTheme)}에서 더 자연스럽게 보여요. 앱 전체 테마를 ${getAppThemeLabel(themeModeSuggestion.targetTheme)}로 전환할까요?`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <label className="mt-5 flex w-fit items-center gap-2.5 text-[13px] font-medium leading-snug text-[#1A1A1A] dark:text-[#F5F5F3]">
            <input
              type="checkbox"
              checked={dontShowThemeModeSuggestion}
              onChange={(event) => setDontShowThemeModeSuggestion(event.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span>다시 보지 않기</span>
          </label>

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={confirmThemeModeSuggestion}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {themeModeSuggestion ? `${getAppThemeLabel(themeModeSuggestion.targetTheme)}로 전환` : "전환"}
            </button>
            <button
              type="button"
              onClick={closeThemeModeSuggestion}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-transparent px-4 text-[14px] font-medium text-[#6B6B68] transition-colors hover:bg-black/5 hover:text-[#1A1A1A] dark:text-[#B4B2A9] dark:hover:bg-white/10 dark:hover:text-[#F5F5F3]"
            >
              그대로 두기
            </button>
          </div>
        </DialogContent>
      </Dialog>

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

function SettingsSquareLink({
  href,
  label,
  onClick,
  backgroundImage,
  icon,
}: {
  href: string
  label: string
  onClick: () => void
  backgroundImage?: string
  icon?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group relative flex aspect-square min-h-[72px] overflow-hidden rounded-lg border border-border bg-background/60 p-2 text-center transition-colors hover:bg-accent",
        backgroundImage && "bg-cover bg-center",
      )}
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
    >
      {backgroundImage && (
        <span className="absolute inset-0 bg-[rgba(999,999,999,0.8)] transition-colors group-hover:bg-[rgba(999,999,999,0.72)] dark:bg-black/35 dark:group-hover:bg-black/25" />
      )}
      <span
        className={cn(
          "relative mt-auto flex w-full items-center justify-center gap-1.5 text-center text-sm font-semibold leading-tight",
          backgroundImage ? "text-neutral-950 drop-shadow-sm dark:text-white dark:drop-shadow" : "text-foreground",
        )}
      >
        {icon}
        <span className="block truncate">{label}</span>
      </span>
    </Link>
  )
}

function SettingsMiniLink({
  href,
  label,
  onClick,
}: {
  href: string
  label: string
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex min-h-0 items-center justify-center rounded-xl border border-border bg-muted/40 px-2 text-center text-xs font-semibold text-foreground transition-colors hover:bg-muted"
    >
      {label}
    </Link>
  )
}

function SettingsMiniButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-0 items-center justify-center rounded-xl border border-border bg-muted/40 px-2 text-center text-xs font-semibold text-foreground transition-colors hover:bg-muted"
    >
      {label}
    </button>
  )
}

function PersonaSquareButton({
  persona,
  href,
  onClick,
}: {
  persona?: StoryPersona
  href: string
  onClick: () => void
}) {
  const label = "현재 자아"
  const fallback = persona?.name?.trim()?.slice(0, 1) || "나"

  return (
    <Link
      href={href}
      onClick={onClick}
      className="group relative flex aspect-square min-h-[82px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-border bg-muted/40 p-2 text-center transition-colors hover:bg-muted"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background ring-1 ring-border transition-opacity group-hover:opacity-35">
        {persona?.avatarUrl ? (
          <img
            src={persona.avatarUrl}
            alt={persona.name || label}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-base font-bold text-muted-foreground">
            {fallback}
          </span>
        )}
      </span>
      <span className="mt-auto min-w-0 max-w-full leading-tight transition-opacity group-hover:opacity-20">
        {persona?.name && (
          <span className="block truncate text-[10px] font-medium leading-tight text-muted-foreground">{persona.name}</span>
        )}
        <span className="block truncate text-sm font-semibold leading-tight text-foreground">{label}</span>
      </span>
      <span className="absolute inset-0 flex items-center justify-center bg-background/45 text-sm font-semibold text-foreground opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
        변경
      </span>
    </Link>
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
          "h-6 w-11 shrink-0 rounded-full border p-0.5 transition-colors",
          checked
            ? "border-blue-500 bg-blue-500 dark:border-sky-400 dark:bg-sky-500"
            : "border-border bg-border dark:bg-neutral-700",
        )}
        aria-pressed={checked}
      >
        <span
          className={cn(
            "block h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform dark:bg-white dark:ring-white/30",
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

