"use client"

import { Check, Lock, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { type StartScenarioSettings, type StartScenario } from "@/lib/store"

interface StartScenarioSelectProps {
  settings: StartScenarioSettings
  selected: StartScenario | null
  customText: string
  onCustomTextChange: (text: string) => void
  onSelect: (scenario: StartScenario) => void
}

export function StartScenarioSelect({
  settings,
  selected,
  customText,
  onCustomTextChange,
  onSelect,
}: StartScenarioSelectProps) {
  const {
    allowUserChangeStartScenario,
    allowCustomStartScenario,
    defaultStartScenario,
    authorStartOptions,
  } = settings

  const isSelected = (title: string) => selected?.title === title

  // 작가가 변경을 허용하지 않은 경우
  if (!allowUserChangeStartScenario) {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">시작 상황</h3>
          <p className="text-xs text-muted-foreground">
            이 작품은 작가가 설정한 시작 상황으로만 진행돼요.
          </p>
        </div>
        <div className="rounded-xl border border-primary bg-accent p-4">
          <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
            <Lock className="h-3 w-3" />
            기존 설정 유지
          </span>
          <p className="mt-1.5 text-sm text-foreground leading-relaxed">{defaultStartScenario}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">첫 시작 설정</h3>
        <p className="text-xs text-muted-foreground">
          이야기를 어떻게 시작할지 선택해주세요.
        </p>
      </div>

      <div className="space-y-2">
        {/* 기존 설정 유지 */}
        <OptionCard
          title="기존 설정 유지"
          description={defaultStartScenario}
          selected={isSelected("기존 설정 유지")}
          onClick={() =>
            onSelect({ type: "default", title: "기존 설정 유지", content: defaultStartScenario })
          }
        />

        {/* 작가 지정 옵션 */}
        {authorStartOptions.map((opt) => (
          <OptionCard
            key={opt.id}
            title={opt.title}
            description={opt.description}
            selected={isSelected(opt.title)}
            onClick={() =>
              onSelect({ type: "author_option", title: opt.title, content: opt.description })
            }
          />
        ))}

        {/* 직접 입력 */}
        {allowCustomStartScenario ? (
          <div
            className={cn(
              "rounded-xl border p-3.5 transition-colors",
              selected?.type === "custom" ? "border-primary bg-accent" : "border-border bg-card"
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              직접 입력
            </span>
            <Textarea
              value={customText}
              onChange={(e) => {
                onCustomTextChange(e.target.value)
                onSelect({ type: "custom", title: "직접 입력", content: e.target.value })
              }}
              placeholder="예: 나는 오래전 그를 구해준 사람이지만, 그는 아직 나를 기억하지 못한다."
              className="mt-2 min-h-[72px] resize-none border-border bg-background text-sm"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border px-3.5 py-3 text-xs text-muted-foreground">
            작가가 직접 입력을 허용하지 않았어요.
          </div>
        )}
      </div>
    </div>
  )
}

function OptionCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-3.5 text-left transition-colors",
        selected ? "border-primary bg-accent" : "border-border bg-card hover:bg-accent"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {selected && (
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary">
            <Check className="h-3 w-3 text-primary-foreground" />
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
    </button>
  )
}
