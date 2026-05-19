"use client"

import { useEffect, type RefObject } from "react"
import { type ChatMessage } from "@/lib/chat-types"
import { cn } from "@/lib/utils"

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

interface NovelMessageListProps {
  messages: ChatMessage[]
  isTyping: boolean
  messagesEndRef: RefObject<HTMLDivElement | null>
}

export function NovelMessageList({ 
  messages, 
  isTyping, 
  messagesEndRef 
}: NovelMessageListProps) {
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping, messagesEndRef])

  return (
    <div className="flex flex-col gap-4 px-6 py-6 pb-44 max-w-2xl mx-auto">
      {messages.map((message) => (
        <NovelMessage key={message.id} message={message} />
      ))}

      {/* Typing Indicator */}
      {isTyping && <NovelTypingIndicator />}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  )
}

interface NovelMessageProps {
  message: ChatMessage
}

function NovelMessage({ message }: NovelMessageProps) {
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
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-2">
        {parsed.map((part, idx) => (
          <NovelParagraph key={idx} part={part} />
        ))}
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
