"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { TimelineHeader } from "@/components/timeline/timeline-header"
import { TimelineList } from "@/components/timeline/timeline-list"
import { EventDetailSheet } from "@/components/timeline/event-detail-sheet"
import {
  defaultTimelineEvents,
  getTimelineEvents,
  type TimelineEvent,
} from "@/lib/timeline-storage"

export default function TimelinePage() {
  const router = useRouter()
  const [events, setEvents] = useState<TimelineEvent[]>(defaultTimelineEvents)
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  useEffect(() => {
    const syncEvents = () => {
      const nextEvents = getTimelineEvents()
      setEvents(nextEvents)
      setSelectedEvent((current) =>
        current ? nextEvents.find((event) => event.id === current.id) ?? null : null,
      )
    }
    syncEvents()
    window.addEventListener("storage", syncEvents)
    window.addEventListener("storychat-timeline-updated", syncEvents)
    return () => {
      window.removeEventListener("storage", syncEvents)
      window.removeEventListener("storychat-timeline-updated", syncEvents)
    }
  }, [])

  const handleEventClick = (event: TimelineEvent) => {
    setSelectedEvent(event)
    setIsSheetOpen(true)
  }

  const handleCloseSheet = () => {
    setIsSheetOpen(false)
  }

  const handleAddEvent = () => {
    router.push("/timeline/new")
  }

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto px-5 py-6 sm:py-10">
        <TimelineHeader onAddEvent={handleAddEvent} />
        <TimelineList events={events} onEventClick={handleEventClick} />
      </div>

      <EventDetailSheet
        event={selectedEvent}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onClose={handleCloseSheet}
      />
    </main>
  )
}
