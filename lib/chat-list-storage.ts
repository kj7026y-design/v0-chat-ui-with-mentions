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
    id: "w8",
    characterName: "강태현",
    characterEmoji: "🔥",
    lastMessage: "야, 또 모르는 척 지나가게? 오늘은 솔직히 말해봐. 나 의식하고 있잖아.",
    timestamp: new Date(Date.now() - 1000 * 60),
    unreadCount: 0,
  },
  {
    id: "w7",
    characterName: "한민준",
    characterEmoji: "🫧",
    lastMessage: "...영화, 다시 틀까? 아니면... 조금 더 이대로 있을래?",
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
    unreadCount: 0,
  },
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
  {
    id: "6",
    characterName: "서윤",
    characterEmoji: "🥀",
    lastMessage: "이 시간에 다시 온 이유가 계약 때문이라고 하면, 난 조금 실망할 것 같은데.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    unreadCount: 0,
  },
]

function ensureDefaultChats(chats: ChatListItemData[], ids: string[]) {
  const existingIds = new Set(chats.map((chat) => chat.id))
  const missingChats = defaultChats.filter((chat) => ids.includes(chat.id) && !existingIds.has(chat.id))
  return missingChats.length ? [...missingChats, ...chats] : chats
}

export function getChatList() {
  if (typeof window === "undefined") return defaultChats

  const savedChats = window.localStorage.getItem(STORYCHAT_CHATS_KEY)
  if (!savedChats) {
    saveChatList(defaultChats)
    return defaultChats
  }

  try {
    const parsedChats = JSON.parse(savedChats) as Array<Omit<ChatListItemData, "timestamp"> & { timestamp: string }>
    const normalizedChats = parsedChats.map((chat) => ({
      ...chat,
      timestamp: new Date(chat.timestamp),
    }))
    return ensureDefaultChats(normalizedChats, ["6", "w7", "w8"])
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
