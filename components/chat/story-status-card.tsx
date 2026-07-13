"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StoryStatus {
  useChapters: boolean
  currentChapterId?: string
  currentChapterTitle?: string
  chapterProgress?: number
  currentMission?: string
  currentGoal?: string
  worldDate?: string
  currentLocation?: string
  weather?: string
  characterName: string
  characterEmotion?: string
  characterStatus?: string
  personaName: string
  personaEmotion?: string
  personaStatus?: string
  nextEventCondition?: string
}

interface StoryStatusCardProps {
  status: StoryStatus
  compactPanel?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function StoryStatusCard({ status, compactPanel = false, open, onOpenChange }: StoryStatusCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const expanded = open ?? internalExpanded
  const setExpanded = onOpenChange ?? setInternalExpanded
  const progress = Math.max(0, Math.min(100, status.chapterProgress ?? 0))
  const sceneSummary = [status.currentChapterTitle, status.worldDate, status.currentLocation, status.weather].filter(Boolean).join(" · ")
  const progressText = status.currentMission || status.currentGoal
  const hasScene = Boolean(sceneSummary)
  const hasProgress = Boolean(progressText || status.chapterProgress !== undefined)
  const hasCharacterState = Boolean(status.characterEmotion || status.characterStatus)
  const hasPersonaState = Boolean(status.personaEmotion || status.personaStatus)
  const hasPeopleState = hasCharacterState || hasPersonaState
  const hasNextFlow = Boolean(status.nextEventCondition)
  const summaryParts = [
    status.useChapters && status.currentChapterTitle
      ? `${status.currentChapterTitle} · ${progress}%`
      : null,
    !status.useChapters && progressText ? progressText : null,
    status.characterEmotion ? `${status.characterName} ${status.characterEmotion}` : null,
    status.personaEmotion ? `${status.personaName} ${status.personaEmotion}` : null,
  ].filter(Boolean)
  const summaryText = summaryParts.length > 0 ? summaryParts.join(" · ") : "현재 상태"

  useEffect(() => {
    if (!compactPanel || !expanded) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (panelRef.current?.contains(target)) return
      if (target.closest("[data-chat-status-trigger='true']")) return
      setExpanded(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [compactPanel, expanded, setExpanded])

  if (compactPanel) {
    if (!expanded) return null

    return (
      <div
        ref={panelRef}
        role="dialog"
        aria-label="진행상황"
        className="fixed left-3 right-3 top-[3rem] z-50 max-h-[58dvh] overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl shadow-black/25"
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="min-w-0 truncate text-xs font-semibold text-foreground">진행상황</p>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="rounded-full p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="진행상황 닫기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="max-h-[calc(58dvh-2.5rem)] overflow-y-auto pb-4">
          <StatusDetails
            status={status}
            progress={progress}
            sceneSummary={sceneSummary}
            progressText={progressText}
            hasScene={hasScene}
            hasProgress={hasProgress}
            hasPeopleState={hasPeopleState}
            hasCharacterState={hasCharacterState}
            hasPersonaState={hasPersonaState}
            hasNextFlow={hasNextFlow}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-30 border-b border-border bg-background">
      <div className="px-3 py-1.5">
        <div className="relative rounded-xl border border-border bg-card/80">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left"
            aria-expanded={expanded}
          >
            <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
              {summaryText}
            </p>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>

          {expanded && (
            <div className="absolute left-0 right-0 top-full mt-1 max-h-[42dvh] space-y-3 overflow-y-auto rounded-2xl border border-border bg-card/95 p-3 shadow-2xl shadow-black/40 backdrop-blur">
              <StatusDetails
                status={status}
                progress={progress}
                sceneSummary={sceneSummary}
                progressText={progressText}
                hasScene={hasScene}
                hasProgress={hasProgress}
                hasPeopleState={hasPeopleState}
                hasCharacterState={hasCharacterState}
                hasPersonaState={hasPersonaState}
                hasNextFlow={hasNextFlow}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusDetails({
  status,
  progress,
  sceneSummary,
  progressText,
  hasScene,
  hasProgress,
  hasPeopleState,
  hasCharacterState,
  hasPersonaState,
  hasNextFlow,
}: {
  status: StoryStatus
  progress: number
  sceneSummary: string
  progressText?: string
  hasScene: boolean
  hasProgress: boolean
  hasPeopleState: boolean
  hasCharacterState: boolean
  hasPersonaState: boolean
  hasNextFlow: boolean
}) {
  const [locationText, timeText] = (status.currentLocation ?? "")
    .split("·")
    .map((item) => item.trim())
    .filter(Boolean)
  const sceneMeta = [
    status.worldDate,
    locationText,
    [timeText, status.weather].filter(Boolean).join(" · "),
  ].filter(Boolean).join(" | ")
  const sceneHighlight = sceneMeta || sceneSummary

  return (
    <div className="space-y-5 pb-4">
      {(hasScene || hasProgress) && (
        <section className="space-y-3 pb-1">
          {sceneHighlight && (
            <div className="bg-muted/70 px-3 py-3">
              {status.currentChapterTitle && (
                <p className="text-sm font-semibold leading-relaxed text-foreground">{status.currentChapterTitle}</p>
              )}
              <p className="text-xs font-medium leading-relaxed text-muted-foreground">{sceneHighlight}</p>
            </div>
          )}
          {progressText && (
            <p className="px-3 text-base leading-relaxed text-foreground">{progressText}</p>
          )}
          {status.chapterProgress !== undefined && (
            <div className="flex items-center gap-3 px-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
              <span className="min-w-9 text-right text-sm font-bold tabular-nums text-muted-foreground">{progress}%</span>
            </div>
          )}
        </section>
      )}

      {hasPeopleState && (
        <section className="space-y-3 px-3 pb-1">
          <h3 className="text-sm font-bold text-muted-foreground">인물 상태</h3>
          <div className="grid gap-3">
            {hasCharacterState && (
              <PersonStatus
                name={status.characterName}
                emotion={status.characterEmotion}
                statusText={status.characterStatus}
              />
            )}
            {hasPersonaState && (
              <PersonStatus
                name={status.personaName}
                emotion={status.personaEmotion}
                statusText={status.personaStatus}
              />
            )}
          </div>
        </section>
      )}

      {hasNextFlow && (
        <StatusSection title="다음 흐름" className="px-3">
          <p className="text-sm leading-relaxed text-foreground">{status.nextEventCondition}</p>
        </StatusSection>
      )}
    </div>
  )
}

function StatusSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-1.5", className)}>
      <h3 className="text-[11px] font-semibold text-muted-foreground">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function PersonStatus({
  name,
  emotion,
  statusText,
}: {
  name: string
  emotion?: string
  statusText?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-bold text-foreground">{name}</span>
        {emotion && (
          <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-bold text-foreground">
            {emotion}
          </span>
        )}
      </div>
      {statusText && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{statusText}</p>
      )}
    </div>
  )
}
