export interface ChatMessage {
  id: string
  type: "user" | "ai" | "event" | "inner-thought"
  content: string
  timestamp: Date
  eventImage?: string
  eventDescription?: string
  mentions?: string[] // Character IDs or "all"
}

export interface Command {
  id: string
  name: string
  description: string
  icon: string
}

export const SLASH_COMMANDS: Command[] = [
  {
    id: "status",
    name: "상태바",
    description: "현재 캐릭터의 감정과 관계 상태를 확인해요",
    icon: "📊",
  },
  {
    id: "inner-thought",
    name: "속마음",
    description: "캐릭터의 내면 독백을 확인해요",
    icon: "💭",
  },
  {
    id: "image",
    name: "이미지",
    description: "현재 장면의 이미지 생성을 준비해요",
    icon: "🖼️",
  },
  {
    id: "summary",
    name: "요약",
    description: "지금까지의 흐름을 짧게 정리해요",
    icon: "📖",
  },
]
