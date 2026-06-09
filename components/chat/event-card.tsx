"use client"

import { type SavedEvent } from "@/lib/store"

interface EventCardProps {
  event: SavedEvent
}

export function EventCard({ event }: EventCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{event.title}</h3>
        <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
          {new Date(event.createdAt).toLocaleDateString("ko-KR", {
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
        {event.summary}
      </p>

      {/* Emotion tags */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {event.emotionalTone.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Related character */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/60">
        <span className="text-[10px] text-muted-foreground">관련 캐릭터</span>
        <span className="text-[10px] font-medium text-foreground">{event.relatedCharacter}</span>
      </div>
    </div>
  )
}
