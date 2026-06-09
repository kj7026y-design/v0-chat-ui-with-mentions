"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore, DEFAULT_START_SETTINGS, type Persona, type StartScenario } from "@/lib/store"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Play, X, ChevronLeft } from "lucide-react"
import { PersonaSelectStep } from "@/components/chat/persona-select-step"
import { StartScenarioSelect } from "@/components/chat/start-scenario-select"

type Step = "intro" | "persona" | "scenario"

export function StoryDrawer() {
  const router = useRouter()
  const {
    selectedStory,
    isStoryDrawerOpen,
    closeStoryDrawer,
    setUserName,
    userName,
    personas,
    selectPersona,
    selectStartScenario,
  } = useAppStore()

  const [step, setStep] = useState<Step>("intro")
  const [localName, setLocalName] = useState(userName)
  const [localPersona, setLocalPersona] = useState<Persona | null>(null)
  const [localScenario, setLocalScenario] = useState<StartScenario | null>(null)
  const [customText, setCustomText] = useState("")

  if (!selectedStory) return null

  const startSettings = DEFAULT_START_SETTINGS

  const handleClose = () => {
    closeStoryDrawer()
    // reset after close animation
    setTimeout(() => {
      setStep("intro")
      setLocalPersona(null)
      setLocalScenario(null)
      setCustomText("")
    }, 300)
  }

  const handleStart = () => {
    setUserName(localName.trim())
    if (localPersona) selectPersona(localPersona)
    const finalScenario: StartScenario =
      localScenario ?? {
        type: "default",
        title: "기존 설정 유지",
        content: startSettings.defaultStartScenario,
      }
    selectStartScenario(finalScenario)
    handleClose()
    router.push("/chat/1")
  }

  const canProceedIntro = localName.trim().length > 0
  const canProceedPersona = localPersona !== null
  const canStart =
    localScenario !== null &&
    (localScenario.type !== "custom" || localScenario.content.trim().length > 0)

  return (
    <Drawer open={isStoryDrawerOpen} onOpenChange={(open) => !open && handleClose()}>
      <DrawerContent className="max-h-[88vh] bg-popover/95 backdrop-blur-xl border-t border-border/50">
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader className="relative pt-6 pb-2">
            {step !== "intro" && (
              <button
                onClick={() => setStep(step === "scenario" ? "persona" : "intro")}
                className="absolute left-4 top-4 p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
                aria-label="이전"
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
              aria-label="닫기"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {(["intro", "persona", "scenario"] as Step[]).map((s) => (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    s === step ? "w-6 bg-foreground" : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>
            <DrawerTitle className="text-center text-base font-semibold text-foreground mt-2">
              {selectedStory.title}
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-8 max-h-[60vh] overflow-y-auto">
            {step === "intro" && (
              <div className="space-y-6 pt-2">
                <div className="flex flex-wrap gap-2">
                  {selectedStory.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    줄거리
                  </h4>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {selectedStory.fullSynopsis}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    등장인물
                  </h4>
                  <div className="flex gap-3">
                    {selectedStory.characters.map((char) => (
                      <div
                        key={char.name}
                        className="flex items-center gap-3 bg-secondary/50 rounded-lg px-4 py-3 flex-1"
                      >
                        <span className="text-2xl">{char.avatar}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{char.name}</p>
                          <p className="text-xs text-muted-foreground">{char.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    당신의 이름을 알려주세요
                  </h4>
                  <Input
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    placeholder="이름 입력..."
                    className="bg-secondary/50 border-0 h-12 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
            )}

            {step === "persona" && (
              <div className="pt-2">
                <PersonaSelectStep
                  personas={personas}
                  selectedId={localPersona?.id ?? null}
                  onSelect={setLocalPersona}
                  onCreateNew={() => router.push("/my-works")}
                />
              </div>
            )}

            {step === "scenario" && (
              <div className="pt-2">
                <StartScenarioSelect
                  settings={startSettings}
                  selected={localScenario}
                  customText={customText}
                  onCustomTextChange={setCustomText}
                  onSelect={setLocalScenario}
                />
              </div>
            )}
          </div>

          {/* Footer button */}
          <div className="px-4 pb-8 pt-2">
            {step === "intro" && (
              <Button
                onClick={() => setStep("persona")}
                disabled={!canProceedIntro}
                className="w-full h-13 py-3.5 text-base font-semibold"
              >
                다음
              </Button>
            )}
            {step === "persona" && (
              <Button
                onClick={() => setStep("scenario")}
                disabled={!canProceedPersona}
                className="w-full h-13 py-3.5 text-base font-semibold"
              >
                이 자아로 계속하기
              </Button>
            )}
            {step === "scenario" && (
              <Button
                onClick={handleStart}
                disabled={
                  !startSettings.allowUserChangeStartScenario ? false : !canStart
                }
                className="w-full h-13 py-3.5 text-base font-semibold"
              >
                <Play className="w-4 h-4 mr-2 fill-current" />
                이 설정으로 시작하기
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
