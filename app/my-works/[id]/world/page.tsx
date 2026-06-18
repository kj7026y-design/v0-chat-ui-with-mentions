"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorldGuidePage } from "@/components/my-works/public-detail-view"
import {
  defaultLibrary,
  getStoryChatLibrary,
  type StoryChatLibrary,
} from "@/lib/storychat-storage"

export default function WorkWorldGuidePage() {
  const params = useParams()
  const router = useRouter()
  const workId = params.id as string
  const [library, setLibrary] = useState<StoryChatLibrary>(defaultLibrary)

  useEffect(() => {
    setLibrary(getStoryChatLibrary())
  }, [])

  const work = useMemo(() => library.works.find((item) => item.id === workId), [library, workId])
  const world = useMemo(() => work ? library.worlds.find((item) => item.id === work.worldId) : undefined, [library, work])
  const characters = useMemo(() => {
    if (!world) return []
    const characterIds = new Set(library.works.filter((item) => item.worldId === world.id).map((item) => item.characterId))
    return library.characters.filter((character) => characterIds.has(character.id))
  }, [library, world])
  const personas = useMemo(() => {
    if (!world) return []
    const personaIds = new Set(library.works.filter((item) => item.worldId === world.id).map((item) => item.personaId).filter(Boolean))
    return library.personas.filter((persona) => personaIds.has(persona.id))
  }, [library, world])

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{world?.name ?? "세계관"}</h1>
            <p className="text-xs text-muted-foreground">세계관 설정</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 pb-28">
        {work && world ? (
          <WorldGuidePage world={world} work={work} characters={characters} personas={personas} />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold">세계관을 찾을 수 없습니다.</h2>
            <p className="mt-2 text-sm text-muted-foreground">삭제되었거나 연결된 작품이 없습니다.</p>
          </div>
        )}
      </main>
    </div>
  )
}
