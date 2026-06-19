"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { GenreSelectWithCustomInput } from "@/components/create/genre-select-with-custom-input"
import { ImageUploadField } from "@/components/create/image-upload-field"
import {
  defaultStoryProgressSettings,
  getStoryChatLibrary,
  saveStoryChatLibrary,
  type StoryChatLibrary,
  type StoryWorld,
} from "@/lib/storychat-storage"

export default function EditWorldPage() {
  const params = useParams()
  const router = useRouter()
  const worldId = params.id as string
  const [library, setLibrary] = useState<StoryChatLibrary | null>(null)
  const [draft, setDraft] = useState<StoryWorld | null>(null)

  useEffect(() => {
    const nextLibrary = getStoryChatLibrary()
    const world = nextLibrary.worlds.find((item) => item.id === worldId)
    setLibrary(nextLibrary)
    setDraft(world ? { ...world, storyProgressSettings: world.storyProgressSettings ?? defaultStoryProgressSettings() } : null)
  }, [worldId])

  const update = <K extends keyof StoryWorld>(key: K, value: StoryWorld[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current)
  }

  const handleSave = () => {
    if (!library || !draft) return
    saveStoryChatLibrary({
      ...library,
      worlds: library.worlds.map((item) => item.id === draft.id ? draft : item),
    })
    toast("세계관을 수정했어요.")
    router.push(`/my-works?tab=scenarios&detailType=scenarios&detailId=${draft.id}`)
  }

  if (!library) return null

  if (!draft) {
    return (
      <div className="min-h-full bg-background p-5 text-foreground">
        <Button variant="ghost" onClick={() => router.push("/my-works?tab=scenarios")}>
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </Button>
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <h1 className="text-lg font-bold">세계관을 찾을 수 없습니다.</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">세계관 수정</h1>
            <p className="text-xs text-muted-foreground">{draft.name}</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5 pb-28">
        <section className="rounded-2xl border border-border bg-card p-4">
          <FieldGroup className="space-y-4">
            <Field>
              <FieldLabel>세계관 이름</FieldLabel>
              <Input value={draft.name} onChange={(event) => update("name", event.target.value)} className="bg-input" />
            </Field>
            <Field>
              <FieldLabel>장르</FieldLabel>
              <GenreSelectWithCustomInput value={String(draft.genre)} onChange={(genre) => update("genre", genre)} />
            </Field>
            <Field>
              <FieldLabel>시대/배경</FieldLabel>
              <Input value={draft.era} onChange={(event) => update("era", event.target.value)} className="bg-input" />
            </Field>
            <ImageUploadField label="대표 이미지" value={draft.coverImageUrl} onChange={(coverImageUrl) => update("coverImageUrl", coverImageUrl)} />
            <Field>
              <FieldLabel>핵심 설정</FieldLabel>
              <Textarea value={draft.coreSetting} onChange={(event) => update("coreSetting", event.target.value)} className="min-h-[90px] bg-input" />
            </Field>
            <Field>
              <FieldLabel>주요 장소</FieldLabel>
              <Textarea value={draft.places} onChange={(event) => update("places", event.target.value)} className="min-h-[80px] bg-input" />
            </Field>
            <Field>
              <FieldLabel>주요 사건</FieldLabel>
              <Textarea value={draft.events} onChange={(event) => update("events", event.target.value)} className="min-h-[80px] bg-input" />
            </Field>
            <Field>
              <FieldLabel>분위기</FieldLabel>
              <Input value={draft.mood} onChange={(event) => update("mood", event.target.value)} className="bg-input" />
            </Field>
            <Field>
              <FieldLabel>세계관 날짜</FieldLabel>
              <Input value={draft.worldDate} onChange={(event) => update("worldDate", event.target.value)} className="bg-input" />
            </Field>
            <Field>
              <FieldLabel>현재 챕터</FieldLabel>
              <Input value={draft.currentChapter} onChange={(event) => update("currentChapter", event.target.value)} className="bg-input" />
            </Field>
            <Field>
              <FieldLabel>현재 목표</FieldLabel>
              <Input value={draft.currentGoal} onChange={(event) => update("currentGoal", event.target.value)} className="bg-input" />
            </Field>
            <Field>
              <FieldLabel>금지 설정</FieldLabel>
              <Textarea value={draft.forbiddenSettings} onChange={(event) => update("forbiddenSettings", event.target.value)} className="min-h-[80px] bg-input" />
            </Field>
          </FieldGroup>
        </section>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="button" className="flex-1" onClick={handleSave}>
            저장
          </Button>
        </div>
      </main>
    </div>
  )
}
