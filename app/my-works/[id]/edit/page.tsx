"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { WorkForm, type WorkFormValues } from "@/components/my-works/work-form"
import {
  defaultLibrary,
  getStoryChatLibrary,
  normalizeIntroScenarios,
  saveStoryChatLibrary,
  type StoryChatLibrary,
  type StoryWork,
  type StoryWorld,
} from "@/lib/storychat-storage"
import { useSafeBack } from "@/hooks/use-safe-back"
import { useAccountSession } from "@/hooks/use-account-session"
import { canEditStoryWork } from "@/lib/work-permissions"
import {
  requireStoryWorkBundle,
  syncStoryWorksFromDatabase,
  updateStoryWorkInDatabase,
} from "@/lib/story-work-client"
import { mergeStoryWorkBundles } from "@/lib/story-work-bundle"

export default function EditWorkPage() {
  const params = useParams()
  const workId = params.id as string
  const goBack = useSafeBack(`/my-works?tab=completed&detailType=completed&detailId=${workId}`)
  const { session, isLoading: isSessionLoading } = useAccountSession()
  const [library, setLibrary] = useState<StoryChatLibrary | null>(null)
  const [isDatabaseLoading, setIsDatabaseLoading] = useState(true)

  useEffect(() => {
    setLibrary(getStoryChatLibrary())
    void syncStoryWorksFromDatabase()
      .then(setLibrary)
      .catch((error) => console.warn("[story works sync failed]", error))
      .finally(() => setIsDatabaseLoading(false))
  }, [])

  const work = useMemo(
    () => library?.works.find((item) => item.id === workId),
    [library, workId],
  )
  const world = useMemo(
    () => work ? library?.worlds.find((item) => item.id === work.worldId) : undefined,
    [library, work],
  )

  if (!library || isSessionLoading || isDatabaseLoading) return null

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

  const canEdit = canEditStoryWork(work, session)

  if (!canEdit) {
    return (
      <div className="min-h-full bg-background p-5 text-foreground">
        <Button variant="ghost" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </Button>
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <h1 className="text-lg font-bold">작품 수정 권한이 없습니다.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            작품 생성자와 관리자, 개발자, 테스터만 수정할 수 있습니다.
          </p>
        </div>
      </div>
    )
  }

  const initialValues = toWorkFormValues(work, world)

  const handleSubmit = async (values: WorkFormValues) => {
    if (!canEditStoryWork(work, session)) {
      toast.error("작품 수정 권한이 없습니다.")
      return
    }

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

    let nextLibrary: StoryChatLibrary = {
      ...library,
      works: library.works.map((item) => item.id === work.id ? nextWork : item),
      worlds: library.worlds.map((item) => item.id === world.id ? nextWorld : item),
    }

    if (!defaultLibrary.works.some((item) => item.id === work.id)) {
      try {
        const savedBundle = await updateStoryWorkInDatabase(
          requireStoryWorkBundle(nextLibrary, work.id),
        )
        nextLibrary = mergeStoryWorkBundles(nextLibrary, [savedBundle])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "작품을 DB에 저장하지 못했어요.")
        return
      }
    }

    saveStoryChatLibrary(nextLibrary)
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
