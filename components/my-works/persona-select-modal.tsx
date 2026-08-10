"use client"

import { useState } from "react"
import { Sparkles, UserPlus, Check, X, UserCheck } from "lucide-react"
import type { StoryPersona, StoryChatLibrary, StoryWork } from "@/lib/storychat-storage"
import { createId, saveStoryChatLibrary } from "@/lib/storychat-storage"

interface PersonaSelectModalProps {
  isOpen: boolean
  onClose: () => void
  work: StoryWork
  library: StoryChatLibrary
  onPersonaSelect: (personaId: string) => void
}

export function PersonaSelectModal({
  isOpen,
  onClose,
  work,
  library,
  onPersonaSelect,
}: PersonaSelectModalProps) {
  const [activeTab, setActiveTab] = useState<"select" | "create">("select")
  
  // 폼 입력 상태 (새 자아 생성용)
  const [name, setName] = useState("")
  const [gender, setGender] = useState<"female" | "male" | "nonbinary" | "unknown">("female")
  const [age, setAge] = useState("")
  const [role, setRole] = useState("")
  const [summary, setSummary] = useState("")
  const [personality, setPersonality] = useState("")

  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(
    library.personas[0]?.id || ""
  )

  if (!isOpen) return null

  const availablePersonas = library.personas || []

  // 기존 자아 선택 완료
  const handleConfirmSelect = () => {
    if (!selectedPersonaId) return
    onPersonaSelect(selectedPersonaId)
  }

  // 새 자아 작성 및 추가 제출
  const handleCreateAndSelect = () => {
    if (!name.trim()) return

    const newPersona: StoryPersona = {
      id: createId("p"),
      name: name.trim(),
      gender,
      age: age.trim() || "",
      role: role.trim() || "",
      summary: summary.trim() || "",
      personality: personality.trim() || "",
      speechStyle: "",
      appearance: "",
      relationship: "",
      secret: "",
      preferredDevelopments: "",
      forbiddenDevelopments: "",
      createdAt: new Date().toLocaleDateString("ko-KR"),
    }

    const updatedLibrary: StoryChatLibrary = {
      ...library,
      personas: [newPersona, ...library.personas],
    }

    saveStoryChatLibrary(updatedLibrary)
    onPersonaSelect(newPersona.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-neutral-100 p-4 dark:border-neutral-800">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-neutral-900 dark:text-neutral-100">
              <Sparkles className="h-4 w-4 text-amber-500" />
              대화에 사용할 자아(페르소나) 설정
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              작품에 자아가 설정되어 있지 않습니다. 시작할 자아를 선택해 주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* 탭 버튼 */}
        <div className="flex border-b border-neutral-100 bg-neutral-50/50 p-1 dark:border-neutral-800 dark:bg-neutral-900/50">
          <button
            type="button"
            onClick={() => setActiveTab("select")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
              activeTab === "select"
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            <UserCheck size={14} />
            기존 자아에서 선택 ({availablePersonas.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
              activeTab === "create"
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            <UserPlus size={14} />
            새 자아 직접 작성
          </button>
        </div>

        {/* 탭 내용 */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "select" ? (
            <div className="space-y-2.5">
              {availablePersonas.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    저장된 자아가 없습니다. &apos;새 자아 직접 작성&apos; 탭에서 자아를 등록해 주세요!
                  </p>
                </div>
              ) : (
                availablePersonas.map((persona) => {
                  const isSelected = selectedPersonaId === persona.id
                  return (
                    <div
                      key={persona.id}
                      onClick={() => setSelectedPersonaId(persona.id)}
                      className={`flex cursor-pointer items-start justify-between rounded-xl border p-3.5 transition-all ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/5 dark:bg-amber-500/10"
                          : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                            {persona.name}
                          </span>
                          {persona.age && (
                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              · {persona.age}세
                            </span>
                          )}
                        </div>
                        {persona.summary && (
                          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                            {persona.summary}
                          </p>
                        )}
                        {persona.role && (
                          <span className="mt-1.5 inline-block rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-600 dark:text-neutral-400">
                            {persona.role}
                          </span>
                        )}
                      </div>
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700">
                        {isSelected && <Check size={12} className="text-amber-500" />}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  자아 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 김민지, 강현우"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-amber-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    성별
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-amber-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                  >
                    <option value="female">여성</option>
                    <option value="male">남성</option>
                    <option value="nonbinary">논바이너리</option>
                    <option value="unknown">기타/미정</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    나이
                  </label>
                  <input
                    type="text"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="예: 24"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-amber-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  역할 / 신분
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="예: 대학생, 신입 개발자, 왕국의 기사"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-amber-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  한 줄 소개
                </label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="예: 호기심이 많고 주관이 뚜렷함"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-amber-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  성격 및 말투 (선택)
                </label>
                <textarea
                  rows={2}
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder="예: 당당하고 직설적이며 조용한 분위기를 좋아함."
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-amber-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* 하단 푸터 버튼 */}
        <div className="border-t border-neutral-100 p-4 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            취소
          </button>
          {activeTab === "select" ? (
            <button
              type="button"
              disabled={!selectedPersonaId}
              onClick={handleConfirmSelect}
              className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
            >
              선택한 자아로 시작하기
            </button>
          ) : (
            <button
              type="button"
              disabled={!name.trim()}
              onClick={handleCreateAndSelect}
              className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
            >
              생성하고 대화 시작하기
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
