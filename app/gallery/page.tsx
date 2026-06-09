"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Image as ImageIcon } from "lucide-react"
import { useAppStore, type SavedEvent } from "@/lib/store"
import { EventCard } from "@/components/chat/event-card"
import { EventDetailModal } from "@/components/chat/event-detail-modal"

export default function GalleryPage() {
  const events = useAppStore((s) => s.events)
  const [selectedEvent, setSelectedEvent] = useState<SavedEvent | null>(null)

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Link
            href="/mypage"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent transition-colors"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">이벤트 갤러리</h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        <p className="text-xs text-muted-foreground mb-4 px-1">
          대화 중 얻은 장면 {events.length}개
        </p>

        {events.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl px-4 py-16 text-center mt-8">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
              아직 저장한 장면이 없어요.
              <br />
              채팅 중 마음에 드는 장면을 저장해보세요.
            </p>
          </div>
        )}
      </div>

      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  )
}
