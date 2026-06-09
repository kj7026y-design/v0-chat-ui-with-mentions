"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StoryStatus {
  chapter: string
  goal: string
  progress: number
  worldDate: string
  emotion: string
}

interface StoryStatusCardProps {
  status: StoryStatus
}

export function StoryStatusCard({ status }: StoryStatusCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mx-4 my-2 rounded-xl bg-card border border-border overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground">현재 챕터</span>
            <span className="text-xs font-semibold text-foreground truncate">{status.chapter}</span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${status.progress}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">{status.progress}%</span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/50">
          <StatusRow label="목표" value={status.goal} />
          <StatusRow label="세계관 날짜" value={status.worldDate} />
          <StatusRow label="캐릭터 상태" value={status.emotion} />
        </div>
      )}
    </div>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">{label}</span>
      <span className="text-[11px] text-foreground flex-1">{value}</span>
    </div>
  )
}
