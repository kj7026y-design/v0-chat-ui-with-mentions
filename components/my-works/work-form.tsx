"use client"

import { useEffect, useState } from "react"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Globe,
  Heart,
  IdCard,
  PenLine,
  Plus,
  Save,
  User,
  Sparkles,
} from "lucide-react"
import {
  getStoryChatLibrary,
  type IntroScenario,
  type StoryChatLibrary,
  cleanIntroScenarios,
} from "@/lib/storychat-storage"
import { ImageUploadField } from "@/components/create/image-upload-field"
import { GenreSelectWithCustomInput } from "@/components/create/genre-select-with-custom-input"

export type WorkFormMode = "simple" | "advanced"

export interface WorkFormValues {
  title: string
  authorNote: string
  characterId: string
  worldId: string
  relationship: string
  openingScene: string
  genre: string
  tagline: string
  coreSetting: string
  coverImageUrl: string
  mood: string
  majorLocations: string
  majorEvents: string
  currentChapter: string
  currentGoal: string
  worldDate: string
  statusBarEnabled: boolean
  statusBarText: string
  introScenarios: IntroScenario[]
}

interface WorkFormProps {
  mode: "create" | "edit"
  initialValues: WorkFormValues
  submitLabel?: string
  onSubmit: (values: WorkFormValues) => void | Promise<void>
  onCancel?: () => void
}

interface SectionProps {
  id: string
  icon: typeof IdCard
  title: string
  badge?: string
  openId: string | null
  setOpenId: (id: string | null) => void
  children: React.ReactNode
}

function Section({
  id,
  icon: Icon,
  title,
  badge,
  openId,
  setOpenId,
  children,
}: SectionProps) {
  const isOpen = openId === id
  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 transition-all">
      <button
        type="button"
        onClick={() => setOpenId(isOpen ? null : id)}
        className="flex w-full items-center justify-between p-4 text-left font-medium"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={18} className="text-neutral-500" />
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </span>
          {badge && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-normal text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`text-neutral-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="border-t border-neutral-100 p-4 dark:border-neutral-800 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}

export function WorkForm({
  mode,
  initialValues,
  submitLabel = mode === "edit" ? "수정 저장" : "저장",
  onSubmit,
  onCancel,
}: WorkFormProps) {
  const [openId, setOpenId] = useState<string | null>("basic")
  const [values, setValues] = useState<WorkFormValues>(initialValues)
  const [library, setLibrary] = useState<StoryChatLibrary | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setValues(initialValues)
    setLibrary(getStoryChatLibrary())
  }, [initialValues])

  const setField = <K extends keyof WorkFormValues>(key: K, value: WorkFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!values.title.trim()) {
      setError("작품 제목을 입력해 주세요.")
      setOpenId("basic")
      return
    }

    setError("")
    setIsSaving(true)
    try {
      const firstIntroScene = values.openingScene.trim() || values.introScenarios[0]?.scene || ""
      const updatedIntroScenarios = firstIntroScene
        ? [
            {
              title: values.introScenarios[0]?.title || "첫 장면",
              scene: firstIntroScene,
              firstMessage: values.introScenarios[0]?.firstMessage || "",
              imageUrl: values.introScenarios[0]?.imageUrl || "",
              options: values.introScenarios[0]?.options || [],
            },
            ...values.introScenarios.slice(1),
          ]
        : values.introScenarios

      await onSubmit({
        ...values,
        title: values.title.trim(),
        authorNote: values.authorNote.trim(),
        relationship: values.relationship.trim(),
        openingScene: firstIntroScene,
        tagline: values.tagline.trim() || values.coreSetting.trim(),
        coreSetting: values.coreSetting.trim() || values.tagline.trim(),
        introScenarios: cleanIntroScenarios(updatedIntroScenarios),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const characters = library?.characters || []
  const worlds = library?.worlds || []

  return (
    <div className="mx-auto max-w-md pb-24">
      {/* 상단 폼 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="-ml-1 rounded-full p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {mode === "edit" ? "작품 수정하기" : "작품 만들기"}
          </h2>
        </div>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => handleSubmit()}
          className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {isSaving ? "저장 중..." : submitLabel}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* 1. 기본 정보 (제목) */}
      <Section
        id="basic"
        icon={IdCard}
        title="기본 정보"
        badge="필수"
        openId={openId}
        setOpenId={setOpenId}
      >
        <div>
          <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            작품 제목
          </p>
          <input
            type="text"
            value={values.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="예: 비 오는 서점의 비밀"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            장르
          </p>
          <GenreSelectWithCustomInput
            value={values.genre}
            onChange={(genre) => setField("genre", genre)}
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            한 줄 소개
          </p>
          <input
            type="text"
            value={values.tagline}
            onChange={(e) => setField("tagline", e.target.value)}
            placeholder="예: 천년의 잠에서 깨어난 왕국의 마지막 이야기"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>
      </Section>

      {/* 2. 작가의 한마디 */}
      <Section
        id="authorNote"
        icon={PenLine}
        title="작가의 한마디"
        badge="선택"
        openId={openId}
        setOpenId={setOpenId}
      >
        <div>
          <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            작가의 한마디
          </p>
          <textarea
            value={values.authorNote}
            onChange={(e) => setField("authorNote", e.target.value)}
            placeholder="예: 잃어버린 것들을 되찾는 이야기를 쓰고 싶었어요. 첫 장면부터 천천히 읽어주세요."
            rows={3}
            className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>
      </Section>

      {/* 3. 주요 캐릭터 선택 */}
      <Section
        id="character"
        icon={User}
        title="주요 캐릭터"
        badge="필수"
        openId={openId}
        setOpenId={setOpenId}
      >
        <div className="space-y-2">
          {characters.length === 0 ? (
            <p className="py-3 text-xs text-neutral-400 dark:text-neutral-500 text-center">
              보유한 캐릭터가 없습니다. 내 보관함에서 생성해 보세요.
            </p>
          ) : (
            characters.map((char) => {
              const isSelected = values.characterId === char.id
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => setField("characterId", char.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30"
                      : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {char.emoji ? `${char.emoji} ` : ""}{char.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {char.role || char.summary || char.speechStyle || "캐릭터"}
                    </p>
                  </div>
                  {isSelected && <Check size={16} className="text-blue-500 shrink-0" />}
                </button>
              )
            })
          )}
        </div>
      </Section>

      {/* 4. 세계관 선택 */}
      <Section
        id="world"
        icon={Globe}
        title="세계관"
        badge="필수"
        openId={openId}
        setOpenId={setOpenId}
      >
        <div className="space-y-2">
          {worlds.length === 0 ? (
            <p className="py-3 text-xs text-neutral-400 dark:text-neutral-500 text-center">
              보유한 세계관이 없습니다. 내 보관함에서 생성해 보세요.
            </p>
          ) : (
            worlds.map((world) => {
              const isSelected = values.worldId === world.id
              return (
                <button
                  key={world.id}
                  type="button"
                  onClick={() => setField("worldId", world.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30"
                      : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {world.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {world.genre || world.coreSetting || world.era || "세계관"}
                    </p>
                  </div>
                  {isSelected && <Check size={16} className="text-blue-500 shrink-0" />}
                </button>
              )
            })
          )}
        </div>
      </Section>

      {/* 5. 관계 설정 */}
      <Section
        id="relationship"
        icon={Heart}
        title="관계 설정"
        badge="선택"
        openId={openId}
        setOpenId={setOpenId}
      >
        <div>
          <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            캐릭터와 나의 관계
          </p>
          <input
            type="text"
            value={values.relationship}
            onChange={(e) => setField("relationship", e.target.value)}
            placeholder="예: 오랜 친구 / 우연히 만난 손님과 주인"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>
      </Section>

      {/* 6. 첫 장면 설정 (오프닝) */}
      <Section
        id="opening"
        icon={Sparkles}
        title="첫 장면 설정"
        badge="선택"
        openId={openId}
        setOpenId={setOpenId}
      >
        <div>
          <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            이야기가 시작되는 첫 대화/상황
          </p>
          <textarea
            value={values.openingScene || values.introScenarios[0]?.scene || ""}
            onChange={(e) => {
              setField("openingScene", e.target.value)
            }}
            placeholder="예: 비가 쏟아지는 저녁, 서점 문에 달린 종소리가 울리며 누군가 들어선다."
            rows={4}
            className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>
      </Section>

      {/* 7. 상세 비주얼 & 분위기 설정 */}
      <Section
        id="advanced"
        icon={Plus}
        title="상세 비주얼 & 분위기"
        badge="선택"
        openId={openId}
        setOpenId={setOpenId}
      >
        <div>
          <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            분위기
          </p>
          <input
            type="text"
            value={values.mood}
            onChange={(e) => setField("mood", e.target.value)}
            placeholder="예: 신비롭고 아늑함, 장엄하고 쓸쓸함"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>
        <div>
          <ImageUploadField
            label="대표 이미지"
            value={values.coverImageUrl}
            onChange={(url) => setField("coverImageUrl", url ?? "")}
          />
        </div>
      </Section>
    </div>
  )
}
