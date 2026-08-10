"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleUserRound,
  Sparkles,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react"
import {
  createId,
  defaultLibrary,
  saveStoryChatLibrary,
  type StoryChatLibrary,
  type StoryCharacterGender,
  type StoryPersona,
  type StoryWork,
} from "@/lib/storychat-storage"
import { cn } from "@/lib/utils"

interface PersonaSelectModalProps {
  isOpen: boolean
  onClose: () => void
  work: StoryWork
  library: StoryChatLibrary
  onPersonaSelect: (personaId: string, library: StoryChatLibrary) => void
}

type PersonaModalView = "author" | "select" | "create"

export function PersonaSelectModal({
  isOpen,
  onClose,
  work,
  library,
  onPersonaSelect,
}: PersonaSelectModalProps) {
  const authorPersona = library.personas.find((persona) => persona.id === work.personaId)
  const defaultPersona =
    library.personas.find((persona) => persona.id === defaultLibrary.personas[0]?.id) ??
    defaultLibrary.personas[0]
  const savedPersonas = useMemo(
    () =>
      library.personas.filter(
        (persona) => persona.id !== defaultPersona?.id && persona.id !== authorPersona?.id,
      ),
    [authorPersona?.id, defaultPersona?.id, library.personas],
  )
  const firstAlternativePersonaId = defaultPersona?.id !== authorPersona?.id
    ? defaultPersona?.id ?? savedPersonas[0]?.id ?? ""
    : savedPersonas[0]?.id ?? ""

  const [view, setView] = useState<PersonaModalView>(authorPersona ? "author" : "select")
  const [selectedPersonaId, setSelectedPersonaId] = useState(firstAlternativePersonaId)
  const [name, setName] = useState("")
  const [gender, setGender] = useState<StoryCharacterGender>("unknown")
  const [age, setAge] = useState("")
  const [role, setRole] = useState("")
  const [summary, setSummary] = useState("")
  const [personality, setPersonality] = useState("")
  const [speechStyle, setSpeechStyle] = useState("")
  const [relationship, setRelationship] = useState("")

  useEffect(() => {
    if (!isOpen) return
    setView(authorPersona ? "author" : "select")
    setSelectedPersonaId(firstAlternativePersonaId)
  }, [authorPersona, firstAlternativePersonaId, isOpen, work.id])

  if (!isOpen) return null

  const selectPersona = (personaId: string, nextLibrary = library) => {
    if (!personaId) return
    onPersonaSelect(personaId, nextLibrary)
  }

  const handleCreateAndSelect = () => {
    if (!name.trim()) return

    const newPersona: StoryPersona = {
      id: createId("persona"),
      name: name.trim(),
      gender,
      genderCustom: "",
      age: age.trim(),
      role: role.trim(),
      summary: summary.trim(),
      personality: personality.trim(),
      speechStyle: speechStyle.trim(),
      appearance: "",
      relationship: relationship.trim(),
      secret: "",
      preferredDevelopments: "",
      forbiddenDevelopments: "",
      createdAt: new Date().toLocaleDateString("ko-KR"),
    }
    const nextLibrary = {
      ...library,
      personas: [newPersona, ...library.personas],
    }

    saveStoryChatLibrary(nextLibrary)
    selectPersona(newPersona.id, nextLibrary)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 p-4 dark:border-neutral-800">
          <div className="flex min-w-0 items-start gap-2.5">
            {view !== "author" && authorPersona && (
              <button
                type="button"
                onClick={() => setView("author")}
                aria-label="이전"
                className="mt-0.5 rounded-full p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <ArrowLeft size={17} />
              </button>
            )}
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-base font-bold text-neutral-900 dark:text-neutral-100">
                <Sparkles className="h-4 w-4 text-blue-500" />
                {view === "author" ? "어떤 자아로 시작할까요?" : "대화 자아 선택"}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                {view === "author"
                  ? "작가가 설정한 자아를 사용하거나 다른 자아를 선택할 수 있습니다."
                  : "기본 자아 또는 내가 만든 자아를 선택해 주세요."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <X size={18} />
          </button>
        </div>

        {view !== "author" && (
          <div className="grid grid-cols-2 gap-1 border-b border-neutral-100 bg-neutral-50/60 p-1 dark:border-neutral-800 dark:bg-neutral-950/30">
            <button
              type="button"
              onClick={() => setView("select")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors",
                view === "select"
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200",
              )}
            >
              <UserCheck size={14} />
              저장된 자아
            </button>
            <button
              type="button"
              onClick={() => setView("create")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors",
                view === "create"
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200",
              )}
            >
              <UserPlus size={14} />
              지금 바로 생성
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {view === "author" && authorPersona && (
            <div className="space-y-3">
              <PersonaCard
                persona={authorPersona}
                badge="작가 설정"
                selected
                onClick={() => selectPersona(authorPersona.id)}
              />
              <button
                type="button"
                onClick={() => setView("select")}
                className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white p-3.5 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    <CircleUserRound size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      다른 자아로 시작
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      기본 자아, 저장된 자아 또는 새 자아를 사용합니다.
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-neutral-400" />
              </button>
            </div>
          )}

          {view === "select" && (
            <div className="space-y-4">
              {defaultPersona && defaultPersona.id !== authorPersona?.id && (
                <PersonaGroup title="기본 자아">
                  <PersonaCard
                    persona={defaultPersona}
                    badge="기본"
                    selected={selectedPersonaId === defaultPersona.id}
                    onClick={() => setSelectedPersonaId(defaultPersona.id)}
                  />
                </PersonaGroup>
              )}

              <PersonaGroup title="내가 만든 자아">
                {savedPersonas.length > 0 ? (
                  <div className="space-y-2">
                    {savedPersonas.map((persona) => (
                      <PersonaCard
                        key={persona.id}
                        persona={persona}
                        selected={selectedPersonaId === persona.id}
                        onClick={() => setSelectedPersonaId(persona.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setView("create")}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-300 py-5 text-xs text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                  >
                    <UserPlus size={14} />
                    지금 바로 자아 만들기
                  </button>
                )}
              </PersonaGroup>
            </div>
          )}

          {view === "create" && (
            <div className="space-y-3.5">
              <PersonaInput label="자아 이름" required value={name} onChange={setName} placeholder="예: 김민지" />
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">성별</span>
                  <select
                    value={gender}
                    onChange={(event) => setGender(event.target.value as StoryCharacterGender)}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                  >
                    <option value="unknown">설정하지 않음</option>
                    <option value="female">여성</option>
                    <option value="male">남성</option>
                    <option value="nonbinary">논바이너리/기타</option>
                  </select>
                </label>
                <PersonaInput label="나이" value={age} onChange={setAge} placeholder="예: 24" />
              </div>
              <PersonaInput label="역할 / 신분" value={role} onChange={setRole} placeholder="예: 대학생" />
              <PersonaInput label="한 줄 소개" value={summary} onChange={setSummary} placeholder="예: 호기심이 많고 주관이 뚜렷함" />
              <PersonaInput
                label="캐릭터와의 관계"
                value={relationship}
                onChange={setRelationship}
                placeholder="예: 같은 회사의 입사 동기"
              />
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">성격</span>
                <textarea
                  rows={3}
                  value={personality}
                  onChange={(event) => setPersonality(event.target.value)}
                  placeholder="예: 당당하고 직설적이지만 속정이 깊음"
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">말투</span>
                <textarea
                  rows={2}
                  value={speechStyle}
                  onChange={(event) => setSpeechStyle(event.target.value)}
                  placeholder="예: 차분한 반말을 쓰고 감정은 솔직하게 표현함"
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            취소
          </button>
          {view === "author" && authorPersona && (
            <button
              type="button"
              onClick={() => selectPersona(authorPersona.id)}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              작가 설정 자아로 시작
            </button>
          )}
          {view === "select" && (
            <button
              type="button"
              disabled={!selectedPersonaId}
              onClick={() => selectPersona(selectedPersonaId)}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              선택한 자아로 시작
            </button>
          )}
          {view === "create" && (
            <button
              type="button"
              disabled={!name.trim()}
              onClick={handleCreateAndSelect}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              생성하고 시작
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PersonaGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">{title}</p>
      {children}
    </section>
  )
}

function PersonaCard({
  persona,
  badge,
  selected,
  onClick,
}: {
  persona: StoryPersona
  badge?: string
  selected?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start justify-between rounded-xl border p-3.5 text-left transition-colors",
        selected
          ? "border-blue-500 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/30"
          : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/50",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-sm font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {persona.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={persona.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            persona.name.trim().slice(0, 1) || "나"
          )}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {persona.name || "이름 없음"}
            </span>
            {badge && (
              <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {badge}
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-neutral-500 dark:text-neutral-400">
            {[persona.age && `${persona.age}세`, persona.role].filter(Boolean).join(" · ") || "설정 없음"}
          </span>
          {persona.summary && (
            <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              {persona.summary}
            </span>
          )}
        </span>
      </div>
      <span
        className={cn(
          "ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-blue-500 bg-blue-500" : "border-neutral-300 dark:border-neutral-700",
        )}
      >
        {selected && <Check size={12} className="text-white" />}
      </span>
    </button>
  )
}

function PersonaInput({
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
      />
    </label>
  )
}
