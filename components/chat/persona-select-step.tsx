"use client"

import { Check, Plus, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { type Persona } from "@/lib/store"

interface PersonaSelectStepProps {
  personas: Persona[]
  selectedId: string | null
  onSelect: (persona: Persona) => void
  onCreateNew: () => void
}

export function PersonaSelectStep({
  personas,
  selectedId,
  onSelect,
  onCreateNew,
}: PersonaSelectStepProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">어떤 자아로 대화할까요?</h3>
        <p className="text-xs text-muted-foreground">
          이야기 속 당신의 정체를 선택해주세요.
        </p>
      </div>

      <div className="space-y-2">
        {personas.map((persona) => {
          const isSelected = persona.id === selectedId
          return (
            <button
              key={persona.id}
              onClick={() => onSelect(persona)}
              className={cn(
                "w-full rounded-xl border p-3.5 text-left transition-colors",
                isSelected
                  ? "border-primary bg-accent"
                  : "border-border bg-card hover:bg-accent"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{persona.name}</span>
                  <span className="text-[11px] text-muted-foreground">{persona.ageOrStatus}</span>
                  {persona.isSecret && (
                    <span className="flex items-center gap-0.5 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-secondary-foreground">
                      <Lock className="h-2.5 w-2.5" />
                      비밀
                    </span>
                  )}
                </div>
                {isSelected && (
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {persona.intro}
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                관계 · <span className="text-foreground">{persona.relationship}</span>
              </p>
            </button>
          )
        })}

        <button
          onClick={onCreateNew}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          <Plus className="h-4 w-4" />
          새 자아 만들기
        </button>
      </div>
    </div>
  )
}
