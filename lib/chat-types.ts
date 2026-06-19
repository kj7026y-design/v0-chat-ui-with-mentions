export interface ChatMessage {
  id: string
  type: "user" | "ai" | "event" | "inner-thought" | "status"
  content: string
  timestamp: Date
  imageUrl?: string
  imageName?: string
  mediaId?: string
  eventImage?: string
  eventDescription?: string
  mentions?: string[] // Character IDs or "all"
  speakerType?: "user" | "character"
  speakerId?: string
  speakerName?: string
  mentionCharacterIds?: string[]
  mentionAll?: boolean
  isUserAuthoredCharacterLine?: boolean
  originalContent?: string
  turnId?: string
  isGenerationError?: boolean
  retryPayload?: {
    content: string
    mentions?: string[]
    image?: {
      url: string
      name?: string
    }
    turnId?: string
  }
}

export interface Command {
  id: string
  name: string
  description: string
  icon: string
}

export const SLASH_COMMANDS: Command[] = [
  {
    id: "phone",
    name: "휴대폰",
    description: "휴대폰 화면으로 확인할 수 있는 내용을 보여줘요",
    icon: "📱",
  },
  {
    id: "sns",
    name: "SNS",
    description: "SNS에 올라온 반응이나 게시글을 보여줘요",
    icon: "💬",
  },
  {
    id: "audience-reaction",
    name: "시청자반응",
    description: "현재 장면을 보는 시청자 반응을 보여줘요",
    icon: "👀",
  },
  {
    id: "image",
    name: "이미지",
    description: "현재 장면의 이미지 생성을 준비해요",
    icon: "🖼️",
  },
]

export const AUTO_COMMAND_IDS = ["phone", "sns", "audience-reaction"]
export const DEFAULT_COMMAND_SUGGESTION_IDS = ["phone", "sns"]
export const MAX_COMMAND_SUGGESTIONS = 2
