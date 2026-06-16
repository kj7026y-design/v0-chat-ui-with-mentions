"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Activity, X } from "lucide-react"
import { cn } from "@/lib/utils"

type OpenReason = "auto" | "manual" | null

interface FloatingStatusWidgetProps {
  enabled?: boolean
  text?: string
  updatedAt?: string
  isEmptyChat?: boolean
}

export function getCompactStatusText(statusBarText?: string) {
  return (statusBarText ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" · ")
}

export function FloatingStatusWidget({
  enabled,
  text,
  updatedAt,
  isEmptyChat,
}: FloatingStatusWidgetProps) {
  const compactText = useMemo(() => getCompactStatusText(text), [text])
  const trimmedText = text?.trim() ?? ""
  const [isOpen, setIsOpen] = useState(false)
  const [openReason, setOpenReason] = useState<OpenReason>(null)
  const [isHighlighted, setIsHighlighted] = useState(false)
  const hasMountedRef = useRef(false)
  const previousAutoKeyRef = useRef<string>("")
  const autoCloseTimerRef = useRef<number | null>(null)

  const clearAutoCloseTimer = () => {
    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
  }

  useEffect(() => {
    if (!enabled || !trimmedText) {
      clearAutoCloseTimer()
      setIsOpen(false)
      setOpenReason(null)
      setIsHighlighted(false)
      hasMountedRef.current = false
      previousAutoKeyRef.current = ""
      return
    }

    const autoKey = `${updatedAt ?? ""}:${trimmedText}`
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      previousAutoKeyRef.current = autoKey
      return
    }

    if (previousAutoKeyRef.current === autoKey) return

    previousAutoKeyRef.current = autoKey
    clearAutoCloseTimer()
    setIsOpen(true)
    setOpenReason("auto")
    setIsHighlighted(true)

    autoCloseTimerRef.current = window.setTimeout(() => {
      setIsOpen((current) => {
        if (openReason === "manual") return current
        return false
      })
      setOpenReason((current) => (current === "auto" ? null : current))
      setIsHighlighted(false)
      autoCloseTimerRef.current = null
    }, 10000)
  }, [enabled, openReason, trimmedText, updatedAt])

  useEffect(() => () => clearAutoCloseTimer(), [])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      clearAutoCloseTimer()
      setIsOpen(false)
      setOpenReason(null)
      setIsHighlighted(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  if (!enabled || !trimmedText) return null

  const openManually = () => {
    clearAutoCloseTimer()
    setIsOpen(true)
    setOpenReason("manual")
    setIsHighlighted(false)
  }

  const closeWidget = () => {
    clearAutoCloseTimer()
    setIsOpen(false)
    setOpenReason(null)
    setIsHighlighted(false)
  }

  const handleButtonClick = () => {
    if (isOpen) {
      closeWidget()
      return
    }
    openManually()
  }

  const preserveManualOpen = () => {
    if (openReason !== "auto") return
    clearAutoCloseTimer()
    setOpenReason("manual")
    setIsHighlighted(false)
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-3 z-30 flex flex-col items-start gap-2 sm:left-4",
        isEmptyChat ? "bottom-[172px]" : "bottom-[188px]",
      )}
    >
      {isOpen && (
        <StatusPopoverPanel
          text={trimmedText}
          compactText={compactText}
          onClose={closeWidget}
          onInteract={preserveManualOpen}
        />
      )}
      <StatusFloatingButton
        isOpen={isOpen}
        isHighlighted={isHighlighted}
        onClick={handleButtonClick}
      />
    </div>
  )
}

interface StatusFloatingButtonProps {
  isOpen: boolean
  isHighlighted: boolean
  onClick: () => void
}

function StatusFloatingButton({ isOpen, isHighlighted, onClick }: StatusFloatingButtonProps) {
  return (
    <button
      type="button"
      aria-label={isOpen ? "현재 상태 닫기" : "현재 상태 보기"}
      aria-expanded={isOpen}
      onClick={onClick}
      className={cn(
        "pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur transition",
        "border-white/10 bg-background/85 text-muted-foreground hover:border-white/20 hover:bg-card hover:text-foreground",
        isHighlighted && "border-amber-300/50 bg-amber-500/15 text-amber-100 shadow-amber-950/30",
      )}
    >
      <Activity className="h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
  )
}

interface StatusPopoverPanelProps {
  text: string
  compactText: string
  onClose: () => void
  onInteract: () => void
}

function StatusPopoverPanel({ text, compactText, onClose, onInteract }: StatusPopoverPanelProps) {
  return (
    <section
      role="status"
      aria-label="현재 상태"
      onPointerDown={onInteract}
      onFocus={onInteract}
      className="pointer-events-auto w-[calc(100vw-24px)] max-w-80 rounded-2xl border border-white/10 bg-background/95 p-3 shadow-2xl shadow-black/30 backdrop-blur"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">현재 상태</p>
          <p className="mt-1 truncate text-xs font-medium text-foreground">{compactText}</p>
        </div>
        <button
          type="button"
          aria-label="현재 상태 닫기"
          onClick={onClose}
          className="rounded-full p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap break-keep text-xs leading-relaxed text-muted-foreground">
        {text}
      </p>
    </section>
  )
}
