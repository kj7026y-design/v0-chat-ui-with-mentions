"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Image as ImageIcon, Zap } from "lucide-react"
import { SLASH_COMMANDS } from "@/lib/chat-types"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSendMessage: (content: string, mentionedTargets?: string[]) => void
  onCommand: (command: string) => void
}

// Character targets for mentions
const MENTION_TARGETS = [
  { id: "hongGilDong", name: "홍길동", emoji: "🧑‍🦱" },
  { id: "imugi", name: "이무기", emoji: "🐉" },
  { id: "extra", name: "엑스트라", emoji: "👥" },
]

export function ChatInput({ onSendMessage, onCommand }: ChatInputProps) {
  const [input, setInput] = useState("")
  const [showCommands, setShowCommands] = useState(false)
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const [selectedMentions, setSelectedMentions] = useState<string[]>([])
  const [isAllSelected, setIsAllSelected] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredCommands = SLASH_COMMANDS.filter((cmd) =>
    input.startsWith("/")
      ? cmd.name.toLowerCase().includes(input.slice(1).toLowerCase())
      : false
  )

  // Detect mobile environment
  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0
      const isNarrowScreen = window.innerWidth <= 768
      setIsMobile(isTouchDevice || isNarrowScreen)
    }
    
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    if (input.startsWith("/") && input.length > 0) {
      setShowCommands(true)
      setSelectedCommandIndex(0)
    } else {
      setShowCommands(false)
    }
  }, [input])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      const lineHeight = 24 // Approximate line height
      const maxLines = 4
      const maxHeight = lineHeight * maxLines
      const newHeight = Math.min(textarea.scrollHeight, maxHeight)
      textarea.style.height = `${newHeight}px`
    }
  }, [input])

  // Handle mention selection with "all" logic
  const handleMentionToggle = (targetId: string) => {
    if (targetId === "all") {
      // Toggle "all" selection
      if (isAllSelected) {
        setIsAllSelected(false)
      } else {
        setSelectedMentions([])
        setIsAllSelected(true)
      }
    } else {
      // Individual character toggle
      if (isAllSelected) {
        // If "all" was selected, deselect it and select only this character
        setIsAllSelected(false)
        setSelectedMentions([targetId])
      } else {
        // Toggle individual selection
        const newMentions = selectedMentions.includes(targetId)
          ? selectedMentions.filter((id) => id !== targetId)
          : [...selectedMentions, targetId]
        
        // Check if all individual characters are now selected
        const allIndividualIds = MENTION_TARGETS.map(t => t.id)
        const allSelected = allIndividualIds.every(id => newMentions.includes(id))
        
        if (allSelected) {
          // All individuals selected -> switch to "all" mode
          setSelectedMentions([])
          setIsAllSelected(true)
        } else {
          setSelectedMentions(newMentions)
        }
      }
    }
  }

  // Handle image button click
  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      // For now, just show alert. In production, this would upload the file.
      alert(`선택된 파일: ${files[0].name}`)
    }
    // Reset input so same file can be selected again
    e.target.value = ""
  }

  // Handle command button click
  const handleCommandClick = () => {
    setInput("/")
    textareaRef.current?.focus()
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim()) return

    // Check if it's a command
    if (input.startsWith("/")) {
      const commandName = input.slice(1).trim()
      const matchedCommand = SLASH_COMMANDS.find(
        (cmd) => cmd.name.toLowerCase() === commandName.toLowerCase()
      )
      if (matchedCommand) {
        onCommand(matchedCommand.name)
        setInput("")
        setShowCommands(false)
        return
      }
    }

    // Determine mentioned targets
    const mentionedTargets = isAllSelected
      ? ["all"]
      : selectedMentions

    onSendMessage(input, mentionedTargets.length > 0 ? mentionedTargets : undefined)
    setInput("")
    
    // Reset mentions after sending
    setSelectedMentions([])
    setIsAllSelected(false)
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleCommandSelect = (commandName: string) => {
    onCommand(commandName)
    setInput("")
    setShowCommands(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Command navigation
    if (showCommands && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedCommandIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        )
        return
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : prev))
        return
      } else if (e.key === "Enter") {
        e.preventDefault()
        handleCommandSelect(filteredCommands[selectedCommandIndex].name)
        return
      }
    }

    // Enter key behavior based on device
    if (e.key === "Enter") {
      if (isMobile) {
        // Mobile: Enter always creates newline, send only via button
        // Do nothing special, let default behavior happen
      } else {
        // Desktop: Enter sends, Shift+Enter creates newline
        if (!e.shiftKey) {
          e.preventDefault()
          handleSubmit()
        }
      }
    }
  }

  // Get display names for selected mentions
  const getSelectedMentionNames = () => {
    if (isAllSelected) return ["모두"]
    return selectedMentions.map(id => {
      const target = MENTION_TARGETS.find(t => t.id === id)
      return target?.name || id
    })
  }

  const selectedNames = getSelectedMentionNames()
  const hasActiveMentions = isAllSelected || selectedMentions.length > 0

  return (
    <div className="relative px-4 pb-2 bg-white dark:bg-neutral-900">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Command Popup */}
      {showCommands && filteredCommands.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden shadow-lg border border-neutral-200 dark:border-neutral-700">
          <div className="p-2">
            <p className="text-xs text-neutral-500 dark:text-neutral-500 px-2 py-1">명령어</p>
            {filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={() => handleCommandSelect(cmd.name)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                  index === selectedCommandIndex
                    ? "bg-neutral-200 dark:bg-neutral-700"
                    : "hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
                )}
              >
                <span className="text-lg">{cmd.icon}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    /{cmd.name}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {cmd.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Bar */}
      <div className="flex items-center gap-2 mb-2 overflow-x-auto scrollbar-hide pb-1">
        {/* Fixed Actions */}
        <button
          type="button"
          onClick={handleImageClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <ImageIcon className="w-4 h-4" />
          <span>이미지</span>
        </button>
        <button
          type="button"
          onClick={handleCommandClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <Zap className="w-4 h-4" />
          <span>명령어</span>
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 flex-shrink-0" />

        {/* Mention Targets */}
        {MENTION_TARGETS.map((target) => (
          <button
            key={target.id}
            type="button"
            onClick={() => handleMentionToggle(target.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
              selectedMentions.includes(target.id) && !isAllSelected
                ? "bg-blue-500 text-white"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            )}
          >
            <span>{target.emoji}</span>
            <span>@{target.name}</span>
          </button>
        ))}

        {/* All Mention */}
        <button
          type="button"
          onClick={() => handleMentionToggle("all")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
            isAllSelected
              ? "bg-blue-500 text-white"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          )}
        >
          <span>👥</span>
          <span>@모두</span>
        </button>
      </div>

      {/* Mention Badge Display */}
      {hasActiveMentions && (
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">To:</span>
          <div className="flex items-center gap-1 flex-wrap">
            {selectedNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
              >
                @{name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 flex items-end gap-2 px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            rows={1}
            className="flex-1 bg-transparent text-neutral-900 dark:text-neutral-100 text-[15px] placeholder:text-neutral-500 outline-none resize-none leading-6 max-h-24"
          />
        </div>
        
        {/* Send Button */}
        <button
          type="submit"
          disabled={!input.trim()}
          className={cn(
            "flex items-center justify-center w-11 h-11 rounded-full transition-colors flex-shrink-0",
            input.trim()
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500"
          )}
          aria-label="전송"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  )
}
