"use client"

import { Heart } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { getLikedWorkIds, saveLikedWorkIds } from "@/lib/work-comments-storage"

interface WorkLikeButtonProps {
  workId: string
  initialCount?: number
  onCountChange?: (count: number) => void
}

export function WorkLikeButton({ workId, initialCount = 0, onCountChange }: WorkLikeButtonProps) {
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    setLiked(getLikedWorkIds().includes(workId))
    setCount(initialCount)
  }, [initialCount, workId])

  const toggleLike = () => {
    const likedIds = getLikedWorkIds()
    const nextLiked = !liked
    const nextIds = nextLiked ? [...likedIds, workId] : likedIds.filter((id) => id !== workId)
    const nextCount = Math.max(0, count + (nextLiked ? 1 : -1))
    saveLikedWorkIds(nextIds)
    setLiked(nextLiked)
    setCount(nextCount)
    onCountChange?.(nextCount)
  }

  return (
    <button
      type="button"
      onClick={toggleLike}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
        liked
          ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-100"
          : "border-border bg-card text-foreground hover:bg-accent",
      )}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-current")} />
      좋아요 {count}
    </button>
  )
}
