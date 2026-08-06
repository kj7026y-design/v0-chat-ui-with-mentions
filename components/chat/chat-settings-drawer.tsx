"use client";

import { useTheme } from "@/components/theme-provider";
import { ConfirmModal } from "@/components/ui/app-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getChatMedia, type ChatMediaItem } from "@/lib/chat-media-storage";
import {
  CHAT_MEMORY_MEMO_MAX_LENGTH,
  getChatMemoryMemo,
  normalizeChatMemoryMemo,
  saveChatMemoryMemo,
} from "@/lib/chat-memory-storage";
import {
  CHAT_LINE_HEIGHT_MAX,
  CHAT_LINE_HEIGHT_MIN,
  CHAT_TEXT_SIZE_MAX,
  CHAT_TEXT_SIZE_MIN,
  getChatReadingSettings,
  saveChatReadingSettings,
  type ChatReadingSettings,
} from "@/lib/chat-settings-storage";
import {
  AUTO_COMMAND_IDS,
  MAX_COMMAND_SUGGESTIONS,
  SLASH_COMMANDS,
} from "@/lib/chat-types";
import type { StoryPersona } from "@/lib/storychat-storage";
import { withReturnTo } from "@/lib/safe-navigation";
import { cn } from "@/lib/utils";
import {
  ChartNoAxesColumnIncreasing,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FlaskConical,
  Gem,
  ImageIcon,
  LogOut,
  MessageSquare,
  MessageSquareHeart,
  MessageSquareText,
  Moon,
  NotebookTabs,
  Palette,
  Send,
  Smartphone,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ChatThemeId = "light" | "dark" | "message" | "messenger";
type AppThemeMode = "light" | "dark";

const CHAT_THEME_MODE_SUGGESTION_DISMISSED_KEY =
  "storychat_chat_theme_mode_suggestion_dismissed";

interface ChatThemeConfig {
  id: ChatThemeId;
  label: string;
  icon: React.ReactNode;
  preview: {
    bg: string;
    userBubble: string;
    userText: string;
    aiBubble: string;
    aiText: string;
  };
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
];

function getPreferredAppThemeForChatTheme(
  chatTheme: ChatThemeId,
): AppThemeMode {
  return chatTheme === "dark" ? "dark" : "light";
}

function getAppThemeLabel(theme: AppThemeMode) {
  return theme === "dark" ? "다크 모드" : "라이트 모드";
}

function getChatThemeLabel(themeId: ChatThemeId) {
  return chatThemes.find((theme) => theme.id === themeId)?.label ?? "선택한";
}

interface ChatSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  characterName: string;
  characterEmoji: string;
  chatId: string;
  creditBalance?: number;
  currentPersona?: StoryPersona;
  canShowProgressStatus?: boolean;
  onChatThemeChange?: (theme: ChatThemeId) => void;
  onReadingSettingsChange?: (settings: ChatReadingSettings) => void;
  onClearChat?: () => void;
  onLeaveChat?: () => void;
  onGalleryOpen?: () => void;
  onTimelineOpen?: () => void;
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
  onGalleryOpen,
  onTimelineOpen,
}: ChatSettingsDrawerProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [selectedChatTheme, setSelectedChatTheme] =
    useState<ChatThemeId>("light");
  const [themeModeSuggestion, setThemeModeSuggestion] = useState<{
    chatTheme: ChatThemeId;
    targetTheme: AppThemeMode;
  } | null>(null);
  const [dontShowThemeModeSuggestion, setDontShowThemeModeSuggestion] =
    useState(false);
  const [readingSettings, setReadingSettings] = useState<ChatReadingSettings>({
    textSize: 13,
    textSizeUserSet: false,
    lineHeight: 1.5,
    showStoryStatus: true,
    alwaysShowCommandSuggestions: false,
    selectedCommandIds: [],
    testBypassRoleplayRules: false,
    testRawRoleplayStream: false,
  });
  const [sharedMedia, setSharedMedia] = useState<ChatMediaItem[]>([]);
  const [isMemoryMemoOpen, setIsMemoryMemoOpen] = useState(false);
  const [memoryMemoDraft, setMemoryMemoDraft] = useState("");
  const memoryTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isDisplayOpen, setIsDisplayOpen] = useState(true);
  const [isAssistOpen, setIsAssistOpen] = useState(true);
  const [isDeveloperOpen, setIsDeveloperOpen] = useState(false);
  const autoCommandOptions = SLASH_COMMANDS.filter((command) =>
    AUTO_COMMAND_IDS.includes(command.id),
  );
  const validSelectedCommandIds = readingSettings.selectedCommandIds.filter(
    (id) => autoCommandOptions.some((command) => command.id === id),
  );

  // Load chat-specific theme on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem(`chat-theme-${chatId}`);
    if (savedTheme && chatThemes.some((theme) => theme.id === savedTheme)) {
      setSelectedChatTheme(savedTheme as ChatThemeId);
    } else {
      localStorage.setItem(`chat-theme-${chatId}`, "light");
      setSelectedChatTheme("light");
    }
    const savedReadingSettings = getChatReadingSettings(chatId);
    setReadingSettings(savedReadingSettings);
    onReadingSettingsChange?.(savedReadingSettings);
    const syncMedia = () => setSharedMedia(getChatMedia(chatId, characterName));
    syncMedia();
    window.addEventListener("storychat-chat-media-updated", syncMedia);
    window.addEventListener("storage", syncMedia);
    return () => {
      window.removeEventListener("storychat-chat-media-updated", syncMedia);
      window.removeEventListener("storage", syncMedia);
    };
  }, [characterName, chatId]);

  const handleChatThemeChange = (theme: ChatThemeId) => {
    if (theme === selectedChatTheme) return;

    setSelectedChatTheme(theme);
    localStorage.setItem(`chat-theme-${chatId}`, theme);
    onChatThemeChange?.(theme);

    const targetTheme = getPreferredAppThemeForChatTheme(theme);
    const isDismissed =
      localStorage.getItem(CHAT_THEME_MODE_SUGGESTION_DISMISSED_KEY) === "true";
    if (!isDismissed && targetTheme !== resolvedTheme) {
      setDontShowThemeModeSuggestion(false);
      setThemeModeSuggestion({ chatTheme: theme, targetTheme });
    }
  };

  const closeThemeModeSuggestion = () => {
    if (dontShowThemeModeSuggestion) {
      localStorage.setItem(CHAT_THEME_MODE_SUGGESTION_DISMISSED_KEY, "true");
    }
    setThemeModeSuggestion(null);
  };

  const confirmThemeModeSuggestion = () => {
    if (!themeModeSuggestion) return;
    if (dontShowThemeModeSuggestion) {
      localStorage.setItem(CHAT_THEME_MODE_SUGGESTION_DISMISSED_KEY, "true");
    }
    setTheme(themeModeSuggestion.targetTheme);
    setThemeModeSuggestion(null);
  };

  const updateReadingSettings = (nextSettings: ChatReadingSettings) => {
    setReadingSettings(nextSettings);
    saveChatReadingSettings(nextSettings, chatId);
    onReadingSettingsChange?.(nextSettings);
  };

  const toggleCommandSelection = (commandId: string) => {
    const selected = validSelectedCommandIds;
    const nextSelected = selected.includes(commandId)
      ? selected.filter((id) => id !== commandId)
      : selected.length < MAX_COMMAND_SUGGESTIONS
        ? [...selected, commandId]
        : selected;

    updateReadingSettings({
      ...readingSettings,
      alwaysShowCommandSuggestions: nextSelected.length > 0,
      selectedCommandIds: nextSelected,
    });
  };

  // Get the actual preview theme based on system setting
  const getPreviewTheme = (themeConfig: ChatThemeConfig) => {
    void mounted;
    void resolvedTheme;
    return themeConfig.preview;
  };

  const openMemoryMemo = () => {
    setMemoryMemoDraft(getChatMemoryMemo(chatId));
    setIsMemoryMemoOpen(true);
  };

  const insertMemoryToken = (token: string) => {
    const textarea = memoryTextareaRef.current;
    const selectionStart = textarea?.selectionStart ?? memoryMemoDraft.length;
    const selectionEnd = textarea?.selectionEnd ?? memoryMemoDraft.length;
    const nextValue = normalizeChatMemoryMemo(
      `${memoryMemoDraft.slice(0, selectionStart)}${token}${memoryMemoDraft.slice(selectionEnd)}`,
    );

    setMemoryMemoDraft(nextValue);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      const nextCursor = Math.min(
        selectionStart + token.length,
        nextValue.length,
      );
      textarea?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const saveMemoryMemo = () => {
    saveChatMemoryMemo(chatId, memoryMemoDraft.trim());
    setIsMemoryMemoOpen(false);
  };

  const chatReturnPath = `/chat/${encodeURIComponent(chatId)}`;

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/70 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[min(92vw,440px)] flex-col overflow-hidden border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out",
          isOpen
            ? "translate-x-0 pointer-events-auto"
            : "translate-x-full pointer-events-none",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="채팅방 설정"
      >
        <div className="z-10 flex min-h-14 items-center justify-between gap-3 border-b border-border bg-background px-5">
          <h2 className="text-[15px] font-bold text-foreground">채팅방 설정</h2>
          <div className="flex items-center gap-2">
            <Link
              href={withReturnTo("/credits", chatReturnPath)}
              onClick={onClose}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-setting-el px-3 text-[11px] font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <Gem className="h-4 w-4 text-muted-foreground" />
              <span className="tabular-nums">
                {mounted ? (creditBalance ?? 0).toLocaleString() : "-"}
              </span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-label="닫기"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <nav
            className="grid grid-cols-4 gap-1 border-b border-border px-4 py-5"
            aria-label="채팅방 바로가기"
          >
            <SettingsShortcut
              label="갤러리"
              onClick={() => {
                onClose();
                onGalleryOpen?.();
              }}
              icon={<ImageIcon className="h-5 w-5" />}
              badge={
                sharedMedia.length > 0 ? String(sharedMedia.length) : undefined
              }
            />
            <PersonaShortcut
              persona={currentPersona}
              href={
                withReturnTo(
                  currentPersona
                    ? `/my-works?tab=personas&detailType=personas&detailId=${currentPersona.id}`
                    : "/my-works?tab=personas",
                  chatReturnPath,
                )
              }
              onClick={onClose}
            />
            <SettingsShortcut
              label="타임라인"
              onClick={() => {
                onClose();
                onTimelineOpen?.();
              }}
              icon={<ChartNoAxesCombined className="h-5 w-5" />}
            />
            <SettingsShortcut
              label="기억 메모"
              onClick={openMemoryMemo}
              icon={<NotebookTabs className="h-5 w-5" />}
            />
          </nav>

          <SettingsSection
            title="채팅 표시"
            icon={<Palette className="h-4 w-4" />}
            open={isDisplayOpen}
            onToggle={() => setIsDisplayOpen((open) => !open)}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-2 min-[390px]:grid-cols-4">
                {chatThemes.map((theme) => {
                  const isSelected = selectedChatTheme === theme.id;
                  const previewColors = getPreviewTheme(theme);
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleChatThemeChange(theme.id)}
                      className={cn(
                        "relative flex min-w-0 flex-col gap-3 rounded-lg p-1.5 text-center bg-setting-el",
                        isSelected
                          ? "text-foreground bg-setting-el-selected"
                          : "text-muted-foreground",
                      )}
                      aria-pressed={isSelected}
                    >
                      <div
                        className="flex h-8 w-full items-center rounded-md px-1.5"
                        style={{ backgroundColor: previewColors.bg }}
                      >
                        <div
                          className="h-3 w-full rounded-sm"
                          style={{ backgroundColor: previewColors.userBubble }}
                        />
                      </div>
                      <span className="truncate text-[11px] font-medium">
                        {theme.label}
                      </span>
                      {isSelected && (
                        <span className="absolute -right-1 -top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary">
                          <Check
                            className="h-3 w-3 text-primary-foreground"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <SliderSetting
                label="글자 크기"
                valueText={`${readingSettings.textSize}px`}
                min={CHAT_TEXT_SIZE_MIN}
                max={CHAT_TEXT_SIZE_MAX}
                value={readingSettings.textSize}
                onChange={(value) =>
                  updateReadingSettings({
                    ...readingSettings,
                    textSize: value,
                    textSizeUserSet: true,
                  })
                }
              />
              <SliderSetting
                label="줄간격"
                valueText={readingSettings.lineHeight.toFixed(1)}
                min={CHAT_LINE_HEIGHT_MIN}
                max={CHAT_LINE_HEIGHT_MAX}
                step={0.1}
                value={readingSettings.lineHeight}
                onChange={(value) =>
                  updateReadingSettings({
                    ...readingSettings,
                    lineHeight: value,
                  })
                }
              />
              {canShowProgressStatus && (
                <ToggleRow
                  title="진행상황 표시"
                  description="챕터나 퀘스트 진행 상태를 상단에 표시합니다."
                  checked={readingSettings.showStoryStatus}
                  onClick={() =>
                    updateReadingSettings({
                      ...readingSettings,
                      showStoryStatus: !readingSettings.showStoryStatus,
                    })
                  }
                />
              )}
            </div>
          </SettingsSection>

          <SettingsSection
            title="대화 보조"
            icon={<MessageSquareText className="h-4 w-4" />}
            open={isAssistOpen}
            onToggle={() => setIsAssistOpen((open) => !open)}
          >
            <div className="space-y-5">
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    자동 실행할 명령어
                  </p>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {validSelectedCommandIds.length}/{MAX_COMMAND_SUGGESTIONS}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {autoCommandOptions.map((command) => {
                    const checked = validSelectedCommandIds.includes(
                      command.id,
                    );
                    const disabled =
                      !checked &&
                      validSelectedCommandIds.length >= MAX_COMMAND_SUGGESTIONS;
                    return (
                      <button
                        type="button"
                        key={command.id}
                        onClick={() => toggleCommandSelection(command.id)}
                        disabled={disabled}
                        className={cn(
                          "relative inline-flex h-8 items-center gap-2 rounded-full px-3 text-[11px] font-semibold transition-colors",
                          checked
                            ? "bg-setting-el-selected text-primary"
                            : "bg-setting-el text-muted-foreground hover:bg-accent",
                          disabled && "cursor-not-allowed opacity-40",
                        )}
                        aria-pressed={checked}
                      >
                        {checked && (
                          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                            <Check
                              className="h-2.5 w-2.5 text-primary-foreground"
                              aria-hidden="true"
                            />
                          </span>
                        )}
                        {getAutoCommandIcon(command.id)}
                        <span>/{command.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {process.env.NODE_ENV !== "production" && (
                <div className="overflow-hidden rounded-lg bg-muted/50">
                  <button
                    type="button"
                    onClick={() => setIsDeveloperOpen((open) => !open)}
                    className="flex h-12 w-full items-center gap-3 px-4 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent"
                    aria-expanded={isDeveloperOpen}
                  >
                    <FlaskConical className="h-4 w-4" />
                    <span className="flex-1">개발자 옵션</span>
                    {isDeveloperOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {isDeveloperOpen && (
                    <div className="space-y-1 border-t border-border p-2">
                      <ToggleRow
                        title="검수/수리 우회"
                        description="기본 문체는 유지하고 앱 검수만 건너뜁니다."
                        checked={readingSettings.testBypassRoleplayRules}
                        onClick={() =>
                          updateReadingSettings({
                            ...readingSettings,
                            testBypassRoleplayRules:
                              !readingSettings.testBypassRoleplayRules,
                          })
                        }
                      />
                      <ToggleRow
                        title="검수 전 원문 로그"
                        description="Gemini 생성 청크를 브라우저 콘솔에 기록합니다."
                        checked={readingSettings.testRawRoleplayStream}
                        onClick={() =>
                          updateReadingSettings({
                            ...readingSettings,
                            testRawRoleplayStream:
                              !readingSettings.testRawRoleplayStream,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </SettingsSection>

          <div className="px-4 py-4">
            <div className="overflow-hidden rounded-lg border border-destructive/50">
              <DangerRow
                icon={<Trash2 className="h-4 w-4" />}
                title="대화 초기화"
                onClick={onClearChat}
              />
              <DangerRow
                icon={<LogOut className="h-4 w-4" />}
                title="채팅방 나가기"
                onClick={() => setIsLeaveConfirmOpen(true)}
                withDivider
              />
            </div>
          </div>
        </div>
      </div>
      <Dialog open={isMemoryMemoOpen} onOpenChange={setIsMemoryMemoOpen}>
        <DialogContent className="max-h-[86dvh] overflow-y-auto border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>기억 메모</DialogTitle>
            <DialogDescription>
              작품이나 캐릭터 설정을 덮어쓰고 싶은 내용을 적어두면 다음 답변
              생성에 우선 반영됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border border-border/70 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <div className="mb-2 font-semibold text-foreground">
                작성 예시
              </div>
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
                onChange={(event) =>
                  setMemoryMemoDraft(
                    normalizeChatMemoryMemo(event.target.value),
                  )
                }
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
          if (!open) closeThemeModeSuggestion();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="w-[min(calc(100vw-2rem),340px)] gap-0 rounded-xl border-border bg-background px-5 pb-5 pt-6 text-foreground shadow-2xl"
        >
          <button
            type="button"
            onClick={closeThemeModeSuggestion}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-[14px] flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary">
            <Palette className="h-[22px] w-[22px]" />
          </div>

          <DialogHeader className="gap-2 text-left">
            <DialogTitle className="text-[18px] font-medium leading-tight tracking-normal text-foreground">
              앱 테마도 맞출까요?
            </DialogTitle>
            <DialogDescription className="text-[14px] font-normal leading-[1.6] text-muted-foreground">
              {themeModeSuggestion
                ? `${getChatThemeLabel(themeModeSuggestion.chatTheme)} 채팅 테마는 ${getAppThemeLabel(themeModeSuggestion.targetTheme)}에서 더 자연스럽게 보여요. 앱 전체 테마를 ${getAppThemeLabel(themeModeSuggestion.targetTheme)}로 전환할까요?`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <label className="mt-5 flex w-fit items-center gap-2.5 text-[13px] font-medium leading-snug text-foreground">
            <input
              type="checkbox"
              checked={dontShowThemeModeSuggestion}
              onChange={(event) =>
                setDontShowThemeModeSuggestion(event.target.checked)
              }
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
              {themeModeSuggestion
                ? `${getAppThemeLabel(themeModeSuggestion.targetTheme)}로 전환`
                : "전환"}
            </button>
            <button
              type="button"
              onClick={closeThemeModeSuggestion}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-transparent px-4 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
          setIsLeaveConfirmOpen(false);
          onLeaveChat?.();
        }}
      />
    </>
  );
}

function SettingsSection({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-11 w-full items-center gap-2.5 px-4 text-left text-foreground transition-colors hover:bg-accent/60"
        aria-expanded={open}
      >
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="flex-1 text-[12px] font-semibold">{title}</h3>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="px-4 pb-5">{children}</div>}
    </section>
  );
}

function SettingsShortcut({
  href,
  label,
  onClick,
  icon,
  badge,
}: {
  href?: string;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  badge?: string;
}) {
  const content = (
    <>
      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-setting-el text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-foreground">
        {icon}
        {badge && (
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[8px] font-bold leading-4 text-primary-foreground">
            {badge}
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
        {label}
      </span>
    </>
  );

  const className =
    "group flex min-w-0 flex-col items-center gap-2 rounded-lg px-1 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return href ? (
    <Link href={href} onClick={onClick} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function PersonaShortcut({
  persona,
  href,
  onClick,
}: {
  persona?: StoryPersona;
  href: string;
  onClick: () => void;
}) {
  const label = "현재 자아";
  const fallback = persona?.name?.trim()?.slice(0, 1) || "나";

  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex min-w-0 flex-col items-center gap-2 rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 transition-colors group-hover:bg-primary/20">
        {persona?.avatarUrl ? (
          <img
            src={persona.avatarUrl}
            alt={persona.name || label}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[14px] font-bold text-primary">{fallback}</span>
        )}
      </span>
      <span className="w-full truncate text-center text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
        {label}
      </span>
    </Link>
  );
}

function getAutoCommandIcon(commandId: string) {
  if (commandId === "phone") return <Smartphone className="h-4 w-4" />;
  if (commandId === "sns") return <MessageSquareHeart className="h-4 w-4" />;
  return <ChartNoAxesColumnIncreasing className="h-4 w-4" />;
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
  label: string;
  valueText: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-0">
        <span className="text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
        <span className="text-[11px] font-semibold tabular-nums text-foreground">
          {valueText}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-border [&::-moz-range-thumb]:bg-background [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm"
      />
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onClick,
}: {
  title: string;
  description: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-2">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-foreground">{title}</p>
        <p className="truncate text-[9px] text-muted-foreground">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "h-6 w-11 shrink-0 rounded-full border p-0.5 transition-colors",
          checked ? "border-primary bg-primary" : "border-border bg-muted",
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
  );
}

function DangerRow({
  icon,
  title,
  onClick,
  withDivider = false,
}: {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  withDivider?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 w-full items-center gap-2.5 px-3.5 text-left text-destructive transition-colors hover:bg-destructive/5",
        withDivider && "border-t border-destructive/30",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-[12px] font-medium">{title}</span>
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}
