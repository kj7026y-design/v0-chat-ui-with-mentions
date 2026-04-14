"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, MoreVertical } from "lucide-react"

interface ChatHeaderProps {
  characterName: string
  level: number
}

export function ChatHeader({ characterName, level }: ChatHeaderProps) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-neutral-900/95 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-neutral-800 transition-colors"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-100" />
        </button>

        <div className="flex items-center gap-3">
          {/* Character Avatar */}
          <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center overflow-hidden">
            <span className="text-lg">🐉</span>
          </div>

          {/* Character Info */}
          <div className="flex flex-col">
            <span className="text-base font-semibold text-neutral-100">
              {characterName}
            </span>
            <span className="text-xs text-neutral-400">
              Level {level}
            </span>
          </div>
        </div>
      </div>

      <button
        className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-neutral-800 transition-colors"
        aria-label="더보기"
      >
        <MoreVertical className="w-5 h-5 text-neutral-400" />
      </button>
    </header>
  )
}
