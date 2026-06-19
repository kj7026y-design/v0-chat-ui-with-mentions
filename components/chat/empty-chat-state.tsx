"use client"

import { type StartScenario } from "@/lib/store"
import { getIntroPreviewText, type IntroScenario } from "@/lib/storychat-storage"
import { cn } from "@/lib/utils"

interface EmptyChatStateProps {
  characterName: string
  characterEmoji: string
  startScenario?: StartScenario | null
  onSuggestionClick: (suggestion: string) => void
  introScenarios?: IntroScenario[]
  selectedIntroScenarioId?: string
  onIntroSelect?: (introId: string) => void
  textSize?: number
  lineHeight?: number
}

const SUGGESTIONS = ["당신은 누구죠?", "여긴 어디예요?", "내가 왜 여기 있는 거죠?"]

export function EmptyChatState({
  characterName,
  characterEmoji,
  startScenario,
  onSuggestionClick,
  introScenarios = [],
  selectedIntroScenarioId,
  onIntroSelect,
  textSize = 16,
  lineHeight = 1.5,
}: EmptyChatStateProps) {
  const hasIntros = introScenarios.length > 0
  const selectedIntro =
    introScenarios.find((intro) => intro.id === selectedIntroScenarioId) ??
    (introScenarios.length === 1 ? introScenarios[0] : undefined)

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 text-center">
      {/* Character Avatar */}
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
        <span className="text-4xl">{characterEmoji}</span>
      </div>

      <h2 className="text-lg font-semibold text-foreground">{characterName}</h2>

      {hasIntros ? (
        <div className="mt-5 w-full max-w-sm space-y-4">
          {introScenarios.length > 1 && (
            <div className="space-y-2">
              <p className="font-semibold text-foreground" style={{ fontSize: textSize, lineHeight }}>
                시작 장면을 선택하세요
              </p>
              <div className="grid gap-2">
                {introScenarios.map((intro) => (
                  <button
                    key={intro.id}
                    type="button"
                    onClick={() => onIntroSelect?.(intro.id)}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition-colors",
                      selectedIntro?.id === intro.id
                        ? "border-amber-300/40 bg-amber-300/10"
                        : "border-border bg-card hover:bg-accent",
                    )}
                  >
                    <span className="block font-semibold text-foreground" style={{ fontSize: textSize, lineHeight }}>{intro.title}</span>
                    <span className="mt-1 line-clamp-2 block text-muted-foreground" style={{ fontSize: Math.max(12, textSize - 2), lineHeight }}>
                      {getIntroPreviewText(intro)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedIntro && (
            <ChatIntroPreview intro={selectedIntro} onOptionClick={onSuggestionClick} textSize={textSize} lineHeight={lineHeight} />
          )}
        </div>
      ) : (
        <>
          {startScenario && (
            <div className="mt-4 w-full max-w-xs rounded-2xl bg-card border border-border px-4 py-3">
              <p className="font-medium text-muted-foreground" style={{ fontSize: Math.max(11, textSize - 4), lineHeight }}>{startScenario.title}</p>
              <p className="mt-1 text-foreground text-pretty" style={{ fontSize: textSize, lineHeight }}>
                {startScenario.content}
              </p>
            </div>
          )}
          <div className="mt-5 w-full max-w-xs rounded-2xl border border-dashed border-border bg-card/70 px-4 py-4">
            <p className="font-semibold text-foreground" style={{ fontSize: textSize, lineHeight }}>자유 도입</p>
            <p className="mt-2 text-muted-foreground" style={{ fontSize: textSize, lineHeight }}>
              아직 정해진 시작 장면이 없어요. 원하는 방식으로 첫 문장을 입력해 이야기를 시작해보세요.
            </p>
          </div>
          <div className="flex flex-col gap-2 mt-4 w-full max-w-xs">
            {["나는 무너진 성문 앞에 멈춰 선다.", `${characterName}, 여기가 어디야?`, ...SUGGESTIONS].slice(0, 4).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSuggestionClick(suggestion)}
                className="px-4 py-3 rounded-2xl bg-card border border-border text-foreground hover:bg-accent transition-colors"
                style={{ fontSize: textSize, lineHeight }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ChatIntroPreview({
  intro,
  onOptionClick,
  textSize,
  lineHeight,
}: {
  intro: IntroScenario
  onOptionClick: (suggestion: string) => void
  textSize: number
  lineHeight: number
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card text-left">
      {intro.imageUrl && (
        <img src={intro.imageUrl} alt={intro.title} className="h-36 w-full object-cover" />
      )}
      <div className="space-y-3 px-4 py-4">
        <div>
          <p className="font-bold text-foreground" style={{ fontSize: textSize, lineHeight }}>{intro.title}</p>
          {intro.scene && <p className="mt-2 text-muted-foreground" style={{ fontSize: textSize, lineHeight }}>{intro.scene}</p>}
        </div>
        {intro.firstMessage && (
          <button
            type="button"
            onClick={() => onOptionClick(intro.firstMessage ?? "")}
            className="w-full rounded-2xl border border-border bg-background px-3 py-3 text-left transition-colors hover:bg-accent"
          >
            <p className="font-medium text-muted-foreground" style={{ fontSize: Math.max(11, textSize - 4), lineHeight }}>첫 메시지</p>
            <p className="mt-1 text-foreground" style={{ fontSize: textSize, lineHeight }}>{intro.firstMessage}</p>
          </button>
        )}
        {(intro.options?.length ?? 0) > 0 && (
          <div className="space-y-2">
            {intro.options?.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onOptionClick(option)}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-left text-foreground transition-colors hover:bg-accent"
                style={{ fontSize: textSize, lineHeight }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
