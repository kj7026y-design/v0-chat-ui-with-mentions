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
    id: "inner-thought",
    name: "속마음",
    description: "캐릭터의 내면을 들여다봅니다",
    icon: "💭",
  },
  {
    id: "event",
    name: "이벤트",
    description: "특별한 이벤트를 발생시킵니다",
    icon: "✨",
  },
  {
    id: "memory",
    name: "기억",
    description: "과거의 기억을 회상합니다",
    icon: "📖",
  },
]
