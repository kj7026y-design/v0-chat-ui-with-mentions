"use client"

import Image from "next/image"
import { X } from "lucide-react"
import { type SavedEvent } from "@/lib/store"

interface EventDetailModalProps {
  event: SavedEvent | null
  onClose: () => void
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  if (!event) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl overflow-hidden border border-border max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[3/4] w-full bg-muted">
          <Image
            src={event.imageUrl || "/placeholder.svg"}
            alt={event.title}
            fill
            sizes="100vw"
            className="object-cover"
          />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-bold text-foreground text-balance">{event.title}</h2>
            <span className="flex-shrink-0 text-[11px] text-muted-foreground mt-1">
              {new Date(event.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
            </span>
          </div>

          <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-pretty">{event.summary}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {event.emotionalTone.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-1.5 border-t border-border/60 pt-4">
            <span className="text-[11px] text-muted-foreground">관련 캐릭터</span>
            <span className="text-[11px] font-medium text-foreground">{event.relatedCharacter}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
