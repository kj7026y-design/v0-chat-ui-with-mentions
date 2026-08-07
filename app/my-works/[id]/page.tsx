"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { WorkLandingPage } from "@/components/my-works/public-detail-view"
import {
  defaultLibrary,
  getStoryChatLibrary,
  saveStoryChatLibrary,
  type StoryChatLibrary,
} from "@/lib/storychat-storage"

export default function WorkPublicPage() {
  const params = useParams()
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
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
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
        <div className="mx-auto max-w-md p-5 py-20 text-center">
          <h2 className="text-lg font-bold">작품을 찾을 수 없습니다.</h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">삭제되었거나 연결된 세계관이 없습니다.</p>
        </div>
      )}
    </div>
  )
}
