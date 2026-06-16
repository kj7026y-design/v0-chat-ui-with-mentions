"use client"

import { useState, useEffect, type ReactNode, type RefObject } from "react"
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
      <span key={`${token}-${index}`} className="rounded-md bg-amber-400/20 px-0.5 text-amber-200">
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

interface ChatMessageListProps {
  messages: ChatMessage[]
  isTyping: boolean
  messagesEndRef: RefObject<HTMLDivElement | null>
  onRewriteMessage?: (messageId: string) => void
  onEditMessage?: (messageId: string, nextContent: string) => void
  onDeleteMessage?: (messageId: string) => void
  onBranchFromMessage?: (messageId: string) => void
  editedMessageIds?: Set<string>
  chatId?: string
  chatTheme?: ChatThemeId
  disabled?: boolean
}

export function ChatMessageList({ 
  messages, 
  isTyping, 
  messagesEndRef,
  onRewriteMessage,
  onEditMessage,
  onDeleteMessage,
  onBranchFromMessage,
  editedMessageIds = new Set(),
  chatId,
  chatTheme: externalChatTheme,
  disabled = false,
}: ChatMessageListProps) {
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
        <BubbleMessageBubble 
          key={message.id} 
          message={message}
          onRewrite={onRewriteMessage}
          onDelete={onDeleteMessage}
          onBranch={onBranchFromMessage}
          isEdited={editedMessageIds.has(message.id)}
          themeConfig={themeConfig}
          isLatest={index === messages.length - 1}
          isEditing={editingMessageId === message.id}
          disabled={disabled}
          onStartEdit={() => {
            if (disabled) return
            setEditingMessageId(message.id)
          }}
          onCancelEdit={() => setEditingMessageId(null)}
          onSaveEdit={(nextContent) => {
            onEditMessage?.(message.id, nextContent)
            setEditingMessageId(null)
          }}
        />
      ))}

      {/* Typing Indicator */}
      {isTyping && <BubbleTypingIndicator />}

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
  onDelete?: (messageId: string) => void
  onBranch?: (messageId: string) => void
  isEdited?: boolean
  themeConfig: ChatThemeConfig
  isLatest: boolean
  isEditing: boolean
  disabled?: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: (nextContent: string) => void
}

function BubbleMessageBubble({
  message,
  onRewrite,
  onDelete,
  onBranch,
  isEdited,
  themeConfig,
  isLatest,
  isEditing,
  disabled = false,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: BubbleMessageBubbleProps) {
  const [isBranching, setIsBranching] = useState(false)
  const [editDraft, setEditDraft] = useState(message.content)
  const isCharacterLine = message.isUserAuthoredCharacterLine && message.speakerType === "character"
  const isUser = message.type === "user" && !isCharacterLine
  const isAI = message.type === "ai"
  const isEvent = message.type === "event"
  const isInnerThought = message.type === "inner-thought"

  useEffect(() => {
    if (isEditing) setEditDraft(message.content)
  }, [isEditing, message.content])

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

  // Inner Thought Bubble (속마음)
  if (isInnerThought) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-muted border border-border border-dashed">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-sm">💭</span>
            <span className="text-xs text-muted-foreground font-medium">/속마음</span>
          </div>
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  // Regular Message Bubble
  const mentionNames = [
    ...getMentionDisplayNames(message.mentions),
    ...(message.speakerName ? [message.speakerName] : []),
  ]

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
          style={{
            backgroundColor: isUser ? themeConfig.preview.userBubble : themeConfig.preview.aiBubble,
            color: isUser ? themeConfig.preview.userText : themeConfig.preview.aiText,
          }}
        >
          {isCharacterLine && message.speakerName && (
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-xs font-semibold opacity-90">{message.speakerName}</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] opacity-70">직접 작성</span>
            </div>
          )}
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt={message.imageName ?? "첨부 이미지"}
              className={cn(
                "mb-2 max-h-80 w-full rounded-xl object-cover",
                !message.content && "mb-0",
              )}
            />
          )}
          {message.content && (
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed [word-break:keep-all]">
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
      {isAI && !isEditing && (
        <div className="flex items-center gap-3 -mx-1 -mt-1">
          <button
            onClick={() => {
              if (disabled) return
              setIsBranching(true)
              setTimeout(() => {
                onBranch?.(message.id)
                setIsBranching(false)
              }, 800)
            }}
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
      )}
    </div>
  )
}

function BubbleTypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="px-4 py-3 rounded-2xl bg-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}
