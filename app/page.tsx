"use client"

import { useAppStore } from "@/lib/store"
import { CharacterCard } from "@/components/character-card"
import { ScenarioModal } from "@/components/scenario-modal"
import { Button } from "@/components/ui/button"
import { Sparkles, Plus, BookOpen } from "lucide-react"

export default function HomePage() {
  const { characters, setSelectedCharacter, openScenarioModal } = useAppStore()

  const handleCharacterSelect = (character: (typeof characters)[0]) => {
    setSelectedCharacter(character)
    openScenarioModal()
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">StoryChat AI</h1>
          </div>
          <p className="text-sm text-muted-foreground hidden sm:block">
            AI 캐릭터와 함께하는 인터랙티브 스토리
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Character Library Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                캐릭터 라이브러리
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">
              {characters.length}개의 캐릭터
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onClick={() => handleCharacterSelect(character)}
              />
            ))}
          </div>
        </section>

        {/* Create Character Section */}
        <section className="border-t border-border pt-8">
          <div className="bg-card border border-border rounded-xl p-8 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              나만의 캐릭터 만들기
            </h3>
            <p className="text-muted-foreground mb-6">
              상상 속 캐릭터를 직접 만들고, 원하는 이야기를 시작해보세요.
            </p>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              새 캐릭터 만들기
            </Button>
          </div>
        </section>
      </div>

      {/* Scenario Modal */}
      <ScenarioModal />
    </main>
  )
}
