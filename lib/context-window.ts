import type { ChatMessage } from "@/lib/chat-types"

export interface SceneStateSnapshot {
  location?: string
  time?: string
  mood?: string
  contractMeaning?: string
}

/**
 * 1. 롤링 요약 (Rolling Summarization)
 * 오래된 대화를 AI 호출 없이 규칙 기반으로 짧게 압축합니다.
 */
export function buildRollingHistorySummary(oldMessages: Array<{ role: string; content: string }>): string {
  if (!oldMessages || oldMessages.length === 0) return ""

  const summaryLines: string[] = []

  for (const msg of oldMessages) {
    if (!msg.content?.trim()) continue
    const text = msg.content.trim()

    if (msg.role === "user") {
      const cleaned = text.replace(/^\[[^\]]+\]\s*/, "").slice(0, 40).trim()
      if (cleaned) summaryLines.push(`• 사용자: "${cleaned}${text.length > 40 ? "..." : ""}"`)
    } else if (msg.role === "assistant") {
      const dialogueMatch = text.match(/[""'']([^""'']{4,50})[""'']/)
      if (dialogueMatch?.[1]) {
        summaryLines.push(`• 캐릭터 대사: "${dialogueMatch[1].trim()}"`)
      } else {
        const cleaned = text.replace(/^\[[^\]]+\]\s*/, "").slice(0, 40).trim()
        if (cleaned) summaryLines.push(`• 캐릭터 행동: ${cleaned}${text.length > 40 ? "..." : ""}`)
      }
    }
  }

  if (summaryLines.length === 0) return ""
  return `[이전 대화 요약]\n` + summaryLines.slice(-6).join("\n")
}

/**
 * 2. 상태 메타데이터 고정 (State Metadata Pinning)
 * 설정 붕괴를 막기 위해 절대 바뀌면 안 되는 씬 상태를 텍스트 블록으로 만듭니다.
 */
export function buildPinnedStateBlock(sceneState?: SceneStateSnapshot): string {
  if (!sceneState) return ""

  const items: string[] = []
  if (sceneState.location?.trim()) items.push(`- 현재 장소: ${sceneState.location.trim()}`)
  if (sceneState.time?.trim()) items.push(`- 현재 시간: ${sceneState.time.trim()}`)
  if (sceneState.mood?.trim()) items.push(`- 현재 분위기: ${sceneState.mood.trim()}`)
  if (sceneState.contractMeaning?.trim()) items.push(`- 절대 대원칙: ${sceneState.contractMeaning.trim()}`)

  if (items.length === 0) return ""
  return `[현재 씬 절대 상태 - 반드시 준수]\n` + items.join("\n")
}

/**
 * 3. 프롬프트 주사기 (Prompt Injection at the End)
 * 히스토리 마지막 직전에 삽입하는 핵심 규칙 리마인드 메시지를 생성합니다.
 */
export function buildInjectorReminder(characterName = "캐릭터", sceneState?: SceneStateSnapshot): string {
  const rules: string[] = [
    `너는 "${characterName}"이고, 상대방의 대사/행동/감정을 멋대로 만들지 마.`,
  ]

  if (sceneState?.contractMeaning?.trim()) {
    rules.push(`핵심 명제: ${sceneState.contractMeaning.trim()}`)
  }

  if (sceneState?.location?.trim()) {
    rules.push(`현재 고정 장소: ${sceneState.location.trim()}`)
  }

  return `[System Reminder: ${rules.join(" | ")}]`
}

/**
 * 롤링 요약과 최신 N개 슬라이싱을 통합하여 최적화된 대화 기록을 반환합니다.
 */
export function optimizeConversationHistory<T extends { role: string; content: string }>(
  messages: T[],
  recentLimit = 10,
): {
  summaryText: string
  recentMessages: T[]
} {
  if (!messages || messages.length <= recentLimit) {
    return { summaryText: "", recentMessages: messages ?? [] }
  }

  const oldMessages = messages.slice(0, messages.length - recentLimit)
  const recentMessages = messages.slice(-recentLimit)
  const summaryText = buildRollingHistorySummary(oldMessages)

  return { summaryText, recentMessages }
}
