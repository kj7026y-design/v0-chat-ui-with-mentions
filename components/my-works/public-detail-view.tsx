"use client"

import { useState, type MouseEvent, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Compass,
  Edit3,
  Eye,
  Heart,
  MapPin,
  Pencil,
  PenLine,
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
import { cn } from "@/lib/utils"
import { getCurrentAppPath, withReturnTo } from "@/lib/safe-navigation"
import { useAccountSession } from "@/hooks/use-account-session"
import { canEditStoryWork } from "@/lib/work-permissions"

type DetailTarget =
  | { type: "scenarios"; id: string }
  | { type: "characters"; id: string }
  | { type: "personas"; id: string }
  | { type: "completed"; id: string }

function ReturnPathLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  const router = useRouter()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    event.preventDefault()
    router.push(withReturnTo(href, getCurrentAppPath()))
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  )
}

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
      <WorkLandingPage
        work={work}
        world={world}
        characters={character ? [character] : []}
        personas={persona ? [persona] : []}
      />
    )
  }

  if (detail.type === "characters") {
    return <CharacterLandingPage character={item as StoryCharacter} />
  }

  return <PersonaLandingPage persona={item as StoryPersona} />
}

interface CastMember {
  id: string
  emoji: string
  name: string
  type: "캐릭터" | "자아"
  tagline: string
  keyword: string
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
  const router = useRouter()
  const { session, isLoading: isSessionLoading } = useAccountSession()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(work.likeCount ?? 0)
  const [selectedScene, setSelectedScene] = useState<string | null>(null)

  const highlights = normalizeList(work.majorEvents ?? world.events)
  const places = normalizeLocations(work.majorLocations ?? world.places, world.locationImages)
  const previewText = buildWorkPreview(work, world, places, highlights)
  const intros = normalizeIntroScenarios(work)
  const canEdit = !isSessionLoading && canEditStoryWork(work, session)

  const title = work.title || "작품 제목"
  const tagline = work.tagline || world.tagline || work.coreSetting || world.coreSetting || "천년의 잠에서 깨어난 왕국의 마지막 이야기"
  const genre = work.genre || world.genre || "판타지"
  const mood = work.mood || world.mood || "장엄하고 쓸쓸함"

  const currentChapterTitle = work.currentChapter || world.currentChapter || "1장: 잠에서 깨어난 성"
  const currentChapterDesc = work.startScenario || world.coreSetting || "안개 낀 산길에서 이무기와 마주친다."
  const currentChapterGoal = work.currentGoal || world.currentGoal || "왕국 몰락의 원인을 찾는다"

  const cast: CastMember[] = [
    ...characters.map((c) => ({
      id: c.id,
      emoji: c.emoji || "🐍",
      name: c.name,
      type: "캐릭터" as const,
      tagline: c.summary || c.role || "천년을 기다린 용이 되지 못한 존재",
      keyword: c.personality || c.speechStyle || "신비롭고 고독하며 지혜로움",
    })),
    ...personas.map((p) => ({
      id: p.id,
      emoji: "🛡️",
      name: p.name,
      type: "자아" as const,
      tagline: [p.age ? `${p.age}세` : "", p.role].filter(Boolean).join(" · ") || "잊혀진 왕국의 마지막 기사",
      keyword: p.summary || p.personality || "왕국을 지키기 위해 남은 유일한 사람",
    })),
  ]

  const handleLike = () => {
    const nextLiked = !liked
    const nextCount = nextLiked ? likeCount + 1 : Math.max(0, likeCount - 1)
    setLiked(nextLiked)
    setLikeCount(nextCount)
    onLikeCountChange?.(nextCount)
  }

  const handleStartChat = (sceneId?: string) => {
    const targetScene = sceneId || selectedScene
    if (targetScene) {
      router.push(`/chat/${work.id}?scene=${encodeURIComponent(targetScene)}`)
    } else {
      router.push(`/chat/${work.id}`)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white pb-8 dark:bg-neutral-950">
      <div className="px-5 pt-4">
        {/* 헤더 */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="뒤로 가기"
              className="-ml-1 shrink-0 p-1 text-neutral-900 dark:text-neutral-100"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="truncate text-base font-medium text-neutral-900 dark:text-neutral-100">
              {title}
            </h1>
          </div>
          {canEdit && (
            <Link
              href={`/my-works/${work.id}/edit`}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            >
              <Pencil size={12} />
              수정하기
            </Link>
          )}
        </div>

        {/* 히어로 */}
        <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-950 p-5">
          <p className="mb-1.5 text-lg font-semibold text-white">{title}</p>
          <p className="mb-3.5 text-sm text-neutral-300">{tagline}</p>
          <div className="mb-4 flex gap-1.5">
            {work.redZoneEnabled && (
              <span className="rounded-full border border-red-300/30 bg-red-500/25 px-2.5 py-1 text-xs font-medium text-red-100">
                레드존
              </span>
            )}
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-neutral-100">
              {genre}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-neutral-100">
              {mood}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleStartChat()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <Play size={13} fill="currentColor" />
              채팅 시작하기
            </button>
            <Link
              href={`/my-works/${work.id}/world`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/20 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
            >
              <BookOpen size={13} />
              세계관 보기
            </Link>
          </div>
        </div>

        {/* 작가의 한마디 */}
        {work.authorNote && (
          <div className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <PenLine size={15} className="text-neutral-500" />
              작가의 한마디
            </p>
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {work.authorNote}
            </p>
          </div>
        )}

        {/* 작품 미리보기 */}
        <div className="mb-5 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <Sparkles size={15} className="text-amber-500" />
              작품 미리보기
            </span>
            {showSocial && (
              <button
                type="button"
                onClick={handleLike}
                className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <Heart
                  size={15}
                  className={liked ? "fill-red-500 text-red-500" : ""}
                />
                좋아요 {likeCount}
              </button>
            )}
          </div>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {previewText}
          </p>
        </div>

        {/* 등장 캐릭터 · 자아 */}
        {cast.length > 0 && (
          <>
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <Users size={15} className="text-neutral-500" />
              등장 캐릭터 · 자아
            </p>
            <div className="mb-6 flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {cast.map((member) => {
                const targetTab = member.type === "캐릭터" ? "characters" : "personas"
                const href = `/my-works?tab=${targetTab}&detailType=${targetTab}&detailId=${encodeURIComponent(member.id)}`
                return (
                  <ReturnPathLink
                    key={member.id}
                    href={href}
                    className="w-40 shrink-0 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-left transition-transform active:scale-[0.99] hover:border-neutral-300 dark:hover:border-neutral-700"
                  >
                    <div className="flex h-24 items-center justify-center bg-neutral-900 text-3xl">
                      {member.emoji}
                    </div>
                    <div className="p-3">
                      <div className="mb-1 flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {member.name}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${
                            member.type === "캐릭터"
                              ? "bg-lime-50 text-lime-700 dark:bg-lime-950 dark:text-lime-300"
                              : "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                          }`}
                        >
                          {member.type}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                        {member.tagline}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-neutral-400 dark:text-neutral-500">
                        {member.keyword}
                      </p>
                    </div>
                  </ReturnPathLink>
                )
              })}
            </div>
          </>
        )}

        {/* 현재 장면 */}
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-neutral-700 to-neutral-900 p-4">
          <span className="mb-2 inline-block rounded-full bg-amber-400/90 px-2 py-0.5 text-[11px] font-medium text-neutral-900">
            현재 장면
          </span>
          <p className="mb-1 text-[15px] font-medium text-white">
            {currentChapterTitle}
          </p>
          <p className="mb-3 text-sm text-neutral-300">
            {currentChapterDesc}
          </p>
          {currentChapterGoal && (
            <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs text-neutral-100">
              <Target size={13} className="shrink-0 text-amber-300" />
              {currentChapterGoal}
            </div>
          )}
        </div>

        {/* 시작 장면 */}
        <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
          <BookOpen size={15} className="text-neutral-500" />
          시작 장면
        </p>
        <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
          원하는 장면에서 이야기를 시작할 수 있어요.
        </p>
        <div className="mb-6 flex flex-col gap-2.5">
          {intros.length > 0 ? (
            intros.map((scene) => {
              const active = selectedScene === scene.id;
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => setSelectedScene(scene.id)}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                  }`}
                >
                  <p className="mb-0.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {scene.title}
                  </p>
                  <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2">
                    {getIntroPreviewText(scene)}
                  </p>
                </button>
              );
            })
          ) : (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 text-xs text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-900">
              기본 장면에서 바로 대화를 시작해보세요.
            </div>
          )}
        </div>

        {/* 주요 매력 */}
        {highlights.length > 0 && (
          <>
            <p className="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              주요 매력
            </p>
            <div className="mb-6 flex flex-wrap gap-1.5">
              {highlights.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}

        {/* 댓글 */}
        {showSocial && (
          <div className="mb-6">
            <WorkComments workId={work.id} />
          </div>
        )}

        {/* 마무리 CTA */}
        <div className="rounded-2xl bg-neutral-50 p-5 text-center dark:bg-neutral-900">
          <p className="mb-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            이야기의 문턱에 섰습니다. 첫 장면에서 바로 대화를 시작해보세요.
          </p>
          <button
            type="button"
            onClick={() => handleStartChat(selectedScene ?? undefined)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Play size={13} fill="currentColor" />
            채팅 시작하기
          </button>
        </div>
      </div>
    </div>
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
          <ReturnPathLink
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
          </ReturnPathLink>
        ))}
        {personas.map((persona) => (
          <ReturnPathLink
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
          </ReturnPathLink>
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
