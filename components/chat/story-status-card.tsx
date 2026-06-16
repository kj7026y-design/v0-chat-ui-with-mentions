"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StoryStatus {
  useChapters: boolean
  currentChapterId?: string
  currentChapterTitle?: string
  chapterProgress?: number
  currentMission?: string
  currentGoal?: string
  worldDate?: string
  characterName: string
  characterEmotion: string
  characterStatus?: string
  personaName: string
  personaEmotion: string
  personaStatus?: string
  nextEventCondition?: string
}

interface StoryStatusCardProps {
  status: StoryStatus
}

export function StoryStatusCard({ status }: StoryStatusCardProps) {
  const [expanded, setExpanded] = useState(false)
  const progress = Math.max(0, Math.min(100, status.chapterProgress ?? 0))
  const summaryParts = [
    status.useChapters && status.currentChapterTitle
      ? `${status.currentChapterTitle} ${progress}%`
      : null,
    `${status.characterName}: ${status.characterEmotion}`,
    `${status.personaName}: ${status.personaEmotion}`,
  ].filter(Boolean)

  return (
    <div className="relative z-30 border-b border-border bg-background">
      <div className="px-3 py-2">
        <div className="relative rounded-lg border border-border bg-card/80">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left"
            aria-expanded={expanded}
          >
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
              <span className="text-foreground">{summaryParts.join(" · ")}</span>
            </p>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>

          {expanded && (
            <div className="absolute left-0 right-0 top-full mt-1 max-h-[46dvh] space-y-3 overflow-y-auto rounded-lg border border-border bg-card/95 px-3 py-3 shadow-2xl shadow-black/40 backdrop-blur">
              {status.useChapters && (
                <div className="space-y-2">
                  <CompactStatusRow label="현재 챕터" value={status.currentChapterTitle} />
                  <div className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-[11px] text-muted-foreground">진행도</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">{progress}%</span>
                  </div>
                  <CompactStatusRow label="현재 미션" value={status.currentMission} />
                  <CompactStatusRow label="현재 목표" value={status.currentGoal} />
                </div>
              )}

              <div className="grid gap-2">
                <CompactStatusRow label="세계관 날짜" value={status.worldDate} />
                <CompactStatusRow label={`${status.characterName} 감정`} value={status.characterEmotion} />
                <CompactStatusRow label={`${status.characterName} 상태`} value={status.characterStatus} />
                <CompactStatusRow label={`${status.personaName} 감정`} value={status.personaEmotion} />
                <CompactStatusRow label={`${status.personaName} 상태`} value={status.personaStatus} />
                {status.useChapters && (
                  <CompactStatusRow label="다음 이벤트" value={status.nextEventCondition} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CompactStatusRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null

  return (
    <div className="flex items-start gap-3">
      <span className="w-20 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 text-[11px] leading-relaxed text-foreground">{value}</span>
    </div>
  )
}
