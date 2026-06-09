"use client"

import { type Story } from "@/lib/store"
import { Play, Heart } from "lucide-react"

function formatCount(n?: number): string {
  if (!n) return "0"
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`
  return n.toLocaleString()
}

interface StoryCardProps {
  story: Story
  onClick: () => void
}

export function StoryCard({ story, onClick }: StoryCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex-shrink-0 w-[140px] sm:w-[160px] overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-transform hover:scale-105 text-left"
    >
      <div className="aspect-[2/3] relative">
        <img
          src={story.coverImage || "/placeholder.svg"}
          alt={story.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Author badge */}
        {story.author && (
          <span className="absolute top-2 left-2 text-[10px] font-medium text-white/90 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
            @{story.author}
          </span>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight">
            {story.title}
          </h3>

          {/* Stats */}
          <div className="flex items-center gap-2.5 mt-1.5 text-[10px] text-white/80">
            <span className="flex items-center gap-0.5">
              <Play className="w-2.5 h-2.5 fill-current" />
              {formatCount(story.playCount)}
            </span>
            <span className="flex items-center gap-0.5">
              <Heart className="w-2.5 h-2.5 fill-current" />
              {formatCount(story.likeCount)}
            </span>
          </div>

          <div className="flex flex-wrap gap-1 mt-1.5">
            {story.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] text-white/70 bg-white/10 px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}
