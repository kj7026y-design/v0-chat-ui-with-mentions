"use client"

import { type StartScenario } from "@/lib/store"

interface EmptyChatStateProps {
  characterName: string
  characterEmoji: string
  startScenario?: StartScenario | null
  onSuggestionClick: (suggestion: string) => void
}

const SUGGESTIONS = ["당신은 누구죠?", "여긴 어디예요?", "내가 왜 여기 있는 거죠?"]

export function EmptyChatState({
  characterName,
  characterEmoji,
  startScenario,
  onSuggestionClick,
}: EmptyChatStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 text-center">
      {/* Character Avatar */}
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
        <span className="text-4xl">{characterEmoji}</span>
      </div>

      <h2 className="text-lg font-semibold text-foreground">{characterName}</h2>

      {/* Selected start scenario */}
      {startScenario && (
        <div className="mt-4 w-full max-w-xs rounded-2xl bg-card border border-border px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground">{startScenario.title}</p>
          <p className="mt-1 text-sm text-foreground leading-relaxed text-pretty">
            {startScenario.content}
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground mt-4 max-w-xs text-pretty leading-relaxed">
        이야기는 아직 시작되지 않았어요. 첫 문장을 건네보세요.
      </p>

      {/* Suggestion Chips */}
      <div className="flex flex-col gap-2 mt-6 w-full max-w-xs">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="px-4 py-3 rounded-2xl bg-card border border-border text-sm text-foreground hover:bg-accent transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
