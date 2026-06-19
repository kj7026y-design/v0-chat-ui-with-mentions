"use client"

import { useState, useEffect, type CSSProperties, type ReactNode, type RefObject } from "react"
import { useTheme } from "@/components/theme-provider"
import { type ChatMessage } from "@/lib/chat-types"
import { cn } from "@/lib/utils"
import { AuthorTools } from "./author-tools"

type ChatThemeId = "system" | "light" | "dark" | "message" | "messenger"

interface ChatThemeConfig {
  id: ChatThemeId
  preview: {
    bg: string
    userBubble: string
    userText: string
    aiBubble: string
    aiText: string
  }
}

// Mention target name mapping
const MENTION_NAMES: Record<string, string> = {
  hongGilDong: "홍길동",
  imugi: "이무기",
  extra: "엑스트라",
  all: "모두",
}

function getMentionDisplayNames(mentions: string[] | undefined): string[] {
  if (!mentions || mentions.length === 0) return []
  return mentions.map(id => MENTION_NAMES[id] || id)
}

function renderHighlightedMentions(content: string, names: string[]) {
  const mentionNames = [...new Set([...names, ...Object.values(MENTION_NAMES)])]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)

  if (mentionNames.length === 0) return content

  const parts: ReactNode[] = []
  let index = 0

  while (index < content.length) {
    const matchedName = mentionNames.find((name) => content.startsWith(`@${name}`, index))
    if (!matchedName) {
      parts.push(content[index])
      index += 1
      continue
    }

    const token = `@${matchedName}`
    parts.push(
      <span key={`${token}-${index}`} className="mention-token rounded-md border px-1 py-0.5 font-semibold">
        {token}
      </span>,
    )
    index += token.length
  }

  return parts
}

const chatThemes: Record<ChatThemeId, ChatThemeConfig> = {
  system: {
    id: "system",
    preview: {
      bg: "#1a1a1a",
      userBubble: "#333333",
      userText: "#FFFFFF",
      aiBubble: "#1E1E1E",
      aiText: "#E5E5E5",
    },
  },
  light: {
    id: "light",
    preview: {
      bg: "#FFFFFF",
      userBubble: "#007AFF",
      userText: "#FFFFFF",
      aiBubble: "#E9E9EB",
      aiText: "#000000",
    },
  },
  dark: {
    id: "dark",
    preview: {
      bg: "#121212",
      userBubble: "#333333",
      userText: "#FFFFFF",
      aiBubble: "#1E1E1E",
      aiText: "#E5E5E5",
    },
  },
  message: {
    id: "message",
    preview: {
      bg: "#F2F2F7",
      userBubble: "#34C759",
      userText: "#FFFFFF",
      aiBubble: "#FFFFFF",
      aiText: "#000000",
    },
  },
  messenger: {
    id: "messenger",
    preview: {
      bg: "#BACEE0",
      userBubble: "#FEE500",
      userText: "#3C1E1E",
      aiBubble: "#FFFFFF",
      aiText: "#000000",
    },
  },
}

function getEditTargetMessage(message: ChatMessage, messages: ChatMessage[]) {
  if (!message.imageUrl || message.content.trim() || !message.turnId) return message

  return [...messages]
    .reverse()
    .find((item) =>
      item.turnId === message.turnId &&
      item.type === "ai" &&
      !item.imageUrl &&
      item.content.trim(),
    ) ?? message
}

interface ChatMessageListProps {
  messages: ChatMessage[]
  isTyping: boolean
  typingLabel?: string
  typingVariant?: "text" | "image"
  messagesEndRef: RefObject<HTMLDivElement | null>
  onRewriteMessage?: (messageId: string) => void
  onRetryFailedMessage?: (messageId: string) => void
  onEditMessage?: (messageId: string, nextContent: string) => void
  onDeleteMessage?: (messageId: string) => void
  onBranchFromMessage?: (messageId: string) => void
  editedMessageIds?: Set<string>
  chatId?: string
  chatTheme?: ChatThemeId
  disabled?: boolean
  textSize?: number
  lineHeight?: number
  alwaysShowCommandSuggestions?: boolean
  selectedCommandIds?: string[]
}

export function ChatMessageList({ 
  messages, 
  isTyping, 
  typingLabel,
  typingVariant = "text",
  messagesEndRef,
  onRewriteMessage,
  onRetryFailedMessage,
  onEditMessage,
  onDeleteMessage,
  onBranchFromMessage,
  editedMessageIds = new Set(),
  chatId,
  chatTheme: externalChatTheme,
  disabled = false,
  textSize = 16,
  lineHeight = 1.5,
  alwaysShowCommandSuggestions = false,
  selectedCommandIds = [],
}: ChatMessageListProps) {
  void alwaysShowCommandSuggestions
  void selectedCommandIds
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [internalChatTheme, setInternalChatTheme] = useState<ChatThemeId>("system")
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    if (chatId) {
      const savedTheme = localStorage.getItem(`chat-theme-${chatId}`) as ChatThemeId
      if (savedTheme && chatThemes[savedTheme]) {
        setInternalChatTheme(savedTheme)
      } else {
        setInternalChatTheme("system")
      }
    }
    
    // Listen for storage changes (when theme is updated from settings)
    const handleStorageChange = (e: StorageEvent) => {
      if (chatId && e.key === `chat-theme-${chatId}`) {
        if (e.newValue) {
          setInternalChatTheme(e.newValue as ChatThemeId)
        } else {
          setInternalChatTheme("system")
        }
      }
    }
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [chatId])

  // Use external theme if provided, otherwise use internal state
  const chatTheme = externalChatTheme ?? internalChatTheme

  // Determine the actual theme config to use
  const getActualThemeConfig = () => {
    // Before mount, default to light to match SSR output and avoid hydration mismatch
    if (!mounted) return chatThemes.light
    if (chatTheme === "system") {
      // Follow app theme
      return resolvedTheme === "dark" ? chatThemes.dark : chatThemes.light
    }
    return chatThemes[chatTheme]
  }

  const themeConfig = getActualThemeConfig()

  // Bubble style rendering
  return (
    <div className="flex flex-col gap-3 px-4 py-4 pb-44">
      {messages.map((message, index) => (
        (() => {
          const editTarget = getEditTargetMessage(message, messages)
          return (
            <BubbleMessageBubble
              key={message.id}
              message={message}
              onRewrite={onRewriteMessage}
              onRetry={onRetryFailedMessage}
              onDelete={onDeleteMessage}
              onBranch={onBranchFromMessage}
              isEdited={editedMessageIds.has(editTarget.id)}
              themeConfig={themeConfig}
              textSize={textSize}
              lineHeight={lineHeight}
              isLatest={index === messages.length - 1}
              canBranch={
                (message.type === "ai" || message.type === "status" || message.type === "inner-thought") &&
                (!message.turnId || messages[index + 1]?.turnId !== message.turnId)
              }
              editInitialContent={editTarget.content}
              isEditing={editingMessageId === message.id}
              disabled={disabled}
              onStartEdit={() => {
                if (disabled) return
                setEditingMessageId(message.id)
              }}
              onCancelEdit={() => setEditingMessageId(null)}
              onSaveEdit={(nextContent) => {
                onEditMessage?.(editTarget.id, nextContent)
                setEditingMessageId(null)
              }}
            />
          )
        })()
      ))}

      {/* Typing Indicator */}
      {isTyping && (
        typingVariant === "image" ? (
          <BubbleImageGeneratingIndicator label={typingLabel ?? "이미지 생성중..."} />
        ) : (
          <BubbleTypingIndicator label={typingLabel} />
        )
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  )
}

// ============================================
// Bubble Style Components
// ============================================

interface BubbleMessageBubbleProps {
  message: ChatMessage
  onRewrite?: (messageId: string) => void
  onRetry?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onBranch?: (messageId: string) => void
  isEdited?: boolean
  themeConfig: ChatThemeConfig
  textSize: number
  lineHeight: number
  isLatest: boolean
  canBranch: boolean
  editInitialContent: string
  isEditing: boolean
  disabled?: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: (nextContent: string) => void
}

function BubbleMessageBubble({
  message,
  onRewrite,
  onRetry,
  onDelete,
  onBranch,
  isEdited,
  themeConfig,
  textSize,
  lineHeight,
  isLatest,
  canBranch,
  editInitialContent,
  isEditing,
  disabled = false,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: BubbleMessageBubbleProps) {
  const [isBranching, setIsBranching] = useState(false)
  const [editDraft, setEditDraft] = useState(editInitialContent)
  const [imageLoadFailed, setImageLoadFailed] = useState(false)
  const isCharacterLine = message.isUserAuthoredCharacterLine && message.speakerType === "character"
  const isUser = message.type === "user" && !isCharacterLine
  const isAI = message.type === "ai"
  const isEvent = message.type === "event"
  const isInnerThought = message.type === "inner-thought"
  const isStatus = message.type === "status"

  useEffect(() => {
    if (isEditing) setEditDraft(editInitialContent)
  }, [editInitialContent, isEditing])

  useEffect(() => {
    setImageLoadFailed(false)
  }, [message.imageUrl])

  if (message.isGenerationError) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[92%] rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-3 text-muted-foreground shadow-sm">
          <p
            className="whitespace-pre-wrap break-words [word-break:keep-all]"
            style={{ fontSize: Math.min(14, Math.max(11, textSize)), lineHeight: Math.max(1.45, lineHeight) }}
          >
            {message.content || "답변을 생성하지 못했어요."}
          </p>
          <button
            type="button"
            onClick={() => onRetry?.(message.id)}
            disabled={disabled}
            className="mt-3 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            무료 재생성
          </button>
        </div>
      </div>
    )
  }

  // Event Card
  if (isEvent) {
    return (
      <div className="flex justify-center my-4">
        <div className="w-full max-w-sm rounded-xl bg-card overflow-hidden">
          {/* Event Image */}
          <div className="relative aspect-video bg-muted">
            {message.eventImage ? (
              <img
                src={message.eventImage}
                alt={message.content}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">🌸</span>
              </div>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
            
            {/* Event Title */}
            <div className="absolute bottom-3 left-4 right-4">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Event</span>
              <h4 className="text-lg font-semibold text-foreground mt-0.5">
                {message.content}
              </h4>
            </div>
          </div>
          
          {/* Event Description */}
          {message.eventDescription && (
            <div className="px-4 py-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {message.eventDescription}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isStatus || isInnerThought) {
    const statusTextSize = Math.min(14, Math.max(11, textSize))

    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex justify-start">
          <div
            className="max-w-[92%] rounded-xl border border-border bg-card/85 px-3 py-2.5 text-muted-foreground shadow-sm"
            style={{ fontSize: statusTextSize, lineHeight: Math.max(1.45, lineHeight) }}
          >
            <p className="whitespace-pre-wrap break-words [word-break:keep-all]">
              {message.content}
            </p>
          </div>
        </div>
        {canBranch && (
          <BranchButton
            disabled={disabled}
            isBranching={isBranching}
            onClick={() => {
              if (disabled) return
              setIsBranching(true)
              setTimeout(() => {
                onBranch?.(message.id)
                setIsBranching(false)
              }, 800)
            }}
          />
        )}
      </div>
    )
  }

  // Regular Message Bubble
  const mentionNames = [
    ...getMentionDisplayNames(message.mentions),
    ...(message.speakerName ? [message.speakerName] : []),
  ]
  const bubbleColor = isUser ? themeConfig.preview.userBubble : themeConfig.preview.aiBubble
  const bubbleTextColor = isUser ? themeConfig.preview.userText : themeConfig.preview.aiText
  const mentionStyle = getMentionStyle(bubbleColor)
  const bubbleStyle = {
    backgroundColor: bubbleColor,
    color: bubbleTextColor,
    "--mention-bg": mentionStyle.bg,
    "--mention-text": mentionStyle.text,
    "--mention-border": mentionStyle.border,
  } as CSSProperties

  return (
    <div 
      className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}
    >
      <div className={cn("relative flex w-full", isUser ? "justify-end" : "justify-start")}>
        {isCharacterLine && (
          <div className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs">
            {message.speakerName?.slice(0, 1) ?? "?"}
          </div>
        )}
        <div
          className={cn(
            "relative w-fit max-w-[82%] rounded-2xl px-4 py-2.5 sm:max-w-[80%]",
            isUser && "ml-auto",
          )}
          style={bubbleStyle}
        >
          {isCharacterLine && message.speakerName && (
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-xs font-semibold opacity-90">{message.speakerName}</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] opacity-70">직접 작성</span>
            </div>
          )}
          {message.imageUrl && !imageLoadFailed && (
            <img
              src={message.imageUrl}
              alt={message.imageName ?? "첨부 이미지"}
              onError={() => setImageLoadFailed(true)}
              className={cn(
                "mb-2 max-h-80 w-full rounded-xl object-cover",
                !message.content && "mb-0",
              )}
            />
          )}
          {message.imageUrl && imageLoadFailed && (
            <div className="rounded-xl border border-border bg-card/85 px-3 py-2.5 text-muted-foreground">
              <p
                className="whitespace-pre-wrap break-words [word-break:keep-all]"
                style={{ fontSize: Math.min(14, Math.max(11, textSize)), lineHeight: Math.max(1.45, lineHeight) }}
              >
                이미지 생성에 실패했어요. 잠시 후 다시 시도해주세요.
              </p>
            </div>
          )}
          {message.content && (
            <p
              className="whitespace-pre-wrap break-words [word-break:keep-all] [&_.mention-token]:border-[var(--mention-border)] [&_.mention-token]:bg-[var(--mention-bg)] [&_.mention-token]:text-[var(--mention-text)]"
              style={{ fontSize: textSize, lineHeight }}
            >
              {renderHighlightedMentions(message.content, mentionNames)}
            </p>
          )}
          
          {/* Edited indicator dot */}
          {isEdited && !isUser && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-background" />
          )}
        </div>
      </div>

      {isEditing && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (disabled) return
            onSaveEdit(editDraft)
          }}
          className={cn("w-full max-w-[82%] space-y-2 sm:max-w-[80%]", isUser && "ml-auto")}
        >
          <textarea
            value={editDraft}
            onChange={(event) => setEditDraft(event.target.value)}
            rows={3}
            autoFocus
            disabled={disabled}
            className="w-full resize-none rounded-xl border border-border bg-input px-3 py-2 text-[15px] leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <div className={cn("flex items-center gap-2", isUser ? "justify-end" : "justify-start")}>
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={disabled}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={disabled || !editDraft.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              저장
            </button>
          </div>
        </form>
      )}
      
      {/* Author Tools - only the latest message can be edited or deleted. */}
      {isLatest && (isUser || isAI || isCharacterLine) && !isEditing && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-150">
          <AuthorTools
            messageId={message.id}
            onRewrite={onRewrite}
            onEdit={onStartEdit}
            onDelete={onDelete}
            isEdited={isEdited}
            canRewrite={isAI}
            disabled={disabled}
          />
        </div>
      )}
      
      {/* Branch Button - below AI messages */}
      {canBranch && !isEditing && (
        <BranchButton
          disabled={disabled}
          isBranching={isBranching}
          onClick={() => {
            if (disabled) return
            setIsBranching(true)
            setTimeout(() => {
              onBranch?.(message.id)
              setIsBranching(false)
            }, 800)
          }}
        />
      )}
    </div>
  )
}

function BranchButton({
  disabled,
  isBranching,
  onClick,
}: {
  disabled: boolean
  isBranching: boolean
  onClick: () => void
}) {
  return (
    <div className="flex items-center gap-3 -mx-1 -mt-1">
      <button
        onClick={onClick}
        disabled={disabled || isBranching}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors",
          isBranching && "text-foreground",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <svg className={cn("w-3 h-3", isBranching && "animate-spin")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>{isBranching ? "분기 생성 중..." : "여기서부터 분기"}</span>
      </button>
    </div>
  )
}

function getMentionStyle(backgroundColor: string) {
  const isDark = isDarkColor(backgroundColor)
  return isDark
    ? {
        bg: "rgba(255,255,255,0.16)",
        text: "#ffffff",
        border: "rgba(255,255,255,0.24)",
      }
    : {
        bg: "rgba(0,0,0,0.08)",
        text: "#111827",
        border: "rgba(0,0,0,0.14)",
      }
}

function isDarkColor(hexColor: string) {
  const hex = hexColor.replace("#", "")
  if (hex.length !== 6) return true
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
  return luminance < 0.55
}

function BubbleTypingIndicator({ label }: { label?: string }) {
  return (
    <div className="flex justify-start">
      <div className="px-4 py-3 rounded-2xl bg-muted">
        {label && (
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {label}
          </p>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

function BubbleImageGeneratingIndicator({ label }: { label: string }) {
  const [dotCount, setDotCount] = useState(1)
  const baseLabel = label.replace(/\.+$/, "")

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDotCount((current) => (current >= 3 ? 1 : current + 1))
    }, 360)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[82%] overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:max-w-[80%]">
        <div className="flex aspect-square max-h-80 min-h-48 w-full flex-col items-center justify-center gap-3 bg-muted/70 px-4 text-center">
          <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
            {baseLabel}
            <span className="inline-block w-5 text-left">{".".repeat(dotCount)}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  )
}
