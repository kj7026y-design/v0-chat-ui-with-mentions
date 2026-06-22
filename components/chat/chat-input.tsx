"use client"

import { useState, useRef, useEffect, type ReactNode, type RefObject, type UIEvent } from "react"
import { Send, Image as ImageIcon, MessageCircle, X, Zap } from "lucide-react"
import { AlertModal } from "@/components/ui/app-modal"
import { SLASH_COMMANDS } from "@/lib/chat-types"
import { cn } from "@/lib/utils"

type CharacterContextMode = "mention" | "speech"

export interface ChatInputCharacter {
  id: string
  name: string
  emoji?: string
  avatarUrl?: string
  role?: string
  summary?: string
}

interface ChatInputProps {
  onSendMessage: (
    content: string,
    mentionedTargets?: string[],
    image?: { url: string; name?: string },
  ) => void
  onCommand: (command: string) => void
  characters?: ChatInputCharacter[]
  disabled?: boolean
  insertTextRequest?: { id: number; text: string } | null
  imageGenerationNotice?: string
}

// Character targets for mentions
const MENTION_TARGETS = [
  { id: "hongGilDong", name: "홍길동", emoji: "🧑‍🦱" },
  { id: "imugi", name: "이무기", emoji: "🐉" },
  { id: "extra", name: "엑스트라", emoji: "👥" },
]

function buildMentionNameToId(characters: ChatInputCharacter[]) {
  return new Map([
    ...characters.map((target) => [target.name, target.id] as const),
    ["모두", "all"] as const,
  ])
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function extractTypedMentions(value: string, characters: ChatInputCharacter[]): string[] {
  const mentionNameToId = buildMentionNameToId(characters)
  const mentionIds = new Set<string>()
  const mentionPattern = /(^|\s)@([^\s@]+)(?=\s|$)/g
  let match: RegExpExecArray | null

  while ((match = mentionPattern.exec(value)) !== null) {
    const mentionId = mentionNameToId.get(match[2])
    if (mentionId) mentionIds.add(mentionId)
  }

  return [...mentionIds]
}

function withAutoMentionSpace(nextValue: string, previousValue: string, characters: ChatInputCharacter[]): string {
  if (nextValue.length <= previousValue.length || nextValue.endsWith(" ")) {
    return nextValue
  }

  const mentionNames = [...buildMentionNameToId(characters).keys()].map(escapeRegExp).join("|")
  if (!mentionNames) return nextValue

  const completedMentionPattern = new RegExp(
    `(^|\\s)@(${mentionNames})$`,
  )

  return completedMentionPattern.test(nextValue) ? `${nextValue} ` : nextValue
}

function getActiveMentionToken(value: string, caretPosition: number) {
  const beforeCaret = value.slice(0, caretPosition)
  const match = beforeCaret.match(/(^|\s)@([^\s@]*)$/)
  if (!match) return null
  const token = match[0]
  const leadingSpaceLength = token.startsWith(" ") ? 1 : 0
  const start = caretPosition - token.length + leadingSpaceLength
  return {
    start,
    end: caretPosition,
    query: match[2] ?? "",
  }
}

function renderHighlightedInput(value: string, characters: ChatInputCharacter[]) {
  if (!value) return null

  const names = [...characters.map((character) => character.name), "모두"]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)

  const parts: ReactNode[] = []
  let index = 0

  while (index < value.length) {
    const matchedName = names.find((name) => value.startsWith(`@${name}`, index) || value.startsWith(`ⓣ${name}`, index))
    if (!matchedName) {
      parts.push(value[index])
      index += 1
      continue
    }

    const prefix = value.startsWith("@", index) ? "@" : "ⓣ"
    const token = `${prefix}${matchedName}`
    parts.push(
      <span
        key={`${token}-${index}`}
        className="rounded-md bg-amber-400/20 px-0.5 text-amber-200"
      >
        {token}
      </span>,
    )
    index += token.length
  }

  return parts
}

export function ChatInput({ onSendMessage, onCommand, characters, disabled = false, insertTextRequest, imageGenerationNotice }: ChatInputProps) {
  const mentionCharacters = characters?.length ? characters : MENTION_TARGETS
  const [input, setInput] = useState("")
  const [showCommands, setShowCommands] = useState(false)
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const [contextMode, setContextMode] = useState<CharacterContextMode | null>(null)
  const [mentionQuery, setMentionQuery] = useState("")
  const [activeMentionRange, setActiveMentionRange] = useState<{ start: number; end: number } | null>(null)
  const [attachedImage, setAttachedImage] = useState<{ url: string; name?: string } | null>(null)
  const [alertMessage, setAlertMessage] = useState("")
  const [isMobile, setIsMobile] = useState(false)
  const [isQuickBarDragging, setIsQuickBarDragging] = useState(false)
  const [inputScrollTop, setInputScrollTop] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const quickBarRef = useRef<HTMLDivElement>(null)
  const commandPopupRef = useRef<HTMLDivElement>(null)
  const commandButtonRef = useRef<HTMLButtonElement>(null)
  const characterContextRef = useRef<HTMLDivElement>(null)
  const mentionButtonRef = useRef<HTMLButtonElement>(null)
  const speechButtonRef = useRef<HTMLButtonElement>(null)
  const quickBarDragStartXRef = useRef(0)
  const quickBarScrollStartRef = useRef(0)
  const quickBarHasDraggedRef = useRef(false)
  const suppressQuickButtonClickRef = useRef(false)

  const filteredCommands = SLASH_COMMANDS.filter((cmd) =>
    showCommands && (!input || input.startsWith("/"))
      ? cmd.name.toLowerCase().includes(input.startsWith("/") ? input.slice(1).toLowerCase() : "")
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
      setInputScrollTop(textarea.scrollTop)
    }
  }, [input])

  useEffect(() => {
    if (!disabled) return
    setShowCommands(false)
    closeCharacterContext()
  }, [disabled])

  useEffect(() => {
    if (!showCommands) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (commandPopupRef.current?.contains(target)) return
      if (commandButtonRef.current?.contains(target)) return
      setShowCommands(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowCommands(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [showCommands])

  useEffect(() => {
    if (contextMode === null) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (characterContextRef.current?.contains(target)) return
      if (mentionButtonRef.current?.contains(target)) return
      if (speechButtonRef.current?.contains(target)) return
      closeCharacterContext()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCharacterContext()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [contextMode])

  useEffect(() => {
    if (!insertTextRequest || disabled) return
    insertAtCursor(insertTextRequest.text)
  }, [insertTextRequest])

  // Handle image button click
  const handleImageClick = () => {
    if (disabled) return
    fileInputRef.current?.click()
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (disabled) {
      e.target.value = ""
      return
    }
    const file = files?.[0]

    if (file) {
      if (!file.type.startsWith("image/")) {
        setAlertMessage("이미지 파일만 첨부할 수 있어요.")
        e.target.value = ""
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAttachedImage({ url: reader.result, name: file.name })
        }
      }
      reader.readAsDataURL(file)
    }
    // Reset input so same file can be selected again
    e.target.value = ""
  }

  // Handle command button click
  const handleCommandClick = () => {
    if (disabled) return
    closeCharacterContext()
    if (showCommands) {
      setShowCommands(false)
      textareaRef.current?.focus()
      return
    }
    setShowCommands(true)
    setSelectedCommandIndex(0)
    textareaRef.current?.focus()
  }

  const closeCharacterContext = () => {
    setContextMode(null)
    setMentionQuery("")
    setActiveMentionRange(null)
  }

  const openCharacterContext = (mode: CharacterContextMode) => {
    if (disabled) return
    setShowCommands(false)
    if (contextMode === mode) {
      closeCharacterContext()
      return
    }
    setContextMode(mode)
    setMentionQuery("")
    setActiveMentionRange(null)
  }

  const insertAtCursor = (text: string, range?: { start: number; end: number } | null) => {
    const textarea = textareaRef.current
    const start = range?.start ?? textarea?.selectionStart ?? input.length
    const end = range?.end ?? textarea?.selectionEnd ?? input.length
    const before = input.slice(0, start)
    const after = input.slice(end)
    const needsLeadingSpace = before.length > 0 && !/\s$/.test(before)
    const nextValue = `${before}${needsLeadingSpace ? " " : ""}${text}${after}`
    const nextCursor = before.length + (needsLeadingSpace ? 1 : 0) + text.length

    setInput(nextValue)
    closeCharacterContext()
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor)
    })
  }

  const handleCharacterSelect = (target: ChatInputCharacter | "all") => {
    if (disabled) return
    if (target === "all") {
      insertAtCursor("@모두 ", activeMentionRange)
      return
    }

    if (contextMode === "speech") {
      insertAtCursor(`ⓣ${target.name}: `)
      return
    }

    insertAtCursor(`@${target.name} `, activeMentionRange)
  }

  const handleQuickBarWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!quickBarRef.current) return
    const scrollDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    quickBarRef.current.scrollLeft += scrollDelta
  }

  const handleQuickBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !quickBarRef.current) return

    setIsQuickBarDragging(true)
    quickBarHasDraggedRef.current = false
    quickBarDragStartXRef.current = e.clientX
    quickBarScrollStartRef.current = quickBarRef.current.scrollLeft
  }

  const handleQuickBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isQuickBarDragging || !quickBarRef.current) return

    const dragDistance = e.clientX - quickBarDragStartXRef.current
    if (Math.abs(dragDistance) > 4) {
      quickBarHasDraggedRef.current = true
      suppressQuickButtonClickRef.current = true
    }
    quickBarRef.current.scrollLeft = quickBarScrollStartRef.current - dragDistance
  }

  const stopQuickBarDrag = () => {
    setIsQuickBarDragging(false)
    if (suppressQuickButtonClickRef.current) {
      window.setTimeout(() => {
        suppressQuickButtonClickRef.current = false
      }, 0)
    }
  }

  const handleQuickBarClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressQuickButtonClickRef.current && !quickBarHasDraggedRef.current) return
    e.preventDefault()
    e.stopPropagation()
    quickBarHasDraggedRef.current = false
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (disabled) return
    const nextValue = withAutoMentionSpace(e.target.value, input, mentionCharacters)
    setInput(nextValue)
    setInputScrollTop(e.target.scrollTop)

    const mentionToken = getActiveMentionToken(nextValue, e.target.selectionStart)
    if (mentionToken) {
      setContextMode("mention")
      setMentionQuery(mentionToken.query)
      setActiveMentionRange({ start: mentionToken.start, end: mentionToken.end })
      return
    }

    if (contextMode === "mention" && activeMentionRange) {
      closeCharacterContext()
    }
  }

  const handleInputScroll = (e: UIEvent<HTMLTextAreaElement>) => {
    setInputScrollTop(e.currentTarget.scrollTop)
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (disabled) return
    if (!input.trim() && !attachedImage) return

    // Check if it's a command
    if (input.trim().startsWith("/") && !attachedImage) {
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

    const speechNames = mentionCharacters.map((character) => escapeRegExp(character.name)).join("|")
    const speechTemplatePattern = speechNames
      ? new RegExp(`^ⓣ(${speechNames}):\\s*$`, "u")
      : null
    if (speechTemplatePattern?.test(input.trim())) {
      setAlertMessage("대사 내용을 입력하세요.")
      return
    }

    const mentionedTargets = extractTypedMentions(input, mentionCharacters)

    onSendMessage(
      input.trim(),
      mentionedTargets.length > 0 ? mentionedTargets : undefined,
      attachedImage ?? undefined,
    )
    setInput("")
    setAttachedImage(null)
    setInputScrollTop(0)
    closeCharacterContext()
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleCommandSelect = (commandName: string) => {
    if (disabled) return
    onCommand(commandName)
    setInput("")
    setShowCommands(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (disabled) {
      e.preventDefault()
      return
    }
    // Command navigation
    if (showCommands && filteredCommands.length > 0) {
      if (e.key === "Escape") {
        e.preventDefault()
        setShowCommands(false)
        return
      }
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

  const filteredContextCharacters = mentionCharacters.filter((character) => {
    const query = mentionQuery.trim()
    if (!query) return true
    return character.name.includes(query)
  })
  const shouldShowAllMention = contextMode === "mention" && "모두".includes(mentionQuery.trim())

  return (
    <div className="relative mx-3 mb-[calc(0.75rem+env(safe-area-inset-bottom))] rounded-3xl border border-border/80 bg-background/88 px-3 pb-3 pt-2 shadow-2xl shadow-black/20 backdrop-blur-xl">
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
        <div
          ref={commandPopupRef}
          role="dialog"
          aria-label="명령어"
          className="absolute bottom-full left-0 right-0 z-40 mb-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl shadow-black/25"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-xs font-semibold text-foreground">명령어</p>
            <button
              type="button"
              onClick={() => setShowCommands(false)}
              className="rounded-full p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-label="명령어 닫기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => handleCommandSelect(cmd.name)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                  index === selectedCommandIndex
                    ? "bg-accent"
                    : "hover:bg-accent"
                )}
              >
                <span className="text-lg">{cmd.icon}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    /{cmd.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {cmd.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <CharacterContextBox
        popoverRef={characterContextRef}
        open={!disabled && contextMode !== null}
        mode={contextMode ?? "mention"}
        characters={filteredContextCharacters}
        showAll={shouldShowAllMention}
        onSelect={handleCharacterSelect}
        onClose={closeCharacterContext}
      />

      {/* Quick Action Bar */}
      <div
        ref={quickBarRef}
        onWheel={handleQuickBarWheel}
        onMouseDown={handleQuickBarMouseDown}
        onMouseMove={handleQuickBarMouseMove}
        onMouseUp={stopQuickBarDrag}
        onMouseLeave={stopQuickBarDrag}
        onClickCapture={handleQuickBarClickCapture}
        className={cn(
          "mb-1.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide select-none",
          isQuickBarDragging ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        {/* Fixed Actions */}
        <button
          type="button"
          onClick={handleImageClick}
          disabled={disabled}
          className="flex h-7 min-w-9 items-center justify-center rounded-full border border-border bg-secondary/80 px-2.5 text-secondary-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="이미지 첨부"
          title="이미지 첨부"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        {imageGenerationNotice && (
          <span className="shrink-0 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
            {imageGenerationNotice}
          </span>
        )}
        <button
          ref={commandButtonRef}
          type="button"
          onClick={handleCommandClick}
          disabled={disabled}
          className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-secondary/80 px-2.5 text-xs text-secondary-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Zap className="w-4 h-4" />
          <span>명령어</span>
        </button>

        {/* Divider */}
        <div className="h-4 w-px flex-shrink-0 bg-border" />

        <button
          ref={mentionButtonRef}
          type="button"
          onClick={() => openCharacterContext("mention")}
          disabled={disabled}
          className="flex h-7 min-w-9 items-center justify-center rounded-full border border-border bg-secondary/80 px-2.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="캐릭터 멘션하기"
          title="캐릭터 멘션하기"
        >
          @
        </button>
        <button
          ref={speechButtonRef}
          type="button"
          onClick={() => openCharacterContext("speech")}
          disabled={disabled}
          className="flex h-7 min-w-9 items-center justify-center rounded-full border border-border bg-secondary/80 px-2.5 text-secondary-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="캐릭터 대사 삽입하기"
          title="캐릭터 대사 삽입하기"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
      </div>

      {attachedImage && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-secondary p-2">
          <img
            src={attachedImage.url}
            alt={attachedImage.name ?? "첨부 이미지"}
            className="h-14 w-14 rounded-md object-cover"
          />
          <span className="min-w-0 flex-1 truncate text-xs text-secondary-foreground">
            {attachedImage.name ?? "첨부 이미지"}
          </span>
          <button
            type="button"
            onClick={() => setAttachedImage(null)}
            disabled={disabled}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="이미지 제거"
            title="이미지 제거"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="relative flex flex-1 items-end gap-2 rounded-2xl border border-border/80 bg-input/95 px-3 py-2.5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3 bottom-2.5 top-2.5 overflow-hidden whitespace-pre-wrap break-words text-[15px] leading-6 text-foreground [word-break:keep-all]"
          >
            <div style={{ transform: `translateY(-${inputScrollTop}px)` }}>
              {renderHighlightedInput(input, mentionCharacters)}
              {input.endsWith("\n") && " "}
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onScroll={handleInputScroll}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="메시지를 입력하세요..."
            rows={1}
            className={cn(
              "relative z-10 max-h-24 flex-1 resize-none overflow-y-auto bg-transparent text-[15px] leading-6 outline-none caret-foreground placeholder:text-muted-foreground",
              input ? "text-transparent" : "text-foreground",
              disabled && "cursor-not-allowed opacity-60",
            )}
          />
        </div>
        
        {/* Send Button */}
        <button
          type="submit"
          disabled={disabled || (!input.trim() && !attachedImage)}
          className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors",
            input.trim() || attachedImage
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-secondary text-muted-foreground border border-border"
          )}
          aria-label="전송"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
      <AlertModal
        open={Boolean(alertMessage)}
        message={alertMessage}
        onOpenChange={(open) => {
          if (!open) setAlertMessage("")
        }}
      />
    </div>
  )
}

interface CharacterContextBoxProps {
  popoverRef: RefObject<HTMLDivElement | null>
  open: boolean
  mode: CharacterContextMode
  characters: ChatInputCharacter[]
  showAll: boolean
  onSelect: (target: ChatInputCharacter | "all") => void
  onClose: () => void
}

function CharacterContextBox({
  popoverRef,
  open,
  mode,
  characters,
  showAll,
  onSelect,
  onClose,
}: CharacterContextBoxProps) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={mode === "mention" ? "멘션할 캐릭터" : "말하게 할 캐릭터"}
      className="absolute bottom-full left-4 right-4 z-40 mb-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl shadow-black/25"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-xs font-semibold text-foreground">
          {mode === "mention" ? "멘션할 캐릭터" : "말하게 할 캐릭터"}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label="캐릭터 선택 닫기"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto p-2">
        {showAll && (
          <button
            type="button"
            onClick={() => onSelect("all")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-accent"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm">
              @
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">모두</span>
              <span className="block truncate text-xs text-muted-foreground">모든 캐릭터를 멘션</span>
            </span>
          </button>
        )}
        {characters.map((character) => (
          <button
            key={character.id}
            type="button"
            onClick={() => onSelect(character)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-accent"
          >
            {character.avatarUrl ? (
              <img
                src={character.avatarUrl}
                alt={character.name}
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm">
                {character.emoji || character.name.slice(0, 1)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{character.name}</span>
              {(character.role || character.summary) && (
                <span className="block truncate text-xs text-muted-foreground">
                  {character.role || character.summary}
                </span>
              )}
            </span>
          </button>
        ))}
        {!showAll && characters.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">일치하는 캐릭터가 없어요.</p>
        )}
      </div>
    </div>
  )
}
