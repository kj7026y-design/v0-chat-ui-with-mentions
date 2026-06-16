"use client"

export function ChatStatusBar({ text }: { text?: string }) {
  if (!text?.trim()) return null

  return (
    <div className="shrink-0 border-t border-border bg-background/95 px-4 py-2 backdrop-blur">
      <div className="rounded-xl border border-border bg-card/80 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">현재 상태</p>
        <p className="mt-1 max-h-20 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground">
          {text}
        </p>
      </div>
    </div>
  )
}
