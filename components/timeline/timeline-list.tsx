import { TimelineCard } from "./timeline-card"
import type { TimelineEvent } from "@/app/timeline/page"

interface TimelineListProps {
  events: TimelineEvent[]
  onEventClick: (event: TimelineEvent) => void
}

export function TimelineList({ events, onEventClick }: TimelineListProps) {
  return (
    <div className="relative">
      {/* Vertical Timeline Line */}
      <div className="absolute left-3 sm:left-4 top-2 bottom-2 w-px bg-border" />

      {/* Timeline Events */}
      <div className="flex flex-col gap-1">
        {events.map((event, index) => (
          <TimelineCard
            key={event.id}
            event={event}
            onClick={() => onEventClick(event)}
            isFirst={index === 0}
            isLast={index === events.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
