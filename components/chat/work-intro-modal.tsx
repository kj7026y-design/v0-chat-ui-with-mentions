"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import { WorkLandingPage, WorldGuidePage } from "@/components/my-works/public-detail-view"
import type { StoryCharacter, StoryPersona, StoryWork, StoryWorld } from "@/lib/storychat-storage"

interface WorkIntroModalProps {
  open: boolean
  onClose: () => void
  work?: StoryWork
  world?: StoryWorld
  character?: StoryCharacter
  characters?: StoryCharacter[]
  personas?: StoryPersona[]
}

export function WorkIntroModal({
  open,
  onClose,
  work,
  world,
  character,
  characters = [],
  personas = [],
}: WorkIntroModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onClose])

  if (!open || !world) return null

  const modalCharacters = Array.from(
    new Map([character, ...characters].filter(Boolean).map((item) => [(item as StoryCharacter).id, item as StoryCharacter])).values(),
  )

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="작품 소개">
      <div className="fixed inset-0 overflow-y-auto bg-background p-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onClose}
          className="fixed right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg hover:bg-accent"
          aria-label="작품 소개 닫기"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mx-auto w-full max-w-5xl">
          {work ? (
            <WorkLandingPage
              work={work}
              world={world}
              characters={modalCharacters}
              personas={personas}
              showSocial={false}
            />
          ) : (
            <WorldGuidePage world={world} characters={modalCharacters} personas={personas} />
          )}
        </div>
      </div>
    </div>
  )
}
