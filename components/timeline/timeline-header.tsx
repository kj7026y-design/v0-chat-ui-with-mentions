import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface TimelineHeaderProps {
  onAddEvent: () => void
}

export function TimelineHeader({ onAddEvent }: TimelineHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-8 sm:mb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          시나리오 타임라인
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          이야기의 흐름을 한눈에 확인하세요
        </p>
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
