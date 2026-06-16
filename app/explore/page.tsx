"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpDown, MessageCircle, Play, Search, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  defaultLibrary,
  getStoryChatLibrary,
  type StoryCharacter,
  type StoryChatLibrary,
  type StoryWork,
  type StoryWorld,
} from "@/lib/storychat-storage"

type SortId = "popular" | "latest" | "updated" | "name"

interface ExploreWork {
  work: StoryWork
  world?: StoryWorld
  character?: StoryCharacter
}

interface ExploreCharacter {
  character: StoryCharacter
  work?: StoryWork
  world?: StoryWorld
}

const baseGenres = ["전체", "판타지", "로맨스", "현대", "학원", "무협", "SF", "공포", "미스터리", "일상"]

export default function ExplorePage() {
  const router = useRouter()
  const [library, setLibrary] = useState<StoryChatLibrary>(defaultLibrary)
  const [query, setQuery] = useState("")
  const [genre, setGenre] = useState("전체")
  const [sort, setSort] = useState<SortId>("popular")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const syncLibrary = () => {
      setLibrary(getStoryChatLibrary())
      setMounted(true)
    }
    syncLibrary()
    window.addEventListener("storage", syncLibrary)
    window.addEventListener("storychat-library-updated", syncLibrary)
    return () => {
      window.removeEventListener("storage", syncLibrary)
      window.removeEventListener("storychat-library-updated", syncLibrary)
    }
  }, [])

  const exploreWorks = useMemo(() => {
    return library.works
      .filter((work) => work.isPublic !== false)
      .map((work) => ({
        work,
        world: library.worlds.find((world) => world.id === work.worldId),
        character: library.characters.find((character) => character.id === (work.defaultCharacterId ?? work.characterId)),
      }))
  }, [library])

  const exploreCharacters = useMemo(() => {
    return library.characters
      .filter((character) => character.isPublic !== false)
      .map((character) => {
        const work = library.works.find((item) => item.characterId === character.id || item.defaultCharacterId === character.id)
        return {
          character,
          work,
          world: work ? library.worlds.find((world) => world.id === work.worldId) : undefined,
        }
      })
  }, [library])

  const genres = useMemo(() => {
    const dynamicGenres = new Set(baseGenres)
    exploreWorks.forEach(({ work, world }) => {
      const value = work.genre || world?.genre
      if (value) dynamicGenres.add(String(value))
    })
    exploreCharacters.forEach(({ character }) => {
      if (character.genre) dynamicGenres.add(String(character.genre))
    })
    return [...dynamicGenres]
  }, [exploreCharacters, exploreWorks])

  const visibleWorks = useMemo(
    () => sortWorks(filterWorks(exploreWorks, query, genre), sort),
    [exploreWorks, genre, query, sort],
  )
  const visibleCharacters = useMemo(
    () => sortCharacters(filterCharacters(exploreCharacters, query, genre), sort),
    [exploreCharacters, genre, query, sort],
  )

  const heroWork = visibleWorks[0] ?? exploreWorks[0]
  const hasSearch = query.trim().length > 0
  const hasContent = exploreWorks.length > 0 || exploreCharacters.length > 0

  const startWork = (item?: ExploreWork | StoryWork) => {
    const work = "work" in (item ?? {}) ? (item as ExploreWork).work : item as StoryWork | undefined
    if (!work) return
    const character = library.characters.find((candidate) => candidate.id === (work.defaultCharacterId ?? work.characterId))
    if (!character) {
      window.alert("아직 시작 가능한 캐릭터가 없어요.")
      router.push(`/my-works/${work.id}`)
      return
    }
    router.push(`/chat/${work.id}`)
  }

  const startCharacter = (item: ExploreCharacter) => {
    if (item.work) {
      router.push(`/chat/${item.work.id}`)
      return
    }
    window.alert("이 캐릭터로 시작 가능한 작품이 아직 없어요.")
  }

  return (
    <main className="min-h-full bg-[#080808] text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-10">
        <ExploreHeader
          query={query}
          sort={sort}
          onQueryChange={setQuery}
          onSortChange={setSort}
        />
        <GenreFilterChips genres={genres} selectedGenre={genre} onSelect={setGenre} />

        {!mounted ? (
          <ExploreSkeleton />
        ) : !hasContent ? (
          <EmptyExploreState />
        ) : hasSearch ? (
          <section className="space-y-5">
            <SectionHeading title="검색 결과" subtitle={`${visibleWorks.length + visibleCharacters.length}개의 콘텐츠`} />
            {visibleWorks.length > 0 && (
              <ContentRail title="작품">
                {visibleWorks.map((item) => (
                  <WorkPosterCard key={item.work.id} item={item} onStart={() => startWork(item)} />
                ))}
              </ContentRail>
            )}
            {visibleCharacters.length > 0 && (
              <ContentRail title="캐릭터">
                {visibleCharacters.map((item) => (
                  <CharacterExploreCard key={item.character.id} item={item} onStart={() => startCharacter(item)} />
                ))}
              </ContentRail>
            )}
            {visibleWorks.length === 0 && visibleCharacters.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-10 text-center">
                <p className="text-sm text-muted-foreground">검색 결과가 없어요. 다른 키워드로 찾아보세요.</p>
              </div>
            )}
          </section>
        ) : (
          <>
            {heroWork && <ExploreHero item={heroWork} onStart={() => startWork(heroWork)} />}
            <ContentRail title="인기 작품" subtitle="지금 많이 시작되는 이야기">
              {visibleWorks.slice(0, 10).map((item) => (
                <WorkPosterCard key={item.work.id} item={item} onStart={() => startWork(item)} />
              ))}
            </ContentRail>
            <ContentRail title="인기 캐릭터" subtitle="바로 대화를 시작할 수 있어요">
              {visibleCharacters.slice(0, 10).map((item) => (
                <CharacterExploreCard key={item.character.id} item={item} onStart={() => startCharacter(item)} />
              ))}
            </ContentRail>
            <GenreRecommendation works={visibleWorks} onStart={startWork} />
            <ContentRail title="새로 올라온 작품" subtitle="최근 등록된 공개 콘텐츠">
              {sortWorks(visibleWorks, "latest").map((item) => (
                <WorkPosterCard key={item.work.id} item={item} onStart={() => startWork(item)} compact />
              ))}
            </ContentRail>
          </>
        )}
      </div>
    </main>
  )
}

function ExploreHeader({
  query,
  sort,
  onQueryChange,
  onSortChange,
}: {
  query: string
  sort: SortId
  onQueryChange: (value: string) => void
  onSortChange: (value: SortId) => void
}) {
  return (
    <header className="space-y-4">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/80">
          <Sparkles className="h-3.5 w-3.5" />
          Discover
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">탐색</h1>
        <p className="mt-1 text-sm leading-relaxed text-white/60">오늘은 어떤 세계로 들어가볼까요?</p>
      </div>

      <div className="flex gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white shadow-sm">
          <Search className="h-4 w-4 shrink-0 text-white/45" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="작품명, 캐릭터명, 장르 검색"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />
        </label>
        <label className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-white">
          <ArrowUpDown className="h-4 w-4 text-white/45" />
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortId)}
            className="h-full bg-transparent text-xs text-white outline-none [color-scheme:dark]"
            aria-label="정렬"
          >
            <option value="popular" className="bg-[#181818] text-white">인기순</option>
            <option value="latest" className="bg-[#181818] text-white">최신순</option>
            <option value="updated" className="bg-[#181818] text-white">업데이트순</option>
            <option value="name" className="bg-[#181818] text-white">이름순</option>
          </select>
        </label>
      </div>
    </header>
  )
}

function GenreFilterChips({
  genres,
  selectedGenre,
  onSelect,
}: {
  genres: string[]
  selectedGenre: string
  onSelect: (genre: string) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const selectedChipRef = useRef<HTMLButtonElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartXRef = useRef(0)
  const scrollStartRef = useRef(0)
  const hasDraggedRef = useRef(false)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    const list = listRef.current
    const selectedChip = selectedChipRef.current
    if (!list || !selectedChip) return

    const targetLeft = selectedChip.offsetLeft - list.clientWidth / 2 + selectedChip.clientWidth / 2
    list.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: "smooth",
    })
  }, [selectedGenre])

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!listRef.current) return
    const scrollDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    listRef.current.scrollLeft += scrollDelta
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !listRef.current) return
    setIsDragging(true)
    hasDraggedRef.current = false
    dragStartXRef.current = event.clientX
    scrollStartRef.current = listRef.current.scrollLeft
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !listRef.current) return
    const dragDistance = event.clientX - dragStartXRef.current
    if (Math.abs(dragDistance) > 4) {
      hasDraggedRef.current = true
      suppressClickRef.current = true
    }
    listRef.current.scrollLeft = scrollStartRef.current - dragDistance
  }

  const stopDragging = () => {
    setIsDragging(false)
    if (suppressClickRef.current) {
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }
  }

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current && !hasDraggedRef.current) return
    event.preventDefault()
    event.stopPropagation()
    hasDraggedRef.current = false
  }

  return (
    <div
      ref={listRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
      onClickCapture={handleClickCapture}
      className={cn(
        "-mx-4 overflow-x-auto px-4 scrollbar-hide select-none",
        isDragging ? "cursor-grabbing" : "cursor-grab",
      )}
    >
      <div className="flex gap-2">
        {genres.map((item) => (
          <button
            key={item}
            ref={(node) => {
              if (selectedGenre === item) selectedChipRef.current = node
            }}
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
              selectedGenre === item
                ? "border-amber-300/50 bg-amber-300/20 text-amber-100"
                : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white",
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}

function ExploreHero({ item, onStart }: { item: ExploreWork; onStart: () => void }) {
  const { work, world, character } = item
  const title = work.title
  const description = work.tagline || work.coreSetting || world?.tagline || world?.coreSetting || "아직 기록되지 않은 이야기가 당신을 기다리고 있다."
  const genre = work.genre || world?.genre || character?.genre
  const mood = work.mood || world?.mood

  return (
    <section
      className={cn(
        "relative min-h-[320px] overflow-hidden rounded-[28px] border border-white/10 bg-cover bg-center p-5 shadow-2xl shadow-black/30",
        !work.coverImageUrl && getWorkCoverFallback(genre),
      )}
      style={work.coverImageUrl ? { backgroundImage: `url(${work.coverImageUrl})` } : undefined}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/15" />
      <div className="relative z-10 flex h-full min-h-[280px] flex-col justify-end">
        <div className="mb-3 flex flex-wrap gap-2">
          {[genre, mood, world?.worldDate].filter(Boolean).map((meta) => (
            <span key={String(meta)} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur">
              {String(meta)}
            </span>
          ))}
        </div>
        <h2 className="max-w-2xl text-3xl font-bold leading-tight text-white">{title}</h2>
        <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-white/70">{description}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            <Play className="h-4 w-4 fill-current" />
            바로 시작
          </button>
          <Link
            href={`/my-works/${work.id}`}
            className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15"
          >
            상세 보기
          </Link>
        </div>
      </div>
    </section>
  )
}

function ContentRail({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const railRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartXRef = useRef(0)
  const scrollStartRef = useRef(0)
  const hasDraggedRef = useRef(false)
  const suppressClickRef = useRef(false)

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!railRef.current) return
    const scrollDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    railRef.current.scrollLeft += scrollDelta
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !railRef.current) return
    setIsDragging(true)
    hasDraggedRef.current = false
    dragStartXRef.current = event.clientX
    scrollStartRef.current = railRef.current.scrollLeft
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !railRef.current) return
    const dragDistance = event.clientX - dragStartXRef.current
    if (Math.abs(dragDistance) > 4) {
      hasDraggedRef.current = true
      suppressClickRef.current = true
    }
    railRef.current.scrollLeft = scrollStartRef.current - dragDistance
  }

  const stopDragging = () => {
    setIsDragging(false)
    if (suppressClickRef.current) {
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }
  }

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current && !hasDraggedRef.current) return
    event.preventDefault()
    event.stopPropagation()
    hasDraggedRef.current = false
  }

  return (
    <section className="space-y-3">
      <SectionHeading title={title} subtitle={subtitle} />
      <div
        ref={railRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        onClickCapture={handleClickCapture}
        className={cn(
          "-mx-4 overflow-x-auto px-4 pb-1 scrollbar-hide select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        <div className="flex gap-3">{children}</div>
      </div>
    </section>
  )
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-white/45">{subtitle}</p>}
    </div>
  )
}

function WorkPosterCard({ item, onStart, compact }: { item: ExploreWork; onStart: () => void; compact?: boolean }) {
  const { work, world, character } = item
  const genre = work.genre || world?.genre || character?.genre
  const description = work.tagline || work.coreSetting || world?.coreSetting || work.startScenario

  return (
    <article className={cn("group w-[178px] shrink-0", compact && "w-[160px]")}>
      <Link
        href={`/my-works/${work.id}`}
        className={cn(
          "block overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] transition active:scale-[0.98] group-hover:border-white/20",
        )}
      >
        <div
          className={cn(
            "relative aspect-[3/4] bg-cover bg-center",
            !work.coverImageUrl && getWorkCoverFallback(genre),
          )}
          style={work.coverImageUrl ? { backgroundImage: `url(${work.coverImageUrl})` } : undefined}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <p className="line-clamp-2 text-base font-bold leading-tight text-white">{work.title}</p>
            <p className="mt-1 text-[11px] text-white/60">{String(genre || "스토리")}</p>
          </div>
        </div>
        <div className="space-y-2 p-3">
          <p className="line-clamp-2 min-h-9 text-xs leading-relaxed text-white/58">{description}</p>
          <div className="flex items-center gap-2 text-[10px] text-white/38">
            <span>조회 {work.viewCount ?? scoreFromId(work.id)}</span>
            <span>대화 {work.chatCount ?? scoreFromId(work.characterId)}</span>
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={onStart}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-2 text-xs font-medium text-white transition hover:bg-white/[0.14]"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        시작
      </button>
    </article>
  )
}

function CharacterExploreCard({ item, onStart }: { item: ExploreCharacter; onStart: () => void }) {
  const { character, work } = item
  const detailHref = `/my-works?tab=characters&detailType=characters&detailId=${character.id}`

  return (
    <article className="w-[168px] shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-3">
      <Link href={detailHref} className="block w-full text-left transition active:scale-[0.98]">
        <div
          className={cn(
            "relative aspect-square overflow-hidden rounded-2xl bg-cover bg-center",
            !character.avatarUrl && !character.coverImageUrl && getCharacterImageFallback(character.genre),
          )}
          style={
            character.avatarUrl || character.coverImageUrl
              ? { backgroundImage: `url(${character.avatarUrl || character.coverImageUrl})` }
              : undefined
          }
        >
          {!character.avatarUrl && !character.coverImageUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-4xl">{character.emoji || character.name.slice(0, 1)}</div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <p className="text-base font-bold text-white">{character.name}</p>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <p className="truncate text-[11px] text-amber-100/70">{work?.title || "독립 캐릭터"}</p>
          <p className="line-clamp-1 text-xs font-medium text-white/80">{character.role || String(character.genre)}</p>
          <p className="line-clamp-2 min-h-8 text-xs leading-relaxed text-white/45">{character.summary}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={onStart}
        className="mt-3 flex w-full items-center justify-center rounded-full bg-white/[0.08] px-3 py-2 text-xs font-medium text-white transition hover:bg-white/[0.14]"
      >
        채팅 시작
      </button>
    </article>
  )
}

function GenreRecommendation({ works, onStart }: { works: ExploreWork[]; onStart: (item: ExploreWork) => void }) {
  const grouped = new Map<string, ExploreWork[]>()
  works.forEach((item) => {
    const genre = String(item.work.genre || item.world?.genre || item.character?.genre || "기타")
    if (!grouped.has(genre)) grouped.set(genre, [])
    grouped.get(genre)?.push(item)
  })

  return (
    <>
      {[...grouped.entries()].slice(0, 4).map(([genre, items]) => (
        <ContentRail key={genre} title={`${genre} 추천`}>
          {items.slice(0, 8).map((item) => (
            <WorkPosterCard key={item.work.id} item={item} onStart={() => onStart(item)} compact />
          ))}
        </ContentRail>
      ))}
    </>
  )
}

function EmptyExploreState() {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-12 text-center">
      <p className="text-base font-semibold text-white">아직 공개된 작품이 없어요.</p>
      <p className="mt-2 text-sm text-white/50">첫 작품을 만들어보세요.</p>
      <Link href="/create?mode=work" className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
        작품 만들기
      </Link>
    </div>
  )
}

function ExploreSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-80 animate-pulse rounded-[28px] bg-white/[0.06]" />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-72 w-[178px] shrink-0 animate-pulse rounded-3xl bg-white/[0.06]" />
        ))}
      </div>
    </div>
  )
}

function normalizeList(value: string | string[] | undefined | null): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean)
  if (!value) return []
  return value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean)
}

function filterWorks(items: ExploreWork[], query: string, genre: string) {
  const normalizedQuery = query.trim().toLowerCase()
  return items.filter((item) => {
    const itemGenre = String(item.work.genre || item.world?.genre || item.character?.genre || "")
    const genreMatched = genre === "전체" || itemGenre === genre
    if (!genreMatched) return false
    if (!normalizedQuery) return true
    const searchText = [
      item.work.title,
      item.work.tagline,
      item.work.coreSetting,
      item.work.mood,
      item.world?.name,
      item.world?.coreSetting,
      item.world?.mood,
      item.character?.name,
      item.character?.summary,
      ...normalizeList(item.work.majorLocations),
      ...normalizeList(item.work.majorEvents),
    ].join(" ").toLowerCase()
    return searchText.includes(normalizedQuery)
  })
}

function filterCharacters(items: ExploreCharacter[], query: string, genre: string) {
  const normalizedQuery = query.trim().toLowerCase()
  return items.filter((item) => {
    const itemGenre = String(item.character.genre || item.work?.genre || item.world?.genre || "")
    const genreMatched = genre === "전체" || itemGenre === genre
    if (!genreMatched) return false
    if (!normalizedQuery) return true
    const searchText = [
      item.character.name,
      item.character.summary,
      item.character.role,
      item.character.personality,
      item.work?.title,
      item.world?.name,
      ...item.character.tags,
    ].join(" ").toLowerCase()
    return searchText.includes(normalizedQuery)
  })
}

function sortWorks(items: ExploreWork[], sort: SortId) {
  return [...items].sort((a, b) => {
    if (sort === "name") return a.work.title.localeCompare(b.work.title, "ko")
    if (sort === "latest") return toTime(b.work.createdAt) - toTime(a.work.createdAt)
    if (sort === "updated") return toTime(b.work.updatedAt) - toTime(a.work.updatedAt)
    return getPopularity(b.work) - getPopularity(a.work)
  })
}

function sortCharacters(items: ExploreCharacter[], sort: SortId) {
  return [...items].sort((a, b) => {
    if (sort === "name") return a.character.name.localeCompare(b.character.name, "ko")
    if (sort === "latest") return toTime(b.character.createdAt) - toTime(a.character.createdAt)
    if (sort === "updated") return toTime(b.character.updatedAt || b.character.createdAt) - toTime(a.character.updatedAt || a.character.createdAt)
    return (b.character.chatCount ?? scoreFromId(b.character.id)) - (a.character.chatCount ?? scoreFromId(a.character.id))
  })
}

function getPopularity(work: StoryWork) {
  return (work.viewCount ?? scoreFromId(work.id)) + (work.likeCount ?? 0) * 3 + (work.chatCount ?? scoreFromId(work.characterId)) * 2
}

function toTime(value?: string) {
  if (!value) return 0
  if (value === "오늘") return Date.now()
  if (value === "어제") return Date.now() - 86_400_000
  const parsed = Date.parse(value.replace(/\./g, "-"))
  return Number.isNaN(parsed) ? 0 : parsed
}

function scoreFromId(value?: string) {
  return (value ?? "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 987
}

function getWorkCoverFallback(genre?: string | number) {
  const value = String(genre || "")
  if (value.includes("로맨스")) return "bg-[radial-gradient(circle_at_20%_10%,rgba(244,114,182,0.28),transparent_34%),linear-gradient(135deg,#2b0f1f,#080808_70%)]"
  if (value.includes("현대") || value.includes("회사")) return "bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.26),transparent_34%),linear-gradient(135deg,#111827,#080808_72%)]"
  if (value.includes("공포")) return "bg-[radial-gradient(circle_at_20%_10%,rgba(185,28,28,0.32),transparent_34%),linear-gradient(135deg,#160707,#050505_72%)]"
  if (value.includes("SF")) return "bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.26),transparent_34%),linear-gradient(135deg,#082f49,#050505_72%)]"
  return "bg-[radial-gradient(circle_at_20%_10%,rgba(129,140,248,0.30),transparent_34%),linear-gradient(135deg,#17122e,#080808_72%)]"
}

function getCharacterImageFallback(genre?: string | number) {
  return getWorkCoverFallback(genre)
}
