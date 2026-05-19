"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Image, Zap, User, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface Character {
  id: string
  name: string
  icon: typeof User
}

const characters: Character[] = [
  { id: "honggilodong", name: "홍길동", icon: User },
  { id: "imuki", name: "이무기", icon: User },
  { id: "extra", name: "엑스트라", icon: User },
]

interface NovelChatInputProps {
  onSendMessage: (content: string) => void
  onCommand: (command: string) => void
}

export function NovelChatInput({ onSendMessage, onCommand }: NovelChatInputProps) {
  const [input, setInput] = useState("")
  const [activeCharacter, setActiveCharacter] = useState<string | null>(null)
  const [cursorParagraphName, setCursorParagraphName] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Track cursor position and determine which character's dialogue we're in
  const updateCursorContext = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const cursorPos = textarea.selectionStart
    const textBeforeCursor = input.substring(0, cursorPos)
    
    // Find the start of the current paragraph (last \n\n or start)
    const paragraphs = textBeforeCursor.split(/\n\n/)
    const currentParagraph = paragraphs[paragraphs.length - 1]
    
    // Check if current paragraph starts with a character name pattern
    const nameMatch = currentParagraph.match(/^([^:]+):/)
    if (nameMatch) {
      setCursorParagraphName(nameMatch[1].trim())
    } else {
      setCursorParagraphName(null)
    }
  }, [input])

  const handleSelectionChange = useCallback(() => {
    updateCursorContext()
  }, [updateCursorContext])

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange)
    return () => document.removeEventListener("selectionchange", handleSelectionChange)
  }, [handleSelectionChange])

  // Handle character chip click
  const handleCharacterClick = (characterName: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const cursorPos = textarea.selectionStart
    const textBeforeCursor = input.substring(0, cursorPos)
    const textAfterCursor = input.substring(cursorPos)
    
    // Find the start of current paragraph
    const lastParagraphBreak = textBeforeCursor.lastIndexOf("\n\n")
    const paragraphStart = lastParagraphBreak === -1 ? 0 : lastParagraphBreak + 2
    const currentParagraphBeforeCursor = textBeforeCursor.substring(paragraphStart)
    
    // Check if we're in a dialogue line
    const nameMatch = currentParagraphBeforeCursor.match(/^([^:]+):/)
    
    if (nameMatch) {
      // Replace existing name with new name
      const existingName = nameMatch[1]
      const beforeParagraph = input.substring(0, paragraphStart)
      const afterName = input.substring(paragraphStart + existingName.length + 1)
      const newInput = beforeParagraph + characterName + ":" + afterName
      setInput(newInput)
      
      // Adjust cursor position
      const cursorAdjustment = characterName.length - existingName.length
      setTimeout(() => {
        textarea.setSelectionRange(cursorPos + cursorAdjustment, cursorPos + cursorAdjustment)
        textarea.focus()
      }, 0)
    } else {
      // Insert new character name with prefix
      const insertion = (cursorPos > 0 && !textBeforeCursor.endsWith("\n\n") ? "\n\n" : "") + characterName + ": "
      const newInput = textBeforeCursor + insertion + textAfterCursor
      setInput(newInput)
      
      // Move cursor after the insertion
      const newCursorPos = cursorPos + insertion.length
      setTimeout(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      }, 0)
    }
    
    setActiveCharacter(characterName)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    if (!input.trim()) return
    
    // Check if it's a command
    if (input.startsWith("/")) {
      const commandName = input.slice(1).trim()
      onCommand(commandName)
      setInput("")
      return
    }
    
    onSendMessage(input)
    setInput("")
    setActiveCharacter(null)
    setCursorParagraphName(null)
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  // Determine which character button should be active
  const getCharacterButtonState = (characterName: string) => {
    if (cursorParagraphName === null) {
      // In narration mode - all buttons available for insertion
      return "available"
    }
    if (cursorParagraphName === characterName) {
      return "active"
    }
    return "inactive"
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
      {/* Quick Action Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 overflow-x-auto scrollbar-hide">
        {/* Fixed buttons */}
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-medium shrink-0 hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors"
        >
          <Image className="w-3.5 h-3.5" />
          <span>이미지</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-medium shrink-0 hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>명령어</span>
        </button>
        
        {/* Divider */}
        <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-600 shrink-0" />
        
        {/* Character chips */}
        {characters.map((char) => {
          const state = getCharacterButtonState(char.name)
          return (
            <button
              key={char.id}
              type="button"
              onClick={() => handleCharacterClick(char.name)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all",
                state === "active" && "bg-emerald-500 text-white",
                state === "available" && "bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-600",
                state === "inactive" && "bg-white/50 dark:bg-neutral-700/50 text-neutral-400 dark:text-neutral-500 opacity-50"
              )}
            >
              <User className="w-3.5 h-3.5" />
              <span>{char.name}</span>
            </button>
          )
        })}
        
        {/* All characters button */}
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all",
            "bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-600"
          )}
        >
          <Users className="w-3.5 h-3.5" />
          <span>모두</span>
        </button>
      </div>

      {/* Input Area */}
      <div className="flex items-end gap-2 px-4 py-3">
        <div className="flex-1 flex items-end gap-2 px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onSelect={updateCursorContext}
            placeholder="대사나 지문을 입력하세요..."
            rows={1}
            className="flex-1 bg-transparent text-neutral-900 dark:text-neutral-100 text-[15px] placeholder:text-neutral-500 outline-none resize-none overflow-y-auto scrollbar-hide leading-6"
            style={{ maxHeight: "96px" }}
          />
        </div>
        
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!input.trim()}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full transition-colors shrink-0",
            input.trim()
              ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
              : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500"
          )}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
