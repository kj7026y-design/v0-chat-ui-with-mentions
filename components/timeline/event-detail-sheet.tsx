import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Pencil, ImageIcon } from "lucide-react"
import Link from "next/link"
import type { TimelineEvent } from "@/lib/timeline-storage"

interface EventDetailSheetProps {
  event: TimelineEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose: () => void
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function EventDetailSheet({
  event,
  open,
  onOpenChange,
  onClose,
}: EventDetailSheetProps) {
  if (!event) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-background border-border overflow-y-auto p-0"
      >
        <div className="flex flex-col h-full px-5 py-6">
          {/* Header */}
          <div className="space-y-1 pr-8">
            <h2 className="text-xl font-bold text-foreground">
              {event.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formatDate(event.date)}
            </p>
          </div>

          {/* Content Area */}
          <div className="flex flex-col gap-5 mt-6 flex-1">
            {/* Image Placeholder - 16:9 Aspect Ratio */}
            <div className="relative w-full aspect-video rounded-lg bg-secondary overflow-hidden">
              {event.imageUrl ? (
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ImageIcon className="w-10 h-10 opacity-50" />
                  <span className="text-sm">이미지 없음</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                상세 설명
              </h4>
              <p className="text-foreground leading-relaxed text-[15px]">
                {event.description}
              </p>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <Button
            asChild
            variant="secondary"
            className="flex-1 bg-secondary hover:bg-accent text-secondary-foreground"
          >
            <Link href={`/timeline/${event.id}/edit`} onClick={onClose}>
              <Pencil className="w-4 h-4 mr-2" />
              내용 수정하기
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-border hover:bg-secondary"
          >
            닫기
          </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
