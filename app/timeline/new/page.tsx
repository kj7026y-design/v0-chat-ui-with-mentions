"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  createTimelineEventId,
  getTimelineEvents,
  saveTimelineEvents,
  type TimelineEvent,
} from "@/lib/timeline-storage"

export default function TimelineNewPage() {
  const router = useRouter()
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [form, setForm] = useState<TimelineEvent>({
    id: "",
    title: "",
    date: new Date().toISOString().split("T")[0],
    imageUrl: "",
    description: "",
  })

  useEffect(() => {
    setEvents(getTimelineEvents())
  }, [])

  const updateForm = (field: keyof TimelineEvent, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error("제목을 입력해주세요.")
      return
    }
    if (!form.date.trim()) {
      toast.error("날짜를 입력해주세요.")
      return
    }

    const nextEvent: TimelineEvent = {
      id: createTimelineEventId(),
      title: form.title.trim(),
      date: form.date.trim(),
      imageUrl: form.imageUrl?.trim() || undefined,
      description: form.description.trim(),
    }

    saveTimelineEvents([...events, nextEvent])
    toast("타임라인에 추가했어요.")
    router.push("/timeline")
  }

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl px-5 py-6">
        <Header title="이벤트 작성" onBack={() => router.back()} />

        <div className="space-y-5 rounded-xl border border-border bg-card p-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="timeline-title">
              제목
            </label>
            <Input
              id="timeline-title"
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
              placeholder="예: 첫 만남의 날"
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
              placeholder="이벤트 내용을 입력해주세요."
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
