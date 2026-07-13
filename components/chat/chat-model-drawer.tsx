"use client"

import { useEffect, useState } from "react"
import { Check, Gem } from "lucide-react"
import Link from "next/link"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { CHAT_MODELS, type ChatModelId } from "@/lib/chat-models"
import { cn } from "@/lib/utils"

interface ChatModelDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedModelId: ChatModelId
  creditBalance?: number
  onModelChange: (modelId: ChatModelId) => void
}

export function ChatModelDrawer({
  open,
  onOpenChange,
  selectedModelId,
  creditBalance,
  onModelChange,
}: ChatModelDrawerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSelect = (modelId: ChatModelId) => {
    onModelChange(modelId)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[76dvh] max-w-md border-border bg-card">
        <DrawerHeader className="px-5 pb-2 pt-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DrawerTitle className="text-base font-bold">AI 모델 선택</DrawerTitle>
              <DrawerDescription className="mt-1 text-xs">
                이 채팅방에서 사용할 답변 생성 모델을 선택합니다.
              </DrawerDescription>
            </div>
            <Link
              href="/credits"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted px-3 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <Gem className="h-3.5 w-3.5 text-primary" />
              <span className="tabular-nums">{mounted ? (creditBalance ?? 0).toLocaleString() : "-"}</span>
            </Link>
          </div>
        </DrawerHeader>

        <div className="space-y-2 overflow-y-auto px-5 pb-5 pt-2">
          {CHAT_MODELS.map((model) => {
            const selected = selectedModelId === model.id
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => handleSelect(model.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold">{model.label}</span>
                    {model.badge && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {model.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{model.description}</p>
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                    답변당 추가 크레딧 {model.creditCostPerReply.toLocaleString()}
                  </p>
                </div>
                {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            )
          })}

          {CHAT_MODELS.find((model) => model.id === selectedModelId)?.creditCostPerReply ? (
            <p className="px-1 pt-1 text-[11px] leading-relaxed text-muted-foreground">
              프리미엄/언셰이프 모델은 답변 생성 성공 시 추가 크레딧을 사용합니다.
            </p>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
