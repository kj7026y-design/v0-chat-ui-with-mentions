"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  ChevronDown,
  Compass,
  Edit3,
  Eye,
  MapPin,
  Play,
  Quote,
  ScrollText,
  Shield,
  Sparkles,
  Target,
  Users,
} from "lucide-react"
import type {
  IntroScenario,
  StoryCharacter,
  StoryChatLibrary,
  StoryPersona,
  StoryWork,
  StoryWorld,
} from "@/lib/storychat-storage"
import { getIntroPreviewText, normalizeIntroScenarios } from "@/lib/storychat-storage"
import { WorkComments } from "@/components/work/work-comments"
import { WorkLikeButton } from "@/components/work/work-like-button"
import { cn } from "@/lib/utils"

type DetailTarget =
  | { type: "scenarios"; id: string }
  | { type: "characters"; id: string }
  | { type: "personas"; id: string }
  | { type: "completed"; id: string }

type MaybeList = string | string[] | null | undefined

interface LocationItem {
  name: string
  imageUrl?: string
  description?: string
}

export function PublicDetailView({
  detail,
  item,
  library,
}: {
  detail: DetailTarget
  item: StoryCharacter | StoryWorld | StoryPersona | StoryWork
  library: StoryChatLibrary
}) {
  if (detail.type === "scenarios") {
    const world = item as StoryWorld
    const linkedCharacters = getCharactersForWorld(world, library)
    const linkedPersonas = getPersonasForWorld(world, library)

    return (
      <WorldGuidePage
        world={world}
        characters={linkedCharacters}
        personas={linkedPersonas}
      />
    )
  }

  if (detail.type === "completed") {
    const work = item as StoryWork
    const world = library.worlds.find((worldItem) => worldItem.id === work.worldId)
    const character = library.characters.find((characterItem) => characterItem.id === work.characterId)
    const persona = library.personas.find((personaItem) => personaItem.id === work.personaId)

    if (!world) {
      return <EmptyPublicPanel title={work.title} description="연결된 세계관을 찾을 수 없습니다." />
    }

    return (
      <div className="max-w-full space-y-3 overflow-x-hidden">
        <div className="flex justify-end">
          <Link
            href={`/my-works/${work.id}/edit`}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
          >
            <Edit3 className="h-3.5 w-3.5" />
            수정하기
          </Link>
        </div>
        <WorkLandingPage
          work={work}
          world={world}
          characters={character ? [character] : []}
          personas={persona ? [persona] : []}
        />
      </div>
    )
  }

  if (detail.type === "characters") {
    return <CharacterLandingPage character={item as StoryCharacter} />
  }

  return <PersonaLandingPage persona={item as StoryPersona} />
}

export function WorkLandingPage({
  work,
  world,
  characters,
  personas,
  showSocial = true,
  onLikeCountChange,
}: {
  work: StoryWork
  world: StoryWorld
  characters: StoryCharacter[]
  personas: StoryPersona[]
  showSocial?: boolean
  onLikeCountChange?: (count: number) => void
}) {
  const highlights = normalizeList(work.majorEvents ?? world.events)
  const places = normalizeLocations(work.majorLocations ?? world.places, world.locationImages)
  const preview = buildWorkPreview(work, world, places, highlights)

  return (
    <article className="max-w-full space-y-6 overflow-x-hidden pb-10">
      <WorkLandingHero work={work} world={world} />

      <WorkPreviewSection
        preview={preview}
        work={work}
        showLike={showSocial}
        onLikeCountChange={onLikeCountChange}
      />

      {(characters.length > 0 || personas.length > 0) && (
        <CharacterPreviewSection characters={characters} personas={personas} />
      )}

      <WorkStartSceneSection work={work} world={world} />

      <WorkIntroScenariosPreview work={work} />

      {highlights.length > 0 && <WorkHighlightSection highlights={highlights} />}

      {showSocial && (
        <div className="space-y-4">
          <WorkComments workId={work.id} />
        </div>
      )}

      <div className="rounded-[24px] border border-border bg-card p-4 text-center">
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">이야기의 문턱에 섰습니다. 첫 장면에서 바로 대화를 시작해 보세요.</p>
        <Link
          href={`/chat/${work.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black hover:bg-amber-100"
        >
          <Play className="h-4 w-4" />
          채팅 시작하기
        </Link>
      </div>
    </article>
  )
}

function WorkIntroScenariosPreview({ work }: { work: StoryWork }) {
  const intros = normalizeIntroScenarios(work)
  if (intros.length === 0) {
    return (
      <section className="rounded-[22px] border border-border bg-card/80 p-4">
        <SectionTitle icon={ScrollText} title="시작 장면" />
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">자유롭게 첫 문장을 입력해 이야기를 시작할 수 있어요.</p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <SectionTitle icon={ScrollText} title="시작 장면" />
      <p className="text-xs text-muted-foreground">원하는 장면에서 이야기를 시작할 수 있어요.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {intros.map((intro) => (
          <IntroPreviewCard key={intro.id} intro={intro} />
        ))}
      </div>
    </section>
  )
}

function IntroPreviewCard({ intro }: { intro: IntroScenario }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-card/80">
      {intro.imageUrl && <img src={intro.imageUrl} alt={intro.title} className="h-28 w-full object-cover" />}
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-bold text-foreground">{intro.title}</h3>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{getIntroPreviewText(intro)}</p>
      </div>
    </div>
  )
}

function WorkLandingHero({ work, world }: { work: StoryWork; world: StoryWorld }) {
  const copy = work.tagline || world.tagline || work.coreSetting || world.coreSetting || "아직 기록되지 않은 이야기가 당신을 기다리고 있다."
  const imageUrl = work.coverImageUrl || world.coverImageUrl
  const backgroundStyle = imageUrl
    ? { backgroundImage: `url(${imageUrl})` }
    : undefined

  return (
    <section
      className={cn(
        "relative min-h-[320px] overflow-hidden rounded-[24px] border border-white/10 bg-cover bg-center p-5",
        !imageUrl && fantasyGradient(work.genre || String(world.genre)),
      )}
      style={backgroundStyle}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/62 to-black/18" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,0.20),transparent_34%),radial-gradient(circle_at_76%_26%,rgba(99,102,241,0.18),transparent_32%)]" />

      <div className="relative flex min-h-[280px] flex-col justify-end gap-4">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">Featured Story</p>
          <div>
            <h2 className="text-3xl font-black leading-tight text-white md:text-5xl">{work.title}</h2>
            <p className="mt-3 line-clamp-3 max-w-2xl text-sm leading-relaxed text-white/76 md:text-base">
              {copy}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-medium text-white/72">
            {[work.genre || world.genre, work.mood || world.mood, "작가의 세계"].filter(Boolean).map((item) => (
              <span key={String(item)} className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1 backdrop-blur">
                {String(item)}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/chat/${work.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-amber-100"
          >
            <Play className="h-4 w-4" />
            채팅 시작하기
          </Link>
          <Link
            href={`/my-works/${work.id}/world`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
          >
            <Compass className="h-4 w-4" />
            세계관 보기
          </Link>
        </div>
      </div>
    </section>
  )
}

function WorkPreviewSection({
  preview,
  work,
  showLike,
  onLikeCountChange,
}: {
  preview: string
  work: StoryWork
  showLike: boolean
  onLikeCountChange?: (count: number) => void
}) {
  return (
    <section className="rounded-[22px] border border-border bg-card/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle icon={Sparkles} title="작품 미리보기" />
        {showLike && (
          <WorkLikeButton
            workId={work.id}
            initialCount={work.likeCount ?? 0}
            onCountChange={onLikeCountChange}
          />
        )}
      </div>
      <p className="mt-3 text-sm leading-[1.75] text-foreground/85">{preview}</p>
    </section>
  )
}

function WorkStartSceneSection({ work, world }: { work: StoryWork; world: StoryWorld }) {
  const useChapters = work.storyProgressSettings?.useChapters ?? world.storyProgressSettings?.useChapters ?? false
  if (!useChapters) return null

  const chapter = useChapters ? work.currentChapter || world.currentChapter : ""
  const goal = work.currentGoal || world.currentGoal
  if (!chapter && !goal && !work.startScenario) return null

  return (
    <section className="rounded-[22px] border border-amber-300/15 bg-[linear-gradient(135deg,rgba(245,158,11,0.10),rgba(24,24,27,0.92))] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
          현재 장면
        </span>
      </div>
      {chapter && <h3 className="text-lg font-bold text-white">{chapter}</h3>}
      <p className="mt-2 text-sm leading-relaxed text-white/74">{work.startScenario || goal}</p>
      {goal && (
        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-white/8 bg-black/24 p-3">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-200" />
          <p className="text-sm leading-relaxed text-white/82">{goal}</p>
        </div>
      )}
    </section>
  )
}

function WorkHighlightSection({ highlights }: { highlights: string[] }) {
  return (
    <section className="space-y-3">
      <SectionTitle icon={ScrollText} title="주요 매력" />
      <div className="flex flex-wrap gap-2">
        {highlights.map((highlight) => (
          <span key={highlight} className="rounded-full border border-amber-500/25 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-50/85">
            {highlight}
          </span>
        ))}
      </div>
    </section>
  )
}

export function WorldGuidePage({
  world,
  characters,
  personas,
  work,
}: {
  world: StoryWorld
  characters: StoryCharacter[]
  personas: StoryPersona[]
  work?: StoryWork
}) {
  const places = normalizeLocations(work?.majorLocations ?? world.places, world.locationImages)
  const events = normalizeList(work?.majorEvents ?? world.events)
  const statusText = work?.statusBarEnabled ? work.statusBarText : ""

  return (
    <article className="max-w-full space-y-5 overflow-x-hidden pb-10">
      <WorldGuideHeader world={world} work={work} />
      <WorldOverviewSection world={world} work={work} />
      <WorldTimeSection world={world} work={work} />
      {places.length > 0 && <WorldLocationList locations={places} />}
      {events.length > 0 && <WorldTimelineSection events={events} />}
      <WorldRulesSection world={world} />
      <WorldCurrentStatusSection world={world} work={work} statusText={statusText} />
      {(characters.length > 0 || personas.length > 0) && (
        <CharacterPreviewSection characters={characters} personas={personas} />
      )}
    </article>
  )
}

function WorldGuideHeader({ world, work }: { world: StoryWorld; work?: StoryWork }) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(79,70,229,0.20),rgba(8,8,8,0.94))] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-200/80">World Guide</p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-white">{world.name}의 세계</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        {work?.worldDate || world.worldDate || world.era}. {work?.coreSetting || world.coreSetting || "아직 기록되지 않은 세계입니다."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/65">
        {[work?.genre || world.genre, work?.mood || world.mood, work?.worldDate || world.worldDate || world.era].filter(Boolean).map((item) => (
          <span key={String(item)} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
            {String(item)}
          </span>
        ))}
      </div>
    </section>
  )
}

function WorldOverviewSection({ world, work }: { world: StoryWorld; work?: StoryWork }) {
  return (
    <DetailSection title="세계의 개요" icon={BookOpen}>
      <FriendlyDetail label="세계의 개요" value={work?.coreSetting || world.coreSetting} />
      <FriendlyDetail label="이 세계의 공기" value={work?.mood || world.mood} />
    </DetailSection>
  )
}

function WorldTimeSection({ world, work }: { world: StoryWorld; work?: StoryWork }) {
  return (
    <DetailSection title="시대와 시간" icon={Compass}>
      <FriendlyDetail label="시대와 날짜" value={work?.worldDate || world.worldDate || world.era} />
      <FriendlyDetail label="현재 시점" value={work?.currentChapter || world.currentChapter} />
      <FriendlyDetail label="현재 목표" value={work?.currentGoal || world.currentGoal} />
    </DetailSection>
  )
}

function WorldLocationList({ locations }: { locations: LocationItem[] }) {
  return (
    <DetailSection title="주요 장소" icon={MapPin}>
      <div className="space-y-2">
        {locations.map((location, index) => (
          <div key={`${location.name}-${index}`} className="rounded-2xl border border-border bg-background/50 p-3">
            <p className="font-semibold text-foreground">{location.name}</p>
            {location.description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{location.description}</p>}
          </div>
        ))}
      </div>
    </DetailSection>
  )
}

function WorldTimelineSection({ events }: { events: string[] }) {
  return (
    <DetailSection title="사건의 흐름" icon={ScrollText}>
      <ol className="space-y-3">
        {events.map((event, index) => (
          <li key={event} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-xs font-bold text-amber-800 dark:text-amber-100">{index + 1}</span>
            <p className="pt-0.5 text-sm leading-relaxed text-foreground/85">{event}</p>
          </li>
        ))}
      </ol>
    </DetailSection>
  )
}

function WorldRulesSection({ world }: { world: StoryWorld }) {
  if (!world.forbiddenSettings && !world.mood) return null

  return (
    <DetailSection title="세계의 법칙" icon={Shield}>
      <FriendlyDetail label="세계의 톤" value={world.mood} />
    </DetailSection>
  )
}

function WorldCurrentStatusSection({
  world,
  work,
  statusText,
}: {
  world: StoryWorld
  work?: StoryWork
  statusText?: string
}) {
  if (!world.currentChapter && !world.currentGoal && !statusText) return null

  return (
    <DetailSection title="현재 진행 상태" icon={Target}>
      <FriendlyDetail label="현재 시점" value={work?.currentChapter || world.currentChapter} />
      <FriendlyDetail label="현재 목표" value={work?.currentGoal || world.currentGoal} />
      <FriendlyDetail label="현재 상태" value={statusText} />
    </DetailSection>
  )
}

function StorySceneCard({ world }: { world: StoryWorld }) {
  return (
    <section className="rounded-[22px] border border-amber-300/15 bg-[linear-gradient(135deg,rgba(245,158,11,0.10),rgba(24,24,27,0.92))] p-4 shadow-lg shadow-black/25">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
          현재 장면
        </span>
        {world.progress > 0 && <span className="text-[11px] text-white/55">{world.progress}% 진행 중</span>}
      </div>
      {world.currentChapter && <h3 className="text-lg font-bold leading-snug text-white">{world.currentChapter}</h3>}
      {world.currentGoal && (
        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-white/8 bg-black/24 p-3">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-200" />
          <div>
            <p className="text-[11px] font-medium text-white/48">진행 중인 목표</p>
            <p className="mt-1 text-sm leading-relaxed text-white/82">{world.currentGoal}</p>
          </div>
        </div>
      )}
    </section>
  )
}

function CharacterPreviewSection({
  characters,
  personas,
}: {
  characters: StoryCharacter[]
  personas: StoryPersona[]
}) {
  return (
    <section id="characters" className="space-y-3">
      <SectionTitle icon={Users} title="등장 존재" />
      <div className="flex max-w-full gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {characters.map((character) => (
          <Link
            key={character.id}
            href={`/my-works?tab=characters&detailType=characters&detailId=${character.id}`}
            className="w-[210px] shrink-0 overflow-hidden rounded-[20px] border border-border bg-card text-left transition-transform active:scale-[0.99]"
          >
            <PortraitBlock
              name={character.name}
              emoji={character.emoji}
              imageUrl={character.avatarUrl || character.coverImageUrl}
              genre={character.genre}
            />
            <div className="space-y-2 p-3">
              <h3 className="font-bold text-foreground">{character.name}</h3>
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{character.summary}</p>
              <p className="line-clamp-1 text-[11px] text-amber-700 dark:text-amber-100/70">{character.personality || character.relationship}</p>
            </div>
          </Link>
        ))}
        {personas.map((persona) => (
          <Link
            key={persona.id}
            href={`/my-works?tab=personas&detailType=personas&detailId=${persona.id}`}
            className="w-[210px] shrink-0 overflow-hidden rounded-[20px] border border-border bg-card text-left transition-transform active:scale-[0.99]"
          >
            <PortraitBlock name={persona.name} emoji="🛡️" genre={persona.role} />
            <div className="space-y-2 p-3">
              <h3 className="font-bold text-foreground">{persona.name}</h3>
              <p className="text-xs text-muted-foreground">{persona.age}세 · {persona.role}</p>
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{persona.summary}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function LocationGallery({ locations, genre }: { locations: LocationItem[]; genre: StoryWorld["genre"] }) {
  return (
    <section className="space-y-3">
      <SectionTitle icon={MapPin} title="무대" />
      <div className="grid grid-cols-2 gap-3">
        {locations.map((location, index) => (
          <div
            key={`${location.name}-${index}`}
            className={cn(
              "relative min-h-[132px] overflow-hidden rounded-[20px] border border-white/10 bg-cover bg-center",
              !location.imageUrl && locationGradient(index, genre),
            )}
            style={location.imageUrl ? { backgroundImage: `url(${location.imageUrl})` } : undefined}
            role="img"
            aria-label={location.name}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="text-sm font-bold text-white">{location.name}</h3>
              {location.description && <p className="mt-1 line-clamp-2 text-[11px] text-white/64">{location.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ClueSection({ clues }: { clues: string[] }) {
  return (
    <section className="space-y-3">
      <SectionTitle icon={ScrollText} title="세계의 단서" />
      <div className="flex flex-wrap gap-2">
        {clues.map((clue) => (
          <span key={clue} className="rounded-full border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground/85">
            {clue}
          </span>
        ))}
      </div>
    </section>
  )
}

function DetailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof BookOpen
  children: React.ReactNode
}) {
  return (
    <section id="world-detail" className="space-y-3 rounded-[22px] border border-border bg-card/80 p-4">
      <SectionTitle icon={Icon} title={title} />
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function CharacterLandingPage({ character }: { character: StoryCharacter }) {
  const quote = character.quote || character.speechStyle || "나는 아직 내 이야기를 끝내지 않았다."
  const genderLabel = getCharacterGenderLabel(character)
  const profileTags = [
    genderLabel,
    ...normalizeList(character.tags),
    ...normalizeList(character.visualTags),
    ...normalizeList(character.relationshipTags),
  ].filter(Boolean)

  return (
    <article className="space-y-6 pb-10">
      <CharacterHero
        title={character.name}
        subtitle={[character.role || character.summary || String(character.genre), genderLabel].filter(Boolean).join(" · ")}
        quote={quote}
        imageUrl={character.coverImageUrl || character.avatarUrl}
        emoji={character.emoji}
        genre={character.genre}
      />
      {profileTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profileTags.slice(0, 8).map((tag) => (
            <span key={tag} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/85">
              {tag}
            </span>
          ))}
        </div>
      )}
      <CharacterProfileSection
        summary={buildCharacterIntro(character)}
        voice={character.speechStyle}
        relationship={character.relationship}
        appearance={character.appearance || normalizeList(character.visualTags).join(", ")}
      />
      <CollapsibleSecretSection title="숨겨진 진실" value={character.secret} />
      <DetailSection title="세부 설정" icon={Eye}>
        <FriendlyDetail label="소개" value={character.summary} />
        <FriendlyDetail label="성향" value={character.personality} />
        <FriendlyDetail label="목소리" value={character.speechStyle} />
        <FriendlyDetail label="당신과의 관계" value={character.relationship} />
        <FriendlyDetail label="성별" value={genderLabel} />
        <FriendlyDetail label="태그" value={normalizeList(character.tags).join(", ")} />
        <FriendlyDetail label="외형 키워드" value={normalizeList(character.visualTags).join(", ")} />
        <FriendlyDetail label="관계 키워드" value={normalizeList(character.relationshipTags).join(", ")} />
      </DetailSection>
    </article>
  )
}

function PersonaLandingPage({ persona }: { persona: StoryPersona }) {
  const genderLabel = getPersonaGenderLabel(persona)

  return (
    <article className="space-y-6 pb-10">
      <CharacterHero
        title={persona.name}
        subtitle={[`${persona.age}세`, persona.role, genderLabel].filter(Boolean).join(" · ")}
        quote={persona.speechStyle || "이 세계에서 나는 어떤 선택을 하게 될까."}
        emoji="🛡️"
        genre={persona.role}
      />
      <CharacterProfileSection
        summary={buildPersonaIntro(persona)}
        voice={persona.speechStyle}
        relationship={persona.relationship}
        appearance={persona.appearance}
      />
      <CollapsibleSecretSection title="숨겨진 진실" value={persona.secret} />
      <DetailSection title="세부 설정" icon={Shield}>
        <FriendlyDetail label="소개" value={persona.summary} />
        <FriendlyDetail label="성향" value={persona.personality} />
        <FriendlyDetail label="목소리" value={persona.speechStyle} />
        <FriendlyDetail label="모습" value={persona.appearance} />
        <FriendlyDetail label="당신과의 관계" value={persona.relationship} />
        <FriendlyDetail label="성별" value={genderLabel} />
      </DetailSection>
    </article>
  )
}

function CharacterHero({
  title,
  subtitle,
  quote,
  imageUrl,
  emoji,
  genre,
}: {
  title: string
  subtitle?: string
  quote: string
  imageUrl?: string
  emoji: string
  genre?: string
}) {
  return (
    <section
      className={cn(
        "relative min-h-[320px] overflow-hidden rounded-[24px] border border-white/10 bg-cover bg-center p-5",
        !imageUrl && fantasyGradient(genre),
      )}
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/16" />
      {!imageUrl && <div className="absolute inset-0 flex items-center justify-center text-[104px] opacity-20">{emoji}</div>}
      <div className="relative flex min-h-[280px] flex-col justify-end gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">Character</p>
          <h2 className="text-4xl font-black leading-tight text-white">{title}</h2>
          {subtitle && <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/72">{subtitle}</p>}
        </div>
        <blockquote className="rounded-2xl border border-white/10 bg-white/8 p-3 text-sm leading-relaxed text-white/82 backdrop-blur">
          <Quote className="mb-2 h-4 w-4 text-amber-200" />
          {quote}
        </blockquote>
      </div>
    </section>
  )
}

function CharacterProfileSection({
  summary,
  voice,
  relationship,
  appearance,
}: {
  summary: string
  voice?: string
  relationship?: string
  appearance?: string
}) {
  return (
    <section className="space-y-3 rounded-[22px] border border-border bg-card/80 p-4">
      <SectionTitle icon={Sparkles} title="소개" />
      <p className="text-sm leading-[1.7] text-foreground/85">{summary}</p>
      <div className="grid gap-3">
        <FriendlyDetail label="목소리" value={voice} />
        <FriendlyDetail label="당신과의 관계" value={relationship} />
        <FriendlyDetail label="모습" value={appearance} />
      </div>
    </section>
  )
}

function CollapsibleSecretSection({ title, value }: { title: string; value?: string }) {
  const [open, setOpen] = useState(false)
  if (!value) return null

  return (
    <section className="rounded-[22px] border border-border bg-card/80">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <Shield className="h-4 w-4 text-amber-700 dark:text-amber-200" />
        <span className="flex-1 text-sm font-bold text-foreground">{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <p className="border-t border-border px-4 pb-4 pt-3 text-sm leading-[1.7] text-muted-foreground">{value}</p>}
    </section>
  )
}

function PortraitBlock({
  name,
  emoji,
  imageUrl,
  genre,
}: {
  name: string
  emoji: string
  imageUrl?: string
  genre?: string
}) {
  return (
    <div
      className={cn("relative h-36 bg-cover bg-center", !imageUrl && fantasyGradient(genre))}
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
      role="img"
      aria-label={name}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      {!imageUrl && <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-70">{emoji}</div>}
    </div>
  )
}

function FriendlyDetail({ label, value }: { label: string; value?: string }) {
  if (!value) return null

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-[1.65] text-foreground/85">{value}</p>
    </div>
  )
}

function SectionTitle({ icon: Icon, title }: { icon: typeof BookOpen; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-500/25 bg-amber-400/10 dark:border-border dark:bg-muted">
        <Icon className="h-4 w-4 text-amber-700 dark:text-amber-200" />
      </span>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
    </div>
  )
}

function EmptyPublicPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-border bg-card p-5">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function normalizeList(value: MaybeList): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean)
  if (!value) return []
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeLocations(value: MaybeList, images?: Record<string, string>): LocationItem[] {
  return normalizeList(value).map((name) => ({
    name,
    imageUrl: images?.[name],
  }))
}

function getCharactersForWorld(world: StoryWorld, library: StoryChatLibrary) {
  const works = library.works.filter((work) => work.worldId === world.id)
  const characterIds = new Set(works.map((work) => work.characterId))
  return library.characters.filter((character) => characterIds.has(character.id))
}

function getPersonasForWorld(world: StoryWorld, library: StoryChatLibrary) {
  const works = library.works.filter((work) => work.worldId === world.id)
  const personaIds = new Set(works.map((work) => work.personaId).filter(Boolean))
  return library.personas.filter((persona) => personaIds.has(persona.id))
}

function getFirstChatHrefForWorld(worldId: string, library: StoryChatLibrary) {
  const work = library.works.find((item) => item.worldId === worldId)
  return work ? `/chat/${work.id}` : "/create?mode=work"
}

function buildWorkPreview(
  work: StoryWork,
  world: StoryWorld,
  places: LocationItem[],
  highlights: string[],
) {
  if (work.tagline) return work.tagline

  const firstPlace = places[0]?.name
  const secondPlace = places[1]?.name
  const firstHighlight = highlights[0]
  const secondHighlight = highlights[1]

  return [
    firstPlace
      ? `당신은 ${firstPlace}에서 이 이야기의 첫 장면을 마주합니다.`
      : work.coreSetting || world.coreSetting,
    secondPlace || firstHighlight
      ? `${[secondPlace, firstHighlight].filter(Boolean).join("과 ")}에는 아직 밝혀지지 않은 단서가 남아 있습니다.`
      : "",
    secondHighlight
      ? `${secondHighlight}이 모든 선택을 다시 움직이게 합니다.`
      : work.currentGoal || world.currentGoal,
  ].filter(Boolean).join(" ")
}

function buildCharacterIntro(character: StoryCharacter) {
  return [character.summary, character.personality, character.relationship]
    .filter(Boolean)
    .join(" ")
}

function getCharacterGenderLabel(character: StoryCharacter) {
  if (character.gender === "custom" && character.genderCustom?.trim()) return character.genderCustom.trim()
  if (character.gender === "male") return "남성"
  if (character.gender === "female") return "여성"
  if (character.gender === "nonbinary") return "논바이너리/기타"
  return ""
}

function buildPersonaIntro(persona: StoryPersona) {
  return [persona.summary, persona.personality, persona.relationship]
    .filter(Boolean)
    .join(" ")
}

function getPersonaGenderLabel(persona: StoryPersona) {
  if (persona.gender === "custom" && persona.genderCustom?.trim()) return persona.genderCustom.trim()
  if (persona.gender === "male") return "남성"
  if (persona.gender === "female") return "여성"
  if (persona.gender === "nonbinary") return "논바이너리/기타"
  return ""
}

function fantasyGradient(genre?: string) {
  const normalizedGenre = String(genre ?? "").toLowerCase()
  if (normalizedGenre.includes("판타지") || normalizedGenre.includes("fantasy")) {
    return "bg-[radial-gradient(circle_at_24%_18%,rgba(124,58,237,0.34),transparent_34%),linear-gradient(135deg,#09090b,#181123_48%,#050508)]"
  }
  return "bg-[radial-gradient(circle_at_30%_16%,rgba(245,158,11,0.22),transparent_30%),linear-gradient(135deg,#09090b,#161616_48%,#050505)]"
}

function locationGradient(index: number, genre?: string) {
  const gradients = [
    "bg-[linear-gradient(135deg,#18181b,#312e81_54%,#030712)]",
    "bg-[linear-gradient(135deg,#111827,#064e3b_58%,#020617)]",
    "bg-[linear-gradient(135deg,#1c1917,#78350f_56%,#09090b)]",
    "bg-[linear-gradient(135deg,#0f172a,#4c1d95_52%,#020617)]",
  ]
  if (String(genre ?? "").includes("판타지")) return gradients[index % gradients.length]
  return gradients[(index + 1) % gradients.length]
}
