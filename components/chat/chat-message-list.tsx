"use client"

import { useState, useEffect, type RefObject } from "react"
import { type ChatMessage } from "@/lib/chat-types"
import { cn } from "@/lib/utils"
import { AuthorTools } from "./author-tools"

type ChatThemeId = "light" | "dark" | "message" | "messenger"
type ChatStyleId = "bubble" | "novel"

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

const chatThemes: Record<ChatThemeId, ChatThemeConfig> = {
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

// Character colors for novel view
const characterColors: Record<string, string> = {
  "이무기": "text-emerald-500 dark:text-emerald-400",
  "홍길동": "text-sky-500 dark:text-sky-400",
  "엑스트라": "text-amber-500 dark:text-amber-400",
}

function getCharacterColor(name: string): string {
  return characterColors[name] || "text-violet-500 dark:text-violet-400"
}

// Parse message content for novel format
function parseNovelContent(content: string): { type: "dialogue" | "narration", name?: string, text: string }[] {
  const lines = content.split("\n")
  const parsed: { type: "dialogue" | "narration", name?: string, text: string }[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    
    // Check for "캐릭터이름: 대사" pattern
    const dialogueMatch = trimmed.match(/^([^:]+):\s*(.+)$/)
    if (dialogueMatch) {
      parsed.push({
        type: "dialogue",
        name: dialogueMatch[1].trim(),
        text: dialogueMatch[2].trim()
      })
    } else {
      parsed.push({
        type: "narration",
        text: trimmed
      })
    }
  }
  
  return parsed
}

interface ChatMessageListProps {
  messages: ChatMessage[]
  isTyping: boolean
  messagesEndRef: RefObject<HTMLDivElement | null>
  onRewriteMessage?: (messageId: string) => void
  onEditMessage?: (messageId: string) => void
  onDeleteMessage?: (messageId: string) => void
  onBranchFromMessage?: (messageId: string) => void
  editedMessageIds?: Set<string>
  chatStyle?: ChatStyleId
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
  chatStyle = "bubble"
}: ChatMessageListProps) {
  const [chatTheme, setChatTheme] = useState<ChatThemeId>("dark")

  useEffect(() => {
    const savedTheme = localStorage.getItem("chat-theme") as ChatThemeId
    if (savedTheme && chatThemes[savedTheme]) {
      setChatTheme(savedTheme)
    }
    
    // Listen for storage changes (when theme is updated from settings)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "chat-theme" && e.newValue) {
        setChatTheme(e.newValue as ChatThemeId)
      }
    }
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const themeConfig = chatThemes[chatTheme]

  // Novel style rendering
  if (chatStyle === "novel") {
    return (
      <div className="flex flex-col gap-4 px-6 py-6 pb-44 max-w-2xl mx-auto">
        {messages.map((message) => (
          <NovelMessageBubble 
            key={message.id} 
            message={message}
            onRewrite={onRewriteMessage}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            onBranch={onBranchFromMessage}
            isEdited={editedMessageIds.has(message.id)}
          />
        ))}

        {/* Typing Indicator */}
        {isTyping && <NovelTypingIndicator />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    )
  }

  // Bubble style rendering (default)
  return (
    <div className="flex flex-col gap-3 px-4 py-4 pb-44">
      {messages.map((message) => (
        <BubbleMessageBubble 
          key={message.id} 
          message={message}
          onRewrite={onRewriteMessage}
          onEdit={onEditMessage}
          onDelete={onDeleteMessage}
          onBranch={onBranchFromMessage}
          isEdited={editedMessageIds.has(message.id)}
          themeConfig={themeConfig}
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
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onBranch?: (messageId: string) => void
  isEdited?: boolean
  themeConfig: ChatThemeConfig
}

function BubbleMessageBubble({ message, onRewrite, onEdit, onDelete, onBranch, isEdited, themeConfig }: BubbleMessageBubbleProps) {
  const [isBranching, setIsBranching] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const isUser = message.type === "user"
  const isAI = message.type === "ai"
  const isEvent = message.type === "event"
  const isInnerThought = message.type === "inner-thought"

  // Event Card
  if (isEvent) {
    return (
      <div className="flex justify-center my-4">
        <div className="w-full max-w-sm rounded-xl bg-neutral-800 overflow-hidden">
          {/* Event Image */}
          <div className="relative aspect-video bg-neutral-700">
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
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-800/90 to-transparent" />
            
            {/* Event Title */}
            <div className="absolute bottom-3 left-4 right-4">
              <span className="text-xs text-neutral-400 uppercase tracking-wider">Event</span>
              <h4 className="text-lg font-semibold text-neutral-100 mt-0.5">
                {message.content}
              </h4>
            </div>
          </div>
          
          {/* Event Description */}
          {message.eventDescription && (
            <div className="px-4 py-3">
              <p className="text-sm text-neutral-300 leading-relaxed">
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
        <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-neutral-800/50 border border-neutral-700/50 border-dashed">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-sm">💭</span>
            <span className="text-xs text-neutral-500 font-medium">/속마음</span>
          </div>
          <p className="text-sm text-neutral-400 italic leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  // Regular Message Bubble
  return (
    <div 
      className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}
      onMouseEnter={() => isAI && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <div
          className="max-w-[80%] px-4 py-2.5 rounded-2xl relative"
          style={{
            backgroundColor: isUser ? themeConfig.preview.userBubble : themeConfig.preview.aiBubble,
            color: isUser ? themeConfig.preview.userText : themeConfig.preview.aiText,
          }}
        >
          <p className="text-[15px] leading-relaxed">{message.content}</p>
          
          {/* Edited indicator dot */}
          {isEdited && !isUser && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-neutral-900" />
          )}
        </div>
      </div>
      
      {/* Author Tools - visible on hover for AI messages */}
      {isAI && isHovered && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-150">
          <AuthorTools
            messageId={message.id}
            onRewrite={onRewrite}
            onEdit={onEdit}
            onDelete={onDelete}
            isEdited={isEdited}
          />
        </div>
      )}
      
      {/* Branch Button - always visible below AI messages */}
      {isAI && (
        <button
          onClick={() => {
            setIsBranching(true)
            setTimeout(() => {
              onBranch?.(message.id)
              setIsBranching(false)
            }, 800)
          }}
          disabled={isBranching}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors",
            "border-t border-dashed border-neutral-800/50 mt-1 -mx-1 pt-2",
            isBranching && "text-neutral-400"
          )}
        >
          <svg className={cn("w-3 h-3", isBranching && "animate-spin")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{isBranching ? "분기 생성 중..." : "여기서부터 새로운 채팅으로 분기"}</span>
        </button>
      )}
    </div>
  )
}

function BubbleTypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="px-4 py-3 rounded-2xl bg-neutral-800">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neutral-500 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-neutral-500 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-neutral-500 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

// ============================================
// Novel Style Components
// ============================================

interface NovelMessageBubbleProps {
  message: ChatMessage
  onRewrite?: (messageId: string) => void
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onBranch?: (messageId: string) => void
  isEdited?: boolean
}

function NovelMessageBubble({ message, onRewrite, onEdit, onDelete, onBranch, isEdited }: NovelMessageBubbleProps) {
  const [isBranching, setIsBranching] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const isEvent = message.type === "event"
  const isInnerThought = message.type === "inner-thought"
  const isUser = message.type === "user"
  const isAI = message.type === "ai"

  // Event Card - same as bubble view
  if (isEvent) {
    return (
      <div className="flex justify-center my-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
        <div className="w-full max-w-sm rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden border border-neutral-200 dark:border-neutral-700">
          {/* Event Image */}
          <div className="relative aspect-video bg-neutral-200 dark:bg-neutral-700">
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
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-100/90 dark:from-neutral-800/90 to-transparent" />
            
            {/* Event Title */}
            <div className="absolute bottom-3 left-4 right-4">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Event</span>
              <h4 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">
                {message.content}
              </h4>
            </div>
          </div>
          
          {/* Event Description */}
          {message.eventDescription && (
            <div className="px-4 py-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {message.eventDescription}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Inner Thought - special styling
  if (isInnerThought) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 text-center my-2">
        <div className="inline-block px-4 py-2 rounded-lg bg-neutral-100/50 dark:bg-neutral-800/50 border border-dashed border-neutral-300 dark:border-neutral-700">
          <span className="text-sm text-neutral-500 dark:text-neutral-400 italic">
            💭 {message.content}
          </span>
        </div>
      </div>
    )
  }

  // User message - treat as narration or dialogue depending on content
  if (isUser) {
    const parsed = parseNovelContent(message.content)
    
    // If no dialogue pattern, render as simple user input indicator
    if (parsed.length === 1 && parsed[0].type === "narration") {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 text-center my-2">
          <div className="inline-block px-3 py-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700">
            <span className="text-sm text-neutral-600 dark:text-neutral-300">
              {message.content}
            </span>
          </div>
        </div>
      )
    }
    
    // Otherwise render parsed content
    return (
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-2">
        {parsed.map((part, idx) => (
          <NovelParagraph key={idx} part={part} />
        ))}
      </div>
    )
  }

  // AI message - parse and render as novel format
  if (isAI) {
    const parsed = parseNovelContent(message.content)
    
    return (
      <div 
        className="animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative">
          {parsed.map((part, idx) => (
            <NovelParagraph key={idx} part={part} />
          ))}
          
          {/* Edited indicator */}
          {isEdited && (
            <span className="ml-2 text-xs text-purple-400">(수정됨)</span>
          )}
        </div>
        
        {/* Author Tools - visible on hover for AI messages */}
        {isHovered && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-150">
            <AuthorTools
              messageId={message.id}
              onRewrite={onRewrite}
              onEdit={onEdit}
              onDelete={onDelete}
              isEdited={isEdited}
            />
          </div>
        )}
        
        {/* Branch Button */}
        <button
          onClick={() => {
            setIsBranching(true)
            setTimeout(() => {
              onBranch?.(message.id)
              setIsBranching(false)
            }, 800)
          }}
          disabled={isBranching}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors",
            "border-t border-dashed border-neutral-300 dark:border-neutral-800/50 mt-1 pt-2",
            isBranching && "text-neutral-400"
          )}
        >
          <svg className={cn("w-3 h-3", isBranching && "animate-spin")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{isBranching ? "분기 생성 중..." : "여기서부터 새로운 채팅으로 분기"}</span>
        </button>
      </div>
    )
  }

  return null
}

interface NovelParagraphProps {
  part: { type: "dialogue" | "narration", name?: string, text: string }
}

function NovelParagraph({ part }: NovelParagraphProps) {
  if (part.type === "dialogue" && part.name) {
    return (
      <p className="leading-relaxed">
        <span className={cn("font-bold", getCharacterColor(part.name))}>
          {part.name}:
        </span>
        <span className="text-neutral-900 dark:text-white ml-1">
          {part.text}
        </span>
      </p>
    )
  }
  
  return (
    <p className="text-neutral-500 dark:text-neutral-400 italic leading-relaxed">
      {part.text}
    </p>
  )
}

function NovelTypingIndicator() {
  return (
    <div className="flex justify-center animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="flex items-center gap-1.5 px-4 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}
