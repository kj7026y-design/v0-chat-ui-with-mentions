"use client"

export const STORYCHAT_CHATS_KEY = "storychat_chats"

export interface ChatListItemData {
  id: string
  characterName: string
  characterEmoji: string
  lastMessage: string
  timestamp: Date
  unreadCount: number
}

export const defaultChats: ChatListItemData[] = [
  {
    id: "1",
    characterName: "이무기",
    characterEmoji: "🐉",
    lastMessage: "그래, 알겠어. 조금 더 이야기해볼까?",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    unreadCount: 2,
  },
  {
    id: "2",
    characterName: "하늘",
    characterEmoji: "🌸",
    lastMessage: "오늘 날씨가 좋아서 기분이 좋아!",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    unreadCount: 0,
  },
  {
    id: "3",
    characterName: "별이",
    characterEmoji: "⭐",
    lastMessage: "내일 같이 영화 보러 갈래?",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    unreadCount: 5,
  },
  {
    id: "4",
    characterName: "루나",
    characterEmoji: "🌙",
    lastMessage: "고마워, 덕분에 많이 위로가 됐어.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    unreadCount: 0,
  },
  {
    id: "5",
    characterName: "제이",
    characterEmoji: "🎸",
    lastMessage: "새로운 곡을 만들었는데 들어볼래?",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    unreadCount: 1,
  },
]

export function getChatList() {
  if (typeof window === "undefined") return defaultChats

  const savedChats = window.localStorage.getItem(STORYCHAT_CHATS_KEY)
  if (!savedChats) {
    saveChatList(defaultChats)
    return defaultChats
  }

  try {
    const parsedChats = JSON.parse(savedChats) as Array<Omit<ChatListItemData, "timestamp"> & { timestamp: string }>
    return parsedChats.map((chat) => ({
      ...chat,
      timestamp: new Date(chat.timestamp),
    }))
  } catch {
    window.localStorage.removeItem(STORYCHAT_CHATS_KEY)
    saveChatList(defaultChats)
    return defaultChats
  }
}

export function saveChatList(chats: ChatListItemData[]) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(STORYCHAT_CHATS_KEY, JSON.stringify(chats))
  window.dispatchEvent(new Event("storychat-chats-updated"))
}

export function createChatId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
