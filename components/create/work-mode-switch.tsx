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
}: WorkModeSwitchProps) {
  return (
    <Card className="border-border bg-card py-0 shadow-none">
      <CardContent className="p-1">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-background/70 p-1">
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
      </CardContent>
    </Card>
  )
}
