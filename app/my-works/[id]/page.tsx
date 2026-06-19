"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkLandingPage } from "@/components/my-works/public-detail-view"
import {
  defaultLibrary,
  getStoryChatLibrary,
  saveStoryChatLibrary,
  type StoryChatLibrary,
} from "@/lib/storychat-storage"

export default function WorkPublicPage() {
  const params = useParams()
  const router = useRouter()
  const workId = params.id as string
  const [library, setLibrary] = useState<StoryChatLibrary>(defaultLibrary)

  useEffect(() => {
    setLibrary(getStoryChatLibrary())
  }, [])

  const work = useMemo(() => library.works.find((item) => item.id === workId), [library, workId])
  const world = useMemo(() => work ? library.worlds.find((item) => item.id === work.worldId) : undefined, [library, work])
  const character = useMemo(() => work ? library.characters.find((item) => item.id === work.characterId) : undefined, [library, work])
  const persona = useMemo(() => work ? library.personas.find((item) => item.id === work.personaId) : undefined, [library, work])

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{work?.title ?? "작품 상세"}</h1>
            <p className="text-xs text-muted-foreground">완성작 소개</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 pb-28">
        {work && world ? (
          <WorkLandingPage
            work={work}
            world={world}
            characters={character ? [character] : []}
            personas={persona ? [persona] : []}
            onLikeCountChange={(likeCount) => {
              const nextLibrary = {
                ...library,
                works: library.works.map((item) => item.id === work.id ? { ...item, likeCount } : item),
              }
              setLibrary(nextLibrary)
              saveStoryChatLibrary(nextLibrary)
            }}
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold">작품을 찾을 수 없습니다.</h2>
            <p className="mt-2 text-sm text-muted-foreground">삭제되었거나 연결된 세계관이 없습니다.</p>
          </div>
        )}
      </main>
    </div>
  )
}
