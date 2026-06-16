"use client"

import { useEffect } from "react"
import Link from "next/link"
import { X, Play, BookOpen, MapPin, Users } from "lucide-react"
import type { StoryCharacter, StoryPersona, StoryWork, StoryWorld } from "@/lib/storychat-storage"
import { normalizeList } from "@/components/my-works/public-detail-view"

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

  const title = work?.title || world.name
  const places = normalizeList(work?.majorLocations ?? world.places)

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="작품 소개">
      <button className="absolute inset-0 bg-black/75" onClick={onClose} aria-label="닫기" />
      <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[28px] border border-white/10 bg-background p-4 shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[86vh] sm:w-[min(560px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/65"
          aria-label="작품 소개 닫기"
        >
          <X className="h-5 w-5" />
        </button>

        <section
          className="relative min-h-[280px] overflow-hidden rounded-[24px] bg-cover bg-center p-5"
          style={world.coverImageUrl || work?.coverImageUrl ? { backgroundImage: `url(${work?.coverImageUrl || world.coverImageUrl})` } : undefined}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(245,158,11,0.20),transparent_34%),linear-gradient(135deg,#09090b,#181123_52%,#050508)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/58 to-black/12" />
          <div className="relative flex min-h-[240px] flex-col justify-end gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">Story Intro</p>
            <h2 className="text-3xl font-black leading-tight text-white">{title}</h2>
            <p className="line-clamp-3 text-sm leading-relaxed text-white/74">
              {work?.tagline || world.tagline || work?.coreSetting || world.coreSetting || "아직 기록되지 않은 이야기가 당신을 기다리고 있다."}
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] text-white/68">
              {[work?.genre || world.genre, work?.mood || world.mood, work?.worldDate || world.worldDate || world.era].filter(Boolean).map((item) => (
                <span key={String(item)} className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1">
                  {String(item)}
                </span>
              ))}
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              {work && (
                <Link href={`/my-works/${work.id}`} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black">
                  <BookOpen className="h-4 w-4" />
                  작품 상세 보기
                </Link>
              )}
              {work && (
                <Link href={`/my-works/${work.id}/world`} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                  <MapPin className="h-4 w-4" />
                  세계관 보기
                </Link>
              )}
              <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                <Play className="h-4 w-4" />
                채팅 계속하기
              </button>
            </div>
          </div>
        </section>

        <div className="space-y-5 py-5">
          {(world.currentChapter || world.currentGoal) && (
            <IntroSection icon={BookOpen} title="현재 장면">
              {world.currentChapter && <p className="text-sm font-bold text-foreground">{world.currentChapter}</p>}
              {world.currentGoal && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{world.currentGoal}</p>}
            </IntroSection>
          )}

          {(characters.length > 0 || personas.length > 0 || character) && (
            <IntroSection icon={Users} title="등장 캐릭터">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[character, ...characters].filter(Boolean).map((item) => (
                  <CharacterMiniCard key={(item as StoryCharacter).id} name={(item as StoryCharacter).name} summary={(item as StoryCharacter).summary} emoji={(item as StoryCharacter).emoji} />
                ))}
                {personas.map((persona) => (
                  <CharacterMiniCard key={persona.id} name={persona.name} summary={persona.summary} emoji="🛡️" />
                ))}
              </div>
            </IntroSection>
          )}

          {places.length > 0 && (
            <IntroSection icon={MapPin} title="주요 장소">
              <div className="grid grid-cols-2 gap-2">
                {places.slice(0, 3).map((place) => (
                  <div key={place} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-semibold text-foreground">
                    {place}
                  </div>
                ))}
              </div>
            </IntroSection>
          )}
        </div>
      </div>
    </div>
  )
}

function IntroSection({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-amber-200" />
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function CharacterMiniCard({ name, summary, emoji }: { name: string; summary?: string; emoji: string }) {
  return (
    <div className="w-40 shrink-0 rounded-2xl border border-white/10 bg-card p-3">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg">{emoji}</div>
      <p className="font-bold text-foreground">{name}</p>
      {summary && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{summary}</p>}
    </div>
  )
}
