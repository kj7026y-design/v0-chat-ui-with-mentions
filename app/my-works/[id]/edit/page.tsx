"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { WorkForm, type WorkFormValues } from "@/components/my-works/work-form"
import {
  getStoryChatLibrary,
  normalizeIntroScenarios,
  saveStoryChatLibrary,
  type StoryChatLibrary,
  type StoryWork,
  type StoryWorld,
} from "@/lib/storychat-storage"
import { useSafeBack } from "@/hooks/use-safe-back"

export default function EditWorkPage() {
  const params = useParams()
  const workId = params.id as string
  const goBack = useSafeBack(`/my-works?tab=completed&detailType=completed&detailId=${workId}`)
  const [library, setLibrary] = useState<StoryChatLibrary | null>(null)

  useEffect(() => {
    setLibrary(getStoryChatLibrary())
  }, [])

  const work = useMemo(
    () => library?.works.find((item) => item.id === workId),
    [library, workId],
  )
  const world = useMemo(
    () => work ? library?.worlds.find((item) => item.id === work.worldId) : undefined,
    [library, work],
  )

  if (!library) return null

  if (!work || !world) {
    return (
      <div className="min-h-full bg-background p-5 text-foreground">
        <Button variant="ghost" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </Button>
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <h1 className="text-lg font-bold">작품을 찾을 수 없습니다.</h1>
          <p className="mt-2 text-sm text-muted-foreground">삭제되었거나 연결된 세계관이 없습니다.</p>
        </div>
      </div>
    )
  }

  const initialValues = toWorkFormValues(work, world)

  const handleSubmit = (values: WorkFormValues) => {
    const now = "오늘"
    const nextWork: StoryWork = {
      ...work,
      title: values.title.trim(),
      characterId: values.characterId || work.characterId,
      worldId: values.worldId || work.worldId,
      genre: values.genre.trim(),
      tagline: values.tagline.trim(),
      authorNote: values.authorNote.trim(),
      coreSetting: values.coreSetting.trim(),
      startScenario: values.relationship.trim() || work.startScenario,
      majorLocations: values.majorLocations,
      majorEvents: values.majorEvents,
      mood: values.mood.trim(),
      currentChapter: values.currentChapter.trim(),
      currentGoal: values.currentGoal.trim(),
      worldDate: values.worldDate.trim(),
      coverImageUrl: values.coverImageUrl.trim(),
      statusBarEnabled: values.statusBarEnabled,
      statusBarText: values.statusBarText,
      statusBarUpdatedAt: values.statusBarEnabled ? new Date().toISOString() : undefined,
      introScenarios: values.introScenarios,
      updatedAt: now,
    }

    const nextWorld: StoryWorld = {
      ...world,
      genre: values.genre.trim(),
      tagline: values.tagline.trim(),
      coreSetting: values.coreSetting.trim(),
      places: values.majorLocations,
      events: values.majorEvents,
      mood: values.mood.trim(),
      currentChapter: values.currentChapter.trim(),
      currentGoal: values.currentGoal.trim(),
      worldDate: values.worldDate.trim(),
      coverImageUrl: values.coverImageUrl.trim(),
    }

    saveStoryChatLibrary({
      ...library,
      works: library.works.map((item) => item.id === work.id ? nextWork : item),
      worlds: library.worlds.map((item) => item.id === world.id ? nextWorld : item),
    })
    toast("작품을 수정했어요.")
    goBack()
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-4 py-5">
        <WorkForm
          mode="edit"
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={goBack}
        />
      </main>
    </div>
  )
}

function toWorkFormValues(work: StoryWork, world: StoryWorld): WorkFormValues {
  return {
    title: work.title,
    genre: work.genre || String(world.genre || ""),
    tagline: work.tagline || world.tagline || "",
    authorNote: work.authorNote || "",
    characterId: work.characterId || "",
    worldId: work.worldId || world.id || "",
    relationship: work.startScenario || "",
    openingScene: work.introScenarios?.[0]?.scene || work.startScenario || "",
    coreSetting: work.coreSetting || world.coreSetting || "",
    coverImageUrl: work.coverImageUrl || world.coverImageUrl || "",
    mood: work.mood || world.mood || "",
    majorLocations: Array.isArray(work.majorLocations)
      ? work.majorLocations.join(", ")
      : work.majorLocations || world.places || "",
    majorEvents: Array.isArray(work.majorEvents)
      ? work.majorEvents.join(", ")
      : work.majorEvents || world.events || "",
    currentChapter: work.currentChapter || world.currentChapter || "",
    currentGoal: work.currentGoal || world.currentGoal || "",
    worldDate: work.worldDate || world.worldDate || world.era || "",
    statusBarEnabled: Boolean(work.statusBarEnabled),
    statusBarText: work.statusBarText || "",
    introScenarios: normalizeIntroScenarios(work),
  }
}
