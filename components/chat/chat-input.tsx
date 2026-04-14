"use client"

import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"
import { SLASH_COMMANDS } from "@/lib/chat-types"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSendMessage: (content: string) => void
  onCommand: (command: string) => void
}

export function ChatInput({ onSendMessage, onCommand }: ChatInputProps) {
  const [input, setInput] = useState("")
  const [showCommands, setShowCommands] = useState(false)
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredCommands = SLASH_COMMANDS.filter((cmd) =>
    input.startsWith("/")
      ? cmd.name.toLowerCase().includes(input.slice(1).toLowerCase())
      : false
  )

  useEffect(() => {
    if (input.startsWith("/") && input.length > 0) {
      setShowCommands(true)
      setSelectedCommandIndex(0)
    } else {
      setShowCommands(false)
    }
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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

    onSendMessage(input)
    setInput("")
  }

  const handleCommandSelect = (commandName: string) => {
    onCommand(commandName)
    setInput("")
    setShowCommands(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showCommands || filteredCommands.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedCommandIndex((prev) =>
        prev < filteredCommands.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : prev))
    } else if (e.key === "Enter" && showCommands) {
      e.preventDefault()
      handleCommandSelect(filteredCommands[selectedCommandIndex].name)
    }
  }

  return (
    <div className="relative px-4 pb-2 bg-neutral-900">
      {/* Command Popup */}
      {showCommands && filteredCommands.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-2 rounded-xl bg-neutral-800 overflow-hidden shadow-lg">
          <div className="p-2">
            <p className="text-xs text-neutral-500 px-2 py-1">명령어</p>
            {filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={() => handleCommandSelect(cmd.name)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                  index === selectedCommandIndex
                    ? "bg-neutral-700"
                    : "hover:bg-neutral-700/50"
                )}
              >
                <span className="text-lg">{cmd.icon}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-neutral-100">
                    /{cmd.name}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {cmd.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-full bg-neutral-800">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-transparent text-neutral-100 text-[15px] placeholder:text-neutral-500 outline-none"
          />
        </div>
        
        <button
          type="submit"
          disabled={!input.trim()}
          className={cn(
            "flex items-center justify-center w-11 h-11 rounded-full transition-colors",
            input.trim()
              ? "bg-neutral-100 text-neutral-900"
              : "bg-neutral-800 text-neutral-500"
          )}
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  )
}
