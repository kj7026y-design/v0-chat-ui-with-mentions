"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  X, 
  BookOpen, 
  PenTool, 
  Calendar, 
  FileText, 
  ListChecks, 
  Sparkles,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SavedScenario {
  id: string
  title: string
  backgroundStory: string
  startDate: string
  majorEvents: string[]
  coverColor: string
}

const sampleScenarios: SavedScenario[] = [
  {
    id: "1",
    title: "마법학교 입학",
    backgroundStory: "당신은 마법학교에 입학한 신입생입니다. 신비로운 마법의 세계가 당신을 기다리고 있습니다. 첫 수업이 시작되기 전, 복도에서 우연히 마주친 엘프 마법사가 당신에게 말을 걸어옵니다.",
    startDate: "2024-03-01",
    majorEvents: ["입학식", "첫 마법 수업", "비밀의 도서관 발견"],
    coverColor: "from-violet-600/20 to-indigo-600/20",
  },
  {
    id: "2",
    title: "궁궐의 음모",
    backgroundStory: "조선 궁궐에서 비밀리에 벌어지는 권력 다툼. 당신은 새로 발탁된 내금위 무관으로, 왕을 호위하는 임무를 맡게 됩니다. 그러나 곧 궁궐 내부의 어둠을 마주하게 됩니다.",
    startDate: "1623-04-15",
    majorEvents: ["내금위 발탁", "첫 야간 순찰", "의문의 밀서 발견"],
    coverColor: "from-amber-600/20 to-orange-600/20",
  },
  {
    id: "3",
    title: "현대 오피스 로맨스",
    backgroundStory: "대기업 마케팅팀에 신입사원으로 입사한 첫 날. 당신의 지도 사원은 회사에서 소문난 워커홀릭이지만, 예상 외로 다정한 면이 있습니다.",
    startDate: "2024-01-02",
    majorEvents: ["첫 출근", "프로젝트 배정", "야근 후 저녁 식사"],
    coverColor: "from-cyan-600/20 to-blue-600/20",
  },
]

interface ScenarioSetupScreenProps {
  isOpen: boolean
  onClose: () => void
}

export function ScenarioSetupScreen({ isOpen, onClose }: ScenarioSetupScreenProps) {
  const router = useRouter()
  const { selectedCharacter, setScenario } = useAppStore()
  
  const [mode, setMode] = useState<"load" | "create">("load")
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [backgroundStory, setBackgroundStory] = useState("")
  const [startDate, setStartDate] = useState("")
  const [majorEvents, setMajorEvents] = useState<string[]>(["", "", ""])
  const [isFieldHighlighted, setIsFieldHighlighted] = useState(false)

  // Load scenario data when selected
  const handleSelectScenario = (scenario: SavedScenario) => {
    setSelectedScenarioId(scenario.id)
    setIsFieldHighlighted(true)
    
    // Animate the field population
    setTimeout(() => {
      setBackgroundStory(scenario.backgroundStory)
      setStartDate(scenario.startDate)
      setMajorEvents([...scenario.majorEvents, "", ""].slice(0, 5))
    }, 100)
    
    setTimeout(() => {
      setIsFieldHighlighted(false)
    }, 800)
  }

  // Reset fields when switching to create mode
  useEffect(() => {
    if (mode === "create") {
      setSelectedScenarioId(null)
      setBackgroundStory("")
      setStartDate("")
      setMajorEvents(["", "", ""])
    }
  }, [mode])

  const handleEventChange = (index: number, value: string) => {
    const newEvents = [...majorEvents]
    newEvents[index] = value
    setMajorEvents(newEvents)
  }

  const handleStartStory = () => {
    if (!backgroundStory.trim()) return

    setScenario({
      place: "",
      time: startDate,
      situation: backgroundStory,
    })
    onClose()
    router.push("/chat")
  }

  const isFormValid = backgroundStory.trim().length > 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
      >
        <X className="w-5 h-5 text-muted-foreground" />
      </button>

      <ScrollArea className="h-full">
        <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
          {/* Character Mini Profile */}
          {selectedCharacter && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border/50 mb-8">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-3xl">
                {selectedCharacter.avatar}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedCharacter.name}
                </h2>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {selectedCharacter.personality}
                </p>
              </div>
              <div className="flex gap-1">
                {selectedCharacter.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs rounded-full bg-secondary text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              시나리오 설정
            </h1>
            <p className="text-muted-foreground">
              이야기의 배경과 시작점을 설정하세요
            </p>
          </div>

          {/* Segmented Control */}
          <div className="flex p-1 rounded-lg bg-secondary/50 mb-6">
            <button
              onClick={() => setMode("load")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all",
                mode === "load"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BookOpen className="w-4 h-4" />
              나의 시나리오 불러오기
            </button>
            <button
              onClick={() => setMode("create")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all",
                mode === "create"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PenTool className="w-4 h-4" />
              직접 새로 작성
            </button>
          </div>

          {/* Scenario Cards (Load Mode) */}
          {mode === "load" && (
            <div className="mb-6">
              <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                {sampleScenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => handleSelectScenario(scenario)}
                    className={cn(
                      "flex-shrink-0 w-48 p-4 rounded-xl border text-left transition-all",
                      selectedScenarioId === scenario.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary/50"
                        : "border-border/50 bg-secondary/30 hover:bg-secondary/50 hover:border-border"
                    )}
                  >
                    <div className={cn(
                      "w-full h-20 rounded-lg bg-gradient-to-br mb-3",
                      scenario.coverColor
                    )} />
                    <h3 className="font-medium text-foreground text-sm mb-1 truncate">
                      {scenario.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {scenario.backgroundStory.slice(0, 50)}...
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Fields */}
          <div className="space-y-6">
            {/* Background Story */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="w-4 h-4 text-primary" />
                배경 스토리
              </label>
              <Textarea
                placeholder="이야기가 시작되는 배경을 자세히 설명해주세요..."
                value={backgroundStory}
                onChange={(e) => setBackgroundStory(e.target.value)}
                className={cn(
                  "min-h-[140px] bg-secondary/30 border-border/50 text-foreground placeholder:text-muted-foreground resize-none transition-all duration-500",
                  isFieldHighlighted && "ring-2 ring-primary/50 bg-primary/5"
                )}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Calendar className="w-4 h-4 text-primary" />
                시작 날짜
              </label>
              <Input
                type="text"
                placeholder="예: 2024-03-15 또는 조선 인조 원년"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={cn(
                  "bg-secondary/30 border-border/50 text-foreground placeholder:text-muted-foreground transition-all duration-500",
                  isFieldHighlighted && "ring-2 ring-primary/50 bg-primary/5"
                )}
              />
            </div>

            {/* Major Events */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ListChecks className="w-4 h-4 text-primary" />
                주요 이벤트
              </label>
              <div className="space-y-2">
                {majorEvents.map((event, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <Input
                      placeholder={`이벤트 ${index + 1}`}
                      value={event}
                      onChange={(e) => handleEventChange(index, e.target.value)}
                      className={cn(
                        "flex-1 bg-secondary/30 border-border/50 text-foreground placeholder:text-muted-foreground transition-all duration-500",
                        isFieldHighlighted && "ring-2 ring-primary/50 bg-primary/5"
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Bottom Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleStartStory}
            disabled={!isFormValid}
            size="lg"
            className="w-full h-14 text-base font-semibold bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            이 설정으로 이야기 시작하기
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
