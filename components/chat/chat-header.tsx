"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown, MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatHeaderProps {
  characterName: string
  characterEmoji?: string
  level?: number
  modelLabel?: string
  statusSummary?: string
  isStatusOpen?: boolean
  onMenuClick?: () => void
  onProfileClick?: () => void
  onModelClick?: () => void
  onStatusClick?: () => void
}

export function ChatHeader({
  characterName,
  characterEmoji = "🐉",
  level,
  modelLabel,
  statusSummary,
  isStatusOpen = false,
  onMenuClick,
  onProfileClick,
  onModelClick,
  onStatusClick,
}: ChatHeaderProps) {
  const router = useRouter()
  const titleText = [
    characterName,
    level !== undefined ? `Lv.${level}` : undefined,
  ].filter(Boolean).join(" · ")

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-border/70 bg-background/82 px-2.5 py-1.5 backdrop-blur-xl">
      <div className="flex h-8 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={() => router.back()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-accent transition-colors"
          aria-label="뒤로 가기"
        >
            <ArrowLeft className="h-[18px] w-[18px] text-foreground" />
        </button>

        <button
          type="button"
          onClick={onProfileClick}
            className="min-w-0 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-accent"
        >
            <div className="flex min-w-0 items-baseline gap-1.5">
              <span className="shrink-0 text-sm font-semibold leading-tight text-foreground">
                {titleText}
              </span>
              {statusSummary && (
                <span className="min-w-0 truncate text-[11px] font-medium leading-tight text-muted-foreground">
                  · {statusSummary}
                </span>
              )}
            </div>
        </button>
      </div>

        <div className="flex shrink-0 items-center gap-1">
          {statusSummary && (
            <button
              type="button"
              onClick={onStatusClick}
              data-chat-status-trigger="true"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="상태 상세 보기"
              aria-expanded={isStatusOpen}
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isStatusOpen && "rotate-180")} />
            </button>
          )}
        {modelLabel && (
          <button
            type="button"
            onClick={(event) => {
              event.currentTarget.blur()
              ;(onModelClick ?? onMenuClick)?.()
            }}
              className="rounded-full border border-border/80 bg-muted/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
              {modelLabel}
          </button>
        )}
        <button
          onClick={onMenuClick}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent transition-colors"
          aria-label="설정 메뉴"
        >
            <MoreVertical className="h-[18px] w-[18px] text-muted-foreground" />
        </button>
        </div>
      </div>
    </header>
  )
}
