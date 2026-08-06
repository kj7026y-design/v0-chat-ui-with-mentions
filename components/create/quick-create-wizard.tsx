"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Check, Globe, Pencil, UserCircle, Users } from "lucide-react"

export type QuickOptionKey = "default" | "custom"
export type QuickCustomEntry = Record<string, string>

export interface QuickCreateData {
  title: string
  character: QuickOptionKey | null
  world: QuickOptionKey | null
  persona: QuickOptionKey | null
  customCharacter: QuickCustomEntry
  customWorld: QuickCustomEntry
  customPersona: QuickCustomEntry
}

interface FieldConfig {
  key: string
  label: string
  type: "input" | "select" | "textarea"
  placeholder?: string
  options?: string[]
  half?: boolean
}

const CHARACTER_FIELDS: FieldConfig[] = [
  { key: "name", label: "이름", type: "input", placeholder: "예: 유진" },
  { key: "age", label: "나이", type: "input", placeholder: "예: 27", half: true },
  { key: "gender", label: "성별", type: "select", options: ["설정하지 않음", "여성", "남성", "논바이너리"], half: true },
  { key: "job", label: "직업", type: "input", placeholder: "예: 서점 주인" },
  { key: "personality", label: "성격", type: "textarea", placeholder: "예: 차분하고 다정하지만 속마음은 잘 안 드러내는 편" },
  { key: "speechStyle", label: "말투", type: "input", placeholder: "예: 정중한 존댓말" },
]

const WORLD_FIELDS: FieldConfig[] = [
  { key: "name", label: "이름", type: "input", placeholder: "예: 현대 판타지" },
  { key: "era", label: "시대 배경", type: "input", placeholder: "예: 2020년대, 근미래 서울", half: true },
  { key: "genre", label: "장르", type: "select", options: ["장르 선택", "판타지", "로맨스", "미스터리", "SF", "일상"], half: true },
  { key: "description", label: "간단 설명", type: "textarea", placeholder: "예: 도심 곳곳에 마법사와 요괴가 숨어 사는 세계" },
]

const PERSONA_FIELDS: FieldConfig[] = [
  { key: "name", label: "이름", type: "input", placeholder: "예: 서연" },
  { key: "age", label: "나이", type: "input", placeholder: "예: 25", half: true },
  { key: "gender", label: "성별", type: "select", options: ["설정하지 않음", "여성", "남성", "논바이너리"], half: true },
  { key: "job", label: "직업", type: "input", placeholder: "예: 대학생" },
]

const emptyEntry = (fields: FieldConfig[]) => Object.fromEntries(fields.map((field) => [field.key, ""]))
const STEP_COUNT = 5
const QUICK_CREATE_STEP_KEY = "__storyChatQuickCreateStep"

export function QuickCreateWizard({
  onExit,
  onComplete,
}: {
  onExit: () => void
  onComplete: (data: QuickCreateData) => void
}) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<QuickCreateData>({
    title: "",
    character: null,
    world: null,
    persona: null,
    customCharacter: emptyEntry(CHARACTER_FIELDS),
    customWorld: emptyEntry(WORLD_FIELDS),
    customPersona: emptyEntry(PERSONA_FIELDS),
  })

  useEffect(() => {
    window.history.replaceState(
      { ...window.history.state, [QUICK_CREATE_STEP_KEY]: 0 },
      "",
      window.location.href,
    )
    const handlePopState = (event: PopStateEvent) => {
      const nextStep = event.state?.[QUICK_CREATE_STEP_KEY]
      if (typeof nextStep === "number" && nextStep >= 0 && nextStep < STEP_COUNT) {
        setStep(nextStep)
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const goToNextStep = () => {
    const nextStep = step + 1
    window.history.pushState(
      { ...window.history.state, [QUICK_CREATE_STEP_KEY]: nextStep },
      "",
      window.location.href,
    )
    setStep(nextStep)
  }

  const exitWizard = () => {
    if (step > 0) window.history.go(-(step + 1))
    else onExit()
  }

  const canGoNext =
    (step === 0 && Boolean(data.title.trim())) ||
    (step === 1 && (data.character === "default" || (data.character === "custom" && Boolean(data.customCharacter.name.trim())))) ||
    (step === 2 && (data.world === "default" || (data.world === "custom" && Boolean(data.customWorld.name.trim())))) ||
    (step === 3 && (data.persona === "default" || (data.persona === "custom" && Boolean(data.customPersona.name.trim())))) ||
    step === 4

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col px-1 pb-4">
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => window.history.back()}
          className={step === 0 ? "invisible p-1" : "-ml-1 p-1 text-foreground"}
          aria-label="이전 단계"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={exitWizard} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">
          나가기
        </button>
      </div>

      <div className="mb-8 flex gap-1.5">
        {Array.from({ length: STEP_COUNT }).map((_, index) => (
          <div key={index} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-blue-500" : "bg-muted"}`} />
        ))}
      </div>

      <div className="flex-1">
        {step === 0 && <TitleStep value={data.title} onChange={(title) => setData((current) => ({ ...current, title }))} />}
        {step === 1 && (
          <ChoiceStep
            question="함께할 캐릭터를 골라주세요"
            selected={data.character}
            onSelect={(character) => setData((current) => ({ ...current, character }))}
            defaultIcon={Users}
            defaultLabel="기본 캐릭터 고르기"
            customLabel="간단히 직접 만들기"
            fields={CHARACTER_FIELDS}
            customEntry={data.customCharacter}
            onCustomChange={(customCharacter) => setData((current) => ({ ...current, customCharacter }))}
          />
        )}
        {step === 2 && (
          <ChoiceStep
            question="이야기의 배경이 될 세계관을 골라주세요"
            selected={data.world}
            onSelect={(world) => setData((current) => ({ ...current, world }))}
            defaultIcon={Globe}
            defaultLabel="기본 세계관 고르기"
            customLabel="간단히 직접 만들기"
            fields={WORLD_FIELDS}
            customEntry={data.customWorld}
            onCustomChange={(customWorld) => setData((current) => ({ ...current, customWorld }))}
          />
        )}
        {step === 3 && (
          <ChoiceStep
            question="당신은 누구로 이 이야기에 참여하나요?"
            selected={data.persona}
            onSelect={(persona) => setData((current) => ({ ...current, persona }))}
            defaultIcon={UserCircle}
            defaultLabel="기본 자아 고르기"
            customLabel="간단히 나만의 자아 만들기"
            fields={PERSONA_FIELDS}
            customEntry={data.customPersona}
            onCustomChange={(customPersona) => setData((current) => ({ ...current, customPersona }))}
          />
        )}
        {step === 4 && <SummaryStep data={data} />}
      </div>

      <button
        type="button"
        disabled={!canGoNext}
        onClick={() => step === STEP_COUNT - 1 ? onComplete(data) : goToNextStep()}
        className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-blue-500 text-sm font-medium text-white transition-colors disabled:bg-muted disabled:text-muted-foreground"
      >
        {step === STEP_COUNT - 1 ? "채팅 시작하기" : "다음"}
      </button>
    </div>
  )
}

function TitleStep({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <h2 className="mb-5 text-lg font-medium leading-snug text-foreground">안녕하세요! 만들 작품의 이름은<br />무엇일까요?</h2>
      <input autoFocus value={value} onChange={(event) => onChange(event.target.value)} placeholder="예: 달빛 서점" className="h-12 w-full rounded-xl border border-border bg-transparent px-4 text-sm outline-none focus:border-blue-500" />
    </div>
  )
}

function ChoiceStep({ question, selected, onSelect, defaultIcon: DefaultIcon, defaultLabel, customLabel, fields, customEntry, onCustomChange }: {
  question: string
  selected: QuickOptionKey | null
  onSelect: (value: QuickOptionKey) => void
  defaultIcon: typeof Users
  defaultLabel: string
  customLabel: string
  fields: FieldConfig[]
  customEntry: QuickCustomEntry
  onCustomChange: (entry: QuickCustomEntry) => void
}) {
  return (
    <div>
      <h2 className="mb-5 text-lg font-medium leading-snug text-foreground">{question}</h2>
      <div className="grid grid-cols-2 gap-3">
        <OptionCard icon={DefaultIcon} label={defaultLabel} active={selected === "default"} onClick={() => onSelect("default")} />
        <OptionCard icon={Pencil} label={customLabel} active={selected === "custom"} onClick={() => onSelect("custom")} />
      </div>
      {selected === "custom" && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-muted/60 p-4">
          <FieldGrid fields={fields} values={customEntry} onChange={(key, value) => onCustomChange({ ...customEntry, [key]: value })} />
        </div>
      )}
    </div>
  )
}

function FieldGrid({ fields, values, onChange }: { fields: FieldConfig[]; values: QuickCustomEntry; onChange: (key: string, value: string) => void }) {
  const rows: FieldConfig[][] = []
  for (let index = 0; index < fields.length;) {
    const field = fields[index]
    if (field.half && fields[index + 1]?.half) {
      rows.push([field, fields[index + 1]])
      index += 2
    } else {
      rows.push([field])
      index += 1
    }
  }
  return <>{rows.map((row, index) => <div key={index} className={row.length === 2 ? "grid grid-cols-2 gap-3" : ""}>{row.map((field) => <Field key={field.key} field={field} value={values[field.key] ?? ""} onChange={(value) => onChange(field.key, value)} />)}</div>)}</>
}

function Field({ field, value, onChange }: { field: FieldConfig; value: string; onChange: (value: string) => void }) {
  const className = "w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground outline-none focus:border-blue-500"
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted-foreground">{field.label}</span>
      {field.type === "input" && <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} className={`h-11 ${className}`} />}
      {field.type === "select" && <select value={value || field.options?.[0]} onChange={(event) => onChange(event.target.value)} className={`h-11 ${className}`}>{field.options?.map((option) => <option key={option}>{option}</option>)}</select>}
      {field.type === "textarea" && <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} rows={3} className={`resize-none py-2.5 ${className}`} />}
    </label>
  )
}

function OptionCard({ icon: Icon, label, active, onClick }: { icon: typeof Users; label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex flex-col items-center gap-2.5 rounded-2xl border-2 p-5 text-center transition-colors ${active ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40" : "border-border"}`}>
      <Icon className={`h-6 w-6 ${active ? "text-blue-700 dark:text-blue-300" : "text-muted-foreground"}`} />
      <span className="text-sm text-foreground">{label}</span>
    </button>
  )
}

function SummaryStep({ data }: { data: QuickCreateData }) {
  const rows = [
    ["작품명", data.title],
    ["캐릭터", data.character === "default" ? "기본 제공" : data.customCharacter.name],
    ["세계관", data.world === "default" ? "기본 제공" : data.customWorld.name],
    ["내 자아", data.persona === "default" ? "기본 제공" : data.customPersona.name],
  ]
  return (
    <div>
      <div className="mb-5 flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950"><Check className="h-[18px] w-[18px] text-blue-700 dark:text-blue-300" /></div><h2 className="text-lg font-medium text-foreground">모든 준비가 끝났어요</h2></div>
      <div className="rounded-xl bg-muted/60 p-4">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0"><span className="text-muted-foreground">{label}</span><span className="font-medium text-foreground">{value || "-"}</span></div>)}</div>
    </div>
  )
}
