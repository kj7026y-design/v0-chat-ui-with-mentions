"use client"

import { Calendar } from "lucide-react"

interface WorldDateDisplayProps {
  date: string
}

export function WorldDateDisplay({ date }: WorldDateDisplayProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 bg-black border-b border-neutral-800/50">
      <Calendar className="w-3 h-3 text-neutral-600" />
      <span className="text-[11px] text-neutral-500 font-medium tracking-wide">
        세계관 날짜: {date}
      </span>
    </div>
  )
}
