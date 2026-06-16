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
  const groupedEvents = events.reduce<Record<string, SavedEvent[]>>((groups, event) => {
    const character = event.relatedCharacter || "기타"
    groups[character] = [...(groups[character] ?? []), event]
    return groups
  }, {})
  const characterGroups = Object.entries(groupedEvents)

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background backdrop-blur-sm px-4 py-4 border-b border-border">
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

        {characterGroups.length > 0 ? (
          <div className="space-y-7">
            {characterGroups.map(([character, characterEvents]) => (
              <section key={character} className="space-y-3">
                <div className="flex items-end justify-between px-1">
                  <div>
                    <h2 className="text-base font-bold text-foreground">{character}</h2>
                    <p className="text-xs text-muted-foreground">저장한 장면 {characterEvents.length}개</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {characterEvents.map((event) => (
                    <EventCard key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
                  ))}
                </div>
              </section>
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
