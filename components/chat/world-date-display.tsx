"use client"

import { Calendar } from "lucide-react"

interface WorldDateDisplayProps {
  date: string
}

export function WorldDateDisplay({ date }: WorldDateDisplayProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 bg-background border-b border-border">
      <Calendar className="w-3 h-3 text-muted-foreground" />
      <span className="text-[11px] text-muted-foreground font-medium tracking-wide">
        세계관 날짜: {date}
      </span>
    </div>
  )
}
