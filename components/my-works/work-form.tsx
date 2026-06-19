"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { GenreSelectWithCustomInput } from "@/components/create/genre-select-with-custom-input"
import { ImageUploadField } from "@/components/create/image-upload-field"
import { IntroScenariosFormSection } from "@/components/my-works/intro-scenarios-form-section"
import { cleanIntroScenarios, createId, type IntroScenario } from "@/lib/storychat-storage"
import { cn } from "@/lib/utils"

export type WorkFormMode = "simple" | "advanced"

export interface WorkFormValues {
  title: string
  genre: string
  tagline: string
  coreSetting: string
  coverImageUrl: string
  mood: string
  majorLocations: string
  majorEvents: string
  currentChapter: string
  currentGoal: string
  worldDate: string
  statusBarEnabled: boolean
  statusBarText: string
  introScenarios: IntroScenario[]
}

interface WorkFormProps {
  mode: "create" | "edit"
  initialValues: WorkFormValues
  submitLabel?: string
  onSubmit: (values: WorkFormValues) => void | Promise<void>
  onCancel?: () => void
  enableModeSwitch?: boolean
}

const WORK_FORM_MODE_KEY = "workFormMode"

export function WorkForm({
  mode,
  initialValues,
  submitLabel = mode === "edit" ? "수정 저장" : "작품 저장",
  onSubmit,
  onCancel,
  enableModeSwitch = mode === "create",
}: WorkFormProps) {
  const [values, setValues] = useState<WorkFormValues>(initialValues)
  const [formMode, setFormMode] = useState<WorkFormMode>("simple")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setValues(initialValues)

    if (!enableModeSwitch) {
      setFormMode("advanced")
      return
    }

    const storedMode = window.localStorage.getItem(WORK_FORM_MODE_KEY)
    if (storedMode === "simple" || storedMode === "advanced") {
      setFormMode(storedMode)
      return
    }

    if (enableModeSwitch && mode === "edit" && hasAdvancedContent(initialValues)) {
      setFormMode("advanced")
    }
  }, [enableModeSwitch, initialValues, mode])

  const update = <K extends keyof WorkFormValues>(key: K, value: WorkFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const changeMode = (nextMode: WorkFormMode) => {
    setFormMode(nextMode)
    window.localStorage.setItem(WORK_FORM_MODE_KEY, nextMode)
  }

  const updateSimpleIntro = (scene: string) => {
    setValues((current) => ({
      ...current,
      introScenarios: mergeSimpleIntro(current.introScenarios, scene),
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!values.title.trim() || !values.genre.trim() || !(values.tagline.trim() || values.coreSetting.trim())) {
      setError("작품 제목, 장르, 한 줄 소개를 입력해 주세요.")
      return
    }

    setError("")
    setIsSaving(true)
    try {
      await onSubmit(cleanWorkFormValues(values))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-28">
      {enableModeSwitch && <WorkFormModeSwitch value={formMode} onChange={changeMode} />}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      )}

      {formMode === "simple" ? (
        <SimpleWorkFormFields
          values={values}
          onUpdate={update}
          onSimpleIntroChange={updateSimpleIntro}
        />
      ) : (
        <AdvancedWorkFormFields values={values} onUpdate={update} />
      )}

      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={isSaving}>
          <Save className="h-4 w-4" />
          {isSaving ? "저장 중..." : submitLabel}
        </Button>
      </div>
    </form>
  )
}

function WorkFormModeSwitch({ value, onChange }: { value: WorkFormMode; onChange: (value: WorkFormMode) => void }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-background/70 p-1">
          <ModeButton active={value === "simple"} onClick={() => onChange("simple")}>
            쉬운 모드
          </ModeButton>
          <ModeButton active={value === "advanced"} onClick={() => onChange("advanced")}>
            상세 모드
          </ModeButton>
        </div>
        <div className="px-1">
          <p className="text-sm font-semibold text-foreground">{value === "simple" ? "쉬운 모드" : "상세 모드"}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {value === "simple"
              ? "꼭 필요한 정보만 입력해서 빠르게 작품을 만들어요. 처음이라면 쉬운 모드로 시작해도 충분해요."
              : "세계관, 도입부, 상태바, 시작 장면까지 세밀하게 설정해요."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function SimpleWorkFormFields({
  values,
  onUpdate,
  onSimpleIntroChange,
}: {
  values: WorkFormValues
  onUpdate: <K extends keyof WorkFormValues>(key: K, value: WorkFormValues[K]) => void
  onSimpleIntroChange: (value: string) => void
}) {
  return (
    <FormSection title="빠른 작품 정보">
      <Field>
        <FieldLabel>작품 제목</FieldLabel>
        <Input value={values.title} onChange={(event) => onUpdate("title", event.target.value)} className="bg-input" />
      </Field>
      <Field>
        <FieldLabel>장르</FieldLabel>
        <GenreSelectWithCustomInput value={values.genre} onChange={(genre) => onUpdate("genre", genre)} />
      </Field>
      <Field>
        <FieldLabel>한 줄 소개</FieldLabel>
        <Textarea
          value={values.tagline || values.coreSetting}
          onChange={(event) => {
            onUpdate("tagline", event.target.value)
            onUpdate("coreSetting", event.target.value)
          }}
          className="min-h-[82px] bg-input"
          placeholder="예: 비 오는 서점에서 비밀스러운 존재와 만나는 이야기"
        />
      </Field>
      <Field>
        <FieldLabel>첫 상황 / 도입부 간단 입력</FieldLabel>
        <Textarea
          value={values.introScenarios[0]?.scene ?? ""}
          onChange={(event) => onSimpleIntroChange(event.target.value)}
          className="min-h-[90px] bg-input"
          placeholder="예: 비를 피해 들어간 작은 서점에서 낯선 목소리를 듣는다."
        />
      </Field>
    </FormSection>
  )
}

function AdvancedWorkFormFields({
  values,
  onUpdate,
}: {
  values: WorkFormValues
  onUpdate: <K extends keyof WorkFormValues>(key: K, value: WorkFormValues[K]) => void
}) {
  return (
    <>
      <FormSection title="기본 정보">
        <Field>
          <FieldLabel>작품 제목</FieldLabel>
          <Input value={values.title} onChange={(event) => onUpdate("title", event.target.value)} className="bg-input" />
        </Field>
        <Field>
          <FieldLabel>장르</FieldLabel>
          <GenreSelectWithCustomInput value={values.genre} onChange={(genre) => onUpdate("genre", genre)} />
        </Field>
        <Field>
          <FieldLabel>한 줄 소개</FieldLabel>
          <Textarea value={values.tagline} onChange={(event) => onUpdate("tagline", event.target.value)} className="min-h-[76px] bg-input" />
        </Field>
        <ImageUploadField
          label="대표 이미지"
          value={values.coverImageUrl}
          onChange={(coverImageUrl) => onUpdate("coverImageUrl", coverImageUrl ?? "")}
        />
      </FormSection>

      <CollapsibleFormSection title="세계관 설정" defaultOpen>
        <Field>
          <FieldLabel>핵심 설정</FieldLabel>
          <Textarea value={values.coreSetting} onChange={(event) => onUpdate("coreSetting", event.target.value)} className="min-h-[90px] bg-input" />
        </Field>
        <Field>
          <FieldLabel>분위기</FieldLabel>
          <Input value={values.mood} onChange={(event) => onUpdate("mood", event.target.value)} className="bg-input" />
        </Field>
        <Field>
          <FieldLabel>주요 장소</FieldLabel>
          <Textarea value={values.majorLocations} onChange={(event) => onUpdate("majorLocations", event.target.value)} className="min-h-[80px] bg-input" />
        </Field>
        <Field>
          <FieldLabel>주요 사건</FieldLabel>
          <Textarea value={values.majorEvents} onChange={(event) => onUpdate("majorEvents", event.target.value)} className="min-h-[80px] bg-input" />
        </Field>
        <Field>
          <FieldLabel>세계관 날짜</FieldLabel>
          <Input value={values.worldDate} onChange={(event) => onUpdate("worldDate", event.target.value)} className="bg-input" />
        </Field>
      </CollapsibleFormSection>

      <CollapsibleFormSection title="진행 상태">
        <p className="text-xs leading-relaxed text-muted-foreground">
          상태바는 채팅 중 현재 위치, 목표, 장면 정보를 보여주는 보조 정보입니다.
        </p>
        <Field>
          <FieldLabel>현재 챕터</FieldLabel>
          <Input value={values.currentChapter} onChange={(event) => onUpdate("currentChapter", event.target.value)} className="bg-input" />
        </Field>
        <Field>
          <FieldLabel>현재 목표</FieldLabel>
          <Input value={values.currentGoal} onChange={(event) => onUpdate("currentGoal", event.target.value)} className="bg-input" />
        </Field>
        <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-3">
          <span className="text-sm font-medium text-foreground">상태바 사용</span>
          <Switch checked={values.statusBarEnabled} onCheckedChange={(checked) => onUpdate("statusBarEnabled", checked)} />
        </div>
        {values.statusBarEnabled && (
          <>
            <Field>
              <FieldLabel>상태바 내용</FieldLabel>
              <Textarea
                value={values.statusBarText}
                onChange={(event) => onUpdate("statusBarText", event.target.value)}
                className="min-h-[96px] bg-input"
              />
            </Field>
            {values.statusBarText.trim() && (
              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">미리보기</p>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-foreground">{values.statusBarText}</p>
              </div>
            )}
          </>
        )}
      </CollapsibleFormSection>

      <IntroScenariosFormSection
        value={values.introScenarios}
        onChange={(introScenarios) => onUpdate("introScenarios", introScenarios)}
      />
    </>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-4 p-4">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <FieldGroup className="space-y-4">{children}</FieldGroup>
      </CardContent>
    </Card>
  )
}

function CollapsibleFormSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card className="border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <h2 className="flex-1 text-base font-bold text-foreground">{title}</h2>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <CardContent className="space-y-4 border-t border-border p-4">
          <FieldGroup className="space-y-4">{children}</FieldGroup>
        </CardContent>
      )}
    </Card>
  )
}

function mergeSimpleIntro(intros: IntroScenario[], scene: string): IntroScenario[] {
  const [firstIntro, ...rest] = intros
  if (!scene.trim() && !firstIntro) return intros

  return [
    {
      id: firstIntro?.id || createId("intro"),
      title: firstIntro?.title || "첫 장면",
      scene,
      firstMessage: firstIntro?.firstMessage || "",
      imageUrl: firstIntro?.imageUrl || "",
      options: firstIntro?.options || [],
    },
    ...rest,
  ]
}

function cleanWorkFormValues(values: WorkFormValues): WorkFormValues {
  const tagline = values.tagline.trim() || values.coreSetting.trim()
  const coreSetting = values.coreSetting.trim() || tagline

  return {
    ...values,
    title: values.title.trim(),
    genre: values.genre.trim(),
    tagline,
    coreSetting,
    coverImageUrl: values.coverImageUrl.trim(),
    mood: values.mood.trim(),
    currentChapter: values.currentChapter.trim(),
    currentGoal: values.currentGoal.trim(),
    worldDate: values.worldDate.trim(),
    introScenarios: cleanIntroScenarios(values.introScenarios),
  }
}

function hasAdvancedContent(values: WorkFormValues) {
  return Boolean(
    values.coverImageUrl.trim() ||
      values.mood.trim() ||
      values.majorLocations.trim() ||
      values.majorEvents.trim() ||
      values.currentChapter.trim() ||
      values.currentGoal.trim() ||
      values.worldDate.trim() ||
      values.statusBarEnabled ||
      values.statusBarText.trim() ||
      values.introScenarios.length > 1,
  )
}
