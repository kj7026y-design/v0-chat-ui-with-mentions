"use client"

import { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Copy,
  Edit3,
  MapPin,
  MoreVertical,
  Play,
  Plus,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  createId,
  defaultLibrary,
  defaultStoryProgressSettings,
  getStoryChatLibrary,
  saveStoryChatLibrary,
  type StoryCharacter,
  type StoryChatLibrary,
  type StoryPersona,
  type StoryWork,
  type StoryWorld,
} from "@/lib/storychat-storage"
import { PublicDetailView } from "@/components/my-works/public-detail-view"

type TabId = "scenarios" | "characters" | "personas" | "completed"
type DetailTarget =
  | { type: "scenarios"; id: string }
  | { type: "characters"; id: string }
  | { type: "personas"; id: string }
  | { type: "completed"; id: string }

interface Tab {
  id: TabId
  label: string
}

const tabs: Tab[] = [
  { id: "scenarios", label: "내 세계관" },
  { id: "characters", label: "내 캐릭터" },
  { id: "personas", label: "내 자아" },
  { id: "completed", label: "내 완성본" },
]

export default function MyWorksPage() {
  const [activeTab, setActiveTab] = useState<TabId>("scenarios")
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const [library, setLibrary] = useState<StoryChatLibrary>(defaultLibrary)
  const [detail, setDetail] = useState<DetailTarget | null>(null)
  const [editingWorldId, setEditingWorldId] = useState<string | null>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get("tab")
    if (isTabId(tabParam)) {
      setActiveTab(tabParam)
    }
    const detailType = params.get("detailType")
    const detailId = params.get("detailId")
    if (isTabId(detailType) && detailId) {
      setActiveTab(detailType)
      setDetail({ type: detailType, id: detailId } as DetailTarget)
    }
  }, [])

  useEffect(() => {
    const activeIndex = tabs.findIndex((tab) => tab.id === activeTab)
    const activeTabElement = tabRefs.current[activeIndex]
    if (activeTabElement) {
      setIndicatorStyle({
        left: activeTabElement.offsetLeft,
        width: activeTabElement.offsetWidth,
      })
    }
  }, [activeTab])

  useEffect(() => {
    const syncLibrary = () => setLibrary(getStoryChatLibrary())
    syncLibrary()
    window.addEventListener("storage", syncLibrary)
    window.addEventListener("storychat-library-updated", syncLibrary)
    return () => {
      window.removeEventListener("storage", syncLibrary)
      window.removeEventListener("storychat-library-updated", syncLibrary)
    }
  }, [])

  const persistLibrary = (nextLibrary: StoryChatLibrary) => {
    setLibrary(nextLibrary)
    saveStoryChatLibrary(nextLibrary)
  }

  const openDetail = (nextDetail: DetailTarget) => {
    setEditingWorldId(null)
    setDetail(nextDetail)
  }

  const handleTabClick = (tab: TabId) => {
    setActiveTab(tab)
    setEditingWorldId(null)
    window.history.replaceState(null, "", `/my-works?tab=${tab}`)
  }

  const handleEdit = (target: DetailTarget) => {
    if (target.type === "scenarios") {
      setEditingWorldId(target.id)
      return
    }
    handleRename(target)
  }

  const handleRename = (target: DetailTarget) => {
    const currentName = getTargetName(library, target)
    const label = target.type === "completed" ? "작품 제목" : "이름"
    const nextName = window.prompt(`${label}을 입력하세요.`, currentName)
    if (!nextName?.trim()) return

    persistLibrary(renameTarget(library, target, nextName.trim()))
    toast("수정했어요.")
  }

  const handleDelete = (target: DetailTarget) => {
    if (!window.confirm("삭제할까요?")) return

    persistLibrary(deleteTarget(library, target))
    setDetail((current) => (current?.type === target.type && current.id === target.id ? null : current))
    if (target.type === "scenarios") setEditingWorldId(null)
    toast("삭제했어요.")
  }

  const handleSaveWorld = (world: StoryWorld) => {
    persistLibrary({
      ...library,
      worlds: library.worlds.map((item) => item.id === world.id ? world : item),
    })
    setEditingWorldId(null)
    toast("세계관을 수정했어요.")
  }

  const handleCopy = (target: DetailTarget) => {
    persistLibrary(copyTarget(library, target))
    toast("복사했어요.")
  }

  const handleCreateClick = () => {
    const createModeByTab: Record<TabId, string> = {
      scenarios: "world",
      characters: "character",
      personas: "persona",
      completed: "work",
    }

    window.location.href = `/create?mode=${createModeByTab[activeTab]}`
  }

  const detailItem = detail ? getDetailItem(library, detail) : null

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-background">
      <header className="shrink-0 z-40 bg-background border-b border-border">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {detail ? (
              <button
                onClick={() => setDetail(null)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
                aria-label="목록으로 돌아가기"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
            ) : (
              <BookOpen className="w-5 h-5 text-muted-foreground" />
            )}
            <h1 className="text-lg font-bold text-foreground">
              {detail ? getTargetName(library, detail) : "내 작품"}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCreateClick}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
              aria-label={getCreateLabel(activeTab)}
              title={getCreateLabel(activeTab)}
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
            </button>
            {detail && detailItem && (
              <HeaderDetailMenu
                target={detail}
                onRename={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>

        {!detail && (
          <div className="relative px-2 overflow-x-auto scrollbar-hide">
            <div className="flex min-w-full sm:min-w-0">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[index] = el }}
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    "min-w-max flex-1 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                    activeTab === tab.id ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div
              className="absolute bottom-0 h-0.5 bg-foreground transition-all duration-300 ease-out"
              style={{
                left: indicatorStyle.left,
                width: indicatorStyle.width,
              }}
            />
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-5 py-6 pb-28 sm:pb-6">
        {detail && detailItem ? (
          editingWorldId && detail.type === "scenarios" ? (
            <WorldEditPanel
              world={detailItem as StoryWorld}
              onSave={handleSaveWorld}
              onCancel={() => setEditingWorldId(null)}
            />
          ) : (
            <DetailView
              detail={detail}
              item={detailItem}
              library={library}
              onRename={handleEdit}
              onDelete={handleDelete}
              onCopy={handleCopy}
            />
          )
        ) : (
          <>
            {activeTab === "scenarios" && (
              <ScenariosTab
                scenarios={library.worlds}
                onOpen={(id) => openDetail({ type: "scenarios", id })}
                onRename={handleEdit}
                onDelete={handleDelete}
                onCopy={handleCopy}
              />
            )}
            {activeTab === "characters" && (
              <CharactersTab
                characters={library.characters}
                onOpen={(id) => openDetail({ type: "characters", id })}
                onRename={handleEdit}
                onDelete={handleDelete}
                onCopy={handleCopy}
              />
            )}
            {activeTab === "personas" && (
              <PersonasTab
                personas={library.personas}
                onOpen={(id) => openDetail({ type: "personas", id })}
                onRename={handleEdit}
                onDelete={handleDelete}
                onCopy={handleCopy}
              />
            )}
            {activeTab === "completed" && (
              <CompletedTab
                works={library.works}
                library={library}
                onOpen={(id) => openDetail({ type: "completed", id })}
                onRename={handleEdit}
                onDelete={handleDelete}
                onCopy={handleCopy}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ScenariosTab({
  scenarios,
  onOpen,
  onRename,
  onDelete,
  onCopy,
}: {
  scenarios: StoryWorld[]
  onOpen: (id: string) => void
  onRename: (target: DetailTarget) => void
  onDelete: (target: DetailTarget) => void
  onCopy: (target: DetailTarget) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      {scenarios.map((scenario) => {
        const target: DetailTarget = { type: "scenarios", id: scenario.id }
        return (
          <div
            key={scenario.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(scenario.id)}
            onKeyDown={(event) => handleCardKeyDown(event, () => onOpen(scenario.id))}
            className={cn(
              "relative cursor-pointer overflow-visible rounded-xl bg-gradient-to-br border border-border text-left",
              scenario.coverColor,
            )}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{scenario.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{scenario.era}</span>
                  </div>
                </div>
                <ItemMenu target={target} onRename={onRename} onDelete={onDelete} onCopy={onCopy} />
              </div>
              <p className="text-sm text-muted-foreground mb-3">{scenario.coreSetting}</p>
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  주요 사건
                </span>
                <div className="flex flex-wrap gap-2">
                  {scenario.events.split(",").filter(Boolean).map((event, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{event.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CharactersTab({
  characters,
  onOpen,
  onRename,
  onDelete,
  onCopy,
}: {
  characters: StoryCharacter[]
  onOpen: (id: string) => void
  onRename: (target: DetailTarget) => void
  onDelete: (target: DetailTarget) => void
  onCopy: (target: DetailTarget) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {characters.map((character) => {
        const target: DetailTarget = { type: "characters", id: character.id }
        return (
          <div
            key={character.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(character.id)}
            onKeyDown={(event) => handleCardKeyDown(event, () => onOpen(character.id))}
            className="relative flex min-h-[140px] cursor-pointer flex-col items-center p-4 bg-card rounded-xl border border-border text-center"
          >
            <div className="absolute right-2 top-2">
              <ItemMenu target={target} onRename={onRename} onDelete={onDelete} onCopy={onCopy} />
            </div>
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
              <span className="text-2xl">{character.emoji}</span>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{character.name}</h3>
            <p className="mb-2 line-clamp-2 text-[10px] text-muted-foreground">{character.summary}</p>
            <div className="flex flex-wrap justify-center gap-1">
              {character.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 text-[9px] bg-muted text-foreground rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PersonasTab({
  personas,
  onOpen,
  onRename,
  onDelete,
  onCopy,
}: {
  personas: StoryPersona[]
  onOpen: (id: string) => void
  onRename: (target: DetailTarget) => void
  onDelete: (target: DetailTarget) => void
  onCopy: (target: DetailTarget) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {personas.map((persona) => {
        const target: DetailTarget = { type: "personas", id: persona.id }
        return (
          <div
            key={persona.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(persona.id)}
            onKeyDown={(event) => handleCardKeyDown(event, () => onOpen(persona.id))}
            className="cursor-pointer p-4 bg-card rounded-xl border border-border text-left"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground mb-1">{persona.name}</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  {persona.age}세 / {persona.role}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">{persona.summary}</p>
              </div>
              <ItemMenu target={target} onRename={onRename} onDelete={onDelete} onCopy={onCopy} />
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <span className="text-[10px] text-muted-foreground">생성일: {persona.createdAt}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CompletedTab({
  works,
  library,
  onOpen,
  onRename,
  onDelete,
  onCopy,
}: {
  works: StoryWork[]
  library: StoryChatLibrary
  onOpen: (id: string) => void
  onRename: (target: DetailTarget) => void
  onDelete: (target: DetailTarget) => void
  onCopy: (target: DetailTarget) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {works.map((work) => (
        <CompletedWorkCard
          key={work.id}
          work={work}
          library={library}
          onOpen={onOpen}
          onRename={onRename}
          onDelete={onDelete}
          onCopy={onCopy}
        />
      ))}
      {works.length === 0 && <EmptyState />}
    </div>
  )
}

function CompletedWorkCard({
  work,
  library,
  onOpen,
  onRename,
  onDelete,
  onCopy,
}: {
  work: StoryWork
  library: StoryChatLibrary
  onOpen: (id: string) => void
  onRename: (target: DetailTarget) => void
  onDelete: (target: DetailTarget) => void
  onCopy: (target: DetailTarget) => void
}) {
  const character = library.characters.find((item) => item.id === work.characterId)
  const world = library.worlds.find((item) => item.id === work.worldId)
  const target: DetailTarget = { type: "completed", id: work.id }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(work.id)}
      onKeyDown={(event) => handleCardKeyDown(event, () => onOpen(work.id))}
      className="cursor-pointer bg-card rounded-xl border border-border overflow-visible text-left"
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xl">{character?.emoji ?? "✨"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{character?.name ?? "캐릭터"}</span>
              <span className="text-muted-foreground">+</span>
              <span className="text-sm text-muted-foreground">{world?.name ?? "세계관"}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{work.title}</p>
          </div>
          <ItemMenu target={target} onRename={onRename} onDelete={onDelete} onCopy={onCopy} />
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">완성본</span>
            <span className="text-xs text-muted-foreground">{work.updatedAt}</span>
          </div>
          <Link
            href={`/chat/${work.id}`}
            onClick={(event) => event.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/80 rounded-lg transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-foreground" />
            <span className="text-xs font-medium text-foreground">대화 이어가기</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

function ItemMenu({
  target,
  onRename,
  onDelete,
  onCopy,
}: {
  target: DetailTarget
  onRename: (target: DetailTarget) => void
  onDelete: (target: DetailTarget) => void
  onCopy: (target: DetailTarget) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
        aria-label="더보기"
      >
        <MoreVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(event) => {
              event.stopPropagation()
              setOpen(false)
            }}
          />
          <div className="absolute right-0 top-10 z-50 bg-popover rounded-xl shadow-xl py-1.5 min-w-[140px] border border-border">
            <MenuButton
              icon={Edit3}
              label="수정"
              onClick={() => {
                setOpen(false)
                onRename(target)
              }}
            />
            <MenuButton
              icon={Copy}
              label="복사"
              onClick={() => {
                setOpen(false)
                onCopy(target)
              }}
            />
            <div className="my-1 border-t border-border" />
            <MenuButton
              icon={Trash2}
              label="삭제"
              destructive
              onClick={() => {
                setOpen(false)
                onDelete(target)
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}

function HeaderDetailMenu({
  target,
  onRename,
  onDelete,
}: {
  target: DetailTarget
  onRename: (target: DetailTarget) => void
  onDelete: (target: DetailTarget) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
        aria-label="상세 메뉴"
      >
        <MoreVertical className="w-5 h-5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(event) => {
              event.stopPropagation()
              setOpen(false)
            }}
          />
          <div className="absolute right-0 top-10 z-50 min-w-[140px] rounded-xl border border-border bg-popover py-1.5 shadow-xl">
            <MenuButton
              icon={Edit3}
              label="수정"
              onClick={() => {
                setOpen(false)
                onRename(target)
              }}
            />
            <div className="my-1 border-t border-border" />
            <MenuButton
              icon={Trash2}
              label="삭제"
              destructive
              onClick={() => {
                setOpen(false)
                onDelete(target)
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}

function MenuButton({
  icon: Icon,
  label,
  destructive,
  onClick,
}: {
  icon: typeof Edit3
  label: string
  destructive?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={cn(
        "w-full px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2",
        destructive
          ? "font-semibold text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-950/60 dark:hover:text-red-100"
          : "text-popover-foreground",
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

function DetailView({
  detail,
  item,
  library,
}: {
  detail: DetailTarget
  item: StoryCharacter | StoryWorld | StoryPersona | StoryWork
  library: StoryChatLibrary
  onRename: (target: DetailTarget) => void
  onDelete: (target: DetailTarget) => void
  onCopy: (target: DetailTarget) => void
}) {
  return (
    <div className="max-w-full space-y-4 overflow-x-hidden">
      <PublicDetailView detail={detail} item={item} library={library} />
    </div>
  )
}

function WorldEditPanel({
  world,
  onSave,
  onCancel,
}: {
  world: StoryWorld
  onSave: (world: StoryWorld) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<StoryWorld>({
    ...world,
    storyProgressSettings: world.storyProgressSettings ?? defaultStoryProgressSettings(),
  })

  const update = <K extends keyof StoryWorld>(key: K, value: StoryWorld[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.name.trim() || !String(draft.genre).trim() || !draft.coreSetting.trim()) {
      window.alert("세계관 이름, 장르, 핵심 설정을 입력해 주세요.")
      return
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      genre: String(draft.genre).trim(),
      era: draft.era.trim(),
      coreSetting: draft.coreSetting.trim(),
      mood: draft.mood.trim(),
      worldDate: draft.worldDate.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-4 pb-10">
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-4">
          <h2 className="text-base font-bold text-foreground">세계관 수정</h2>
          <p className="mt-1 text-xs text-muted-foreground">세계관의 기본 정보와 공개 소개에 쓰이는 설정을 수정합니다.</p>
        </div>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <WorldEditField label="세계관 이름">
              <input
                value={draft.name}
                onChange={(event) => update("name", event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none"
              />
            </WorldEditField>
            <WorldEditField label="장르">
              <input
                value={String(draft.genre)}
                onChange={(event) => update("genre", event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none"
              />
            </WorldEditField>
          </div>
          <WorldEditField label="시대/배경">
            <input
              value={draft.era}
              onChange={(event) => update("era", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none"
            />
          </WorldEditField>
          <WorldEditField label="핵심 설정">
            <textarea
              value={draft.coreSetting}
              onChange={(event) => update("coreSetting", event.target.value)}
              className="min-h-[92px] w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none"
            />
          </WorldEditField>
          <div className="grid gap-3 sm:grid-cols-2">
            <WorldEditField label="주요 장소">
              <textarea
                value={draft.places}
                onChange={(event) => update("places", event.target.value)}
                className="min-h-[82px] w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none"
              />
            </WorldEditField>
            <WorldEditField label="주요 사건">
              <textarea
                value={draft.events}
                onChange={(event) => update("events", event.target.value)}
                className="min-h-[82px] w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none"
              />
            </WorldEditField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <WorldEditField label="분위기">
              <input
                value={draft.mood}
                onChange={(event) => update("mood", event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none"
              />
            </WorldEditField>
            <WorldEditField label="세계관 날짜">
              <input
                value={draft.worldDate}
                onChange={(event) => update("worldDate", event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none"
              />
            </WorldEditField>
          </div>
          <WorldEditField label="금지 설정">
            <textarea
              value={draft.forbiddenSettings}
              onChange={(event) => update("forbiddenSettings", event.target.value)}
              className="min-h-[82px] w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none"
            />
          </WorldEditField>
        </div>
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          취소
        </button>
        <button
          type="submit"
          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          저장
        </button>
      </div>
    </form>
  )
}

function WorldEditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function WorldDetail({ world }: { world: StoryWorld }) {
  return (
    <DetailCard title={world.name} subtitle={`${world.genre} · ${world.era}`}>
      <DetailRow label="핵심 설정" value={world.coreSetting} />
      <DetailRow label="주요 장소" value={world.places} />
      <DetailRow label="주요 사건" value={world.events} />
      <DetailRow label="분위기" value={world.mood} />
      <DetailRow label="현재 챕터" value={world.currentChapter} />
      <DetailRow label="현재 목표" value={world.currentGoal} />
      <DetailRow label="세계관 날짜" value={world.worldDate} />
      <DetailRow label="진행도" value={`${world.progress}%`} />
      <DetailRow label="금지 설정" value={world.forbiddenSettings} />
    </DetailCard>
  )
}

function CharacterDetail({ character }: { character: StoryCharacter }) {
  return (
    <DetailCard title={character.name} subtitle={`${character.emoji} ${character.genre}`}>
      <DetailRow label="한 줄 소개" value={character.summary} />
      <DetailRow label="성격" value={character.personality} />
      <DetailRow label="말투 규칙" value={character.speechStyle} />
      <DetailRow label="기본 관계" value={character.relationship} />
      <DetailRow label="비밀 설정" value={character.secret} />
      <DetailRow label="금지 전개" value={character.forbiddenDevelopments} />
      <DetailRow label="기본 시작 상황" value={character.defaultStartScenario} />
      <DetailRow label="시작 옵션" value={character.startOptions.filter(Boolean).join(", ")} />
    </DetailCard>
  )
}

function PersonaDetail({ persona }: { persona: StoryPersona }) {
  return (
    <DetailCard title={persona.name} subtitle={`${persona.age}세 · ${persona.role}`}>
      <DetailRow label="한 줄 소개" value={persona.summary} />
      <DetailRow label="성격" value={persona.personality} />
      <DetailRow label="말투" value={persona.speechStyle} />
      <DetailRow label="외형" value={persona.appearance} />
      <DetailRow label="관계" value={persona.relationship} />
      <DetailRow label="비밀 설정" value={persona.secret} />
      <DetailRow label="선호 전개" value={persona.preferredDevelopments} />
      <DetailRow label="금지 전개" value={persona.forbiddenDevelopments} />
    </DetailCard>
  )
}

function WorkDetail({ work, library }: { work: StoryWork; library: StoryChatLibrary }) {
  const character = library.characters.find((item) => item.id === work.characterId)
  const world = library.worlds.find((item) => item.id === work.worldId)
  const persona = library.personas.find((item) => item.id === work.personaId)

  return (
    <DetailCard title={work.title} subtitle="완성본">
      <DetailRow label="캐릭터" value={character?.name ?? "없음"} />
      <DetailRow label="세계관" value={world?.name ?? "없음"} />
      <DetailRow label="자아" value={persona?.name ?? "없음"} />
      <DetailRow label="첫 시작 설정" value={work.startScenario} />
      <DetailRow label="생성일" value={work.createdAt} />
      <DetailRow label="수정일" value={work.updatedAt} />
      <Link
        href={`/chat/${work.id}`}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        <Play className="w-4 h-4" />
        대화 이어가기
      </Link>
    </DetailCard>
  )
}

function DetailCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg bg-secondary px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value || "-"}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4">
        <BookOpen className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm">아직 완성본이 없습니다</p>
      <p className="text-muted-foreground text-xs mt-1">캐릭터와 세계관을 조합해 시작하세요</p>
    </div>
  )
}

function getCreateLabel(tab: TabId) {
  if (tab === "scenarios") return "새 세계관"
  if (tab === "characters") return "새 캐릭터"
  if (tab === "personas") return "새 자아"
  return "새 완성본"
}

function isTabId(tab: string | null): tab is TabId {
  return tab === "scenarios" || tab === "characters" || tab === "personas" || tab === "completed"
}

function handleCardKeyDown(event: React.KeyboardEvent, onOpen: () => void) {
  if (event.key !== "Enter" && event.key !== " ") return
  event.preventDefault()
  onOpen()
}

function getDetailItem(library: StoryChatLibrary, target: DetailTarget) {
  if (target.type === "scenarios") return library.worlds.find((item) => item.id === target.id)
  if (target.type === "characters") return library.characters.find((item) => item.id === target.id)
  if (target.type === "personas") return library.personas.find((item) => item.id === target.id)
  return library.works.find((item) => item.id === target.id)
}

function getTargetName(library: StoryChatLibrary, target: DetailTarget) {
  const item = getDetailItem(library, target)
  if (!item) return "상세보기"
  if (target.type === "completed") return (item as StoryWork).title
  return (item as StoryCharacter | StoryWorld | StoryPersona).name
}

function renameTarget(library: StoryChatLibrary, target: DetailTarget, name: string): StoryChatLibrary {
  if (target.type === "scenarios") {
    return {
      ...library,
      worlds: library.worlds.map((item) => item.id === target.id ? { ...item, name } : item),
    }
  }
  if (target.type === "characters") {
    return {
      ...library,
      characters: library.characters.map((item) => item.id === target.id ? { ...item, name } : item),
    }
  }
  if (target.type === "personas") {
    return {
      ...library,
      personas: library.personas.map((item) => item.id === target.id ? { ...item, name } : item),
    }
  }
  return {
    ...library,
    works: library.works.map((item) => item.id === target.id ? { ...item, title: name, updatedAt: "오늘" } : item),
  }
}

function deleteTarget(library: StoryChatLibrary, target: DetailTarget): StoryChatLibrary {
  if (target.type === "scenarios") {
    return {
      ...library,
      worlds: library.worlds.filter((item) => item.id !== target.id),
      works: library.works.filter((item) => item.worldId !== target.id),
    }
  }
  if (target.type === "characters") {
    return {
      ...library,
      characters: library.characters.filter((item) => item.id !== target.id),
      works: library.works.filter((item) => item.characterId !== target.id),
    }
  }
  if (target.type === "personas") {
    return {
      ...library,
      personas: library.personas.filter((item) => item.id !== target.id),
      works: library.works.filter((item) => item.personaId !== target.id),
    }
  }
  return {
    ...library,
    works: library.works.filter((item) => item.id !== target.id),
  }
}

function copyTarget(library: StoryChatLibrary, target: DetailTarget): StoryChatLibrary {
  const suffix = " 복사본"
  if (target.type === "scenarios") {
    const item = library.worlds.find((world) => world.id === target.id)
    if (!item) return library
    return {
      ...library,
      worlds: [{ ...item, id: createId("world"), name: `${item.name}${suffix}`, createdAt: "오늘" }, ...library.worlds],
    }
  }
  if (target.type === "characters") {
    const item = library.characters.find((character) => character.id === target.id)
    if (!item) return library
    return {
      ...library,
      characters: [{ ...item, id: createId("character"), name: `${item.name}${suffix}`, createdAt: "오늘" }, ...library.characters],
    }
  }
  if (target.type === "personas") {
    const item = library.personas.find((persona) => persona.id === target.id)
    if (!item) return library
    return {
      ...library,
      personas: [{ ...item, id: createId("persona"), name: `${item.name}${suffix}`, createdAt: "오늘" }, ...library.personas],
    }
  }
  const item = library.works.find((work) => work.id === target.id)
  if (!item) return library
  return {
    ...library,
    works: [{ ...item, id: createId("work"), title: `${item.title}${suffix}`, createdAt: new Date().toISOString(), updatedAt: "오늘" }, ...library.works],
  }
}
