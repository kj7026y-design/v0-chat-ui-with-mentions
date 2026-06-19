"use client"

import { ChevronDown, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createId, type IntroScenario } from "@/lib/storychat-storage"
import { cn } from "@/lib/utils"

interface IntroScenariosFormSectionProps {
  value: IntroScenario[]
  onChange: (value: IntroScenario[]) => void
}

const emptyIntroScenario = (): IntroScenario => ({
  id: createId("intro"),
  title: "",
  scene: "",
  firstMessage: "",
  imageUrl: "",
  options: [],
})

export function IntroScenariosFormSection({ value, onChange }: IntroScenariosFormSectionProps) {
  const intros = value.slice(0, 5)

  const updateIntro = (index: number, nextIntro: IntroScenario) => {
    onChange(intros.map((intro, introIndex) => (introIndex === index ? nextIntro : intro)))
  }

  const removeIntro = (index: number) => {
    onChange(intros.filter((_, introIndex) => introIndex !== index))
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="text-base font-bold text-foreground">도입부</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            채팅을 처음 시작할 때 사용자가 선택할 수 있는 시작 장면입니다. 최대 5개까지 설정할 수 있어요.
            입력하지 않으면 자유 도입으로 시작됩니다.
          </p>
        </div>

        {intros.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-background/60 px-3 py-4 text-sm text-muted-foreground">
            도입부를 설정하지 않으면 사용자가 자유롭게 첫 메시지를 입력해 시작합니다.
          </div>
        )}

        <div className="space-y-3">
          {intros.map((intro, index) => (
            <IntroScenarioCardEditor
              key={intro.id || index}
              intro={intro}
              index={index}
              onChange={(nextIntro) => updateIntro(index, nextIntro)}
              onDelete={() => removeIntro(index)}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={intros.length >= 5}
          onClick={() => onChange([...intros, emptyIntroScenario()])}
        >
          <Plus className="h-4 w-4" />
          도입부 추가
        </Button>
      </CardContent>
    </Card>
  )
}

function IntroScenarioCardEditor({
  intro,
  index,
  onChange,
  onDelete,
}: {
  intro: IntroScenario
  index: number
  onChange: (intro: IntroScenario) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(index === 0)

  const update = <K extends keyof IntroScenario>(key: K, value: IntroScenario[K]) => {
    onChange({ ...intro, [key]: value })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background/60">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{intro.title?.trim() || `도입부 ${index + 1}`}</span>
          <span className="block truncate text-xs text-muted-foreground">{intro.scene || intro.firstMessage || "새 시작 장면"}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-3 py-4">
          <Field>
            <FieldLabel>도입부 제목</FieldLabel>
            <Input value={intro.title ?? ""} onChange={(event) => update("title", event.target.value)} className="bg-input" />
          </Field>
          <Field>
            <FieldLabel>첫 장면 설명</FieldLabel>
            <Textarea value={intro.scene ?? ""} onChange={(event) => update("scene", event.target.value)} className="min-h-[86px] bg-input" />
          </Field>
          <Field>
            <FieldLabel>첫 메시지</FieldLabel>
            <Textarea value={intro.firstMessage ?? ""} onChange={(event) => update("firstMessage", event.target.value)} className="min-h-[72px] bg-input" />
          </Field>
          <Field>
            <FieldLabel>이미지 URL</FieldLabel>
            <Input value={intro.imageUrl ?? ""} onChange={(event) => update("imageUrl", event.target.value)} className="bg-input" />
          </Field>
          <IntroOptionsEditor
            options={intro.options ?? []}
            onChange={(options) => update("options", options)}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full border-red-500/40 font-semibold text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-400/35 dark:text-red-300 dark:hover:bg-red-950/60 dark:hover:text-red-100"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            이 도입부 삭제
          </Button>
        </div>
      )}
    </div>
  )
}

function IntroOptionsEditor({
  options,
  onChange,
}: {
  options: string[]
  onChange: (options: string[]) => void
}) {
  const visibleOptions = options.length > 0 ? options : [""]

  const updateOption = (index: number, value: string) => {
    const nextOptions = [...visibleOptions]
    nextOptions[index] = value
    onChange(nextOptions)
  }

  return (
    <div className="space-y-2">
      <FieldLabel>시작 선택지</FieldLabel>
      {visibleOptions.map((option, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={option}
            onChange={(event) => updateOption(index, event.target.value)}
            className="bg-input"
            placeholder="예: 여기가 어디냐고 묻는다"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onChange(visibleOptions.filter((_, optionIndex) => optionIndex !== index))}
            aria-label="선택지 삭제"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...visibleOptions, ""])}>
        <Plus className="h-3.5 w-3.5" />
        선택지 추가
      </Button>
    </div>
  )
}
