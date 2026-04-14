"use client"

import { type Story } from "@/lib/store"

interface StoryCardProps {
  story: Story
  onClick: () => void
}

export function StoryCard({ story, onClick }: StoryCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex-shrink-0 w-[140px] sm:w-[160px] overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-transform hover:scale-105"
    >
      <div className="aspect-[2/3] relative">
        <img
          src={story.coverImage}
          alt={story.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-semibold text-white text-left line-clamp-2 leading-tight">
            {story.title}
          </h3>
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
