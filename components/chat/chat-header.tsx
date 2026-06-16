"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, MoreVertical } from "lucide-react"

interface ChatHeaderProps {
  characterName: string
  characterEmoji?: string
  level: number
  onMenuClick?: () => void
  onProfileClick?: () => void
}

export function ChatHeader({ characterName, characterEmoji = "🐉", level, onMenuClick, onProfileClick }: ChatHeaderProps) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background backdrop-blur-sm border-b border-border">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-accent transition-colors"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        <button
          type="button"
          onClick={onProfileClick}
          className="flex items-center gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-accent"
        >
          {/* Character Avatar */}
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            <span className="text-lg">{characterEmoji}</span>
          </div>

          {/* Character Info */}
          <div className="flex flex-col">
            <span className="text-base font-semibold text-foreground">
              {characterName}
            </span>
            <span className="text-xs text-muted-foreground">
              Level {level}
            </span>
          </div>
        </button>
      </div>

      <button
        onClick={onMenuClick}
        className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-accent transition-colors"
        aria-label="설정 메뉴"
      >
        <MoreVertical className="w-5 h-5 text-muted-foreground" />
      </button>
    </header>
  )
}
