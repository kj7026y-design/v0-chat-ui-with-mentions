"use client"

import { useEffect, useMemo, useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Feather,
  ListOrdered,
  Map,
  PenTool,
  Plus,
  Rocket,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Zap,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertModal } from "@/components/ui/app-modal"
import { CharacterForm as CharacterCreateForm } from "@/components/create/character-form"
import { GenreSelectWithCustomInput } from "@/components/create/genre-select-with-custom-input"
import { ImageUploadField as CreateImageUploadField } from "@/components/create/image-upload-field"
import { WorkModeSwitch as CreateModeSwitch } from "@/components/create/work-mode-switch"
import {
  QuickCreateWizard,
  type QuickCreateData,
} from "@/components/create/quick-create-wizard"
import AdvancedCreateHome from "@/components/create/advanced-create-home"
import {
  CharacterCreateScreen,
  WorldCreateScreen,
  PersonaCreateScreen,
  WorkCreateScreen,
} from "@/components/create/advanced-create-screens"
import { WorkForm, type WorkFormValues } from "@/components/my-works/work-form"
import { IntroScenariosFormSection } from "@/components/my-works/intro-scenarios-form-section"
import {
  cleanIntroScenarios,
  createId,
  defaultLibrary,
  getStoryChatLibrary,
  saveStoryChatLibrary,
  type StoryChapter,
  type StoryCharacter,
  type StoryCharacterGender,
  type StoryChatLibrary,
  type IntroScenario,
  type StoryPersona,
  type StoryWork,
  type StoryWorld,
} from "@/lib/storychat-storage"
import { cn } from "@/lib/utils"
import { useSafeBack } from "@/hooks/use-safe-back"
import { getChatList, saveChatList } from "@/lib/chat-list-storage"
import { useAccountSession } from "@/hooks/use-account-session"
import { getStoryWorkAuthor } from "@/lib/work-permissions"
import {
  createStoryWorkInDatabase,
  requireStoryWorkBundle,
  syncStoryWorksFromDatabase,
} from "@/lib/story-work-client"
import { mergeStoryWorkBundles } from "@/lib/story-work-bundle"

type EntryMode = "menu" | "advanced" | "work" | "character" | "world" | "persona"

const CREATE_HISTORY_STATE_KEY = "__storyChatCreateMode"

const isEntryMode = (value: unknown): value is EntryMode =>
  value === "menu" ||
  value === "advanced" ||
  value === "work" ||
  value === "character" ||
  value === "world" ||
  value === "persona"
type WorkStep = "character" | "world" | "review"
type WorkFormMode = "simple" | "advanced"
type SourceMode = "select" | "new"

const WORK_DRAFT_KEY = "storychat_work_create_draft"
const WORK_FORM_MODE_KEY = "workFormMode"
const CHARACTER_DRAFT_KEY = "storychat_character_draft"
const WORLD_DRAFT_KEY = "storychat_world_draft"
const PERSONA_DRAFT_KEY = "storychat_persona_draft"

const workSteps: { id: WorkStep; label: string }[] = [
  { id: "character", label: "캐릭터" },
  { id: "world", label: "세계관" },
  { id: "review", label: "완성본" },
]

const emptyCharacter = (): StoryCharacter => ({
  id: "",
  name: "",
  genre: "",
  gender: "unknown",
  genderCustom: "",
  age: "",
  role: "",
  residence: "",
  appearance: "",
  summary: "",
  personality: "",
  speechStyle: "",
  relationship: "",
  secret: "",
  forbiddenDevelopments: "",
  defaultStartScenario: "",
  allowStartChange: true,
  allowCustomStart: true,
  startOptions: ["", "", ""],
  tags: [],
  visualTags: [],
  relationshipTags: [],
  emoji: "✨",
  createdAt: "",
})

const emptyStoryChapter = (): StoryChapter => ({
  id: createId("chapter"),
  title: "",
  description: "",
  startCondition: "",
  goal: "",
  mission: "",
  keyEvent: "",
  emotionalDirection: "",
  nextChapterCondition: "",
  progressRange: { start: 0, end: 100 },
})

const emptyWorld = (): StoryWorld => ({
  id: "",
  name: "",
  genre: "",
  era: "",
  coreSetting: "",
  places: "",
  events: "",
  mood: "",
  currentChapter: "",
  currentGoal: "",
  worldDate: "",
  progress: 0,
  forbiddenSettings: "",
  coverColor: "from-neutral-800 to-neutral-950",
  storyProgressSettings: {
    useChapters: false,
    chapters: [emptyStoryChapter()],
  },
  createdAt: "",
})

const emptyPersona = (): StoryPersona => ({
  id: "",
  name: "",
  gender: "unknown",
  genderCustom: "",
  age: "",
  role: "",
  summary: "",
  personality: "",
  speechStyle: "",
  appearance: "",
  relationship: "",
  secret: "",
  preferredDevelopments: "",
  forbiddenDevelopments: "",
  avatarUrl: "",
  createdAt: "",
})

interface WorkDraft {
  step: WorkStep
  characterSource: SourceMode
  worldSource: SourceMode
  selectedCharacterId: string
  selectedWorldId: string
  character: StoryCharacter
  world: StoryWorld
  title: string
  genre: string
  tagline: string
  authorNote: string
  coreSetting: string
  coverImageUrl: string
  mood: string
  majorLocations: string
  majorEvents: string
  currentChapter: string
  currentGoal: string
  worldDate: string
  startScenario: string
  introScenarios: IntroScenario[]
  statusBarEnabled: boolean
  statusBarText: string
  redZoneEnabled: boolean
  savedAt: string
}

interface ItemDraft<T> {
  item: T
  savedAt: string
}

const emptyWorkDraft = (): WorkDraft => ({
  step: "character",
  characterSource: "select",
  worldSource: "select",
  selectedCharacterId: "",
  selectedWorldId: "",
  character: emptyCharacter(),
  world: emptyWorld(),
  title: "",
  genre: "",
  tagline: "",
  authorNote: "",
  coreSetting: "",
  coverImageUrl: "",
  mood: "",
  majorLocations: "",
  majorEvents: "",
  currentChapter: "",
  currentGoal: "",
  worldDate: "",
  startScenario: "",
  introScenarios: [],
  statusBarEnabled: false,
  statusBarText: "",
  redZoneEnabled: false,
  savedAt: "",
})

export default function CreatePage() {
  const router = useRouter()
  const goToPreviousPage = useSafeBack("/")
  const { session, isLoading: isSessionLoading } = useAccountSession()
  const [mode, setMode] = useState<EntryMode>("menu")
  const [enteredModeDirectly, setEnteredModeDirectly] = useState(false)
  const [library, setLibrary] = useState<StoryChatLibrary>(defaultLibrary)
  const [workDraft, setWorkDraft] = useState<WorkDraft>(() => emptyWorkDraft())
  const [workFormMode, setWorkFormMode] = useState<WorkFormMode>("simple")
  const [personaFormMode, setPersonaFormMode] = useState<WorkFormMode>("simple")
  const [showWorkContinue, setShowWorkContinue] = useState(false)
  const [characterDraft, setCharacterDraft] = useState<StoryCharacter>(() => emptyCharacter())
  const [worldDraft, setWorldDraft] = useState<StoryWorld>(() => emptyWorld())
  const [personaDraft, setPersonaDraft] = useState<StoryPersona>(() => emptyPersona())
  const [showItemContinue, setShowItemContinue] = useState<Partial<Record<EntryMode, boolean>>>({})
  const [isExitPromptOpen, setIsExitPromptOpen] = useState(false)

  useEffect(() => {
    const currentLibrary = getStoryChatLibrary()
    setLibrary(currentLibrary)
    void syncStoryWorksFromDatabase()
      .then(setLibrary)
      .catch((error) => console.warn("[story works sync failed]", error))
    loadDrafts()
    const params = new URLSearchParams(window.location.search)
    const rawMode = params.get("mode") || params.get("type") || params.get("tab")
    const editId = params.get("editId") || params.get("id")
    const normalizedMode = rawMode === "scenarios" ? "world" : rawMode
    const requestedMode = (normalizedMode as EntryMode | null)
    const initialMode = requestedMode && requestedMode !== "menu" && isEntryMode(requestedMode)
      ? requestedMode
      : "menu"
    const isDirectEntry = initialMode !== "menu"

    if (editId && initialMode !== "menu") {
      if (initialMode === "character") {
        const found = currentLibrary.characters.find((c) => c.id === editId)
        if (found) setCharacterDraft(found)
      } else if (initialMode === "world") {
        const found = currentLibrary.worlds.find((w) => w.id === editId)
        if (found) setWorldDraft(found)
      } else if (initialMode === "persona") {
        const found = currentLibrary.personas.find((p) => p.id === editId)
        if (found) setPersonaDraft(found)
      } else if (initialMode === "work") {
        const found = currentLibrary.works.find((w) => w.id === editId)
        if (found) {
          const char = currentLibrary.characters.find((c) => c.id === found.characterId)
          const wrld = currentLibrary.worlds.find((w) => w.id === found.worldId)
          setWorkDraft({
            ...emptyWorkDraft(),
            title: found.title,
            authorNote: found.authorNote || "",
            selectedCharacterId: found.characterId,
            selectedWorldId: found.worldId,
            character: char || emptyCharacter(),
            world: wrld || emptyWorld(),
            startScenario: found.startScenario,
            introScenarios: found.introScenarios || [],
            genre: found.genre || "",
            tagline: found.tagline || "",
            coreSetting: found.coreSetting || "",
            majorLocations: Array.isArray(found.majorLocations) ? found.majorLocations.join(", ") : found.majorLocations || "",
            majorEvents: Array.isArray(found.majorEvents) ? found.majorEvents.join(", ") : found.majorEvents || "",
            mood: found.mood || "",
            currentChapter: found.currentChapter || "",
            currentGoal: found.currentGoal || "",
            worldDate: found.worldDate || "",
            coverImageUrl: found.coverImageUrl || "",
            statusBarEnabled: Boolean(found.statusBarEnabled),
            statusBarText: found.statusBarText || "",
            redZoneEnabled: Boolean(found.redZoneEnabled),
          })
        }
      }
    }

    window.history.replaceState(
      {
        ...window.history.state,
        [CREATE_HISTORY_STATE_KEY]: { mode: initialMode, direct: isDirectEntry },
      },
      "",
      window.location.href,
    )
    setMode(initialMode)
    setEnteredModeDirectly(isDirectEntry)

    const handlePopState = (event: PopStateEvent) => {
      const createState = event.state?.[CREATE_HISTORY_STATE_KEY] as
        | { mode?: unknown; direct?: unknown }
        | undefined

      if (!isEntryMode(createState?.mode)) return

      setIsExitPromptOpen(false)
      setMode(createState.mode)
      setEnteredModeDirectly(createState.direct === true)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const loadDrafts = () => {
    const work = readDraft<WorkDraft>(WORK_DRAFT_KEY)
    if (work) {
      setWorkDraft({ ...emptyWorkDraft(), ...work, step: (work.step as string) === "persona" ? "review" : work.step })
      setShowWorkContinue(true)
    }

    const character = readDraft<ItemDraft<StoryCharacter>>(CHARACTER_DRAFT_KEY)
    if (character?.item) {
      setCharacterDraft({ ...emptyCharacter(), ...character.item })
      setShowItemContinue((prev) => ({ ...prev, character: true }))
    }

    const world = readDraft<ItemDraft<StoryWorld>>(WORLD_DRAFT_KEY)
    if (world?.item) {
      setWorldDraft({ ...emptyWorld(), ...world.item })
      setShowItemContinue((prev) => ({ ...prev, world: true }))
    }

    const persona = readDraft<ItemDraft<StoryPersona>>(PERSONA_DRAFT_KEY)
    if (persona?.item) {
      setPersonaDraft({ ...emptyPersona(), ...persona.item })
      setShowItemContinue((prev) => ({ ...prev, persona: true }))
    }
  }

  const selectedCharacter = useMemo(
    () =>
      workDraft.characterSource === "select"
        ? library.characters.find((item) => item.id === workDraft.selectedCharacterId)
        : workDraft.character,
    [library.characters, workDraft],
  )

  const selectedWorld = useMemo(
    () =>
      workDraft.worldSource === "select"
        ? library.worlds.find((item) => item.id === workDraft.selectedWorldId)
        : workDraft.world,
    [library.worlds, workDraft],
  )

  const currentStepIndex = workSteps.findIndex((step) => step.id === workDraft.step)
  const previousStep = workSteps[currentStepIndex - 1]?.id
  const nextStep = workSteps[currentStepIndex + 1]?.id

  const setLibraryAndPersist = (nextLibrary: StoryChatLibrary) => {
    setLibrary(nextLibrary)
    saveStoryChatLibrary(nextLibrary)
  }

  const requireWorkAuthor = () => {
    const author = getStoryWorkAuthor(session)
    if (author) return author

    if (!isSessionLoading) {
      toast.error("로그인한 사용자만 작품을 생성하고 저장할 수 있습니다.", {
        action: {
          label: "로그인하러 가기",
          onClick: () => router.push("/mypage"),
        },
      })
    } else {
      toast.error("로그인 정보를 확인하고 있습니다. 잠시 후 다시 시도해 주세요.")
    }
    return null
  }

  const saveWorkDraft = () => {
    const nextDraft = { ...workDraft, savedAt: new Date().toISOString() }
    setWorkDraft(nextDraft)
    window.localStorage.setItem(WORK_DRAFT_KEY, JSON.stringify(nextDraft))
    setShowWorkContinue(false)
    toast("임시저장했어요.")
  }

  const changeWorkFormMode = (nextMode: WorkFormMode) => {
    setWorkFormMode(nextMode)
    window.localStorage.setItem(WORK_FORM_MODE_KEY, nextMode)
  }

  const saveItemDraft = (target: "character" | "world" | "persona") => {
    const key =
      target === "character"
        ? CHARACTER_DRAFT_KEY
        : target === "world"
          ? WORLD_DRAFT_KEY
          : PERSONA_DRAFT_KEY
    const item =
      target === "character" ? characterDraft : target === "world" ? worldDraft : personaDraft

    window.localStorage.setItem(
      key,
      JSON.stringify({ item, savedAt: new Date().toISOString() }),
    )
    setShowItemContinue((prev) => ({ ...prev, [target]: false }))
    toast("임시저장했어요.")
  }

  const completeCharacter = () => {
    if (!isCharacterReady(characterDraft)) return
    const saved = normalizeCharacter(characterDraft)
    setLibraryAndPersist({ ...library, characters: upsertById(library.characters, saved) })
    window.localStorage.removeItem(CHARACTER_DRAFT_KEY)
    toast("내 캐릭터에 저장했어요.")
    setCharacterDraft(emptyCharacter())
    setMode("menu")
  }

  const completeWorld = () => {
    if (!isWorldReady(worldDraft)) return
    const saved = normalizeWorld(worldDraft)
    setLibraryAndPersist({ ...library, worlds: upsertById(library.worlds, saved) })
    window.localStorage.removeItem(WORLD_DRAFT_KEY)
    toast("내 세계관에 저장했어요.")
    setWorldDraft(emptyWorld())
    setMode("menu")
  }

  const completePersona = () => {
    if (!isPersonaReady(personaDraft)) return
    const saved = normalizePersona(personaDraft)
    setLibraryAndPersist({ ...library, personas: upsertById(library.personas, saved) })
    window.localStorage.removeItem(PERSONA_DRAFT_KEY)
    toast("내 자아에 저장했어요.")
    setPersonaDraft(emptyPersona())
    setMode("menu")
  }

  const completeWork = async (goChat: boolean) => {
    const character = resolveWorkCharacter()
    const world = resolveWorkWorld()
    if (!character || !world || !workDraft.title) return
    const author = requireWorkAuthor()
    if (!author) return

    const now = new Date().toISOString()
    const work: StoryWork = {
      id: createId("work"),
      ...author,
      title: workDraft.title,
      characterId: character.id,
      worldId: world.id,
      personaId: "",
      startScenario: workDraft.startScenario || character.defaultStartScenario,
      introScenarios: cleanIntroScenarios(workDraft.introScenarios),
      storyProgressSettings: world.storyProgressSettings,
      genre: workDraft.genre.trim() || String(world.genre),
      tagline: workDraft.tagline.trim() || world.tagline,
      authorNote: workDraft.authorNote.trim(),
      coreSetting: workDraft.coreSetting.trim() || workDraft.tagline.trim() || world.coreSetting,
      majorLocations: workDraft.majorLocations.trim() || world.places,
      majorEvents: workDraft.majorEvents.trim() || world.events,
      mood: workDraft.mood.trim() || world.mood,
      currentChapter: workDraft.currentChapter.trim() || world.currentChapter,
      currentGoal: workDraft.currentGoal.trim() || world.currentGoal,
      worldDate: workDraft.worldDate.trim() || world.worldDate,
      coverImageUrl: workDraft.coverImageUrl.trim() || world.coverImageUrl,
      statusBarEnabled: workDraft.statusBarEnabled,
      statusBarText: workDraft.statusBarText,
      statusBarUpdatedAt: workDraft.statusBarEnabled ? new Date().toISOString() : undefined,
      redZoneEnabled: workDraft.redZoneEnabled,
      createdAt: now,
      updatedAt: "오늘",
    }

    const nextLibrary = {
      characters: upsertById(library.characters, character),
      worlds: upsertById(library.worlds, world),
      personas: library.personas,
      works: [work, ...library.works],
    }

    try {
      const savedBundle = await createStoryWorkInDatabase(requireStoryWorkBundle(nextLibrary, work.id))
      setLibraryAndPersist(mergeStoryWorkBundles(nextLibrary, [savedBundle]))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "작품을 DB에 저장하지 못했어요.")
      return
    }
    window.localStorage.removeItem(WORK_DRAFT_KEY)
    toast(goChat ? "작품을 저장하고 채팅을 시작해요." : "완성작 아카이브에 저장했어요.")
    setWorkDraft(emptyWorkDraft())
    if (goChat) router.push(`/chat/${work.id}`)
    else setMode("menu")
  }

  const completeQuickWork = async (data: QuickCreateData) => {
    const author = requireWorkAuthor()
    if (!author) return

    const gender = (value: string): StoryCharacterGender =>
      value === "여성" ? "female" : value === "남성" ? "male" : value === "논바이너리" ? "nonbinary" : "unknown"
    const character = data.character === "default" && library.characters[0]
      ? library.characters[0]
      : normalizeCharacter({
          ...emptyCharacter(),
          name: data.character === "custom" ? data.customCharacter.name.trim() : "유진",
          age: data.character === "custom" ? data.customCharacter.age.trim() || "27" : "27",
          gender: gender(data.customCharacter.gender),
          role: data.character === "custom" ? data.customCharacter.job.trim() || "이야기의 주인공" : "서점 주인",
          summary: data.character === "custom"
            ? data.customCharacter.personality.trim() || "차분하지만 쉽게 속마음을 드러내지 않는 인물"
            : "차분하고 다정하지만 비밀을 품고 있는 서점 주인",
          personality: data.character === "custom"
            ? data.customCharacter.personality.trim() || "차분하고 다정함"
            : "차분하고 다정하지만 속마음을 잘 드러내지 않음",
          speechStyle: data.character === "custom" ? data.customCharacter.speechStyle.trim() || "부드러운 존댓말" : "부드러운 존댓말",
        })
    const world = data.world === "default" && library.worlds[0]
      ? library.worlds[0]
      : normalizeWorld({
          ...emptyWorld(),
          name: data.world === "custom" ? data.customWorld.name.trim() : "달빛이 머무는 도시",
          era: data.world === "custom" ? data.customWorld.era.trim() || "2020년대 현대" : "2020년대 현대",
          genre: data.world === "custom" && data.customWorld.genre !== "장르 선택" ? data.customWorld.genre : "현대 판타지",
          coreSetting: data.world === "custom"
            ? data.customWorld.description.trim() || "평범한 일상 속에 마법과 비밀이 숨어 있는 세계"
            : "도심 곳곳에 마법사와 요괴가 숨어 살아가는 세계",
          mood: "신비롭고 따뜻한 분위기",
        })
    const persona = data.persona === "default" && library.personas[0]
      ? library.personas[0]
      : normalizePersona({
          ...emptyPersona(),
          name: data.persona === "custom" ? data.customPersona.name.trim() : "서연",
          age: data.persona === "custom" ? data.customPersona.age.trim() || "25" : "25",
          gender: gender(data.customPersona.gender),
          role: data.persona === "custom" ? data.customPersona.job.trim() || "이야기의 방문자" : "대학생",
          summary: "이야기의 중심에서 캐릭터와 관계를 만들어가는 나의 역할",
          relationship: `${character.name}과 처음 인연을 맺는다.`,
        })
    const now = new Date().toISOString()
    const work: StoryWork = {
      id: createId("work"),
      ...author,
      title: data.title.trim(),
      characterId: character.id,
      worldId: world.id,
      personaId: persona.id,
      startScenario: `${world.name}에서 ${character.name}과 처음 마주친다.`,
      introScenarios: [],
      storyProgressSettings: world.storyProgressSettings,
      genre: String(world.genre),
      tagline: world.coreSetting,
      coreSetting: world.coreSetting,
      majorLocations: world.places,
      majorEvents: world.events,
      mood: world.mood,
      currentChapter: world.currentChapter,
      currentGoal: world.currentGoal,
      worldDate: world.worldDate,
      coverImageUrl: world.coverImageUrl,
      statusBarEnabled: false,
      statusBarText: "",
      redZoneEnabled: false,
      createdAt: now,
      updatedAt: "오늘",
    }

    const nextLibrary = {
      characters: upsertById(library.characters, character),
      worlds: upsertById(library.worlds, world),
      personas: upsertById(library.personas, persona),
      works: [work, ...library.works],
    }
    try {
      const savedBundle = await createStoryWorkInDatabase(requireStoryWorkBundle(nextLibrary, work.id))
      setLibraryAndPersist(mergeStoryWorkBundles(nextLibrary, [savedBundle]))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "작품을 DB에 저장하지 못했어요.")
      return
    }
    saveChatList([
      {
        id: work.id,
        roomName: character.name,
        characterName: character.name,
        characterEmoji: character.emoji || "✨",
        lastMessage: "새로운 이야기를 시작해 보세요.",
        timestamp: new Date(),
        unreadCount: 0,
      },
      ...getChatList().filter((chat) => chat.id !== work.id),
    ])
    window.localStorage.removeItem(WORK_DRAFT_KEY)
    setWorkDraft(emptyWorkDraft())
    toast("작품을 만들고 채팅을 시작해요.")
    router.push(`/chat/${work.id}`)
  }

  const resolveWorkCharacter = () => {
    if (workDraft.characterSource === "select") return selectedCharacter
    return isCharacterReady(workDraft.character) ? normalizeCharacter(workDraft.character) : null
  }

  const resolveWorkWorld = () => {
    if (workDraft.worldSource === "select") return selectedWorld
    return isWorldReady(workDraft.world) ? normalizeWorld(workDraft.world) : null
  }

  const canGoNext =
    workFormMode === "simple"
      ? Boolean(resolveWorkCharacter() && resolveWorkWorld() && workDraft.title)
      : workDraft.step === "character"
        ? Boolean(resolveWorkCharacter())
        : workDraft.step === "world"
          ? Boolean(resolveWorkWorld())
        : Boolean(resolveWorkCharacter() && resolveWorkWorld() && workDraft.title)

  const enterCreateMode = (nextMode: EntryMode) => {
    if (nextMode === "menu") {
      setMode("menu")
      return
    }

    window.history.pushState(
      {
        ...window.history.state,
        [CREATE_HISTORY_STATE_KEY]: { mode: nextMode, direct: false },
      },
      "",
      window.location.href,
    )
    setEnteredModeDirectly(false)
    setMode(nextMode)
  }

  const goBack = () => {
    if (mode === "menu" || enteredModeDirectly) goToPreviousPage()
    else window.history.back()
  }

  const saveCurrentDraft = () => {
    if (mode === "work") {
      saveWorkDraft()
      return
    }

    if (mode === "character" || mode === "world" || mode === "persona") {
      saveItemDraft(mode)
    }
  }

  const leaveCreateMode = () => {
    setIsExitPromptOpen(false)
    setMode("menu")
  }

  const handleSaveAndExit = () => {
    saveCurrentDraft()
    leaveCreateMode()
  }

  if (mode === "work") {
    const emptyValues: WorkFormValues = {
      title: workDraft.title,
      authorNote: workDraft.authorNote || "",
      characterId: workDraft.selectedCharacterId || library.characters[0]?.id || "",
      worldId: workDraft.selectedWorldId || library.worlds[0]?.id || "",
      relationship: workDraft.startScenario || "",
      openingScene: workDraft.introScenarios[0]?.scene || "",
      genre: workDraft.genre,
      tagline: workDraft.tagline,
      coreSetting: workDraft.coreSetting,
      coverImageUrl: workDraft.coverImageUrl,
      mood: workDraft.mood,
      majorLocations: workDraft.majorLocations,
      majorEvents: workDraft.majorEvents,
      currentChapter: workDraft.currentChapter,
      currentGoal: workDraft.currentGoal,
      worldDate: workDraft.worldDate,
      statusBarEnabled: workDraft.statusBarEnabled,
      statusBarText: workDraft.statusBarText,
      redZoneEnabled: workDraft.redZoneEnabled,
      introScenarios: workDraft.introScenarios,
    }

    return (
      <div className="min-h-full bg-background text-foreground px-4 py-5">
        <WorkForm
          mode="create"
          initialValues={emptyValues}
          onCancel={goBack}
          onSubmit={async (values) => {
            const character = library.characters.find((c) => c.id === values.characterId) || library.characters[0]
            const world = library.worlds.find((w) => w.id === values.worldId) || library.worlds[0]
            if (!character || !world || !values.title) return
            const author = requireWorkAuthor()
            if (!author) return

            const now = new Date().toISOString()
            const work: StoryWork = {
              id: createId("work"),
              ...author,
              title: values.title,
              characterId: character.id,
              worldId: world.id,
              personaId: "",
              authorNote: values.authorNote,
              startScenario: values.relationship || values.openingScene || character.defaultStartScenario,
              introScenarios: values.introScenarios,
              storyProgressSettings: world.storyProgressSettings,
              genre: values.genre || String(world.genre),
              tagline: values.tagline || world.tagline,
              coreSetting: values.coreSetting || world.coreSetting,
              majorLocations: values.majorLocations || world.places,
              majorEvents: values.majorEvents || world.events,
              mood: values.mood || world.mood,
              currentChapter: values.currentChapter || world.currentChapter,
              currentGoal: values.currentGoal || world.currentGoal,
              worldDate: values.worldDate || world.worldDate,
              coverImageUrl: values.coverImageUrl || world.coverImageUrl,
              statusBarEnabled: values.statusBarEnabled,
              statusBarText: values.statusBarText,
              redZoneEnabled: values.redZoneEnabled,
              createdAt: now,
              updatedAt: "오늘",
            }

            const nextLibrary = {
              ...library,
              works: [work, ...library.works],
            }

            try {
              const savedBundle = await createStoryWorkInDatabase(requireStoryWorkBundle(nextLibrary, work.id))
              setLibraryAndPersist(mergeStoryWorkBundles(nextLibrary, [savedBundle]))
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "작품을 DB에 저장하지 못했어요.")
              return
            }
            window.localStorage.removeItem(WORK_DRAFT_KEY)
            toast("작품을 저장하고 채팅을 시작해요.")
            router.push(`/chat/${work.id}`)
          }}
        />
      </div>
    )
  }

  // 캐릭터/세계관/자아는 자체 레이아웃을 가진 화면으로 early return
  if (mode === "advanced") {
    return (
      <AdvancedCreateHome
        onBack={() => setMode("menu")}
        onSelectWork={() => {
          changeWorkFormMode("simple")
          setShowWorkContinue(false)
          setWorkDraft(emptyWorkDraft())
          enterCreateMode("work")
        }}
        onSelectCharacter={() => enterCreateMode("character")}
        onSelectWorld={() => enterCreateMode("world")}
        onSelectPersona={() => enterCreateMode("persona")}
        characterCount={library.characters.length}
        worldCount={library.worlds.length}
      />
    )
  }

  if (mode === "character") {
    return (
      <CharacterCreateScreen
        initialValue={characterDraft}
        onBack={goBack}
        onSave={(character) => {
          if (!isCharacterReady(character)) return
          const saved = normalizeCharacter(character)
          setLibraryAndPersist({ ...library, characters: upsertById(library.characters, saved) })
          window.localStorage.removeItem(CHARACTER_DRAFT_KEY)
          toast("내 캐릭터에 저장했어요.")
          setCharacterDraft(emptyCharacter())
          setMode("menu")
        }}
        onDraftSave={(character) => {
          setCharacterDraft(character)
          window.localStorage.setItem(
            CHARACTER_DRAFT_KEY,
            JSON.stringify({ item: character, savedAt: new Date().toISOString() }),
          )
          toast("임시저장했어요.")
        }}
      />
    )
  }

  if (mode === "world") {
    return (
      <WorldCreateScreen
        initialValue={worldDraft}
        onBack={goBack}
        onSave={(world) => {
          if (!isWorldReady(world)) return
          const saved = normalizeWorld(world)
          setLibraryAndPersist({ ...library, worlds: upsertById(library.worlds, saved) })
          window.localStorage.removeItem(WORLD_DRAFT_KEY)
          toast("내 세계관에 저장했어요.")
          setWorldDraft(emptyWorld())
          setMode("menu")
        }}
        onDraftSave={(world) => {
          setWorldDraft(world)
          window.localStorage.setItem(
            WORLD_DRAFT_KEY,
            JSON.stringify({ item: world, savedAt: new Date().toISOString() }),
          )
          toast("임시저장했어요.")
        }}
        WorldFormComponent={WorldForm}
      />
    )
  }

  if (mode === "persona") {
    return (
      <PersonaCreateScreen
        initialValue={personaDraft}
        onBack={goBack}
        onSave={(persona) => {
          if (!isPersonaReady(persona)) return
          const saved = normalizePersona(persona)
          setLibraryAndPersist({ ...library, personas: upsertById(library.personas, saved) })
          window.localStorage.removeItem(PERSONA_DRAFT_KEY)
          toast("내 자아에 저장했어요.")
          setPersonaDraft(emptyPersona())
          setMode("menu")
        }}
        onDraftSave={(persona) => {
          setPersonaDraft(persona)
          window.localStorage.setItem(
            PERSONA_DRAFT_KEY,
            JSON.stringify({ item: persona, savedAt: new Date().toISOString() }),
          )
          toast("임시저장했어요.")
        }}
        PersonaFormComponent={PersonaForm}
      />
    )
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-background text-foreground">
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <main className="mx-auto w-full max-w-5xl p-4 md:p-8 pb-28 space-y-6">
          {mode === "menu" && (
            <CreateMenu
              onSelectQuick={() => {
                changeWorkFormMode("simple")
                setShowWorkContinue(false)
                setWorkDraft(emptyWorkDraft())
                enterCreateMode("work")
              }}
              onSelectAdvanced={() => enterCreateMode("advanced")}
            />
          )}
        </main>
      </ScrollArea>
    </div>
  )
}

function CreateMenu({
  onSelectQuick,
  onSelectAdvanced,
}: {
  onSelectQuick: () => void
  onSelectAdvanced: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-md pt-1">
      <h2 className="text-lg font-medium text-foreground">어떻게 만들까요?</h2>
      <p className="mb-6 mt-1.5 text-sm leading-relaxed text-muted-foreground">
        두 가지 방법 중 편한 쪽을 골라주세요.
      </p>

      <button
        type="button"
        onClick={onSelectQuick}
        className="mb-4 w-full rounded-2xl border-2 border-blue-500 bg-card p-5 text-left transition-colors active:bg-blue-50 dark:border-blue-400 dark:active:bg-blue-950/40"
      >
        <span className="inline-block rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          처음이라면 · 5분 완성
        </span>

        <div className="mt-3 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Zap className="h-[22px] w-[22px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-base font-medium text-foreground">빠르게 시작하기</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              질문에 답하기만 하면 캐릭터, 세계관, 자아까지 알아서 준비돼요.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </button>

      <button
        type="button"
        onClick={onSelectAdvanced}
        className="w-full rounded-2xl border border-border bg-card p-5 text-left transition-colors active:bg-accent"
      >
        <span className="inline-block rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          작가라면 · 섬세하게
        </span>

        <div className="mt-3 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Feather className="h-[22px] w-[22px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-base font-medium text-foreground">직접 하나하나 만들기</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              캐릭터, 세계관, 챕터까지 세밀하게 다듬고 싶은 분께 맞아요.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </button>
    </div>
  )
}

function WorkStepper({ step }: { step: WorkStep }) {
  const activeIndex = workSteps.findIndex((item) => item.id === step)

  return (
    <div className="px-4 md:px-8 py-4 border-t border-border">
      <div className="flex items-center gap-2">
        {workSteps.map((item, index) => {
          const active = item.id === step
          const complete = index < activeIndex
          return (
            <div key={item.id} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-medium",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : complete
                      ? "border-border bg-secondary text-foreground"
                      : "border-border bg-secondary text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                    active
                      ? "bg-primary-foreground/20"
                      : complete
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {complete ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {index < workSteps.length - 1 && <div className="hidden h-px w-5 bg-border sm:block" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ContinueCard({
  title,
  onContinue,
  onDiscard,
}: {
  title: string
  onContinue: () => void
  onDiscard?: () => void
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">{title}</p>
          <div className="flex gap-2">
            {onDiscard && (
              <Button variant="outline" size="sm" onClick={onDiscard}>
                삭제
              </Button>
            )}
            <Button size="sm" onClick={onContinue}>
              이어서 작성
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SimpleWorkCreateStep({
  library,
  draft,
  setDraft,
}: {
  library: StoryChatLibrary
  draft: WorkDraft
  setDraft: React.Dispatch<React.SetStateAction<WorkDraft>>
}) {
  const selectedWorld = library.worlds.find((world) => world.id === draft.selectedWorldId)
  const genre = draft.genre || String(selectedWorld?.genre || "")
  const tagline = draft.tagline || selectedWorld?.tagline || draft.coreSetting || selectedWorld?.coreSetting || ""
  const simpleIntro = draft.introScenarios[0]?.scene ?? draft.startScenario

  const update = <K extends keyof WorkDraft>(key: K, value: WorkDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const updateSimpleIntro = (scene: string) => {
    setDraft((prev) => ({
      ...prev,
      startScenario: scene,
      introScenarios: mergeSimpleIntro(prev.introScenarios, scene),
    }))
  }

  return (
    <section className="space-y-4">
      <Card className="border-border bg-card">
        <CardContent className="space-y-4 p-4 md:p-6">
          <div>
            <h2 className="text-base font-bold text-foreground">빠른 작품 만들기</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              캐릭터와 세계관을 고르고, 바로 시작할 기본 정보만 입력합니다.
            </p>
          </div>

          <FieldGroup className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>대표 캐릭터</FieldLabel>
                {library.characters.length > 0 ? (
                  <Select
                    value={draft.selectedCharacterId}
                    onValueChange={(selectedCharacterId) =>
                      setDraft((prev) => ({ ...prev, characterSource: "select", selectedCharacterId }))
                    }
                  >
                    <SelectTrigger className="w-full bg-input">
                      <SelectValue placeholder="캐릭터 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {library.characters.map((character) => (
                        <SelectItem key={character.id} value={character.id}>
                          {character.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <EmptySelectState
                    title="현재 생성된 캐릭터가 없습니다."
                    description="캐릭터 만들기 버튼을 눌러 캐릭터를 생성해 주세요."
                    actionLabel="캐릭터 만들기"
                    onAction={() => setDraft((prev) => ({ ...prev, characterSource: "new" }))}
                  />
                )}
              </Field>

              <Field>
                <FieldLabel>세계관</FieldLabel>
                {library.worlds.length > 0 ? (
                  <Select
                    value={draft.selectedWorldId}
                    onValueChange={(selectedWorldId) => {
                      const world = library.worlds.find((item) => item.id === selectedWorldId)
                      setDraft((prev) => ({
                        ...prev,
                        worldSource: "select",
                        selectedWorldId,
                        genre: prev.genre || String(world?.genre || ""),
                        coreSetting: prev.coreSetting || world?.coreSetting || "",
                        tagline: prev.tagline || world?.tagline || world?.coreSetting || "",
                      }))
                    }}
                  >
                    <SelectTrigger className="w-full bg-input">
                      <SelectValue placeholder="세계관 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {library.worlds.map((world) => (
                        <SelectItem key={world.id} value={world.id}>
                          {world.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <EmptySelectState
                    title="현재 생성된 세계관이 없습니다."
                    description="세계관 만들기 버튼을 눌러 세계관을 생성해 주세요."
                    actionLabel="세계관 만들기"
                    onAction={() => setDraft((prev) => ({ ...prev, worldSource: "new" }))}
                  />
                )}
              </Field>
            </div>

            <Field>
              <FieldLabel>작품 제목</FieldLabel>
              <Input
                value={draft.title}
                onChange={(event) => update("title", event.target.value)}
                className="bg-input"
                placeholder="예: 이무기와 잊혀진 왕국"
              />
            </Field>

            <Field>
              <FieldLabel>장르</FieldLabel>
              <GenreSelectWithCustomInput value={genre} onChange={(value) => update("genre", value)} />
            </Field>

            <Field>
              <FieldLabel>한 줄 소개</FieldLabel>
              <Textarea
                value={tagline}
                onChange={(event) => {
                  update("tagline", event.target.value)
                  update("coreSetting", event.target.value)
                }}
                className="min-h-[82px] bg-input"
                placeholder="작품을 한 문장으로 설명해 주세요."
              />
            </Field>

            <Field>
              <FieldLabel>첫 상황 / 도입부 간단 입력</FieldLabel>
              <Textarea
                value={simpleIntro}
                onChange={(event) => updateSimpleIntro(event.target.value)}
                className="min-h-[90px] bg-input"
                placeholder="바로 채팅을 시작할 첫 장면을 적어 주세요."
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </section>
  )
}

function CharacterWorkStep({
  library,
  draft,
  setDraft,
}: {
  library: StoryChatLibrary
  draft: WorkDraft
  setDraft: React.Dispatch<React.SetStateAction<WorkDraft>>
}) {
  return (
    <StepSection title="캐릭터 선택 또는 새로 만들기" number="1">
      <Tabs
        value={draft.characterSource}
        onValueChange={(value) => setDraft((prev) => ({ ...prev, characterSource: value as SourceMode }))}
      >
        <TabsList className="w-full">
          <TabsTrigger value="select">내 캐릭터에서 선택</TabsTrigger>
          <TabsTrigger value="new">새 캐릭터 만들기</TabsTrigger>
        </TabsList>
        <TabsContent value="select" className="pt-4">
          {library.characters.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {library.characters.map((character) => (
                <CharacterSelectCard
                  key={character.id}
                  character={character}
                  selected={draft.selectedCharacterId === character.id}
                  onClick={() => setDraft((prev) => ({ ...prev, selectedCharacterId: character.id }))}
                />
              ))}
            </div>
          ) : (
            <EmptySelectState
              title="현재 생성된 캐릭터가 없습니다."
              description="새 캐릭터 만들기 버튼을 눌러 캐릭터를 생성해 주세요."
              actionLabel="새 캐릭터 만들기"
              onAction={() => setDraft((prev) => ({ ...prev, characterSource: "new" }))}
            />
          )}
        </TabsContent>
        <TabsContent value="new" className="pt-4">
          <CharacterCreateForm
            value={draft.character}
            onChange={(character) => setDraft((prev) => ({ ...prev, character }))}
            formMode="advanced"
          />
        </TabsContent>
      </Tabs>
    </StepSection>
  )
}

function WorldWorkStep({
  library,
  draft,
  setDraft,
}: {
  library: StoryChatLibrary
  draft: WorkDraft
  setDraft: React.Dispatch<React.SetStateAction<WorkDraft>>
}) {
  return (
    <StepSection title="세계관 선택 또는 새로 만들기" number="2">
      <Tabs
        value={draft.worldSource}
        onValueChange={(value) => setDraft((prev) => ({ ...prev, worldSource: value as SourceMode }))}
      >
        <TabsList className="w-full">
          <TabsTrigger value="select">내 세계관에서 선택</TabsTrigger>
          <TabsTrigger value="new">새 세계관 만들기</TabsTrigger>
        </TabsList>
        <TabsContent value="select" className="pt-4">
          {library.worlds.length > 0 ? (
            <div className="flex flex-col gap-3">
              {library.worlds.map((world) => (
                <WorldSelectCard
                  key={world.id}
                  world={world}
                  selected={draft.selectedWorldId === world.id}
                  onClick={() => setDraft((prev) => ({ ...prev, selectedWorldId: world.id }))}
                />
              ))}
            </div>
          ) : (
            <EmptySelectState
              title="현재 생성된 세계관이 없습니다."
              description="새 세계관 만들기 버튼을 눌러 세계관을 생성해 주세요."
              actionLabel="새 세계관 만들기"
              onAction={() => setDraft((prev) => ({ ...prev, worldSource: "new" }))}
            />
          )}
        </TabsContent>
        <TabsContent value="new" className="pt-4">
          <WorldForm
            value={draft.world}
            onChange={(world) => setDraft((prev) => ({ ...prev, world }))}
          />
        </TabsContent>
      </Tabs>
    </StepSection>
  )
}

function ReviewStep({
  draft,
  setDraft,
  character,
  world,
  formMode,
}: {
  draft: WorkDraft
  setDraft: React.Dispatch<React.SetStateAction<WorkDraft>>
  character?: StoryCharacter
  world?: StoryWorld
  formMode: WorkFormMode
}) {
  const genre = draft.genre || String(world?.genre || "")
  const tagline = draft.tagline || world?.tagline || draft.coreSetting || world?.coreSetting || ""
  const coreSetting = draft.coreSetting || draft.tagline || world?.coreSetting || ""
  const simpleIntro = draft.introScenarios[0]?.scene ?? draft.startScenario

  const update = <K extends keyof WorkDraft>(key: K, value: WorkDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const updateSimpleIntro = (scene: string) => {
    setDraft((prev) => ({
      ...prev,
      startScenario: scene,
      introScenarios: mergeSimpleIntro(prev.introScenarios, scene),
    }))
  }

  return (
    <StepSection title="완성본 확인" number="3">
      <div className="grid gap-3 lg:grid-cols-2">
        {character && <CharacterSelectCard character={character} selected />}
        {world && <WorldSelectCard world={world} selected />}
      </div>

      {formMode === "simple" ? (
        <Card className="bg-card border-border">
          <CardContent className="p-4 md:p-6">
            <FieldGroup className="space-y-4">
              <Field>
                <FieldLabel htmlFor="workTitle">작품 제목</FieldLabel>
                <Input
                  id="workTitle"
                  placeholder="예: 이무기와 잊혀진 왕국"
                  value={draft.title}
                  onChange={(event) => update("title", event.target.value)}
                  className="bg-input"
                />
              </Field>
              <Field>
                <FieldLabel>장르</FieldLabel>
                <GenreSelectWithCustomInput value={genre} onChange={(value) => update("genre", value)} />
              </Field>
              <Field>
                <FieldLabel>한 줄 소개</FieldLabel>
                <Textarea
                  value={tagline}
                  onChange={(event) => {
                    update("tagline", event.target.value)
                    update("coreSetting", event.target.value)
                  }}
                  className="min-h-[82px] bg-input"
                  placeholder="작품을 한 문장으로 설명해 주세요."
                />
              </Field>
              <Field>
                <FieldLabel>첫 상황 / 도입부 간단 입력</FieldLabel>
                <Textarea
                  value={simpleIntro}
                  onChange={(event) => updateSimpleIntro(event.target.value)}
                  className="min-h-[90px] bg-input"
                  placeholder="바로 채팅을 시작할 첫 장면을 적어 주세요."
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-card border-border">
            <CardContent className="p-4 md:p-6">
              <FieldGroup className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="workTitleAdvanced">작품 제목</FieldLabel>
                  <Input
                    id="workTitleAdvanced"
                    value={draft.title}
                    onChange={(event) => update("title", event.target.value)}
                    className="bg-input"
                  />
                </Field>
                <Field>
                  <FieldLabel>장르</FieldLabel>
                  <GenreSelectWithCustomInput value={genre} onChange={(value) => update("genre", value)} />
                </Field>
                <Field>
                  <FieldLabel>한 줄 소개</FieldLabel>
                  <Textarea value={tagline} onChange={(event) => update("tagline", event.target.value)} className="min-h-[76px] bg-input" />
                </Field>
                <CreateImageUploadField
                  label="대표 이미지"
                  value={draft.coverImageUrl || world?.coverImageUrl || ""}
                  onChange={(coverImageUrl) => update("coverImageUrl", coverImageUrl ?? "")}
                />
              </FieldGroup>
            </CardContent>
          </Card>

          <AdvancedCreateSection title="세계관 설정" defaultOpen>
            <Field>
              <FieldLabel>핵심 설정</FieldLabel>
              <Textarea value={coreSetting} onChange={(event) => update("coreSetting", event.target.value)} className="min-h-[90px] bg-input" />
            </Field>
            <Field>
              <FieldLabel>분위기</FieldLabel>
              <Input value={draft.mood || world?.mood || ""} onChange={(event) => update("mood", event.target.value)} className="bg-input" />
            </Field>
            <Field>
              <FieldLabel>주요 장소</FieldLabel>
              <Textarea value={draft.majorLocations || world?.places || ""} onChange={(event) => update("majorLocations", event.target.value)} className="min-h-[80px] bg-input" />
            </Field>
            <Field>
              <FieldLabel>주요 사건</FieldLabel>
              <Textarea value={draft.majorEvents || world?.events || ""} onChange={(event) => update("majorEvents", event.target.value)} className="min-h-[80px] bg-input" />
            </Field>
            <Field>
              <FieldLabel>세계관 날짜</FieldLabel>
              <Input value={draft.worldDate || world?.worldDate || ""} onChange={(event) => update("worldDate", event.target.value)} className="bg-input" />
            </Field>
          </AdvancedCreateSection>

          <AdvancedCreateSection title="진행 상태">
            <p className="text-xs leading-relaxed text-muted-foreground">
              상태바는 채팅 중 현재 위치, 목표, 장면 정보를 보여주는 보조 정보입니다.
            </p>
            <Field>
              <FieldLabel>현재 챕터</FieldLabel>
              <Input value={draft.currentChapter || world?.currentChapter || ""} onChange={(event) => update("currentChapter", event.target.value)} className="bg-input" />
            </Field>
            <Field>
              <FieldLabel>현재 목표</FieldLabel>
              <Input value={draft.currentGoal || world?.currentGoal || ""} onChange={(event) => update("currentGoal", event.target.value)} className="bg-input" />
            </Field>
            <StatusBarSettingsFields
              enabled={draft.statusBarEnabled}
              text={draft.statusBarText}
              onEnabledChange={(statusBarEnabled) => update("statusBarEnabled", statusBarEnabled)}
              onTextChange={(statusBarText) => update("statusBarText", statusBarText)}
            />
          </AdvancedCreateSection>

          <AdvancedCreateSection title="레드존">
            <ToggleRow
              label="성인 대화 허용"
              checked={draft.redZoneEnabled}
              onCheckedChange={(redZoneEnabled) => update("redZoneEnabled", redZoneEnabled)}
            />
          </AdvancedCreateSection>

          <IntroScenariosFormSection
            value={draft.introScenarios}
            onChange={(introScenarios) => update("introScenarios", introScenarios)}
          />
        </>
      )}
    </StepSection>
  )
}

function WorkModeSwitch({
  value,
  onChange,
  simpleDescription = "처음이라면 쉬운 모드로 시작해도 충분해요. 나중에 상세 모드에서 세계관과 도입부를 더 추가할 수 있어요.",
  advancedDescription = "작품의 분위기, 시작 장면, 상태바, 세계관 정보를 세밀하게 설정할 수 있어요.",
}: {
  value: WorkFormMode
  onChange: (value: WorkFormMode) => void
  simpleDescription?: string
  advancedDescription?: string
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-background/70 p-1">
          {(["simple", "advanced"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                value === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {mode === "simple" ? "쉬운 모드" : "상세 모드"}
            </button>
          ))}
        </div>
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          {value === "simple" ? simpleDescription : advancedDescription}
        </p>
      </CardContent>
    </Card>
  )
}

function AdvancedCreateSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card className="border-border bg-card">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center gap-3 p-4 text-left">
        <h3 className="flex-1 text-base font-bold text-foreground">{title}</h3>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <CardContent className="space-y-4 border-t border-border p-4">
          <FieldGroup className="space-y-4">{children}</FieldGroup>
        </CardContent>
      )}
    </Card>
  )
}

function mergeSimpleIntro(intros: IntroScenario[], scene: string): IntroScenario[] {
  const [firstIntro, ...rest] = intros
  if (!scene.trim() && !firstIntro) return intros
  return [
    {
      id: firstIntro?.id || createId("intro"),
      title: firstIntro?.title || "첫 장면",
      scene,
      firstMessage: firstIntro?.firstMessage || "",
      imageUrl: firstIntro?.imageUrl || "",
      options: firstIntro?.options || [],
    },
    ...rest,
  ]
}

function EmptySelectState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <Card className="border-dashed bg-card">
      <CardContent className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button type="button" onClick={onAction}>
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

function StepSection({
  title,
  number,
  children,
}: {
  title: string
  number: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
          {number}
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function CharacterForm({
  value,
  onChange,
  formMode = "advanced",
}: {
  value: StoryCharacter
  onChange: (value: StoryCharacter) => void
  formMode?: WorkFormMode
}) {
  const update = <K extends keyof StoryCharacter>(key: K, nextValue: StoryCharacter[K]) => {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 md:p-6">
        <FieldGroup className="space-y-6">
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">{formMode === "simple" ? "쉬운 모드" : "기본 정보"}</h3>
              <p className="mt-1 text-xs text-muted-foreground">채팅 캐릭터로 바로 쓸 수 있는 핵심 정보를 입력해 주세요.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>이름</FieldLabel>
                <Input value={value.name} onChange={(event) => update("name", event.target.value)} className="bg-input" />
              </Field>
              <GenderSelectField value={value} onChange={onChange} />
              <Field>
                <FieldLabel>나이</FieldLabel>
                <Input value={value.age ?? ""} onChange={(event) => update("age", event.target.value)} className="bg-input" />
              </Field>
              <Field>
                <FieldLabel>역할/직업</FieldLabel>
                <Input value={value.role ?? ""} onChange={(event) => update("role", event.target.value)} className="bg-input" />
              </Field>
            </div>
            <Field>
              <FieldLabel>한 줄 소개</FieldLabel>
              <Input value={value.summary} onChange={(event) => update("summary", event.target.value)} className="bg-input" />
            </Field>
            <Field>
              <FieldLabel>성격 키워드</FieldLabel>
              <Textarea value={value.personality} onChange={(event) => update("personality", event.target.value)} className="bg-input min-h-[80px]" />
            </Field>
            <ImageUploadField
              label="대표 이미지"
              value={value.coverImageUrl}
              onChange={(coverImageUrl) => update("coverImageUrl", coverImageUrl)}
            />
          </section>

          {formMode === "advanced" && (
            <section className="space-y-4 border-t border-border pt-5">
              <div>
                <h3 className="text-sm font-bold text-foreground">상세 모드</h3>
                <p className="mt-1 text-xs text-muted-foreground">외형, 관계성, 말투와 탐색용 태그를 더 세밀하게 정합니다.</p>
              </div>
              <Field>
                <FieldLabel>장르</FieldLabel>
                <GenreSelectWithCustomInput value={String(value.genre)} onChange={(genre) => update("genre", genre)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>사는 곳</FieldLabel>
                  <Input value={value.residence ?? ""} onChange={(event) => update("residence", event.target.value)} className="bg-input" />
                </Field>
                <Field>
                  <FieldLabel>사용자와의 관계</FieldLabel>
                  <Input value={value.relationship} onChange={(event) => update("relationship", event.target.value)} className="bg-input" />
                </Field>
              </div>
              <Field>
                <FieldLabel>외모 상세</FieldLabel>
                <Textarea value={value.appearance ?? ""} onChange={(event) => update("appearance", event.target.value)} className="bg-input min-h-[80px]" />
              </Field>
              <Field>
                <FieldLabel>말투 규칙</FieldLabel>
                <Textarea value={value.speechStyle} onChange={(event) => update("speechStyle", event.target.value)} className="bg-input min-h-[90px]" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>비밀 설정</FieldLabel>
                  <Textarea value={value.secret} onChange={(event) => update("secret", event.target.value)} className="bg-input min-h-[80px]" />
                </Field>
                <Field>
                  <FieldLabel>금지 전개</FieldLabel>
                  <Textarea value={value.forbiddenDevelopments} onChange={(event) => update("forbiddenDevelopments", event.target.value)} className="bg-input min-h-[80px]" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ImageUploadField
                  label="대표 아바타"
                  value={value.avatarUrl}
                  onChange={(avatarUrl) => update("avatarUrl", avatarUrl)}
                />
                <TagInputField
                  label="태그"
                  placeholder="신비로운, 고독한, 지혜로운"
                  value={value.tags}
                  onChange={(tags) => update("tags", tags)}
                />
              </div>
              <TagInputField
                label="외형 키워드"
                placeholder="흑발, 장신, 넓은 어깨, 차가운 인상"
                value={value.visualTags ?? []}
                onChange={(visualTags) => update("visualTags", visualTags)}
              />
              <Field>
                <FieldLabel>대표 대사</FieldLabel>
                <Input value={value.quote ?? ""} onChange={(event) => update("quote", event.target.value)} className="bg-input" />
              </Field>
            </section>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

function GenderSelectField({
  value,
  onChange,
}: {
  value: StoryCharacter
  onChange: (value: StoryCharacter) => void
}) {
  const gender = value.gender ?? "unknown"

  const updateGender = (nextGender: StoryCharacterGender) => {
    onChange({
      ...value,
      gender: nextGender,
      genderCustom: nextGender === "custom" ? value.genderCustom ?? "" : "",
    })
  }

  return (
    <Field>
      <FieldLabel>성별</FieldLabel>
      <Select value={gender} onValueChange={(nextValue) => updateGender(nextValue as StoryCharacterGender)}>
        <SelectTrigger className="w-full bg-input">
          <SelectValue placeholder="성별 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="male">남성</SelectItem>
          <SelectItem value="female">여성</SelectItem>
          <SelectItem value="nonbinary">논바이너리/기타</SelectItem>
          <SelectItem value="unknown">설정하지 않음</SelectItem>
          <SelectItem value="custom">직접 입력</SelectItem>
        </SelectContent>
      </Select>
      {gender === "custom" && (
        <Input
          value={value.genderCustom ?? ""}
          onChange={(event) => onChange({ ...value, gender: "custom", genderCustom: event.target.value })}
          placeholder="성별을 직접 입력하세요"
          className="mt-2 bg-input"
        />
      )}
    </Field>
  )
}

function TagInputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value?: string[]
  onChange: (value: string[]) => void
  placeholder: string
}) {
  const textValue = (value ?? []).join(", ")

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input
        value={textValue}
        onChange={(event) => onChange(normalizeTagList(event.target.value))}
        onBlur={(event) => onChange(normalizeTagList(event.target.value))}
        placeholder={placeholder}
        className="bg-input"
      />
      {(value ?? []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(value ?? []).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </Field>
  )
}

function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string
  value?: string
  onChange: (value: string | undefined) => void
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [invalidImageOpen, setInvalidImageOpen] = useState(false)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setInvalidImageOpen(true)
      event.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result)
    }
    reader.readAsDataURL(file)
    event.target.value = ""
  }

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-3">
        <label
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
        >
          이미지 업로드
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
        {value && (
          <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-border bg-muted">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="h-full w-full"
              aria-label={`${label} 미리보기`}
            >
              <img src={value} alt={label} className="h-full w-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[11px] font-bold leading-none text-white hover:bg-black"
              aria-label={`${label} 삭제`}
            >
              ×
            </button>
          </div>
        )}
      </div>
      {isPreviewOpen && value && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-card"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-lg font-bold leading-none text-white hover:bg-black"
              aria-label="미리보기 닫기"
            >
              ×
            </button>
            <img src={value} alt={label} className="max-h-[78dvh] w-full object-contain" />
          </div>
        </div>
      )}
      <AlertModal
        open={invalidImageOpen}
        title="이미지 업로드"
        message="이미지 파일만 업로드할 수 있어요."
        onOpenChange={setInvalidImageOpen}
      />
    </Field>
  )
}

function WorldForm({
  value,
  onChange,
}: {
  value: StoryWorld
  onChange: (value: StoryWorld) => void
}) {
  const [expanded, setExpanded] = useState({ basic: true, setting: false })
  const update = <K extends keyof StoryWorld>(key: K, nextValue: StoryWorld[K]) => {
    onChange({ ...value, [key]: nextValue })
  }

  const hasText = (fieldValue: unknown) =>
    typeof fieldValue === "string" && fieldValue.trim().length > 0
  const basicFields = [value.name, value.genre, value.era, value.coverImageUrl]
  const settingFields = [
    value.coreSetting,
    value.mood,
    value.places,
    value.events,
    value.worldDate,
    value.forbiddenSettings,
  ]
  const totalFieldCount = basicFields.length + settingFields.length
  const filledCount = [...basicFields, ...settingFields].filter(hasText).length

  return (
    <div className="mx-auto w-full max-w-2xl [&_[data-slot=input]]:shadow-none [&_[data-slot=select-trigger]]:shadow-none [&_[data-slot=textarea]]:shadow-none">
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[13px] text-muted-foreground">전체 진행률</span>
          <span className="text-[13px] font-medium text-blue-600 dark:text-blue-400">
            {filledCount} / {totalFieldCount} 항목
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
            style={{ width: `${(filledCount / totalFieldCount) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <WorldFormSection
          title="기본 정보"
          icon={Map}
          required
          open={expanded.basic}
          filledCount={basicFields.filter(hasText).length}
          fieldLabels={["세계관 이름", "세계관 장르", "시대/배경", "대표 이미지"]}
          onToggle={() => setExpanded((current) => ({ ...current, basic: !current.basic }))}
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <CompactField label="세계관 이름">
              <Input
                value={value.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="예: 멸망한 왕국 아르카디아"
              />
            </CompactField>
            <CompactField label="세계관 장르">
              <GenreSelectWithCustomInput
                value={String(value.genre)}
                onChange={(genre) => update("genre", genre)}
              />
            </CompactField>
          </div>
          <CompactField label="시대/배경">
            <Input
              value={value.era}
              onChange={(event) => update("era", event.target.value)}
              placeholder="예: AC 300년, 근미래 서울"
            />
          </CompactField>
          <CreateImageUploadField
            label="대표 이미지"
            value={value.coverImageUrl}
            onChange={(coverImageUrl) => update("coverImageUrl", coverImageUrl)}
          />
        </WorldFormSection>

        <WorldFormSection
          title="세계관 설정"
          icon={Settings}
          required
          open={expanded.setting}
          filledCount={settingFields.filter(hasText).length}
          fieldLabels={["핵심 설정", "분위기", "주요 장소", "주요 사건", "세계관 날짜", "금지 설정"]}
          onToggle={() => setExpanded((current) => ({ ...current, setting: !current.setting }))}
        >
          <CompactField label="핵심 설정">
            <Textarea
              value={value.coreSetting}
              onChange={(event) => update("coreSetting", event.target.value)}
              placeholder="예: 마법이 기억을 대가로 발동되는 세계"
              rows={3}
            />
          </CompactField>
          <CompactField label="분위기">
            <Input
              value={value.mood}
              onChange={(event) => update("mood", event.target.value)}
              placeholder="예: 장엄하고 쓸쓸함"
            />
          </CompactField>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <CompactField label="주요 장소">
              <Textarea
                value={value.places}
                onChange={(event) => update("places", event.target.value)}
                placeholder="예: 무너진 왕성, 안개 숲, 예언자의 탑"
                rows={3}
              />
            </CompactField>
            <CompactField label="주요 사건">
              <Textarea
                value={value.events}
                onChange={(event) => update("events", event.target.value)}
                placeholder="예: 왕국의 몰락, 숨겨진 예언서 발견"
                rows={3}
              />
            </CompactField>
          </div>
          <CompactField label="세계관 날짜">
            <Input
              value={value.worldDate}
              onChange={(event) => update("worldDate", event.target.value)}
              placeholder="예: AC 300년 4월 16일"
            />
          </CompactField>
          <CompactField label="금지 설정">
            <Textarea
              value={value.forbiddenSettings}
              onChange={(event) => update("forbiddenSettings", event.target.value)}
              placeholder="예: 현대 기술이 갑자기 등장하는 전개"
              rows={3}
            />
          </CompactField>
        </WorldFormSection>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 px-3 py-3">
            <ListOrdered className="h-[18px] w-[18px] text-muted-foreground" />
            <span className="flex-1 text-sm font-medium text-foreground">챕터 시스템</span>
            <Switch
              checked={value.storyProgressSettings.useChapters}
              onCheckedChange={(checked) => update("storyProgressSettings", {
                ...value.storyProgressSettings,
                useChapters: checked,
              })}
              aria-label="챕터 시스템 사용"
            />
          </div>
          {!value.storyProgressSettings.useChapters && (
            <p className="px-3 pb-3 text-xs text-muted-foreground">
              켜면 챕터별로 목표 · 진행도 · 다음 조건을 나눠 설정해요.
            </p>
          )}
          {value.storyProgressSettings.useChapters && (
            <div className="px-3 pb-3">
              <StoryProgressSettingsForm
                value={value.storyProgressSettings}
                onChange={(storyProgressSettings) => update("storyProgressSettings", storyProgressSettings)}
                hideToggle
              />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function WorldFormSection({
  title,
  icon: Icon,
  required,
  open,
  filledCount,
  fieldLabels,
  onToggle,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  required: boolean
  open: boolean
  filledCount: number
  fieldLabels: string[]
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border bg-card", open ? "border-blue-500" : "border-border")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2 px-3 py-3 text-left">
        <Icon className={cn("h-[18px] w-[18px]", open ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground")} />
        <span className="flex-1 text-sm font-medium text-foreground">{title}</span>
        <span className={cn(
          "rounded-full px-2 py-0.5 text-xs",
          open ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-muted text-muted-foreground",
        )}>
          {required ? "필수" : "선택"} · {filledCount}/{fieldLabels.length}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open ? (
        <div className="flex flex-col gap-2.5 px-3 pb-3">{children}</div>
      ) : (
        <p className="px-3 pb-3 text-xs text-muted-foreground">{fieldLabels.join(" · ")}</p>
      )}
    </section>
  )
}

function CompactField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function StoryProgressSettingsForm({
  value,
  onChange,
  hideToggle = false,
}: {
  value: StoryWorld["storyProgressSettings"]
  onChange: (value: StoryWorld["storyProgressSettings"]) => void
  hideToggle?: boolean
}) {
  const chapters = value.chapters.length ? value.chapters : [emptyStoryChapter()]
  const [openChapterId, setOpenChapterId] = useState<string | null>(() => chapters[0]?.id ?? null)

  const updateChapter = (chapterId: string, nextChapter: StoryChapter) => {
    onChange({
      ...value,
      chapters: chapters.map((chapter) => (chapter.id === chapterId ? nextChapter : chapter)),
    })
  }

  const addChapter = () => {
    const nextChapter = emptyStoryChapter()
    onChange({
      ...value,
      useChapters: true,
      chapters: [...chapters, nextChapter],
    })
    setOpenChapterId(nextChapter.id)
  }

  const deleteChapter = (chapterId: string) => {
    if (chapters.length <= 1) return
    const nextChapters = chapters.filter((chapter) => chapter.id !== chapterId)
    onChange({
      ...value,
      chapters: nextChapters,
    })
    if (openChapterId === chapterId) setOpenChapterId(nextChapters[0]?.id ?? null)
  }

  const moveChapter = (chapterId: string, direction: -1 | 1) => {
    const currentIndex = chapters.findIndex((chapter) => chapter.id === chapterId)
    const nextIndex = currentIndex + direction
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= chapters.length) return

    const nextChapters = [...chapters]
    const [target] = nextChapters.splice(currentIndex, 1)
    nextChapters.splice(nextIndex, 0, target)
    onChange({ ...value, chapters: nextChapters })
  }

  return (
    <section className={cn("space-y-3", !hideToggle && "rounded-xl border border-border bg-secondary/40 p-3")}>
      {!hideToggle && (
        <ToggleRow
          label="챕터 사용"
          checked={value.useChapters}
          onCheckedChange={(checked) =>
            onChange({
              ...value,
              useChapters: checked,
              chapters,
            })
          }
        />
      )}

      {value.useChapters && (
        <div className="space-y-3">
          <div className="space-y-2">
            {chapters.map((chapter, index) => (
              <ChapterEditorCard
                key={chapter.id}
                chapter={chapter}
                index={index}
                total={chapters.length}
                expanded={openChapterId === chapter.id}
                onToggle={() => setOpenChapterId((current) => current === chapter.id ? null : chapter.id)}
                onChange={(nextChapter) => updateChapter(chapter.id, nextChapter)}
                onDelete={() => deleteChapter(chapter.id)}
                onMoveUp={() => moveChapter(chapter.id, -1)}
                onMoveDown={() => moveChapter(chapter.id, 1)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addChapter}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-sm text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
          >
            <Plus className="h-[15px] w-[15px]" />
            챕터 추가
          </button>
        </div>
      )}
    </section>
  )
}

function ChapterEditorCard({
  chapter,
  index,
  total,
  expanded,
  onToggle,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  chapter: StoryChapter
  index: number
  total: number
  expanded: boolean
  onToggle: () => void
  onChange: (chapter: StoryChapter) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const update = <K extends keyof StoryChapter>(key: K, nextValue: StoryChapter[K]) => {
    onChange({ ...chapter, [key]: nextValue })
  }

  const updateProgressRange = (key: keyof StoryChapter["progressRange"], nextValue: number) => {
    onChange({
      ...chapter,
      progressRange: {
        ...chapter.progressRange,
        [key]: nextValue,
      },
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-2.5 px-3 py-3 text-left"
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {chapter.title || `챕터 ${index + 1}`}
          </p>
          {chapter.goal && <p className="mt-0.5 truncate text-xs text-muted-foreground">{chapter.goal}</p>}
        </div>
        {expanded
          ? <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          : <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="flex flex-col gap-2.5 border-t border-border px-3 pb-3 pt-3">
          <CompactField label="챕터 제목">
            <Input
              value={chapter.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="예: 봄의 시작"
            />
          </CompactField>
          <CompactField label="챕터 시작 조건">
            <Input
              value={chapter.startCondition}
              onChange={(event) => update("startCondition", event.target.value)}
              placeholder="예: 첫 만남 이후 대화 시작"
            />
          </CompactField>
          <CompactField label="챕터 설명">
            <Textarea
              value={chapter.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="예: 두 인물이 처음으로 서로를 의식하기 시작하는 구간"
              rows={2}
            />
          </CompactField>
          <CompactField label="챕터 목표">
            <Textarea
              value={chapter.goal}
              onChange={(event) => update("goal", event.target.value)}
              placeholder="예: 캐릭터의 경계심을 낮추고 첫 단서를 얻기"
              rows={2}
            />
          </CompactField>
          <CompactField label="주요 미션">
            <Input
              value={chapter.mission}
              onChange={(event) => update("mission", event.target.value)}
              placeholder="예: 캐릭터의 정체에 대한 단서 찾기"
            />
          </CompactField>
          <CompactField label="핵심 사건">
            <Input
              value={chapter.keyEvent}
              onChange={(event) => update("keyEvent", event.target.value)}
              placeholder="예: 캐릭터가 자신의 과거를 처음 언급함"
            />
          </CompactField>
          <CompactField label="감정 변화 방향">
            <Input
              value={chapter.emotionalDirection}
              onChange={(event) => update("emotionalDirection", event.target.value)}
              placeholder="예: 경계 → 호기심 → 약한 신뢰"
            />
          </CompactField>
          <CompactField label="다음 챕터로 넘어가는 조건">
            <Textarea
              value={chapter.nextChapterCondition}
              onChange={(event) => update("nextChapterCondition", event.target.value)}
              placeholder="예: 신뢰도가 일정 이상이거나 핵심 단서를 발견했을 때"
              rows={2}
            />
          </CompactField>
          <div className="grid grid-cols-2 gap-2">
            <CompactField label="진행도 시작">
              <Input
                type="number"
                min={0}
                max={100}
                value={chapter.progressRange.start}
                onChange={(event) => updateProgressRange("start", Number(event.target.value))}
              />
            </CompactField>
            <CompactField label="진행도 종료">
              <Input
                type="number"
                min={0}
                max={100}
                value={chapter.progressRange.end}
                onChange={(event) => updateProgressRange("end", Number(event.target.value))}
              />
            </CompactField>
          </div>
          <div className="mt-0.5 flex flex-wrap justify-end gap-2">
            <button type="button" disabled={index === 0} onClick={onMoveUp} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground disabled:opacity-40">
              <ArrowUp className="h-[13px] w-[13px]" />
              위로
            </button>
            <button type="button" disabled={index === total - 1} onClick={onMoveDown} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground disabled:opacity-40">
              <ArrowDown className="h-[13px] w-[13px]" />
              아래로
            </button>
            <button type="button" disabled={total <= 1} onClick={onDelete} className="flex items-center gap-1 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-xs text-destructive disabled:opacity-40">
              <Trash2 className="h-[13px] w-[13px]" />
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PersonaForm({
  value,
  onChange,
  formMode = "advanced",
}: {
  value: StoryPersona
  onChange: (value: StoryPersona) => void
  formMode?: WorkFormMode
}) {
  const update = <K extends keyof StoryPersona>(key: K, nextValue: StoryPersona[K]) => {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 md:p-6">
        <FieldGroup className="space-y-4">
          <ImageUploadField
            label="프로필 사진"
            value={value.avatarUrl}
            onChange={(avatarUrl) => update("avatarUrl", avatarUrl)}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel>자아 이름</FieldLabel>
              <Input value={value.name} onChange={(event) => update("name", event.target.value)} className="bg-input" />
            </Field>
            <PersonaGenderSelectField value={value} onChange={onChange} />
            <Field>
              <FieldLabel>나이</FieldLabel>
              <Input value={value.age} onChange={(event) => update("age", event.target.value)} className="bg-input" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>직업/신분</FieldLabel>
              <Input value={value.role} onChange={(event) => update("role", event.target.value)} className="bg-input" />
            </Field>
            <Field>
              <FieldLabel>한 줄 소개</FieldLabel>
              <Input value={value.summary} onChange={(event) => update("summary", event.target.value)} className="bg-input" />
            </Field>
          </div>
          <Field>
            <FieldLabel>캐릭터와의 관계</FieldLabel>
            <Input value={value.relationship} onChange={(event) => update("relationship", event.target.value)} className="bg-input" />
          </Field>
          {formMode === "advanced" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>성격</FieldLabel>
                  <Textarea value={value.personality} onChange={(event) => update("personality", event.target.value)} className="bg-input min-h-[80px]" />
                </Field>
                <Field>
                  <FieldLabel>말투</FieldLabel>
                  <Textarea value={value.speechStyle} onChange={(event) => update("speechStyle", event.target.value)} className="bg-input min-h-[80px]" />
                </Field>
              </div>
              <Field>
                <FieldLabel>외형</FieldLabel>
                <Input value={value.appearance} onChange={(event) => update("appearance", event.target.value)} className="bg-input" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel>비밀 설정</FieldLabel>
                  <Textarea value={value.secret} onChange={(event) => update("secret", event.target.value)} className="bg-input min-h-[80px]" />
                </Field>
                <Field>
                  <FieldLabel>선호 전개</FieldLabel>
                  <Textarea value={value.preferredDevelopments} onChange={(event) => update("preferredDevelopments", event.target.value)} className="bg-input min-h-[80px]" />
                </Field>
                <Field>
                  <FieldLabel>금지 전개</FieldLabel>
                  <Textarea value={value.forbiddenDevelopments} onChange={(event) => update("forbiddenDevelopments", event.target.value)} className="bg-input min-h-[80px]" />
                </Field>
              </div>
            </>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

function PersonaGenderSelectField({
  value,
  onChange,
}: {
  value: StoryPersona
  onChange: (value: StoryPersona) => void
}) {
  const gender = value.gender ?? "unknown"

  const updateGender = (nextGender: StoryCharacterGender) => {
    onChange({
      ...value,
      gender: nextGender,
      genderCustom: nextGender === "custom" ? value.genderCustom ?? "" : "",
    })
  }

  return (
    <Field>
      <FieldLabel>성별</FieldLabel>
      <Select value={gender} onValueChange={(nextValue) => updateGender(nextValue as StoryCharacterGender)}>
        <SelectTrigger className="w-full bg-input">
          <SelectValue placeholder="성별 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="male">남성</SelectItem>
          <SelectItem value="female">여성</SelectItem>
          <SelectItem value="nonbinary">논바이너리/기타</SelectItem>
          <SelectItem value="unknown">설정하지 않음</SelectItem>
          <SelectItem value="custom">직접 입력</SelectItem>
        </SelectContent>
      </Select>
      {gender === "custom" && (
        <Input
          value={value.genderCustom ?? ""}
          onChange={(event) => onChange({ ...value, gender: "custom", genderCustom: event.target.value })}
          placeholder="성별을 직접 입력하세요"
          className="mt-2 bg-input"
        />
      )}
    </Field>
  )
}

function IndividualShell({
  showContinue,
  onContinue,
  onDiscard,
  children,
}: {
  showContinue: boolean
  onContinue: () => void
  onDiscard: () => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      {showContinue && (
        <ContinueCard
          title="작성 중인 초안이 있어요. 이어서 작성할까요?"
          onContinue={onContinue}
          onDiscard={onDiscard}
        />
      )}
      {children}
    </div>
  )
}

function CharacterSelectCard({
  character,
  selected,
  onClick,
}: {
  character: StoryCharacter
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border bg-card p-4 text-left transition-colors",
        selected ? "border-primary bg-accent" : "border-border hover:bg-accent",
      )}
    >
      <div className="flex gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-xl">
          {character.emoji}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{character.name || "이름 없음"}</h3>
              <span className="text-xs text-muted-foreground">
                {[character.genre, getCharacterGenderLabel(character)].filter(Boolean).join(" · ")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{character.summary}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {character.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}

function WorldSelectCard({
  world,
  selected,
  onClick,
}: {
  world: StoryWorld
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border bg-gradient-to-br p-4 text-left transition-colors",
        world.coverColor,
        selected ? "border-primary" : "border-border hover:border-muted-foreground",
      )}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground">{world.name || "이름 없음"}</h3>
            <p className="text-xs text-muted-foreground">
              {world.genre} · {world.era}
            </p>
          </div>
          {selected && <Check className="h-4 w-4 text-primary" />}
        </div>
        <p className="text-sm text-muted-foreground">{world.coreSetting}</p>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{world.mood}</span>
          <span>{world.events}</span>
        </div>
      </div>
    </button>
  )
}

function PersonaSelectCard({
  persona,
  selected,
  onClick,
}: {
  persona: StoryPersona
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border bg-card p-4 text-left transition-colors",
        selected ? "border-primary bg-accent" : "border-border hover:bg-accent",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-semibold">{persona.name || "이름 없음"}</h3>
          <p className="text-xs text-muted-foreground">
            {persona.age} · {persona.role}
          </p>
          <p className="text-sm text-muted-foreground">{persona.summary}</p>
          <p className="text-xs text-muted-foreground">관계: {persona.relationship}</p>
        </div>
        {selected && <Check className="h-4 w-4 text-primary" />}
      </div>
    </button>
  )
}

function StatusBarSettingsFields({
  enabled,
  text,
  onEnabledChange,
  onTextChange,
}: {
  enabled: boolean
  text: string
  onEnabledChange: (value: boolean) => void
  onTextChange: (value: string) => void
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-secondary/40 p-3">
      <ToggleRow label="상태바 사용" checked={enabled} onCheckedChange={onEnabledChange} />
      {enabled && (
        <>
          <Field>
            <FieldLabel>상태바 내용</FieldLabel>
            <Textarea
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder={"현재 위치: 무너진 왕성\n현재 목표: 왕국 몰락의 원인을 찾는다"}
              className="min-h-[96px] bg-input"
            />
          </Field>
          {text.trim() && (
            <div className="rounded-lg border border-border bg-card px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">미리보기</p>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-foreground">{text}</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function BottomActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-border bg-background p-4 backdrop-blur md:bottom-0 md:left-auto md:w-full">
      <div className="mx-auto flex max-w-5xl gap-2">{children}</div>
    </div>
  )
}

function readDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    window.localStorage.removeItem(key)
    return null
  }
}

function normalizeCharacter(character: StoryCharacter): StoryCharacter {
  const tags = normalizeTagList(character.tags)
  const visualTags = normalizeTagList(character.visualTags)
  const relationshipTags = normalizeTagList(character.relationshipTags)

  return {
    ...character,
    id: character.id || createId("character"),
    gender: character.gender ?? "unknown",
    genderCustom: character.gender === "custom" ? character.genderCustom?.trim() ?? "" : "",
    tags: tags.length
      ? tags
      : character.personality
          .split(/[,\s]+/)
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 3),
    visualTags,
    relationshipTags,
    createdAt: character.createdAt || new Date().toLocaleDateString("ko-KR"),
  }
}

function normalizeTagList(value?: string[] | string | null): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean)
  }
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

function normalizeWorld(world: StoryWorld): StoryWorld {
  return {
    ...world,
    id: world.id || createId("world"),
    coverColor: world.coverColor || "from-neutral-800 to-neutral-950",
    storyProgressSettings: {
      useChapters: world.storyProgressSettings?.useChapters ?? false,
      chapters: world.storyProgressSettings?.chapters?.length
        ? world.storyProgressSettings.chapters
        : [emptyStoryChapter()],
    },
    createdAt: world.createdAt || new Date().toLocaleDateString("ko-KR"),
  }
}

function normalizePersona(persona: StoryPersona): StoryPersona {
  return {
    ...persona,
    id: persona.id || createId("persona"),
    gender: persona.gender ?? "unknown",
    genderCustom: persona.gender === "custom" ? persona.genderCustom?.trim() ?? "" : "",
    createdAt: persona.createdAt || new Date().toLocaleDateString("ko-KR"),
  }
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const exists = items.some((current) => current.id === item.id)
  if (exists) return items.map((current) => (current.id === item.id ? item : current))
  return [item, ...items]
}

function isCharacterReady(character: StoryCharacter) {
  return Boolean(
    character.name &&
      character.age &&
      character.role &&
      character.summary &&
      character.personality,
  )
}

function isWorldReady(world: StoryWorld) {
  return Boolean(world.name && world.genre && world.era && world.coreSetting && world.mood)
}

function isPersonaReady(persona: StoryPersona) {
  return Boolean(persona.name && persona.age && persona.role && persona.summary && persona.relationship)
}
