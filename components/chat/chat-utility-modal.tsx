"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Image as ImageIcon, X } from "lucide-react"
import { TimelineList } from "@/components/timeline/timeline-list"
import { getChatMedia, type ChatMediaItem } from "@/lib/chat-media-storage"
import {
  getTimelineEvents,
  type TimelineEvent,
} from "@/lib/timeline-storage"

export type ChatUtilityModalType = "gallery" | "timeline"

interface ChatUtilityModalProps {
  type: ChatUtilityModalType | null
  chatId: string
  roomName: string
  characterName: string
  onClose: () => void
}

function formatTimelineDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function ChatUtilityModal({
  type,
  chatId,
  roomName,
  characterName,
  onClose,
}: ChatUtilityModalProps) {
  const [media, setMedia] = useState<ChatMediaItem[]>([])
  const [selectedMedia, setSelectedMedia] = useState<ChatMediaItem | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)

  useEffect(() => {
    if (!type) return

    const syncMedia = () => setMedia(getChatMedia(chatId, characterName))
    const syncTimeline = () => setTimelineEvents(getTimelineEvents())
    syncMedia()
    syncTimeline()
    window.addEventListener("storage", syncMedia)
    window.addEventListener("storage", syncTimeline)
    window.addEventListener("storychat-chat-media-updated", syncMedia)
    window.addEventListener("storychat-timeline-updated", syncTimeline)
    return () => {
      window.removeEventListener("storage", syncMedia)
      window.removeEventListener("storage", syncTimeline)
      window.removeEventListener("storychat-chat-media-updated", syncMedia)
      window.removeEventListener("storychat-timeline-updated", syncTimeline)
    }
  }, [characterName, chatId, type])

  useEffect(() => {
    if (!type) {
      setSelectedMedia(null)
      setSelectedEvent(null)
    }
  }, [type])

  if (!type) return null

  return (
    <section
      className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-label={type === "gallery" ? "채팅방 갤러리" : "채팅방 타임라인"}
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-accent"
          aria-label="채팅방으로 돌아가기"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">
            {type === "gallery" ? "갤러리" : "타임라인"}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{roomName}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-24">
          {type === "gallery" ? (
            media.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {media.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedMedia(item)}
                    className="aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                    aria-label={`${item.title} 크게 보기`}
                  >
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card px-4 py-12 text-center">
                <ImageIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">아직 공유 미디어가 없어요.</p>
              </div>
            )
          ) : (
            <TimelineList events={timelineEvents} onEventClick={setSelectedEvent} />
          )}
        </div>
      </div>

      {selectedMedia && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedMedia(null)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white"
              aria-label="이미지 닫기"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={selectedMedia.imageUrl}
              alt={selectedMedia.title}
              className="max-h-[88dvh] w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-background p-5">
          <div className="mx-auto max-w-lg">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">{selectedEvent.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{formatTimelineDate(selectedEvent.date)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"
                aria-label="상세 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {selectedEvent.imageUrl && (
              <img
                src={selectedEvent.imageUrl}
                alt={selectedEvent.title}
                className="mb-5 aspect-video w-full rounded-xl object-cover"
              />
            )}
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{selectedEvent.description}</p>
          </div>
        </div>
      )}
    </section>
  )
}
