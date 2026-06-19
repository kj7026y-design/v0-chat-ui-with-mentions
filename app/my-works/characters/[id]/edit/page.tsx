"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CharacterForm } from "@/components/create/character-form"
import {
  getStoryChatLibrary,
  saveStoryChatLibrary,
  type StoryCharacter,
  type StoryChatLibrary,
} from "@/lib/storychat-storage"

export default function EditCharacterPage() {
  const params = useParams()
  const router = useRouter()
  const characterId = params.id as string
  const [library, setLibrary] = useState<StoryChatLibrary | null>(null)
  const [draft, setDraft] = useState<StoryCharacter | null>(null)

  useEffect(() => {
    const nextLibrary = getStoryChatLibrary()
    setLibrary(nextLibrary)
    setDraft(nextLibrary.characters.find((item) => item.id === characterId) ?? null)
  }, [characterId])

  const character = useMemo(
    () => library?.characters.find((item) => item.id === characterId),
    [characterId, library],
  )

  const handleSave = () => {
    if (!library || !draft) return
    saveStoryChatLibrary({
      ...library,
      characters: library.characters.map((item) => item.id === draft.id ? draft : item),
    })
    toast("캐릭터를 수정했어요.")
    router.push(`/my-works?tab=characters&detailType=characters&detailId=${draft.id}`)
  }

  if (!library) return null

  if (!character || !draft) {
    return (
      <div className="min-h-full bg-background p-5 text-foreground">
        <Button variant="ghost" onClick={() => router.push("/my-works?tab=characters")}>
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </Button>
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <h1 className="text-lg font-bold">캐릭터를 찾을 수 없습니다.</h1>
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
            <h1 className="text-lg font-bold">캐릭터 수정</h1>
            <p className="text-xs text-muted-foreground">{character.name}</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5 pb-28">
        <CharacterForm value={draft} onChange={setDraft} formMode="advanced" />
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
