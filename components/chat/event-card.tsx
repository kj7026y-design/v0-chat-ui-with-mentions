"use client"

import Image from "next/image"
import { type SavedEvent } from "@/lib/store"

interface EventCardProps {
  event: SavedEvent
  onClick?: () => void
}

export function EventCard({ event, onClick }: EventCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-muted text-left"
    >
      <Image
        src={event.imageUrl || "/placeholder.svg"}
        alt={event.title}
        fill
        sizes="(max-width: 640px) 33vw, 200px"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      {/* Text */}
      <div className="absolute inset-x-0 bottom-0 p-2.5">
        <h3 className="text-xs font-semibold text-white line-clamp-1">{event.title}</h3>
        <div className="mt-1 flex flex-wrap gap-1">
          {event.emotionalTone.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}
