"use client"

import { useEffect, useState } from "react"
import { Copy, Edit3, MoreHorizontal, Search, Trash2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  createChatId,
  defaultChats,
  getChatList,
  saveChatList,
  type ChatListItemData,
} from "@/lib/chat-list-storage"

export default function ChatsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [chats, setChats] = useState<ChatListItemData[]>(defaultChats)

  useEffect(() => {
    const syncChats = () => setChats(getChatList())
    syncChats()
    window.addEventListener("storage", syncChats)
    window.addEventListener("storychat-chats-updated", syncChats)
    return () => {
      window.removeEventListener("storage", syncChats)
      window.removeEventListener("storychat-chats-updated", syncChats)
    }
  }, [])

  const persistChats = (nextChats: ChatListItemData[]) => {
    setChats(nextChats)
    saveChatList(nextChats)
  }

  const handleRenameChat = (chatId: string) => {
    const chat = chats.find((item) => item.id === chatId)
    if (!chat) return

    const nextName = window.prompt("채팅방 이름을 입력하세요.", chat.characterName)
    if (!nextName?.trim()) return

    persistChats(chats.map((item) => item.id === chatId ? { ...item, characterName: nextName.trim() } : item))
    toast("이름을 바꿨어요.")
  }

  const handleDuplicateChat = (chatId: string) => {
    const chat = chats.find((item) => item.id === chatId)
    if (!chat) return

    persistChats([
      {
        ...chat,
        id: createChatId(),
        characterName: `${chat.characterName} 복제본`,
        timestamp: new Date(),
        unreadCount: 0,
      },
      ...chats,
    ])
    toast("채팅방을 복제했어요.")
  }

  const handleDeleteChat = (chatId: string) => {
    if (!window.confirm("채팅방을 삭제할까요?")) return

    persistChats(chats.filter((chat) => chat.id !== chatId))
    toast("채팅방을 삭제했어요.")
  }

  const filteredChats = chats.filter((chat) =>
    chat.characterName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background backdrop-blur-sm px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">채팅</h1>
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-accent transition-colors"
            aria-label="검색"
          >
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Search Input */}
        {isSearchOpen && (
          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="캐릭터 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted text-foreground placeholder:text-muted-foreground rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>
          </div>
        )}
      </header>

      {/* Chat List */}
      <div className="divide-y divide-border">
        {filteredChats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            onRename={handleRenameChat}
            onDuplicate={handleDuplicateChat}
            onDelete={handleDeleteChat}
          />
        ))}
      </div>

      {filteredChats.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p>검색 결과가 없습니다</p>
        </div>
      )}
    </div>
  )
}

function ChatListItem({
  chat,
  onRename,
  onDuplicate,
  onDelete,
}: {
  chat: ChatListItemData
  onRename: (chatId: string) => void
  onDuplicate: (chatId: string) => void
  onDelete: (chatId: string) => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="relative">
      <Link
        href={`/chat/${chat.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent transition-colors"
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
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
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-semibold truncate",
              chat.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
            )}>
              {chat.characterName}
            </span>
          </div>
          <p className={cn(
            "text-sm truncate mt-0.5",
            chat.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
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
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
        aria-label="더보기"
      >
        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)} 
          />
          <div className="absolute right-2 top-14 z-50 bg-popover rounded-xl shadow-xl py-1.5 min-w-[140px] border border-border">
            <ContextMenuButton
              icon={Trash2}
              label="삭제"
              destructive
              onClick={() => {
                setShowMenu(false)
                onDelete(chat.id)
              }}
            />
            <ContextMenuButton
              icon={Copy}
              label="복제"
              onClick={() => {
                setShowMenu(false)
                onDuplicate(chat.id)
              }}
            />
            <ContextMenuButton
              icon={Edit3}
              label="이름 바꾸기"
              onClick={() => {
                setShowMenu(false)
                onRename(chat.id)
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}

function ContextMenuButton({
  icon: Icon,
  label,
  destructive,
  onClick,
}: {
  icon: typeof MoreHorizontal
  label: string
  destructive?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
      className={cn(
        "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors",
        destructive
          ? "font-semibold text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-950/60 dark:hover:text-red-100"
          : "text-popover-foreground",
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}
