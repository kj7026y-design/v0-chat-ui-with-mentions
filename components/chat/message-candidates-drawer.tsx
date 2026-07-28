"use client"

import { useState } from "react"
import { Check, GitBranch } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import type { ChatMessage } from "@/lib/chat-types"
import { cn } from "@/lib/utils"

function normalizeCandidateContent(content: string) {
  return content
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

interface MessageCandidateControlsProps {
  message: ChatMessage
  disabled?: boolean
  textSize: number
  lineHeight: number
  onSelectCandidate?: (messageId: string, candidateId: string) => void
}

export function MessageCandidateControls({
  message,
  disabled = false,
  textSize,
  lineHeight,
  onSelectCandidate,
}: MessageCandidateControlsProps) {
  const [open, setOpen] = useState(false)
  const candidates = message.messageCandidates ?? []
  const alternativeCount = Math.max(0, candidates.length - 1)

  if (alternativeCount === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--chat-theme-panel-border)] bg-[var(--chat-theme-panel-bg)] px-2.5 text-xs font-semibold text-[var(--chat-theme-text)] transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10"
        aria-label={`다른 전개 ${alternativeCount}개 보기`}
      >
        <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
        <span>다른 전개 {alternativeCount}개</span>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-h-[82dvh] max-w-md border-border bg-card">
          <DrawerHeader className="px-5 pb-2 pt-5 text-left">
            <DrawerTitle className="text-base font-bold">다른 전개</DrawerTitle>
            <DrawerDescription className="sr-only">생성된 답변 후보 목록</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-2 overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
            {candidates.map((candidate, index) => {
              const selected = candidate.id === message.selectedCandidateId
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => {
                    onSelectCandidate?.(message.id, candidate.id)
                    setOpen(false)
                  }}
                  className={cn(
                    "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background/60 text-foreground hover:bg-accent",
                  )}
                  aria-pressed={selected}
                >
                  <span className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold">전개 {index + 1}</span>
                    {selected && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        선택됨
                      </span>
                    )}
                  </span>
                  <span
                    className="block whitespace-pre-wrap break-words [word-break:keep-all]"
                    style={{ fontSize: textSize, lineHeight }}
                  >
                    {normalizeCandidateContent(candidate.content)}
                  </span>
                </button>
              )
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
