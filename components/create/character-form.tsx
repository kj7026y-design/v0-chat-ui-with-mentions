"use client"

import { useMemo, useState } from "react"
import type React from "react"
import {
  ChevronDown,
  ChevronUp,
  IdCard,
  Image as ImageIcon,
  Lock,
  MapPin,
  MessageCircle,
  type LucideIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AlertModal } from "@/components/ui/app-modal"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { GenreSelectWithCustomInput } from "@/components/create/genre-select-with-custom-input"
import type { StoryCharacter, StoryCharacterGender } from "@/lib/storychat-storage"
import { cn } from "@/lib/utils"

type CreateFormMode = "simple" | "advanced"
type SectionKey = "basic" | "voice" | "appearance" | "relationship" | "secret"

interface CharacterFormProps {
  value: StoryCharacter
  onChange: (value: StoryCharacter) => void
  formMode?: CreateFormMode
}

interface SectionDefinition {
  key: SectionKey
  title: string
  icon: LucideIcon
  required: boolean
  fieldLabels: string[]
  filledCount: number
}

export function CharacterForm({ value, onChange, formMode = "advanced" }: CharacterFormProps) {
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    basic: true,
    voice: false,
    appearance: false,
    relationship: false,
    secret: false,
  })

  const update = <K extends keyof StoryCharacter>(key: K, nextValue: StoryCharacter[K]) => {
    onChange({ ...value, [key]: nextValue })
  }

  const hasText = (fieldValue: unknown) =>
    typeof fieldValue === "string" && fieldValue.trim().length > 0
  const hasTags = (tags: string[] | string | null | undefined) =>
    normalizeTagList(tags).length > 0

  const sections = useMemo<SectionDefinition[]>(() => [
    {
      key: "basic",
      title: "기본 정보",
      icon: IdCard,
      required: true,
      fieldLabels: ["이름", "성별", "나이", "역할/직업", "장르", "한 줄 소개", "성격 키워드"],
      filledCount: [
        hasText(value.name),
        value.gender === "custom"
          ? hasText(value.genderCustom)
          : (value.gender ?? "unknown") !== "unknown",
        hasText(value.age),
        hasText(value.role),
        hasText(value.genre),
        hasText(value.summary),
        hasText(value.personality),
      ].filter(Boolean).length,
    },
    {
      key: "voice",
      title: "성격 & 대화",
      icon: MessageCircle,
      required: false,
      fieldLabels: ["말투 규칙", "대표 대사", "태그"],
      filledCount: [hasText(value.speechStyle), hasText(value.quote), hasTags(value.tags)].filter(Boolean).length,
    },
    {
      key: "appearance",
      title: "외형",
      icon: ImageIcon,
      required: false,
      fieldLabels: ["대표 이미지", "외형 키워드", "외모 상세"],
      filledCount: [
        hasText(value.avatarUrl) || hasText(value.coverImageUrl),
        hasTags(value.visualTags),
        hasText(value.appearance),
      ].filter(Boolean).length,
    },
    {
      key: "relationship",
      title: "관계 & 배경",
      icon: MapPin,
      required: false,
      fieldLabels: ["사는 곳", "사용자와의 관계", "관계 키워드"],
      filledCount: [
        hasText(value.residence),
        hasText(value.relationship),
        hasTags(value.relationshipTags),
      ].filter(Boolean).length,
    },
    {
      key: "secret",
      title: "비밀 & 제약",
      icon: Lock,
      required: false,
      fieldLabels: ["비밀 설정", "금지 전개"],
      filledCount: [hasText(value.secret), hasText(value.forbiddenDevelopments)].filter(Boolean).length,
    },
  ], [value])

  const visibleSections = formMode === "simple" ? sections.slice(0, 1) : sections
  const totalFieldCount = visibleSections.reduce((sum, section) => sum + section.fieldLabels.length, 0)
  const filledCount = visibleSections.reduce((sum, section) => sum + section.filledCount, 0)

  return (
    <div className="mx-auto w-full max-w-2xl [&_[data-slot=input]]:shadow-none [&_[data-slot=select-trigger]]:shadow-none [&_[data-slot=textarea]]:shadow-none">
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[13px] text-muted-foreground">전체 진행률</span>
          <span className="text-[13px] font-medium text-blue-600 dark:text-blue-400">
            {filledCount} / {totalFieldCount} 항목
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
            style={{ width: `${totalFieldCount ? (filledCount / totalFieldCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {visibleSections.map((section) => (
          <CharacterFormSection
            key={section.key}
            section={section}
            open={formMode === "simple" ? true : expanded[section.key]}
            collapsible={formMode === "advanced"}
            onToggle={() => setExpanded((current) => ({
              ...current,
              [section.key]: !current[section.key],
            }))}
          >
            {section.key === "basic" && (
              <>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <FormField label="이름">
                    <Input
                      value={value.name}
                      onChange={(event) => update("name", event.target.value)}
                      placeholder="캐릭터 이름"
                    />
                  </FormField>
                  <GenderSelectField value={value} onChange={onChange} />
                  <FormField label="나이">
                    <Input
                      value={value.age ?? ""}
                      onChange={(event) => update("age", event.target.value)}
                      placeholder="나이"
                    />
                  </FormField>
                  <FormField label="역할/직업">
                    <Input
                      value={value.role ?? ""}
                      onChange={(event) => update("role", event.target.value)}
                      placeholder="예: 기타리스트"
                    />
                  </FormField>
                </div>
                <FormField label="장르">
                  <GenreSelectWithCustomInput
                    value={String(value.genre)}
                    onChange={(genre) => update("genre", genre)}
                  />
                </FormField>
                <FormField label="한 줄 소개">
                  <Textarea
                    value={value.summary}
                    onChange={(event) => update("summary", event.target.value)}
                    placeholder="캐릭터를 한 문장으로 설명해 주세요."
                    rows={2}
                  />
                </FormField>
                <FormField label="성격 키워드">
                  <Input
                    value={value.personality}
                    onChange={(event) => update("personality", event.target.value)}
                    placeholder="신비로운, 고독한, 지혜로운"
                  />
                </FormField>
              </>
            )}

            {section.key === "voice" && (
              <>
                <FormField label="말투 규칙">
                  <Textarea
                    value={value.speechStyle}
                    onChange={(event) => update("speechStyle", event.target.value)}
                    placeholder="예: 존댓말을 쓰지 않음"
                    rows={3}
                  />
                </FormField>
                <FormField label="대표 대사">
                  <Input
                    value={value.quote ?? ""}
                    onChange={(event) => update("quote", event.target.value)}
                    placeholder="캐릭터가 자주 할 법한 말"
                  />
                </FormField>
                <TagInputField
                  label="태그"
                  placeholder="신비로운, 고독한, 지혜로운"
                  value={value.tags}
                  onChange={(tags) => update("tags", tags)}
                />
              </>
            )}

            {section.key === "appearance" && (
              <>
                <ImageUploadField
                  label="대표 이미지"
                  value={value.avatarUrl || value.coverImageUrl}
                  onChange={(imageUrl) => onChange({
                    ...value,
                    avatarUrl: imageUrl,
                    coverImageUrl: imageUrl,
                  })}
                />
                <TagInputField
                  label="외형 키워드"
                  placeholder="흑발, 장신, 넓은 어깨"
                  value={value.visualTags ?? []}
                  onChange={(visualTags) => update("visualTags", visualTags)}
                />
                <FormField label="외모 상세">
                  <Textarea
                    value={value.appearance ?? ""}
                    onChange={(event) => update("appearance", event.target.value)}
                    placeholder="구체적인 외모 묘사"
                    rows={3}
                  />
                </FormField>
              </>
            )}

            {section.key === "relationship" && (
              <>
                <FormField label="사는 곳">
                  <Input
                    value={value.residence ?? ""}
                    onChange={(event) => update("residence", event.target.value)}
                    placeholder="예: 안개 숲 근처 마을"
                  />
                </FormField>
                <FormField label="사용자와의 관계">
                  <Input
                    value={value.relationship}
                    onChange={(event) => update("relationship", event.target.value)}
                    placeholder="예: 소꿉친구"
                  />
                </FormField>
                <TagInputField
                  label="관계 키워드"
                  placeholder="소꿉친구, 보호자, 계약 관계"
                  value={value.relationshipTags ?? []}
                  onChange={(relationshipTags) => update("relationshipTags", relationshipTags)}
                />
              </>
            )}

            {section.key === "secret" && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                <FormField label="비밀 설정">
                  <Textarea
                    value={value.secret}
                    onChange={(event) => update("secret", event.target.value)}
                    placeholder="캐릭터만 아는 비밀"
                    rows={3}
                  />
                </FormField>
                <FormField label="금지 전개">
                  <Textarea
                    value={value.forbiddenDevelopments}
                    onChange={(event) => update("forbiddenDevelopments", event.target.value)}
                    placeholder="일어나지 않아야 할 전개"
                    rows={3}
                  />
                </FormField>
              </div>
            )}
          </CharacterFormSection>
        ))}
      </div>

    </div>
  )
}

function CharacterFormSection({
  section,
  open,
  collapsible,
  onToggle,
  children,
}: {
  section: SectionDefinition
  open: boolean
  collapsible: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const Icon = section.icon
  const headerContent = (
    <>
      <Icon className={cn("h-[18px] w-[18px]", open ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground")} />
      <span className="flex-1 text-sm font-medium text-foreground">{section.title}</span>
      <span className={cn(
        "rounded-full px-2 py-0.5 text-xs",
        open
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          : "bg-muted text-muted-foreground",
      )}>
        {section.required ? "필수" : "선택"} · {section.filledCount}/{section.fieldLabels.length}
      </span>
      {collapsible && (open
        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
        : <ChevronDown className="h-4 w-4 text-muted-foreground" />)}
    </>
  )

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-card transition-colors",
        open ? "border-blue-500" : "border-border",
      )}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-3 py-3 text-left"
        >
          {headerContent}
        </button>
      ) : (
        <div className="flex w-full items-center gap-2 px-3 py-3 text-left">
          {headerContent}
        </div>
      )}

      {open ? (
        <div className="flex flex-col gap-2.5 px-3 pb-3">{children}</div>
      ) : (
        <p className="px-3 pb-3 text-xs text-muted-foreground">
          {section.fieldLabels.join(" · ")}
        </p>
      )}
    </section>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function GenderSelectField({
  value,
  onChange,
}: {
  value: StoryCharacter
  onChange: (value: StoryCharacter) => void
}) {
  const gender = value.gender ?? "unknown"
  const updateGender = (nextGender: StoryCharacterGender) => {
    onChange({
      ...value,
      gender: nextGender,
      genderCustom: nextGender === "custom" ? value.genderCustom ?? "" : "",
    })
  }

  return (
    <FormField label="성별">
      <Select value={gender} onValueChange={(nextValue) => updateGender(nextValue as StoryCharacterGender)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="성별 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unknown">설정하지 않음</SelectItem>
          <SelectItem value="male">남성</SelectItem>
          <SelectItem value="female">여성</SelectItem>
          <SelectItem value="nonbinary">논바이너리/기타</SelectItem>
          <SelectItem value="custom">직접 입력</SelectItem>
        </SelectContent>
      </Select>
      {gender === "custom" && (
        <Input
          value={value.genderCustom ?? ""}
          onChange={(event) => onChange({ ...value, gender: "custom", genderCustom: event.target.value })}
          placeholder="성별을 직접 입력하세요"
          className="mt-1"
        />
      )}
    </FormField>
  )
}

function TagInputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value?: string[]
  onChange: (value: string[]) => void
  placeholder: string
}) {
  const textValue = (value ?? []).join(", ")
  return (
    <FormField label={label}>
      <Input
        value={textValue}
        onChange={(event) => onChange(normalizeTagList(event.target.value))}
        onBlur={(event) => onChange(normalizeTagList(event.target.value))}
        placeholder={placeholder}
      />
      {(value ?? []).length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {(value ?? []).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </FormField>
  )
}

function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string
  value?: string
  onChange: (value: string | undefined) => void
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [invalidImageOpen, setInvalidImageOpen] = useState(false)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setInvalidImageOpen(true)
      event.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result)
    }
    reader.readAsDataURL(file)
    event.target.value = ""
  }

  return (
    <FormField label={label}>
      <div className="flex items-center gap-3">
        <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent">
          이미지 업로드
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
        {value && (
          <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-border bg-muted">
            <button type="button" onClick={() => setIsPreviewOpen(true)} className="h-full w-full" aria-label={`${label} 미리보기`}>
              <img src={value} alt={label} className="h-full w-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[11px] font-bold leading-none text-white hover:bg-black"
              aria-label={`${label} 삭제`}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {isPreviewOpen && value && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setIsPreviewOpen(false)}>
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-card" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-lg font-bold leading-none text-white hover:bg-black"
              aria-label="미리보기 닫기"
            >
              ×
            </button>
            <img src={value} alt={label} className="max-h-[78dvh] w-full object-contain" />
          </div>
        </div>
      )}

      <AlertModal
        open={invalidImageOpen}
        title="이미지 업로드"
        message="이미지 파일만 업로드할 수 있어요."
        onOpenChange={setInvalidImageOpen}
      />
    </FormField>
  )
}

function normalizeTagList(value?: string[] | string | null): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean)
  if (!value) return []
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}
