"use client"

import { Gem } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreditProductCardProps {
  amount: number
  price: string
  bonus?: number
  badge?: string
  highlighted?: boolean
  onClick?: () => void
}

export function CreditProductCard({
  amount,
  price,
  bonus,
  badge,
  highlighted,
  onClick,
}: CreditProductCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors w-full",
        highlighted
          ? "border-primary/60 bg-primary/5 hover:bg-primary/10"
          : "border-border bg-card hover:bg-accent/50"
      )}
    >
      {badge && (
        <span className="absolute -top-2 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
          {badge}
        </span>
      )}

      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            highlighted ? "bg-primary/15" : "bg-muted"
          )}
        >
          <Gem className={cn("h-5 w-5", highlighted ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {amount.toLocaleString()} 크레딧
          </p>
          {bonus ? (
            <p className="text-[11px] text-primary mt-0.5">+{bonus} 보너스</p>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-0.5">기본 충전</p>
          )}
        </div>
      </div>

      <span className="text-sm font-bold text-foreground">{price}</span>
    </button>
  )
}
