"use client"

import { useMemo, useState } from "react"
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  Globe,
  Heart,
  IdCard,
  Image as ImageIcon,
  Layers,
  Lock,
  MessageCircle,
  Plus,
  Save,
  Smile,
  Sparkles,
  Upload,
  User,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { ImageUploadField } from "@/components/create/image-upload-field"
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
import { CharacterForm } from "@/components/create/character-form"
import type {
  StoryCharacter,
  StoryPersona,
  StoryWorld,
} from "@/lib/storychat-storage"

// ─────────────────────────────────────────────
// 공통 레이아웃
// ─────────────────────────────────────────────

interface ScreenShellProps {
  /** 헤더에 표시할 제목 */
  title: string
  /** 뒤로가기 콜백 */
  onBack: () => void
  /** 하단 저장 버튼 비활성 여부 */
  saveDisabled?: boolean
  /** 저장 버튼 클릭 */
  onSave: () => void
  /** 저장 버튼 레이블 */
  saveLabel?: string
  /** 임시저장 버튼 클릭 (없으면 미노출) */
  onDraftSave?: () => void
  children: React.ReactNode
}

function ScreenShell({
  title,
  onBack,
  saveDisabled,
  onSave,
  saveLabel = "저장",
  onDraftSave,
  children,
}: ScreenShellProps) {
  const [exitOpen, setExitOpen] = useState(false)

  const handleBack = () => {
    if (onDraftSave) {
      setExitOpen(true)
    } else {
      onBack()
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white dark:bg-neutral-950">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-neutral-100 bg-white/95 px-5 py-3 backdrop-blur dark:border-neutral-800/60 dark:bg-neutral-950/95">
        <button
          type="button"
          onClick={handleBack}
          aria-label="뒤로 가기"
          className="-ml-1 rounded-full p-1 text-neutral-900 transition-colors active:bg-neutral-100 dark:text-neutral-100 dark:active:bg-neutral-800"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-base font-medium text-neutral-900 dark:text-neutral-100">
          {title}
        </h1>
        {onDraftSave && (
          <button
            type="button"
            onClick={() => {
              onDraftSave()
              toast("임시저장했어요.")
            }}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 transition-colors active:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:active:bg-neutral-800"
          >
            <Save size={13} />
            임시저장
          </button>
        )}
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto px-5 pb-32 pt-5">{children}</div>

      {/* 하단 저장 버튼 */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-neutral-100 bg-white/95 px-5 pb-[env(safe-area-inset-bottom,16px)] pt-3 backdrop-blur dark:border-neutral-800/60 dark:bg-neutral-950/95">
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-500 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500"
        >
          {saveLabel}
        </button>
      </div>

      {/* 나가기 확인 다이얼로그 */}
      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent className="w-[min(calc(100vw-2rem),340px)] gap-0 rounded-[20px] border-0 bg-white px-5 pb-5 pt-6 shadow-2xl shadow-black/20 dark:bg-neutral-900 sm:max-w-none">
          <AlertDialogCancel
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border-0 bg-transparent p-0 shadow-none"
            aria-label="닫기"
          >
            <X size={15} className="text-neutral-400" />
          </AlertDialogCancel>

          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950">
            <Save size={20} className="text-blue-600 dark:text-blue-400" />
          </div>

          <AlertDialogHeader className="gap-1.5 text-left">
            <AlertDialogTitle className="text-[17px] font-medium text-neutral-900 dark:text-neutral-100">
              임시 저장할까요?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              작성 중인 내용이 있어요. 임시저장하면 다음에 이어서 작성할 수
              있어요.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-5 flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={() => {
                onDraftSave?.()
                onBack()
              }}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-blue-500 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              임시저장 후 나가기
            </AlertDialogAction>
            <button
              type="button"
              onClick={onBack}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-transparent text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              저장 안 함
            </button>
            <AlertDialogCancel className="flex h-11 w-full items-center justify-center rounded-xl border-0 bg-transparent text-sm font-medium text-neutral-500 shadow-none transition-colors hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800">
              취소
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─────────────────────────────────────────────
// 섹션 헤더 (화면 상단 설명 영역)
// ─────────────────────────────────────────────

function ScreenHeader({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
}: {
  icon: typeof User
  iconBg: string
  iconColor: string
  title: string
  description: string
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Icon size={22} className={iconColor} />
      </div>
      <div>
        <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
          {title}
        </h2>
        <p className="mt-0.5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 1. 캐릭터 만들기 화면
// ─────────────────────────────────────────────

interface CharacterCreateScreenProps {
  initialValue: StoryCharacter
  onBack: () => void
  onSave: (character: StoryCharacter) => void
  onDraftSave?: (character: StoryCharacter) => void
}

export function CharacterCreateScreen({
  initialValue,
  onBack,
  onSave,
  onDraftSave,
}: CharacterCreateScreenProps) {
  const [draft, setDraft] = useState<StoryCharacter>(initialValue)

  const isReady = draft.name.trim().length > 0

  return (
    <ScreenShell
      title="캐릭터 만들기"
      onBack={onBack}
      saveDisabled={!isReady}
      onSave={() => onSave(draft)}
      saveLabel="내 캐릭터에 저장"
      onDraftSave={onDraftSave ? () => onDraftSave(draft) : undefined}
    >
      <ScreenHeader
        icon={User}
        iconBg="bg-lime-50 dark:bg-lime-950"
        iconColor="text-lime-700 dark:text-lime-300"
        title="캐릭터 만들기"
        description="채팅에서 함께할 캐릭터의 이름, 성격, 말투 등을 설정해요."
      />

      <CharacterForm value={draft} onChange={setDraft} formMode="advanced" />

      {!isReady && (
        <p className="mt-4 text-center text-xs text-neutral-400 dark:text-neutral-500">
          이름을 입력하면 저장할 수 있어요.
        </p>
      )}
    </ScreenShell>
  )
}

// ─────────────────────────────────────────────
// 2. 세계관 만들기 화면
// ─────────────────────────────────────────────

interface WorldCreateScreenProps {
  initialValue: StoryWorld
  onBack: () => void
  onSave: (world: StoryWorld) => void
  onDraftSave?: (world: StoryWorld) => void
  /** 세계관 폼 컴포넌트 (create/page.tsx 내부 WorldForm 재사용) */
  WorldFormComponent: React.ComponentType<{
    value: StoryWorld
    onChange: (value: StoryWorld) => void
  }>
}

export function WorldCreateScreen({
  initialValue,
  onBack,
  onSave,
  onDraftSave,
  WorldFormComponent,
}: WorldCreateScreenProps) {
  const [draft, setDraft] = useState<StoryWorld>(initialValue)

  const isReady = draft.name.trim().length > 0

  return (
    <ScreenShell
      title="세계관 만들기"
      onBack={onBack}
      saveDisabled={!isReady}
      onSave={() => onSave(draft)}
      saveLabel="내 세계관에 저장"
      onDraftSave={onDraftSave ? () => onDraftSave(draft) : undefined}
    >
      <ScreenHeader
        icon={BookOpen}
        iconBg="bg-amber-50 dark:bg-amber-950"
        iconColor="text-amber-700 dark:text-amber-300"
        title="세계관 만들기"
        description="이야기가 펼쳐질 배경, 규칙, 분위기를 설정해요."
      />

      <WorldFormComponent value={draft} onChange={setDraft} />

      {!isReady && (
        <p className="mt-4 text-center text-xs text-neutral-400 dark:text-neutral-500">
          세계관 이름을 입력하면 저장할 수 있어요.
        </p>
      )}
    </ScreenShell>
  )
}

// ─────────────────────────────────────────────
// 3. 자아 만들기 화면 (새 디자인 폼)
// ─────────────────────────────────────────────

type FieldType = "input" | "select" | "textarea" | "upload"

interface FieldConfig {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  options?: string[]
  half?: boolean
}

interface SectionConfig {
  id: string
  icon: typeof IdCard
  title: string
  required: boolean
  fields: FieldConfig[]
}

const PERSONA_SECTIONS: SectionConfig[] = [
  {
    id: "basic",
    icon: IdCard,
    title: "기본 정보",
    required: true,
    fields: [
      { key: "profileImage", label: "프로필 사진", type: "upload" },
      { key: "name", label: "자아 이름", type: "input", placeholder: "자아 이름" },
      {
        key: "gender",
        label: "성별",
        type: "select",
        options: ["설정하지 않음", "여성", "남성", "논바이너리"],
        half: true,
      },
      { key: "age", label: "나이", type: "input", placeholder: "나이", half: true },
      { key: "job", label: "직업/신분", type: "input", placeholder: "예: 대학생" },
      { key: "intro", label: "한 줄 소개", type: "input", placeholder: "나를 한 문장으로 소개해 주세요" },
    ],
  },
  {
    id: "talk",
    icon: MessageCircle,
    title: "성격 & 대화",
    required: false,
    fields: [
      { key: "personality", label: "성격", type: "textarea", placeholder: "예: 낯을 가리지만 친해지면 장난이 많음" },
      { key: "speechStyle", label: "말투", type: "textarea", placeholder: "예: 편한 반말, 이모티콘을 자주 씀" },
    ],
  },
  {
    id: "look",
    icon: ImageIcon,
    title: "외형",
    required: false,
    fields: [
      { key: "appearance", label: "외형", type: "textarea", placeholder: "구체적인 외모 묘사" },
    ],
  },
  {
    id: "relation",
    icon: Heart,
    title: "관계",
    required: false,
    fields: [
      { key: "relationToCharacter", label: "캐릭터와의 관계", type: "input", placeholder: "예: 소꿉친구, 동료, 처음 만난 사이" },
    ],
  },
  {
    id: "secret",
    icon: Lock,
    title: "비밀 & 제약",
    required: false,
    fields: [
      { key: "secret", label: "비밀 설정", type: "textarea", placeholder: "나만 아는 비밀" },
      { key: "preferredDevelopment", label: "선호 전개", type: "textarea", placeholder: "선호하는 전개 방향" },
      { key: "forbiddenDevelopment", label: "금지 전개", type: "textarea", placeholder: "일어나지 않아야 할 전개" },
    ],
  },
]

type FormValues = Record<string, string>

function personaToFormValues(persona?: StoryPersona): FormValues {
  const genderMap: Record<string, string> = {
    female: "여성",
    male: "남성",
    nonbinary: "논바이너리",
    unknown: "설정하지 않음",
  }
  return {
    profileImage: persona?.avatarUrl ?? "",
    name: persona?.name ?? "",
    gender: genderMap[persona?.gender ?? "unknown"] ?? "설정하지 않음",
    age: persona?.age ?? "",
    job: persona?.role ?? "",
    intro: persona?.summary ?? "",
    personality: persona?.personality ?? "",
    speechStyle: persona?.speechStyle ?? "",
    appearance: persona?.appearance ?? "",
    relationToCharacter: persona?.relationship ?? "",
    secret: persona?.secret ?? "",
    preferredDevelopment: persona?.preferredDevelopments ?? "",
    forbiddenDevelopment: persona?.forbiddenDevelopments ?? "",
  }
}

function formValuesToPersona(values: FormValues, initial?: StoryPersona): StoryPersona {
  const genderReverseMap: Record<string, "male" | "female" | "nonbinary" | "unknown"> = {
    "여성": "female",
    "남성": "male",
    "논바이너리": "nonbinary",
    "설정하지 않음": "unknown",
  }
  return {
    id: initial?.id || "",
    name: values.name || "",
    gender: genderReverseMap[values.gender] ?? "unknown",
    genderCustom: initial?.genderCustom || "",
    age: values.age || "",
    role: values.job || "",
    summary: values.intro || "",
    personality: values.personality || "",
    speechStyle: values.speechStyle || "",
    appearance: values.appearance || "",
    relationship: values.relationToCharacter || "",
    secret: values.secret || "",
    preferredDevelopments: values.preferredDevelopment || "",
    forbiddenDevelopments: values.forbiddenDevelopment || "",
    avatarUrl: values.profileImage || undefined,
    createdAt: initial?.createdAt || "",
  }
}

interface PersonaCreateScreenProps {
  initialValue?: StoryPersona
  onBack: () => void
  onSave: (persona: StoryPersona) => void
  onDraftSave?: (persona: StoryPersona) => void
  PersonaFormComponent?: unknown
}

export function PersonaCreateScreen({
  initialValue,
  onBack,
  onSave,
  onDraftSave,
}: PersonaCreateScreenProps) {
  const [values, setValues] = useState<FormValues>(() => personaToFormValues(initialValue))
  const [openId, setOpenId] = useState<string>("basic")

  const canSave = (values.name ?? "").trim().length > 0

  const totalFieldCount = useMemo(
    () => PERSONA_SECTIONS.reduce((sum, sec) => sum + sec.fields.length, 0),
    [],
  )

  const filledCount = useMemo(() => {
    let count = 0
    for (const section of PERSONA_SECTIONS) {
      for (const field of section.fields) {
        const val = (values[field.key] ?? "").trim()
        if (field.key === "gender") {
          if (val && val !== "설정하지 않음") count++
        } else {
          if (val.length > 0) count++
        }
      }
    }
    return count
  }, [values])

  const setField = (key: string, value: string) =>
    setValues((v) => ({ ...v, [key]: value }))

  const handleSave = () => {
    if (!canSave) return
    onSave(formValuesToPersona(values, initialValue))
  }

  const handleSaveDraft = () => {
    if (onDraftSave) {
      onDraftSave(formValuesToPersona(values, initialValue))
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white px-5 pt-4 pb-24 dark:bg-neutral-950">
      {/* 헤더 */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="뒤로 가기"
            className="-ml-1 p-1 text-neutral-900 dark:text-neutral-100"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
            자아 만들기
          </h1>
        </div>
        {onDraftSave && (
          <button
            type="button"
            onClick={() => {
              handleSaveDraft()
              toast("임시저장했어요.")
            }}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
          >
            <Save size={13} />
            임시저장
          </button>
        )}
      </div>

      {/* 소개 */}
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-950">
          <Smile size={18} className="text-violet-700 dark:text-violet-300" />
        </div>
        <div>
          <p className="mb-1 text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
            자아 만들기
          </p>
          <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            채팅에서 내가 맡을 역할이에요. 캐릭터와 달리 &apos;나 자신&apos;을
            표현해요.
          </p>
        </div>
      </div>

      {/* 전체 진행률 프로그레스 바 */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">전체 진행률</span>
          <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
            {filledCount} / {totalFieldCount} 항목 ({Math.round((filledCount / Math.max(1, totalFieldCount)) * 100)}%)
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className="h-full bg-violet-500 transition-all duration-300 dark:bg-violet-400"
            style={{ width: `${Math.round((filledCount / Math.max(1, totalFieldCount)) * 100)}%` }}
          />
        </div>
      </div>

      {/* 안내 배너 */}
      <div className="mb-5 rounded-xl bg-violet-50 p-4 text-sm leading-relaxed text-violet-800 dark:bg-violet-950/60 dark:text-violet-300">
        자아는 채팅에서 여러분 자신의 역할이에요. 이름, 직업, 관계 등을
        설정하면 AI가 그에 맞춰 대화해요.
      </div>

      {/* 폼 섹션 */}
      <div className="flex-1">
        {PERSONA_SECTIONS.map((section) => {
          const isOpen = openId === section.id
          const Icon = section.icon
          return (
            <div
              key={section.id}
              className={`mb-2.5 rounded-xl px-3.5 ${
                isOpen
                  ? "border-2 border-violet-500 dark:border-violet-400"
                  : "border border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? "" : section.id)}
                className="flex w-full items-center gap-2.5 py-3.5 text-left"
              >
                <Icon size={17} className="text-violet-600 dark:text-violet-400" />
                <span className="flex-1 text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
                  {section.title}
                </span>
                {section.required && (
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                    필수
                  </span>
                )}
                <ChevronDown
                  size={15}
                  className={`text-neutral-400 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="flex flex-col gap-3 pb-4 pl-6">
                  <PersonaFieldGrid
                    fields={section.fields}
                    values={values}
                    onChange={setField}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 하단 저장 바 */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-neutral-100 bg-white px-5 py-3 dark:border-neutral-900 dark:bg-neutral-950">
        {!canSave && (
          <p className="mb-2 text-center text-xs text-neutral-400 dark:text-neutral-600">
            이름을 입력하면 저장할 수 있어요.
          </p>
        )}
        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-violet-500 text-sm font-medium text-white transition-colors disabled:bg-neutral-200 disabled:text-neutral-400 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600"
        >
          내 자아에 저장
        </button>
      </div>
    </div>
  )
}

function PersonaFieldGrid({
  fields,
  values,
  onChange,
}: {
  fields: FieldConfig[]
  values: FormValues
  onChange: (key: string, value: string) => void
}) {
  const rows: FieldConfig[][] = []
  let i = 0
  while (i < fields.length) {
    const f = fields[i]
    if (f.half && fields[i + 1]?.half) {
      rows.push([f, fields[i + 1]])
      i += 2
    } else {
      rows.push([f])
      i += 1
    }
  }

  return (
    <>
      {rows.map((row, idx) => (
        <div key={idx} className={row.length === 2 ? "grid grid-cols-2 gap-3" : ""}>
          {row.map((field) => (
            <PersonaSingleField
              key={field.key}
              field={field}
              value={values[field.key] ?? ""}
              onChange={(v) => onChange(field.key, v)}
            />
          ))}
        </div>
      ))}
    </>
  )
}

function PersonaSingleField({
  field,
  value,
  onChange,
}: {
  field: FieldConfig
  value: string
  onChange: (v: string) => void
}) {
  const baseClass =
    "w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-violet-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"

  if (field.type === "upload") {
    return (
      <ImageUploadField
        label={field.label}
        value={value}
        onChange={(v) => onChange(v ?? "")}
      />
    )
  }

  return (
    <div>
      <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400">
        {field.label}
      </p>
      {field.type === "input" && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`h-11 ${baseClass}`}
        />
      )}
      {field.type === "select" && (
        <select
          value={value || field.options?.[0]}
          onChange={(e) => onChange(e.target.value)}
          className={`h-11 ${baseClass}`}
        >
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
      {field.type === "textarea" && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={`resize-none py-2.5 ${baseClass}`}
        />
      )}
    </div>
  )
}


// ─────────────────────────────────────────────
// 4. 작품 만들기 화면 (캐릭터 + 세계관 연결)
// ─────────────────────────────────────────────

export interface WorkCreateData {
  title: string
  characterId: string
  worldId: string
  relationship?: string
  openingScene?: string
}

interface WorkCreateScreenProps {
  characters: Array<{ id: string; name: string; emoji?: string; role?: string; summary?: string }>
  worlds: Array<{ id: string; name: string; genre?: string; coreSetting?: string }>
  onBack: () => void
  onSave: (data: WorkCreateData) => void
  onDraftSave?: (data: WorkCreateData) => void
  onGoCreateCharacter: () => void
  onGoCreateWorld: () => void
}

interface LibraryItem {
  id: string
  name: string
  description: string
}

export function WorkCreateScreen({
  characters,
  worlds,
  onBack,
  onSave,
  onDraftSave,
  onGoCreateCharacter,
  onGoCreateWorld,
}: WorkCreateScreenProps) {
  const [values, setValues] = useState<WorkCreateData>({
    title: "",
    characterId: "",
    worldId: "",
    relationship: "",
    openingScene: "",
  })
  const [openId, setOpenId] = useState<string>("basic")

  const characterItems: LibraryItem[] = characters.map((c) => ({
    id: c.id,
    name: `${c.emoji ? c.emoji + " " : ""}${c.name}`,
    description: c.role || c.summary || "캐릭터",
  }))

  const worldItems: LibraryItem[] = worlds.map((w) => ({
    id: w.id,
    name: w.name,
    description: (w.genre ? String(w.genre) + " · " : "") + (w.coreSetting || "세계관"),
  }))

  const selectedCharacter = characters.find((c) => c.id === values.characterId)
  const selectedWorld = worlds.find((w) => w.id === values.worldId)

  const canSave =
    values.title.trim().length > 0 && values.characterId !== "" && values.worldId !== ""

  const setField = <K extends keyof WorkCreateData>(key: K, value: WorkCreateData[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const handleSave = () => {
    if (!canSave) return
    onSave(values)
  }

  const handleSaveDraft = () => {
    if (onDraftSave) {
      onDraftSave(values)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white px-5 pt-4 pb-24 dark:bg-neutral-950">
      {/* 헤더 */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="뒤로 가기"
            className="-ml-1 p-1 text-neutral-900 dark:text-neutral-100"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
            작품 만들기
          </h1>
        </div>
        {onDraftSave && (
          <button
            type="button"
            onClick={() => {
              handleSaveDraft()
              toast("임시저장했어요.")
            }}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
          >
            <Save size={13} />
            임시저장
          </button>
        )}
      </div>

      {/* 지금 만들고 있는 조합 - 상단 고정 미리보기 */}
      <div className="mb-5 rounded-xl bg-blue-50 p-3.5 dark:bg-blue-950/40">
        <p className="mb-2 text-[11px] font-medium text-blue-700 dark:text-blue-300">
          지금 만들고 있는 조합
        </p>
        <div className="flex gap-4 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="flex items-center gap-1">
            <User size={13} />
            {selectedCharacter?.name ?? "미선택"}
          </span>
          <span className="flex items-center gap-1">
            <Globe size={13} />
            {selectedWorld?.name ?? "미선택"}
          </span>
        </div>
      </div>

      <div className="flex-1">
        {/* 기본 정보 */}
        <WorkSection
          id="basic"
          icon={IdCard}
          title="기본 정보"
          badge="필수"
          openId={openId}
          setOpenId={setOpenId}
        >
          <div>
            <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              작품 이름
            </p>
            <input
              value={values.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="예: 달빛 서점"
              className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </div>
        </WorkSection>

        {/* 캐릭터 선택 */}
        <WorkSection
          id="character"
          icon={User}
          title="캐릭터 선택"
          badge="필수"
          openId={openId}
          setOpenId={setOpenId}
        >
          <LibraryPicker
            items={characterItems}
            selectedId={values.characterId}
            onSelect={(id) => setField("characterId", id)}
            onCreateNew={onGoCreateCharacter}
            createLabel="새 캐릭터 만들기"
          />
        </WorkSection>

        {/* 세계관 선택 */}
        <WorkSection
          id="world"
          icon={Globe}
          title="세계관 선택"
          badge="필수"
          openId={openId}
          setOpenId={setOpenId}
        >
          <LibraryPicker
            items={worldItems}
            selectedId={values.worldId}
            onSelect={(id) => setField("worldId", id)}
            onCreateNew={onGoCreateWorld}
            createLabel="새 세계관 만들기"
          />
        </WorkSection>

        {/* 관계 & 초기 설정 */}
        <WorkSection
          id="relation"
          icon={Heart}
          title="관계 & 초기 설정"
          badge="선택"
          openId={openId}
          setOpenId={setOpenId}
        >
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                캐릭터와의 관계
              </p>
              <input
                value={values.relationship ?? ""}
                onChange={(e) => setField("relationship", e.target.value)}
                placeholder="예: 단골 손님, 오랜 친구"
                className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                초기 상황
              </p>
              <textarea
                value={values.openingScene ?? ""}
                onChange={(e) => setField("openingScene", e.target.value)}
                placeholder="이야기가 시작되는 상황을 적어주세요"
                rows={3}
                className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              />
            </div>
          </div>
        </WorkSection>
      </div>

      {/* 하단 저장 바 */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-neutral-100 bg-white px-5 py-3 dark:border-neutral-900 dark:bg-neutral-950">
        {!canSave && (
          <p className="mb-2 text-center text-xs text-neutral-400 dark:text-neutral-600">
            작품 이름, 캐릭터, 세계관을 채우면 저장할 수 있어요.
          </p>
        )}
        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-500 text-sm font-medium text-white transition-colors disabled:bg-neutral-200 disabled:text-neutral-400 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600"
        >
          작품 저장하고 채팅 시작하기
        </button>
      </div>
    </div>
  )
}

function WorkSection({
  id,
  icon: Icon,
  title,
  badge,
  openId,
  setOpenId,
  children,
}: {
  id: string
  icon: typeof User
  title: string
  badge: string
  openId: string
  setOpenId: (id: string) => void
  children: React.ReactNode
}) {
  const isOpen = openId === id
  return (
    <div
      className={`mb-2.5 rounded-xl px-3.5 ${
        isOpen
          ? "border-2 border-blue-500 dark:border-blue-400"
          : "border border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpenId(isOpen ? "" : id)}
        className="flex w-full items-center gap-2.5 py-3.5 text-left"
      >
        <Icon size={17} className="text-blue-600 dark:text-blue-400" />
        <span className="flex-1 text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
          {title}
        </span>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {badge}
        </span>
        <ChevronDown
          size={15}
          className={`text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && <div className="pb-4 pl-6">{children}</div>}
    </div>
  )
}

function LibraryPicker({
  items,
  selectedId,
  onSelect,
  onCreateNew,
  createLabel,
}: {
  items: LibraryItem[]
  selectedId: string
  onSelect: (id: string) => void
  onCreateNew: () => void
  createLabel: string
}) {
  if (items.length === 0) {
    return (
      <button
        type="button"
        onClick={onCreateNew}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 py-3 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
      >
        <Plus size={15} />
        {createLabel}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const active = selectedId === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
              active
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                : "border-neutral-200 dark:border-neutral-800"
            }`}
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {item.name}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {item.description}
              </p>
            </div>
            {active && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
          </button>
        )
      })}
      <button
        type="button"
        onClick={onCreateNew}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 py-2.5 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
      >
        <Plus size={14} />
        {createLabel}
      </button>
    </div>
  )
}

