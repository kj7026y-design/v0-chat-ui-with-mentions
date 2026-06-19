"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type CreateFormMode = "simple" | "advanced"

interface WorkModeSwitchProps {
  value: CreateFormMode
  onChange: (value: CreateFormMode) => void
  simpleDescription?: string
  advancedDescription?: string
}

export function WorkModeSwitch({
  value,
  onChange,
  simpleDescription = "처음이라면 쉬운 모드로 시작해도 충분해요. 나중에 상세 모드에서 세계관과 도입부를 더 추가할 수 있어요.",
  advancedDescription = "작품의 분위기, 시작 장면, 상태바, 세계관 정보를 세밀하게 설정할 수 있어요.",
}: WorkModeSwitchProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-background/70 p-1">
          {(["simple", "advanced"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                value === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {mode === "simple" ? "쉬운 모드" : "상세 모드"}
            </button>
          ))}
        </div>
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          {value === "simple" ? simpleDescription : advancedDescription}
        </p>
      </CardContent>
    </Card>
  )
}
