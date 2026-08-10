"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Copy,
  Edit3,
  Globe,
  MapPin,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Smile,
  Trash2,
  Users,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { AlertModal, ConfirmModal, PromptModal } from "@/components/ui/app-modal"
import { cn } from "@/lib/utils"
import {
  createId,
  defaultLibrary,
  defaultStoryProgressSettings,
  getStoryChatLibrary,
  saveStoryChatLibrary,
  type StoryCharacter,
  type StoryCharacterGender,
  type StoryChatLibrary,
  type StoryPersona,
  type StoryWork,
  type StoryWorld,
} from "@/lib/storychat-storage"
import { PublicDetailView } from "@/components/my-works/public-detail-view"
import { ImageUploadField } from "@/components/create/image-upload-field"
import { useSafeBack } from "@/hooks/use-safe-back"
import {
  getCurrentAppPath,
  normalizeInternalNavigationTarget,
  withReturnTo,
} from "@/lib/safe-navigation"
import { useAccountSession } from "@/hooks/use-account-session"
import { canEditStoryWork, getStoryWorkAuthor } from "@/lib/work-permissions"
import {
  createStoryWorkInDatabase,
  deleteStoryWorkFromDatabase,
  requireStoryWorkBundle,
  syncStoryWorksFromDatabase,
} from "@/lib/story-work-client"
import { mergeStoryWorkBundles } from "@/lib/story-work-bundle"

type TabId = "completed" | "characters" | "scenarios" | "personas"
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
  { id: "completed", label: "내 작품" },
  { id: "characters", label: "내 캐릭터" },
  { id: "scenarios", label: "내 세계관" },
  { id: "personas", label: "내 자아" },
]

export default function MyWorksPage() {
  return (
    <Suspense fallback={<div className="h-full bg-background" />}>
      <MyWorksContent />
    </Suspense>
  )
}

function MyWorksContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, isLoading: isSessionLoading } = useAccountSession()
  const [activeTab, setActiveTab] = useState<TabId>("completed")
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const [library, setLibrary] = useState<StoryChatLibrary>(defaultLibrary)
  const [detail, setDetail] = useState<DetailTarget | null>(null)
  const [editingWorldId, setEditingWorldId] = useState<string | null>(null)
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null)
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<DetailTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DetailTarget | null>(null)
  const [hasReturnDestination, setHasReturnDestination] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const goBack = useSafeBack(detail ? `/my-works?tab=${detail.type}` : "/")

  useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (isTabId(tabParam)) {
      setActiveTab(tabParam)
    }
    const detailType = searchParams.get("detailType")
    const detailId = searchParams.get("detailId")
    if (isTabId(detailType) && detailId) {
      setActiveTab(detailType)
      setDetail({ type: detailType, id: detailId } as DetailTarget)
    } else {
      setDetail(null)
    }
    setHasReturnDestination(Boolean(
      normalizeInternalNavigationTarget(searchParams.get("returnTo")),
    ))
  }, [searchParams])

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
    void syncStoryWorksFromDatabase()
      .then(setLibrary)
      .catch((error) => console.warn("[story works sync failed]", error))
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

  const canManageWork = (work?: StoryWork | null) =>
    !isSessionLoading && canEditStoryWork(work, session)

  const openDetail = (nextDetail: DetailTarget) => {
    setEditingWorldId(null)
    setEditingCharacterId(null)
    setEditingPersonaId(null)
    setDetail(nextDetail)
    const detailPath = `/my-works?tab=${nextDetail.type}&detailType=${nextDetail.type}&detailId=${encodeURIComponent(nextDetail.id)}`
    router.push(withReturnTo(detailPath, getCurrentAppPath()))
  }

  const handleTabClick = (tab: TabId) => {
    setActiveTab(tab)
    setEditingWorldId(null)
    setEditingCharacterId(null)
    setEditingPersonaId(null)
    setOpenMenuId(null)
    const returnTo = normalizeInternalNavigationTarget(searchParams.get("returnTo"))
    const tabPath = `/my-works?tab=${tab}`
    router.replace(returnTo ? withReturnTo(tabPath, returnTo) : tabPath)
  }

  const handleEdit = (target: DetailTarget) => {
    setEditingWorldId(null)
    setEditingCharacterId(null)
    setEditingPersonaId(null)

    if (target.type === "scenarios") {
      setDetail(target)
      setEditingWorldId(target.id)
      return
    }
    if (target.type === "characters") {
      setDetail(target)
      setEditingCharacterId(target.id)
      return
    }
    if (target.type === "personas") {
      setDetail(target)
      setEditingPersonaId(target.id)
      return
    }
    if (target.type === "completed") {
      const work = library.works.find((item) => item.id === target.id)
      if (!canManageWork(work)) {
        toast.error("작품 수정 권한이 없습니다.")
        return
      }
      router.push(withReturnTo(`/my-works/${target.id}/edit`, getCurrentAppPath()))
      return
    }
    handleRename(target)
  }

  const handleRename = (target: DetailTarget) => {
    setRenameTarget(target)
  }

  const handleDelete = (target: DetailTarget) => {
    if (target.type === "completed") {
      const work = library.works.find((item) => item.id === target.id)
      if (!canManageWork(work)) {
        toast.error("작품 삭제 권한이 없습니다.")
        return
      }
    }
    setDeleteTarget(target)
  }

  const handleSaveWorld = (world: StoryWorld) => {
    persistLibrary({
      ...library,
      worlds: library.worlds.map((item) => item.id === world.id ? world : item),
    })
    setEditingWorldId(null)
    toast("세계관을 수정했어요.")
  }

  const handleSaveCharacter = (character: StoryCharacter) => {
    persistLibrary({
      ...library,
      characters: library.characters.map((item) => item.id === character.id ? character : item),
    })
    setEditingCharacterId(null)
    toast("캐릭터를 수정했어요.")
  }

  const handleSavePersona = (persona: StoryPersona) => {
    persistLibrary({
      ...library,
      personas: library.personas.map((item) => item.id === persona.id ? persona : item),
    })
    setEditingPersonaId(null)
    toast("자아를 수정했어요.")
  }

  const handleCopy = async (target: DetailTarget) => {
    const author = getStoryWorkAuthor(session)
    if (target.type === "completed" && !author) {
      toast.error("로그인한 사용자만 작품을 복사할 수 있습니다.")
      return
    }
    let nextLibrary = copyTarget(library, target, author ?? undefined)
    if (target.type === "completed") {
      const copiedWork = nextLibrary.works[0]
      try {
        const savedBundle = await createStoryWorkInDatabase(
          requireStoryWorkBundle(nextLibrary, copiedWork.id),
        )
        nextLibrary = mergeStoryWorkBundles(nextLibrary, [savedBundle])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "작품을 DB에 저장하지 못했어요.")
        return
      }
    }
    persistLibrary(nextLibrary)
    toast("복사했어요.")
  }

  const handleCreateClick = () => {
    const createModeByTab: Record<TabId, string> = {
      scenarios: "world",
      characters: "character",
      personas: "persona",
      completed: "work",
    }

    router.push(withReturnTo(`/create?mode=${createModeByTab[activeTab]}`, getCurrentAppPath()))
  }

  const detailItem = detail ? getDetailItem(library, detail) : null
  const renameLabel = renameTarget?.type === "completed" ? "작품 제목" : "이름"

  return (
    <div
      className="mx-auto flex min-h-screen max-w-md flex-col bg-white pb-24 dark:bg-neutral-950"
      onClick={() => openMenuId && setOpenMenuId(null)}
    >
      {/* 헤더 - detail이 없을 때만 목록 헤더 및 탭 바 표시 */}
      {!detail && (
        <div className="px-5 pt-4">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={goBack}
                aria-label="뒤로 가기"
                className="-ml-1 p-1 text-neutral-900 dark:text-neutral-100"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                내 보관함
              </h1>
            </div>
            <button
              type="button"
              onClick={handleCreateClick}
              aria-label="새로 만들기"
              className="p-1 text-neutral-900 dark:text-neutral-100"
            >
              <Plus size={22} />
            </button>
          </div>

          {/* 탭 - 작품 → 캐릭터 → 세계관 → 자아 순서 */}
          <div className="mb-5 flex gap-5 border-b border-neutral-100 dark:border-neutral-900">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabClick(t.id)}
                className={`pb-3 text-sm ${
                  activeTab === t.id
                    ? "border-b-2 border-neutral-900 font-semibold text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                    : "text-neutral-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={cn("flex-1", !detail && "px-5")}>
        {detail && detailItem ? (
          editingWorldId && detail.type === "scenarios" ? (
            <div className="px-5 pt-4">
              <WorldEditPanel
                world={detailItem as StoryWorld}
                onSave={handleSaveWorld}
                onCancel={() => setEditingWorldId(null)}
              />
            </div>
          ) : editingCharacterId && detail.type === "characters" ? (
            <div className="px-5 pt-4">
              <CharacterEditPanel
                character={detailItem as StoryCharacter}
                onSave={handleSaveCharacter}
                onCancel={() => setEditingCharacterId(null)}
              />
            </div>
          ) : editingPersonaId && detail.type === "personas" ? (
            <div className="px-5 pt-4">
              <PersonaEditPanel
                persona={detailItem as StoryPersona}
                onSave={handleSavePersona}
                onCancel={() => setEditingPersonaId(null)}
              />
            </div>
          ) : (
            <DetailView
              detail={detail}
              item={detailItem}
              library={library}
              onEdit={handleEdit}
              onRename={handleEdit}
              onDelete={handleDelete}
              onCopy={handleCopy}
            />
          )
        ) : (
          <>
            {activeTab === "completed" && (
              <CompletedTab
                works={library.works}
                library={library}
                openMenuId={openMenuId}
                onToggleMenu={(id) => setOpenMenuId((current) => (current === id ? null : id))}
                onOpenDetail={(id) => openDetail({ type: "completed", id })}
                canManageWork={canManageWork}
                onEdit={(id) => handleEdit({ type: "completed", id })}
                onDelete={(id) => handleDelete({ type: "completed", id })}
              />
            )}
            {activeTab === "characters" && (
              <CharactersTab
                characters={library.characters}
                openMenuId={openMenuId}
                onToggleMenu={(id) => setOpenMenuId((current) => (current === id ? null : id))}
                onOpenDetail={(id) => openDetail({ type: "characters", id })}
                onEdit={(id) => router.push(`/create?mode=character&editId=${id}`)}
                onDelete={(id) => handleDelete({ type: "characters", id })}
              />
            )}
            {activeTab === "scenarios" && (
              <ScenariosTab
                scenarios={library.worlds}
                openMenuId={openMenuId}
                onToggleMenu={(id) => setOpenMenuId((current) => (current === id ? null : id))}
                onOpenDetail={(id) => openDetail({ type: "scenarios", id })}
                onEdit={(id) => router.push(`/create?mode=world&editId=${id}`)}
                onDelete={(id) => handleDelete({ type: "scenarios", id })}
              />
            )}
            {activeTab === "personas" && (
              <PersonasTab
                personas={library.personas}
                openMenuId={openMenuId}
                onToggleMenu={(id) => setOpenMenuId((current) => (current === id ? null : id))}
                onOpenDetail={(id) => openDetail({ type: "personas", id })}
                onEdit={(id) => router.push(`/create?mode=persona&editId=${id}`)}
                onDelete={(id) => handleDelete({ type: "personas", id })}
              />
            )}
          </>
        )}
      </div>

      <PromptModal
        open={Boolean(renameTarget)}
        title="이름 수정"
        message={`${renameLabel}을 입력하세요.`}
        defaultValue={renameTarget ? getTargetName(library, renameTarget) : ""}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null)
        }}
        onConfirm={(nextName) => {
          if (!renameTarget) return
          persistLibrary(renameTargetItem(library, renameTarget, nextName))
          setRenameTarget(null)
          toast("수정했어요.")
        }}
      />
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="삭제"
        message="삭제할까요?"
        confirmText="삭제"
        destructive
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={async () => {
          if (!deleteTarget) return
          if (deleteTarget.type === "completed") {
            const work = library.works.find((item) => item.id === deleteTarget.id)
            if (!canManageWork(work)) {
              setDeleteTarget(null)
              toast.error("작품 삭제 권한이 없습니다.")
              return
            }
            if (!defaultLibrary.works.some((item) => item.id === work?.id)) {
              try {
                await deleteStoryWorkFromDatabase(deleteTarget.id)
              } catch (error) {
                setDeleteTarget(null)
                toast.error(error instanceof Error ? error.message : "작품을 DB에서 삭제하지 못했어요.")
                return
              }
            }
          } else {
            const relatedWorks = getRelatedWorks(library, deleteTarget)
            const databaseWorks = relatedWorks.filter((work) =>
              !defaultLibrary.works.some((defaultWork) => defaultWork.id === work.id),
            )
            if (databaseWorks.some((work) => !canManageWork(work))) {
              setDeleteTarget(null)
              toast.error("수정 권한이 없는 작품에서 사용 중이라 삭제할 수 없습니다.")
              return
            }
            try {
              await Promise.all(databaseWorks.map((work) => deleteStoryWorkFromDatabase(work.id)))
            } catch (error) {
              setDeleteTarget(null)
              toast.error(error instanceof Error ? error.message : "연결 작품을 DB에서 삭제하지 못했어요.")
              return
            }
          }
          persistLibrary(deleteTargetItem(library, deleteTarget))
          setDetail((current) => (current?.type === deleteTarget.type && current.id === deleteTarget.id ? null : current))
          if (deleteTarget.type === "scenarios") setEditingWorldId(null)
          if (deleteTarget.type === "characters") setEditingCharacterId(null)
          setDeleteTarget(null)
          toast("삭제했어요.")
        }}
      />
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
  const [alertOpen, setAlertOpen] = useState(false)

  const update = <K extends keyof StoryWorld>(key: K, value: StoryWorld[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.name.trim() || !String(draft.genre).trim() || !draft.coreSetting.trim()) {
      setAlertOpen(true)
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
              <input value={draft.name} onChange={(event) => update("name", event.target.value)} className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none" />
            </WorldEditField>
            <WorldEditField label="장르">
              <input value={String(draft.genre)} onChange={(event) => update("genre", event.target.value)} className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none" />
            </WorldEditField>
          </div>
          <WorldEditField label="시대/배경">
            <input value={draft.era} onChange={(event) => update("era", event.target.value)} className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none" />
          </WorldEditField>
          <WorldEditField label="핵심 설정">
            <textarea value={draft.coreSetting} onChange={(event) => update("coreSetting", event.target.value)} className="field-sizing-content max-h-[220px] min-h-[92px] w-full resize-y overflow-y-auto rounded-md border border-border bg-input px-3 py-2 text-sm outline-none" />
          </WorldEditField>
          <div className="grid gap-3 sm:grid-cols-2">
            <WorldEditField label="주요 장소">
              <textarea value={draft.places} onChange={(event) => update("places", event.target.value)} className="field-sizing-content max-h-[220px] min-h-[82px] w-full resize-y overflow-y-auto rounded-md border border-border bg-input px-3 py-2 text-sm outline-none" />
            </WorldEditField>
            <WorldEditField label="주요 사건">
              <textarea value={draft.events} onChange={(event) => update("events", event.target.value)} className="field-sizing-content max-h-[220px] min-h-[82px] w-full resize-y overflow-y-auto rounded-md border border-border bg-input px-3 py-2 text-sm outline-none" />
            </WorldEditField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <WorldEditField label="분위기">
              <input value={draft.mood} onChange={(event) => update("mood", event.target.value)} className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none" />
            </WorldEditField>
            <WorldEditField label="세계관 날짜">
              <input value={draft.worldDate} onChange={(event) => update("worldDate", event.target.value)} className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none" />
            </WorldEditField>
          </div>
          <WorldEditField label="금지 설정">
            <textarea value={draft.forbiddenSettings} onChange={(event) => update("forbiddenSettings", event.target.value)} className="field-sizing-content max-h-[220px] min-h-[82px] w-full resize-y overflow-y-auto rounded-md border border-border bg-input px-3 py-2 text-sm outline-none" />
          </WorldEditField>
          <ImageUploadField
            label="대표 이미지"
            value={draft.coverImageUrl ?? ""}
            onChange={(url) => update("coverImageUrl", url ?? "")}
          />
        </div>
      </section>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">취소</button>
        <button type="submit" className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">저장</button>
      </div>
      <AlertModal open={alertOpen} message="세계관 이름, 장르, 핵심 설정을 입력해 주세요." onOpenChange={setAlertOpen} />
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

function CharacterEditPanel({
  character,
  onSave,
  onCancel,
}: {
  character: StoryCharacter
  onSave: (character: StoryCharacter) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<StoryCharacter>({
    ...character,
    gender: character.gender ?? "unknown",
    genderCustom: character.genderCustom ?? "",
    tags: normalizeTagList(character.tags),
    visualTags: normalizeTagList(character.visualTags),
    relationshipTags: normalizeTagList(character.relationshipTags),
  })
  const [alertOpen, setAlertOpen] = useState(false)

  const update = <K extends keyof StoryCharacter>(key: K, value: StoryCharacter[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const handleGenderChange = (gender: StoryCharacterGender) => {
    setDraft((current) => ({
      ...current,
      gender,
      genderCustom: gender === "custom" ? current.genderCustom ?? "" : "",
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.name.trim() || !draft.age?.trim() || !draft.role?.trim() || !draft.summary.trim() || !draft.personality.trim()) {
      setAlertOpen(true)
      return
    }

    onSave({
      ...draft,
      name: draft.name.trim(),
      age: draft.age?.trim(),
      role: draft.role?.trim(),
      residence: draft.residence?.trim(),
      appearance: draft.appearance?.trim(),
      summary: draft.summary.trim(),
      personality: draft.personality.trim(),
      speechStyle: draft.speechStyle.trim(),
      relationship: draft.relationship.trim(),
      secret: draft.secret.trim(),
      forbiddenDevelopments: draft.forbiddenDevelopments.trim(),
      gender: draft.gender ?? "unknown",
      genderCustom: draft.gender === "custom" ? draft.genderCustom?.trim() ?? "" : "",
      tags: normalizeTagList(draft.tags),
      visualTags: normalizeTagList(draft.visualTags),
      relationshipTags: normalizeTagList(draft.relationshipTags),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-4 pb-10">
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-4">
          <h2 className="text-base font-bold text-foreground">캐릭터 수정</h2>
          <p className="mt-1 text-xs text-muted-foreground">성별, 태그, 외형 키워드까지 채팅 캐릭터 정보를 수정합니다.</p>
        </div>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <WorldEditField label="이름">
              <input value={draft.name} onChange={(event) => update("name", event.target.value)} className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none" />
            </WorldEditField>
            <WorldEditField label="성별">
              <select
                value={draft.gender ?? "unknown"}
                onChange={(event) => handleGenderChange(event.target.value as StoryCharacterGender)}
                className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none"
              >
                <option value="male">남성</option>
                <option value="female">여성</option>
                <option value="nonbinary">논바이너리/기타</option>
                <option value="unknown">설정하지 않음</option>
                <option value="custom">직접 입력</option>
              </select>
            </WorldEditField>
          </div>
          {draft.gender === "custom" && (
            <WorldEditField label="성별 직접 입력">
              <input value={draft.genderCustom ?? ""} onChange={(event) => update("genderCustom", event.target.value)} className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none" />
            </WorldEditField>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <WorldEditField label="나이">
              <input value={draft.age ?? ""} onChange={(event) => update("age", event.target.value)} className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none" />
            </WorldEditField>
            <WorldEditField label="역할/직업">
              <input value={draft.role ?? ""} onChange={(event) => update("role", event.target.value)} className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none" />
            </WorldEditField>
          </div>
          <WorldEditField label="한 줄 소개">
            <input value={draft.summary} onChange={(event) => update("summary", event.target.value)} className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none" />
          </WorldEditField>
          <WorldEditField label="성격 키워드">
            <textarea value={draft.personality} onChange={(event) => update("personality", event.target.value)} className="field-sizing-content max-h-[220px] min-h-[82px] w-full resize-y overflow-y-auto rounded-md border border-border bg-input px-3 py-2 text-sm outline-none" />
          </WorldEditField>
          <div className="grid gap-3 sm:grid-cols-2">
            <WorldEditField label="사는 곳">
              <input value={draft.residence ?? ""} onChange={(event) => update("residence", event.target.value)} className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none" />
            </WorldEditField>
            <WorldEditField label="사용자와의 관계">
              <input value={draft.relationship} onChange={(event) => update("relationship", event.target.value)} className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none" />
            </WorldEditField>
          </div>
          <WorldEditField label="외모 상세">
            <textarea value={draft.appearance ?? ""} onChange={(event) => update("appearance", event.target.value)} className="field-sizing-content max-h-[220px] min-h-[82px] w-full resize-y overflow-y-auto rounded-md border border-border bg-input px-3 py-2 text-sm outline-none" />
          </WorldEditField>
          <WorldEditField label="말투 규칙">
            <textarea value={draft.speechStyle} onChange={(event) => update("speechStyle", event.target.value)} className="field-sizing-content max-h-[220px] min-h-[82px] w-full resize-y overflow-y-auto rounded-md border border-border bg-input px-3 py-2 text-sm outline-none" />
          </WorldEditField>
          <div className="grid gap-3 sm:grid-cols-2">
            <WorldEditField label="비밀 설정">
              <textarea value={draft.secret} onChange={(event) => update("secret", event.target.value)} className="field-sizing-content max-h-[220px] min-h-[82px] w-full resize-y overflow-y-auto rounded-md border border-border bg-input px-3 py-2 text-sm outline-none" />
            </WorldEditField>
            <WorldEditField label="금지 전개">
              <textarea value={draft.forbiddenDevelopments} onChange={(event) => update("forbiddenDevelopments", event.target.value)} className="field-sizing-content max-h-[220px] min-h-[82px] w-full resize-y overflow-y-auto rounded-md border border-border bg-input px-3 py-2 text-sm outline-none" />
            </WorldEditField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <EditableTagField label="태그" value={draft.tags} onChange={(tags) => update("tags", tags)} />
            <EditableTagField label="외형 키워드" value={draft.visualTags ?? []} onChange={(visualTags) => update("visualTags", visualTags)} />
          </div>
          <EditableTagField label="관계 키워드" value={draft.relationshipTags ?? []} onChange={(relationshipTags) => update("relationshipTags", relationshipTags)} />
          <ImageUploadField
            label="프로필 이미지"
            value={draft.avatarUrl || draft.coverImageUrl || ""}
            onChange={(url) => update("avatarUrl", url ?? "")}
          />
        </div>
      </section>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
          취소
        </button>
        <button type="submit" className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          저장
        </button>
      </div>
      <AlertModal
        open={alertOpen}
        message="이름, 나이, 역할/직업, 한 줄 소개, 성격 키워드를 입력해 주세요."
        onOpenChange={setAlertOpen}
      />
    </form>
  )
}

function PersonaEditPanel({
  persona,
  onSave,
  onCancel,
}: {
  persona: StoryPersona
  onSave: (persona: StoryPersona) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<StoryPersona>(persona)
  const [alertOpen, setAlertOpen] = useState(false)

  const update = <K extends keyof StoryPersona>(key: K, value: StoryPersona[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.name.trim()) {
      setAlertOpen(true)
      return
    }
    onSave(draft)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-base font-bold text-foreground">자아 수정하기</h2>
        <span className="text-xs text-muted-foreground">{draft.name}</span>
      </div>

      <div className="space-y-3">
        <WorldEditField label="이름">
          <input
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none"
          />
        </WorldEditField>
        <div className="grid gap-3 sm:grid-cols-2">
          <WorldEditField label="성별">
            <select
              value={draft.gender ?? "unknown"}
              onChange={(event) => update("gender", event.target.value as StoryCharacterGender)}
              className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none"
            >
              <option value="female">여성</option>
              <option value="male">남성</option>
              <option value="nonbinary">논바이너리/기타</option>
              <option value="unknown">설정하지 않음</option>
              <option value="custom">직접 입력</option>
            </select>
          </WorldEditField>
          <WorldEditField label="나이">
            <input
              value={draft.age ?? ""}
              onChange={(event) => update("age", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none"
            />
          </WorldEditField>
        </div>
        {draft.gender === "custom" && (
          <WorldEditField label="성별 직접 입력">
            <input
              value={draft.genderCustom ?? ""}
              onChange={(event) => update("genderCustom", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none"
            />
          </WorldEditField>
        )}
        <WorldEditField label="역할 / 상태">
          <input
            value={draft.role ?? ""}
            onChange={(event) => update("role", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none"
          />
        </WorldEditField>
        <WorldEditField label="한 줄 소개">
          <textarea
            value={draft.summary ?? ""}
            onChange={(event) => update("summary", event.target.value)}
            className="field-sizing-content max-h-[220px] min-h-[82px] w-full resize-y overflow-y-auto rounded-md border border-border bg-input px-3 py-2 text-sm outline-none"
          />
        </WorldEditField>
        <WorldEditField label="성격">
          <textarea
            value={draft.personality ?? ""}
            onChange={(event) => update("personality", event.target.value)}
            className="field-sizing-content max-h-[220px] min-h-[82px] w-full resize-y overflow-y-auto rounded-md border border-border bg-input px-3 py-2 text-sm outline-none"
          />
        </WorldEditField>
        <WorldEditField label="말투">
          <input
            value={draft.speechStyle ?? ""}
            onChange={(event) => update("speechStyle", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none"
          />
        </WorldEditField>
        <WorldEditField label="관계">
          <input
            value={draft.relationship ?? ""}
            onChange={(event) => update("relationship", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none"
          />
        </WorldEditField>
        <ImageUploadField
          label="프로필 이미지"
          value={draft.avatarUrl ?? ""}
          onChange={(url) => update("avatarUrl", url ?? "")}
        />
      </div>

      <div className="flex gap-2 pt-2">
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
      <AlertModal
        open={alertOpen}
        message="자아 이름을 입력해 주세요."
        onOpenChange={setAlertOpen}
      />
    </form>
  )
}

function EditableTagField({
  label,
  value,
  onChange,
}: {
  label: string
  value?: string[]
  onChange: (value: string[]) => void
}) {
  const tags = normalizeTagList(value)

  return (
    <WorldEditField label={label}>
      <input
        value={tags.join(", ")}
        onChange={(event) => onChange(normalizeTagList(event.target.value))}
        placeholder="쉼표로 구분"
        className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none"
      />
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-2 py-1 text-[10px] text-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </WorldEditField>
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
      <DetailRow label="성별" value={getCharacterGenderLabel(character)} />
      <DetailRow label="한 줄 소개" value={character.summary} />
      <DetailRow label="성격" value={character.personality} />
      <DetailRow label="태그" value={normalizeTagList(character.tags).join(", ")} />
      <DetailRow label="외형 키워드" value={normalizeTagList(character.visualTags).join(", ")} />
      <DetailRow label="관계 키워드" value={normalizeTagList(character.relationshipTags).join(", ")} />
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
    <DetailCard title={persona.name} subtitle={[`${persona.age}세`, persona.role, getPersonaGenderLabel(persona)].filter(Boolean).join(" · ")}>
      <DetailRow label="성별" value={getPersonaGenderLabel(persona)} />
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
    <DetailCard title={work.title} subtitle="완성작">
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
      <p className="text-muted-foreground text-sm">아직 완성작이 없습니다</p>
      <p className="text-muted-foreground text-xs mt-1">캐릭터와 세계관을 조합해 시작하세요</p>
    </div>
  )
}

function getCreateLabel(tab: TabId) {
  if (tab === "scenarios") return "새 세계관"
  if (tab === "characters") return "새 캐릭터"
  if (tab === "personas") return "새 자아"
  return "새 완성작"
}

function isTabId(tab: string | null): tab is TabId {
  return tab === "scenarios" || tab === "characters" || tab === "personas" || tab === "completed"
}

function handleCardKeyDown(event: React.KeyboardEvent, onOpen: () => void) {
  if (event.key !== "Enter" && event.key !== " ") return
  event.preventDefault()
  onOpen()
}

function normalizeTagList(value?: string[] | string | null): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean)
  if (!value) return []
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getCharacterGenderLabel(character: StoryCharacter) {
  if (character.gender === "custom" && character.genderCustom?.trim()) return character.genderCustom.trim()
  if (character.gender === "male") return "남성"
  if (character.gender === "female") return "여성"
  if (character.gender === "nonbinary") return "논바이너리/기타"
  return ""
}

function getPersonaGenderLabel(persona: StoryPersona) {
  if (persona.gender === "custom" && persona.genderCustom?.trim()) return persona.genderCustom.trim()
  if (persona.gender === "male") return "남성"
  if (persona.gender === "female") return "여성"
  if (persona.gender === "nonbinary") return "논바이너리/기타"
  return ""
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

function renameTargetItem(library: StoryChatLibrary, target: DetailTarget, name: string): StoryChatLibrary {
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

function deleteTargetItem(library: StoryChatLibrary, target: DetailTarget): StoryChatLibrary {
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

function getRelatedWorks(library: StoryChatLibrary, target: DetailTarget) {
  if (target.type === "characters") {
    return library.works.filter((work) =>
      work.characterId === target.id || work.defaultCharacterId === target.id,
    )
  }
  if (target.type === "scenarios") {
    return library.works.filter((work) => work.worldId === target.id)
  }
  if (target.type === "personas") {
    return library.works.filter((work) => work.personaId === target.id)
  }
  return []
}

function copyTarget(
  library: StoryChatLibrary,
  target: DetailTarget,
  author?: Pick<StoryWork, "authorId" | "authorName">,
): StoryChatLibrary {
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
    works: [{ ...item, ...author, id: createId("work"), title: `${item.title}${suffix}`, createdAt: new Date().toISOString(), updatedAt: "오늘" }, ...library.works],
  }
}

function DetailView({
  detail,
  item,
  library,
  onEdit,
}: {
  detail: DetailTarget
  item: StoryCharacter | StoryWorld | StoryPersona | StoryWork | null
  library: StoryChatLibrary
  onEdit?: (target: DetailTarget) => void
  onRename?: (target: DetailTarget) => void
  onDelete?: (target: DetailTarget) => void
  onCopy?: (target: DetailTarget) => void
}) {
  if (!item) return null

  const isWork = detail.type === "completed"
  const title = isWork
    ? (item as StoryWork).title
    : (item as StoryCharacter | StoryWorld | StoryPersona).name

  return (
    <div className="max-w-full overflow-x-hidden">
      {/* 헤더 - 내 작품 view와 동일한 형식 */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="뒤로 가기"
            className="-ml-1 rounded-full p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[200px]">
            {title}
          </h1>
        </div>
        {onEdit && !isWork && (
          <button
            type="button"
            onClick={() => onEdit(detail)}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            <Pencil size={13} />
            수정
          </button>
        )}
      </div>
      <div className="px-5 space-y-4 pb-4">
        <PublicDetailView detail={detail} item={item} library={library} />
      </div>
    </div>
  )
}

function CompletedTab({
  works,
  library,
  openMenuId,
  onToggleMenu,
  onOpenDetail,
  canManageWork,
  onEdit,
  onDelete,
}: {
  works: StoryWork[]
  library: StoryChatLibrary
  openMenuId: string | null
  onToggleMenu: (id: string) => void
  onOpenDetail: (id: string) => void
  canManageWork: (work: StoryWork) => boolean
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  const router = useRouter()

  if (works.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-neutral-400 dark:text-neutral-600">
        아직 만든 작품이 없어요. 오른쪽 위 + 버튼으로 만들어보세요.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {works.map((w) => {
        const character = library.characters.find((c) => c.id === w.characterId)
        const world = library.worlds.find((item) => item.id === w.worldId)
        const item = {
          id: w.id,
          emoji: character?.emoji || "📖",
          title: character?.name || w.title,
          subtitle: world?.name || w.genre || "세계관",
          description: w.title || w.coreSetting || "작품 대화",
          status: "완성작",
          updatedAt: w.updatedAt || "오늘",
        }

        return (
          <WorkCard
            key={w.id}
            item={item}
            onOpenDetail={() => onOpenDetail(w.id)}
            onContinueChat={() => router.push(`/chat/${w.id}`)}
            canManage={canManageWork(w)}
            menuOpen={openMenuId === w.id}
            onToggleMenu={() => onToggleMenu(w.id)}
            onEdit={() => onEdit(w.id)}
            onDelete={() => onDelete(w.id)}
          />
        )
      })}
    </div>
  )
}

function CharactersTab({
  characters,
  openMenuId,
  onToggleMenu,
  onOpenDetail,
  onEdit,
  onDelete,
}: {
  characters: StoryCharacter[]
  openMenuId: string | null
  onToggleMenu: (id: string) => void
  onOpenDetail: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  const items = characters.map((c) => ({
    id: c.id,
    name: c.name,
    description: `${c.role || "캐릭터"} · ${c.speechStyle || c.summary || "설정 완료"}`,
    imageUrl: c.avatarUrl || c.coverImageUrl,
  }))

  return (
    <EntryList
      icon={Users}
      iconColor="text-lime-600 dark:text-lime-400"
      iconBg="bg-lime-50 dark:bg-lime-950"
      items={items}
      openMenuId={openMenuId}
      onToggleMenu={onToggleMenu}
      onOpenDetail={onOpenDetail}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  )
}

function ScenariosTab({
  scenarios,
  openMenuId,
  onToggleMenu,
  onOpenDetail,
  onEdit,
  onDelete,
}: {
  scenarios: StoryWorld[]
  openMenuId: string | null
  onToggleMenu: (id: string) => void
  onOpenDetail: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  const items = scenarios.map((w) => ({
    id: w.id,
    name: w.name,
    description: `${w.genre || "장르"} · ${w.coreSetting || w.era || "세계관"}`,
    imageUrl: w.coverImageUrl,
  }))

  return (
    <EntryList
      icon={Globe}
      iconColor="text-amber-600 dark:text-amber-400"
      iconBg="bg-amber-50 dark:bg-amber-950"
      items={items}
      openMenuId={openMenuId}
      onToggleMenu={onToggleMenu}
      onOpenDetail={onOpenDetail}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  )
}

function PersonasTab({
  personas,
  openMenuId,
  onToggleMenu,
  onOpenDetail,
  onEdit,
  onDelete,
}: {
  personas: StoryPersona[]
  openMenuId: string | null
  onToggleMenu: (id: string) => void
  onOpenDetail: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  const items = personas.map((p) => ({
    id: p.id,
    name: p.name,
    description: `${p.role || "자아"} · ${p.summary || p.relationship || "설정 완료"}`,
    imageUrl: p.avatarUrl,
  }))

  return (
    <EntryList
      icon={Smile}
      iconColor="text-violet-600 dark:text-violet-400"
      iconBg="bg-violet-50 dark:bg-violet-950"
      items={items}
      openMenuId={openMenuId}
      onToggleMenu={onToggleMenu}
      onOpenDetail={onOpenDetail}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  )
}

function WorkCard({
  item,
  onOpenDetail,
  onContinueChat,
  canManage,
  menuOpen,
  onToggleMenu,
  onEdit,
  onDelete,
}: {
  item: {
    id: string
    emoji: string
    title: string
    subtitle: string
    description: string
    status: string
    updatedAt: string
  }
  onOpenDetail?: () => void
  onContinueChat: () => void
  canManage: boolean
  menuOpen: boolean
  onToggleMenu: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={onOpenDetail}
      className="cursor-pointer rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-colors hover:border-blue-400/50 dark:hover:border-blue-500/50"
    >
      <div className="mb-3 flex items-start gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl dark:bg-neutral-800">
          {item.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] text-neutral-900 dark:text-neutral-100 truncate">
            <span className="font-semibold">{item.title}</span>
            <span className="mx-1 text-neutral-400">+</span>
            {item.subtitle}
          </p>
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
            {item.description}
          </p>
        </div>
        {canManage && <div className="relative">
          <button
            type="button"
            aria-label="더보기"
            onClick={(e) => {
              e.stopPropagation()
              onToggleMenu()
            }}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-6 z-10 w-32 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
            >
              <button
                type="button"
                onClick={() => {
                  onEdit()
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <Pencil size={14} />
                수정
              </button>
              <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
              <button
                type="button"
                onClick={() => {
                  onDelete()
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Trash2 size={14} />
                삭제
              </button>
            </div>
          )}
        </div>}
      </div>
      <div className="my-3 h-px bg-neutral-100 dark:bg-neutral-800" />
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          {item.status} · {item.updatedAt}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onContinueChat()
          }}
          className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
        >
          <Play size={12} fill="currentColor" />
          대화 이어가기
        </button>
      </div>
    </div>
  )
}

function EntryList({
  icon: Icon,
  iconColor,
  iconBg,
  items,
  openMenuId,
  onToggleMenu,
  onOpenDetail,
  onEdit,
  onDelete,
}: {
  icon: typeof Users
  iconColor: string
  iconBg: string
  items: Array<{ id: string; name: string; description: string; imageUrl?: string }>
  openMenuId: string | null
  onToggleMenu: (id: string) => void
  onOpenDetail?: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-neutral-400 dark:text-neutral-600">
        아직 만든 항목이 없어요. 오른쪽 위 + 버튼으로 만들어보세요.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => onOpenDetail?.(item.id)}
          className="cursor-pointer flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-3 dark:border-neutral-800 dark:bg-neutral-900 transition-colors hover:border-blue-400/50 dark:hover:border-blue-500/50"
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg overflow-hidden ${!item.imageUrl ? iconBg : ""}`}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <Icon size={17} className={iconColor} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {item.name}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {item.description}
            </p>
          </div>
          <div className="relative">
            <button
              type="button"
              aria-label="더보기"
              onClick={(e) => {
                e.stopPropagation()
                onToggleMenu(item.id)
              }}
              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <MoreVertical size={17} />
            </button>
            {openMenuId === item.id && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-6 z-10 w-32 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
              >
                <button
                  type="button"
                  onClick={() => onEdit(item.id)}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Pencil size={14} />
                  수정
                </button>
                <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <Trash2 size={14} />
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

