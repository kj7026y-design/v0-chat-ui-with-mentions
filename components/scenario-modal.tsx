"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/lib/store"
import { MapPin, Clock, BookOpen, Sparkles } from "lucide-react"

export function ScenarioModal() {
  const router = useRouter()
  const {
    isScenarioModalOpen,
    closeScenarioModal,
    selectedCharacter,
    setScenario,
  } = useAppStore()

  const [place, setPlace] = useState("")
  const [time, setTime] = useState("")
  const [situation, setSituation] = useState("")

  const handleStartChat = () => {
    if (!place.trim() || !time.trim() || !situation.trim()) return

    setScenario({ place, time, situation })
    closeScenarioModal()
    router.push("/chat")
  }

  const isFormValid = place.trim() && time.trim() && situation.trim()

  return (
    <Dialog open={isScenarioModalOpen} onOpenChange={closeScenarioModal}>
      <DialogContent className="sm:max-w-[550px] bg-popover border-border">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {selectedCharacter && (
              <span className="text-4xl">{selectedCharacter.avatar}</span>
            )}
            <div>
              <DialogTitle className="text-xl text-foreground">
                세계관 설정
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {selectedCharacter?.name}와의 이야기 배경을 설정해주세요
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="place" className="text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                장소 (Place)
              </Label>
              <Input
                id="place"
                placeholder="예: 마법 학교, 우주 정거장..."
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                시간 (Time)
              </Label>
              <Input
                id="time"
                placeholder="예: 새벽, 3022년..."
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="situation" className="text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              현재 상황 (Situation)
            </Label>
            <Textarea
              id="situation"
              placeholder="이야기가 시작되는 상황을 자세히 설명해주세요...&#10;예: 당신은 마법 학교의 신입생으로, 첫 수업을 듣기 위해 교실에 들어섭니다. 앞자리에 앉아있는 아리아가 당신을 바라보며..."
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              className="min-h-[120px] bg-input border-border text-foreground placeholder:text-muted-foreground resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={closeScenarioModal}
            className="border-border text-foreground hover:bg-secondary"
          >
            취소
          </Button>
          <Button
            onClick={handleStartChat}
            disabled={!isFormValid}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            이야기 시작하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
