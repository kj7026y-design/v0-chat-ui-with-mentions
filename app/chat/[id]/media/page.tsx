"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, X } from "lucide-react"
import {
  getChatMedia,
  type ChatMediaItem,
} from "@/lib/chat-media-storage"
import { defaultChats, getChatList } from "@/lib/chat-list-storage"

export default function ChatMediaPage() {
  const params = useParams()
  const router = useRouter()
  const chatId = params.id as string
  const [items, setItems] = useState<ChatMediaItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ChatMediaItem | null>(null)
  const chat = useMemo(
    () => getChatList().find((item) => item.id === chatId) ?? defaultChats.find((item) => item.id === chatId),
    [chatId],
  )

  useEffect(() => {
    const syncMedia = () => setItems(getChatMedia(chatId, chat?.characterName))
    syncMedia()
    window.addEventListener("storage", syncMedia)
    window.addEventListener("storychat-chat-media-updated", syncMedia)
    return () => {
      window.removeEventListener("storage", syncMedia)
      window.removeEventListener("storychat-chat-media-updated", syncMedia)
    }
  }, [chat?.characterName, chatId])

  return (
    <main className="min-h-full bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent"
            aria-label="뒤로가기"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">공유 미디어</h1>
            <p className="text-xs text-muted-foreground">{chat?.characterName ?? "채팅방"} 채팅방</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 pb-28">
        {items.length > 0 ? (
          <section className="grid grid-cols-4 gap-2">
            {items.map((item) => (
              <article key={item.id} className="group relative overflow-hidden rounded-xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="block aspect-square w-full bg-muted"
                  aria-label={`${item.title} 크게 보기`}
                >
                  <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                </button>
              </article>
            ))}
          </section>
        ) : (
          <div className="rounded-2xl border border-border bg-card px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">아직 공유 미디어가 없어요.</p>
          </div>
        )}

        <Link href={`/chat/${chatId}`} className="block text-center text-sm text-muted-foreground hover:text-foreground">
          채팅방으로 돌아가기
        </Link>
      </div>

      {selectedItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/85"
              aria-label="이미지 닫기"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="max-h-[78dvh] bg-black">
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.title}
                className="mx-auto max-h-[78dvh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
