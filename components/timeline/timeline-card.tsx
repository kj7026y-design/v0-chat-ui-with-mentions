import { ChevronRight } from "lucide-react"
import type { TimelineEvent } from "@/app/timeline/page"
import { cn } from "@/lib/utils"

interface TimelineCardProps {
  event: TimelineEvent
  onClick: () => void
  isFirst?: boolean
  isLast?: boolean
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function TimelineCard({ event, onClick, isFirst, isLast }: TimelineCardProps) {
  return (
    <div className="relative flex items-start gap-4 sm:gap-6 group">
      {/* Timeline Node */}
      <div className="relative z-10 flex-shrink-0">
        <div
          className={cn(
            "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center",
            "bg-secondary border border-border",
            "group-hover:bg-accent group-hover:border-muted-foreground/30",
            "transition-colors duration-200"
          )}
        >
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-muted-foreground group-hover:bg-foreground transition-colors duration-200" />
        </div>
      </div>

      {/* Card Content */}
      <button
        onClick={onClick}
        className={cn(
          "flex-1 flex items-center justify-between",
          "py-4 sm:py-5 px-4 sm:px-5 rounded-lg",
          "bg-card/50 hover:bg-card",
          "transition-all duration-200",
          "text-left group/card",
          isFirst && "mt-0",
          isLast && "mb-0"
        )}
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-medium text-foreground truncate group-hover/card:text-foreground">
            {event.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDate(event.date)}
          </p>
        </div>

        {/* Chevron Icon */}
        <div className="flex-shrink-0 ml-3">
          <ChevronRight
            className={cn(
              "w-5 h-5 text-muted-foreground",
              "group-hover/card:text-foreground group-hover/card:translate-x-0.5",
              "transition-all duration-200"
            )}
          />
        </div>
      </button>
    </div>
  )
}
