"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, ArrowLeft } from "lucide-react"

interface TimelineHeaderProps {
  onAddEvent: () => void
}

export function TimelineHeader({ onAddEvent }: TimelineHeaderProps) {
  const router = useRouter()

  return (
    <header className="flex items-center justify-between mb-8 sm:mb-12">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            시나리오 타임라인
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            이야기의 흐름을 한눈에 확인하세요
          </p>
        </div>
      </div>
      <Button
        onClick={onAddEvent}
        size="sm"
        className="bg-secondary text-secondary-foreground hover:bg-accent"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        <span className="hidden sm:inline">이벤트 추가</span>
        <span className="sm:hidden">추가</span>
      </Button>
    </header>
  )
}
