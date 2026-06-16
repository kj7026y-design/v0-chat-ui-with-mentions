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
              <p className="text-sm font-semibold text-foreground">시작 장면을 선택하세요</p>
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
                    <span className="block text-sm font-semibold text-foreground">{intro.title}</span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                      {getIntroPreviewText(intro)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedIntro && (
            <ChatIntroPreview intro={selectedIntro} onOptionClick={onSuggestionClick} />
          )}
        </div>
      ) : (
        <>
          {startScenario && (
            <div className="mt-4 w-full max-w-xs rounded-2xl bg-card border border-border px-4 py-3">
              <p className="text-[11px] font-medium text-muted-foreground">{startScenario.title}</p>
              <p className="mt-1 text-sm text-foreground leading-relaxed text-pretty">
                {startScenario.content}
              </p>
            </div>
          )}
          <div className="mt-5 w-full max-w-xs rounded-2xl border border-dashed border-border bg-card/70 px-4 py-4">
            <p className="text-sm font-semibold text-foreground">자유 도입</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              아직 정해진 시작 장면이 없어요. 원하는 방식으로 첫 문장을 입력해 이야기를 시작해보세요.
            </p>
          </div>
          <div className="flex flex-col gap-2 mt-4 w-full max-w-xs">
            {["나는 무너진 성문 앞에 멈춰 선다.", `${characterName}, 여기가 어디야?`, ...SUGGESTIONS].slice(0, 4).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSuggestionClick(suggestion)}
                className="px-4 py-3 rounded-2xl bg-card border border-border text-sm text-foreground hover:bg-accent transition-colors"
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
}: {
  intro: IntroScenario
  onOptionClick: (suggestion: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card text-left">
      {intro.imageUrl && (
        <img src={intro.imageUrl} alt={intro.title} className="h-36 w-full object-cover" />
      )}
      <div className="space-y-3 px-4 py-4">
        <div>
          <p className="text-sm font-bold text-foreground">{intro.title}</p>
          {intro.scene && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{intro.scene}</p>}
        </div>
        {intro.firstMessage && (
          <div className="rounded-2xl border border-border bg-background px-3 py-3">
            <p className="text-[11px] font-medium text-muted-foreground">첫 메시지</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{intro.firstMessage}</p>
          </div>
        )}
        {(intro.options?.length ?? 0) > 0 && (
          <div className="space-y-2">
            {intro.options?.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onOptionClick(option)}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
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
