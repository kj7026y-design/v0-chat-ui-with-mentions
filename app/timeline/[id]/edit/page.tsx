"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  defaultTimelineEvents,
  getTimelineEvents,
  saveTimelineEvents,
  type TimelineEvent,
} from "@/lib/timeline-storage"

export default function TimelineEditPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string
  const [events, setEvents] = useState<TimelineEvent[]>(defaultTimelineEvents)
  const [form, setForm] = useState<TimelineEvent | null>(null)

  useEffect(() => {
    const nextEvents = getTimelineEvents()
    setEvents(nextEvents)
    setForm(nextEvents.find((event) => event.id === eventId) ?? null)
  }, [eventId])

  const updateForm = (field: keyof TimelineEvent, value: string) => {
    setForm((current) => current ? { ...current, [field]: value } : current)
  }

  const handleSave = () => {
    if (!form) return
    if (!form.title.trim()) {
      toast.error("제목을 입력해주세요.")
      return
    }
    if (!form.date.trim()) {
      toast.error("날짜를 입력해주세요.")
      return
    }

    const nextEvent = {
      ...form,
      title: form.title.trim(),
      date: form.date.trim(),
      imageUrl: form.imageUrl?.trim() || undefined,
      description: form.description.trim(),
    }
    const nextEvents = events.map((event) => event.id === eventId ? nextEvent : event)
    saveTimelineEvents(nextEvents)
    toast("타임라인을 저장했어요.")
    router.push("/timeline")
  }

  if (!form) {
    return (
      <main className="flex-1 min-h-0 overflow-y-auto bg-background">
        <div className="mx-auto max-w-2xl px-5 py-6">
          <Header title="이벤트를 찾을 수 없어요" onBack={() => router.push("/timeline")} />
          <div className="rounded-xl border border-border bg-card px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">삭제되었거나 존재하지 않는 이벤트입니다.</p>
            <Button className="mt-4" onClick={() => router.push("/timeline")}>
              타임라인으로 돌아가기
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl px-5 py-6">
        <Header title="이벤트 수정" onBack={() => router.back()} />

        <div className="space-y-5 rounded-xl border border-border bg-card p-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="timeline-title">
              제목
            </label>
            <Input
              id="timeline-title"
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
              className="bg-input"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="timeline-date">
              날짜
            </label>
            <Input
              id="timeline-date"
              type="date"
              value={form.date}
              onChange={(event) => updateForm("date", event.target.value)}
              className="bg-input"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="timeline-image">
              이미지 URL
            </label>
            <Input
              id="timeline-image"
              value={form.imageUrl ?? ""}
              onChange={(event) => updateForm("imageUrl", event.target.value)}
              placeholder="선택 사항"
              className="bg-input"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="timeline-description">
              상세 설명
            </label>
            <Textarea
              id="timeline-description"
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              className="min-h-[180px] bg-input"
            />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-40 border-t border-border bg-background px-5 py-4">
        <div className="mx-auto flex max-w-2xl gap-3">
          <Button variant="outline" className="flex-1" onClick={() => router.back()}>
            취소
          </Button>
          <Button className="flex-1" onClick={handleSave}>
            <Save className="w-4 h-4" />
            저장
          </Button>
        </div>
      </div>
    </main>
  )
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="-mx-5 mb-6 flex items-center gap-3 border-b border-border bg-background px-5 pb-4">
      <button
        type="button"
        onClick={onBack}
        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent transition-colors"
        aria-label="뒤로 가기"
      >
        <ArrowLeft className="h-5 w-5 text-foreground" />
      </button>
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
    </header>
  )
}
