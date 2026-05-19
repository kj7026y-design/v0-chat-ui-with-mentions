"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Sun, Moon, Image, Zap, User, Users } from "lucide-react"
import { cn } from "@/lib/utils"

// Types
interface NovelMessage {
  id: string
  content: string
  timestamp: Date
}

interface Character {
  id: string
  name: string
  color: string
}

// Sample characters
const CHARACTERS: Character[] = [
  { id: "1", name: "홍길동", color: "text-blue-500 dark:text-blue-400" },
  { id: "2", name: "이무기", color: "text-emerald-500 dark:text-emerald-400" },
  { id: "3", name: "엑스트라", color: "text-purple-500 dark:text-purple-400" },
]

// Parse message to detect "CharacterName: dialogue" pattern
function parseMessage(content: string): { type: "dialogue" | "narration"; name?: string; text: string; color?: string }[] {
  const lines = content.split("\n")
  const parsed: { type: "dialogue" | "narration"; name?: string; text: string; color?: string }[] = []

  for (const line of lines) {
    if (!line.trim()) continue

    // Match "이름: 대사" pattern
    const dialogueMatch = line.match(/^([가-힣a-zA-Z0-9]+):\s*(.*)$/)
    
    if (dialogueMatch) {
      const [, name, text] = dialogueMatch
      const character = CHARACTERS.find(c => c.name === name)
      parsed.push({
        type: "dialogue",
        name,
        text,
        color: character?.color || "text-amber-500 dark:text-amber-400",
      })
    } else {
      parsed.push({
        type: "narration",
        text: line,
      })
    }
  }

  return parsed
}

// Initial sample messages
const initialMessages: NovelMessage[] = [
  {
    id: "1",
    content: "바람이 차갑게 불어오는 깊은 밤이었다. 산 속 오두막에서 희미한 불빛이 새어나왔다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
  },
  {
    id: "2",
    content: "홍길동: 이 시각에 찾아오다니, 무슨 일이오?",
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
  },
  {
    id: "3",
    content: "이무기: 급한 소식이 있어서 왔습니다. 관군이 움직이기 시작했습니다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 6),
  },
  {
    id: "4",
    content: "홍길동의 표정이 굳어졌다. 그는 천천히 자리에서 일어났다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 4),
  },
  {
    id: "5",
    content: "홍길동: 얼마나 되는 병력이오?",
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
  },
  {
    id: "6",
    content: "이무기: 대략 오백 명 정도로 보입니다. 하지만 더 늘어날 수도 있습니다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 1),
  },
]

export default function NovelChatPage() {
  const [messages, setMessages] = useState<NovelMessage[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [activeCharacter, setActiveCharacter] = useState<string | null>(null)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    textarea.style.height = "auto"
    const lineHeight = 24 // approximate line height
    const maxLines = 4
    const maxHeight = lineHeight * maxLines
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${newHeight}px`
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  // Detect which character's dialogue the cursor is in
  const detectActiveCharacter = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const text = textarea.value
    const cursor = textarea.selectionStart

    // Find the paragraph where cursor is located
    const beforeCursor = text.slice(0, cursor)
    const lastNewline = beforeCursor.lastIndexOf("\n")
    const currentLineStart = lastNewline + 1
    const nextNewline = text.indexOf("\n", cursor)
    const currentLineEnd = nextNewline === -1 ? text.length : nextNewline
    const currentLine = text.slice(currentLineStart, currentLineEnd)

    // Check if current line matches "이름:" pattern
    const match = currentLine.match(/^([가-힣a-zA-Z0-9]+):/)
    if (match) {
      setActiveCharacter(match[1])
    } else {
      setActiveCharacter(null)
    }
  }, [])

  // Handle cursor position changes
  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      setCursorPosition(textarea.selectionStart)
      detectActiveCharacter()
    }
  }, [detectActiveCharacter])

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange)
    return () => document.removeEventListener("selectionchange", handleSelectionChange)
  }, [handleSelectionChange])

  // Handle character button click
  const handleCharacterClick = (characterName: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const text = textarea.value
    const cursor = textarea.selectionStart

    // Find current paragraph boundaries
    const beforeCursor = text.slice(0, cursor)
    const lastNewline = beforeCursor.lastIndexOf("\n")
    const currentLineStart = lastNewline + 1
    const nextNewline = text.indexOf("\n", cursor)
    const currentLineEnd = nextNewline === -1 ? text.length : nextNewline
    const currentLine = text.slice(currentLineStart, currentLineEnd)

    // Check if current line has a character name
    const match = currentLine.match(/^([가-힣a-zA-Z0-9]+):/)

    let newText: string
    let newCursorPos: number

    if (match) {
      // Swap existing character name
      const oldName = match[1]
      const newLine = currentLine.replace(`${oldName}:`, `${characterName}:`)
      newText = text.slice(0, currentLineStart) + newLine + text.slice(currentLineEnd)
      newCursorPos = cursor + (characterName.length - oldName.length)
    } else {
      // Insert new character dialogue
      const insertion = cursor === 0 || text[cursor - 1] === "\n" 
        ? `${characterName}: `
        : `\n\n${characterName}: `
      newText = text.slice(0, cursor) + insertion + text.slice(cursor)
      newCursorPos = cursor + insertion.length
    }

    setInput(newText)
    
    // Set cursor position after state update
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      detectActiveCharacter()
    }, 0)
  }

  // Handle "All" button click
  const handleAllClick = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const text = textarea.value
    const cursor = textarea.selectionStart

    const insertion = cursor === 0 || text[cursor - 1] === "\n"
      ? "모두: "
      : "\n\n모두: "
    
    const newText = text.slice(0, cursor) + insertion + text.slice(cursor)
    const newCursorPos = cursor + insertion.length

    setInput(newText)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Submit message
  const handleSubmit = () => {
    if (!input.trim()) return

    const newMessage: NovelMessage = {
      id: Date.now().toString(),
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, newMessage])
    setInput("")
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  return (
    <div className={cn("min-h-screen transition-colors duration-300", isDarkMode ? "dark" : "")}>
      <div className="flex flex-col h-[100dvh] bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200">
        
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h1 className="text-lg font-semibold">소설형 채팅</h1>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-neutral-400" />
            ) : (
              <Moon className="w-5 h-5 text-neutral-600" />
            )}
          </button>
        </header>

        {/* Messages Area */}
        <main className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            {messages.map((message, index) => {
              const parsed = parseMessage(message.content)
              
              return (
                <div
                  key={message.id}
                  className="animate-in fade-in slide-in-from-bottom-3 duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {parsed.map((segment, segIndex) => (
                    <p key={segIndex} className="leading-relaxed mb-1 last:mb-0">
                      {segment.type === "dialogue" ? (
                        <>
                          <span className={cn("font-bold", segment.color)}>
                            {segment.name}:
                          </span>
                          <span className="text-black dark:text-white ml-1">
                            {segment.text}
                          </span>
                        </>
                      ) : (
                        <span className="text-neutral-500 dark:text-neutral-400 italic">
                          {segment.text}
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Quick Action Bar */}
        <div className="bg-neutral-100 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-hide">
            {/* Left Fixed Buttons */}
            <button className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-sm hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors">
              <Image className="w-4 h-4" />
              <span>이미지</span>
            </button>
            <button className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-sm hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors">
              <Zap className="w-4 h-4" />
              <span>명령어</span>
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-600 mx-1 flex-shrink-0" />

            {/* Character Chips */}
            {CHARACTERS.map(character => {
              const isActive = activeCharacter === character.name
              return (
                <button
                  key={character.id}
                  onClick={() => handleCharacterClick(character.name)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all",
                    isActive
                      ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900"
                      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 opacity-60 hover:opacity-100"
                  )}
                >
                  <User className="w-4 h-4" />
                  <span>{character.name}</span>
                </button>
              )
            })}
            <button
              onClick={handleAllClick}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all",
                activeCharacter === "모두"
                  ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900"
                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 opacity-60 hover:opacity-100"
              )}
            >
              <Users className="w-4 h-4" />
              <span>모두</span>
            </button>
          </div>
        </div>

        {/* Input Area */}
        <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onSelect={handleSelectionChange}
              onClick={handleSelectionChange}
              placeholder="대사나 지문을 입력하세요... (Shift+Enter: 줄바꿈, Enter: 전송)"
              rows={1}
              className={cn(
                "flex-1 px-4 py-3 rounded-xl resize-none",
                "bg-neutral-50 dark:bg-neutral-800",
                "text-neutral-900 dark:text-neutral-100",
                "placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
                "border border-neutral-200 dark:border-neutral-700",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
                "overflow-y-auto scrollbar-hide",
                "text-[15px] leading-6"
              )}
              style={{ maxHeight: "96px" }} // 4 lines max
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className={cn(
                "flex-shrink-0 px-4 py-3 rounded-xl font-medium transition-colors",
                input.trim()
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
              )}
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
