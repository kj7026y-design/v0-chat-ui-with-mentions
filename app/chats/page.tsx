"use client"

import { useState } from "react"
import { Search, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface ChatItem {
  id: string
  characterName: string
  characterEmoji: string
  lastMessage: string
  timestamp: Date
  unreadCount: number
}

const chatList: ChatItem[] = [
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

function formatTimestamp(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days === 1) return "어제"
  return `${days}일 전`
}

export default function ChatsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const filteredChats = chatList.filter((chat) =>
    chat.characterName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-[100dvh] bg-neutral-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-sm px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-neutral-100">채팅</h1>
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-neutral-800 transition-colors"
            aria-label="검색"
          >
            <Search className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Search Input */}
        {isSearchOpen && (
          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="캐릭터 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-800 text-neutral-100 placeholder:text-neutral-500 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-600"
                autoFocus
              />
            </div>
          </div>
        )}
      </header>

      {/* Chat List */}
      <div className="divide-y divide-neutral-800/50">
        {filteredChats.map((chat) => (
          <ChatListItem key={chat.id} chat={chat} />
        ))}
      </div>

      {filteredChats.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
          <p>검색 결과가 없습니다</p>
        </div>
      )}
    </div>
  )
}

function ChatListItem({ chat }: { chat: ChatItem }) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="relative">
      <Link
        href={`/chat/${chat.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-800/50 active:bg-neutral-800 transition-colors"
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center">
            <span className="text-2xl">{chat.characterEmoji}</span>
          </div>
          {chat.unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">
                {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              "font-semibold truncate",
              chat.unreadCount > 0 ? "text-neutral-100" : "text-neutral-300"
            )}>
              {chat.characterName}
            </span>
            <span className="text-xs text-neutral-500 flex-shrink-0">
              {formatTimestamp(chat.timestamp)}
            </span>
          </div>
          <p className={cn(
            "text-sm truncate mt-0.5",
            chat.unreadCount > 0 ? "text-neutral-300" : "text-neutral-500"
          )}>
            {chat.lastMessage}
          </p>
        </div>
      </Link>

      {/* More Button */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowMenu(!showMenu)
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-700 transition-colors"
        aria-label="더보기"
      >
        <MoreHorizontal className="w-4 h-4 text-neutral-500" />
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)} 
          />
          <div className="absolute right-2 top-14 z-50 bg-neutral-800 rounded-lg shadow-xl py-1 min-w-[120px]">
            <button className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700">
              알림 끄기
            </button>
            <button className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700">
              고정하기
            </button>
            <button className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-neutral-700">
              삭제하기
            </button>
          </div>
        </>
      )}
    </div>
  )
}
