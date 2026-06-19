"use client"

import { useState } from "react"
import type React from "react"
import { Badge } from "@/components/ui/badge"
import { AlertModal } from "@/components/ui/app-modal"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
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

type CreateFormMode = "simple" | "advanced"

interface CharacterFormProps {
  value: StoryCharacter
  onChange: (value: StoryCharacter) => void
  formMode?: CreateFormMode
}

export function CharacterForm({ value, onChange, formMode = "advanced" }: CharacterFormProps) {
  const update = <K extends keyof StoryCharacter>(key: K, nextValue: StoryCharacter[K]) => {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 md:p-6">
        <FieldGroup className="space-y-6">
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">{formMode === "simple" ? "쉬운 모드" : "기본 정보"}</h3>
              <p className="mt-1 text-xs text-muted-foreground">채팅 캐릭터로 바로 쓸 수 있는 핵심 정보를 입력해 주세요.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>이름</FieldLabel>
                <Input value={value.name} onChange={(event) => update("name", event.target.value)} className="bg-input" />
              </Field>
              <GenderSelectField value={value} onChange={onChange} />
              <Field>
                <FieldLabel>나이</FieldLabel>
                <Input value={value.age ?? ""} onChange={(event) => update("age", event.target.value)} className="bg-input" />
              </Field>
              <Field>
                <FieldLabel>역할/직업</FieldLabel>
                <Input value={value.role ?? ""} onChange={(event) => update("role", event.target.value)} className="bg-input" />
              </Field>
            </div>
            <Field>
              <FieldLabel>한 줄 소개</FieldLabel>
              <Input value={value.summary} onChange={(event) => update("summary", event.target.value)} className="bg-input" />
            </Field>
            <Field>
              <FieldLabel>성격 키워드</FieldLabel>
              <Textarea value={value.personality} onChange={(event) => update("personality", event.target.value)} className="bg-input min-h-[80px]" />
            </Field>
            <ImageUploadField
              label="대표 이미지"
              value={value.coverImageUrl}
              onChange={(coverImageUrl) => update("coverImageUrl", coverImageUrl)}
            />
          </section>

          {formMode === "advanced" && (
            <section className="space-y-4 border-t border-border pt-5">
              <div>
                <h3 className="text-sm font-bold text-foreground">상세 모드</h3>
                <p className="mt-1 text-xs text-muted-foreground">외형, 관계성, 말투와 탐색용 태그를 더 세밀하게 정합니다.</p>
              </div>
              <Field>
                <FieldLabel>장르</FieldLabel>
                <GenreSelectWithCustomInput value={String(value.genre)} onChange={(genre) => update("genre", genre)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>사는 곳</FieldLabel>
                  <Input value={value.residence ?? ""} onChange={(event) => update("residence", event.target.value)} className="bg-input" />
                </Field>
                <Field>
                  <FieldLabel>사용자와의 관계</FieldLabel>
                  <Input value={value.relationship} onChange={(event) => update("relationship", event.target.value)} className="bg-input" />
                </Field>
              </div>
              <Field>
                <FieldLabel>외모 상세</FieldLabel>
                <Textarea value={value.appearance ?? ""} onChange={(event) => update("appearance", event.target.value)} className="bg-input min-h-[80px]" />
              </Field>
              <Field>
                <FieldLabel>말투 규칙</FieldLabel>
                <Textarea value={value.speechStyle} onChange={(event) => update("speechStyle", event.target.value)} className="bg-input min-h-[90px]" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>비밀 설정</FieldLabel>
                  <Textarea value={value.secret} onChange={(event) => update("secret", event.target.value)} className="bg-input min-h-[80px]" />
                </Field>
                <Field>
                  <FieldLabel>금지 전개</FieldLabel>
                  <Textarea value={value.forbiddenDevelopments} onChange={(event) => update("forbiddenDevelopments", event.target.value)} className="bg-input min-h-[80px]" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ImageUploadField
                  label="대표 아바타"
                  value={value.avatarUrl}
                  onChange={(avatarUrl) => update("avatarUrl", avatarUrl)}
                />
                <TagInputField
                  label="태그"
                  placeholder="신비로운, 고독한, 지혜로운"
                  value={value.tags}
                  onChange={(tags) => update("tags", tags)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TagInputField
                  label="외형 키워드"
                  placeholder="흑발, 장신, 넓은 어깨, 차가운 인상"
                  value={value.visualTags ?? []}
                  onChange={(visualTags) => update("visualTags", visualTags)}
                />
                <TagInputField
                  label="관계 키워드"
                  placeholder="소꿉친구, 보호자, 계약 관계"
                  value={value.relationshipTags ?? []}
                  onChange={(relationshipTags) => update("relationshipTags", relationshipTags)}
                />
              </div>
              <Field>
                <FieldLabel>대표 대사</FieldLabel>
                <Input value={value.quote ?? ""} onChange={(event) => update("quote", event.target.value)} className="bg-input" />
              </Field>
            </section>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
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
    <Field>
      <FieldLabel>성별</FieldLabel>
      <Select value={gender} onValueChange={(nextValue) => updateGender(nextValue as StoryCharacterGender)}>
        <SelectTrigger className="w-full bg-input">
          <SelectValue placeholder="성별 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="male">남성</SelectItem>
          <SelectItem value="female">여성</SelectItem>
          <SelectItem value="nonbinary">논바이너리/기타</SelectItem>
          <SelectItem value="unknown">설정하지 않음</SelectItem>
          <SelectItem value="custom">직접 입력</SelectItem>
        </SelectContent>
      </Select>
      {gender === "custom" && (
        <Input
          value={value.genderCustom ?? ""}
          onChange={(event) => onChange({ ...value, gender: "custom", genderCustom: event.target.value })}
          placeholder="성별을 직접 입력하세요"
          className="mt-2 bg-input"
        />
      )}
    </Field>
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
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input
        value={textValue}
        onChange={(event) => onChange(normalizeTagList(event.target.value))}
        onBlur={(event) => onChange(normalizeTagList(event.target.value))}
        placeholder={placeholder}
        className="bg-input"
      />
      {(value ?? []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(value ?? []).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </Field>
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
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-3">
        <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent">
          이미지 업로드
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
        {value && (
          <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-border bg-muted">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="h-full w-full"
              aria-label={`${label} 미리보기`}
            >
              <img src={value} alt={label} className="h-full w-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[11px] font-bold leading-none text-white hover:bg-black"
              aria-label={`${label} 삭제`}
            >
              x
            </button>
          </div>
        )}
      </div>
      {isPreviewOpen && value && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-card"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-lg font-bold leading-none text-white hover:bg-black"
              aria-label="미리보기 닫기"
            >
              x
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
    </Field>
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
