"use client"

import { useState } from "react"
import { useAppStore, CATEGORIES, type Category } from "@/lib/store"
import { CharacterCard } from "@/components/character-card"
import { ScenarioModal } from "@/components/scenario-modal"
import { Button } from "@/components/ui/button"
import { Sparkles, Plus, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const { characters, setSelectedCharacter, openScenarioModal } = useAppStore()
  const [selectedCategory, setSelectedCategory] = useState<Category>("회사")

  const filteredCharacters = characters.filter(
    (char) => char.category === selectedCategory
  )

  const handleCharacterSelect = (character: (typeof characters)[0]) => {
    setSelectedCharacter(character)
    openScenarioModal()
  }

  return (
    <main className="min-h-screen bg-background relative">
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
      <div className="max-w-7xl mx-auto px-6 py-8 pb-24">
        {/* Character Library Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              캐릭터 라이브러리
            </h2>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                )}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Character Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onClick={() => handleCharacterSelect(character)}
              />
            ))}
          </div>

          {filteredCharacters.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              이 카테고리에는 아직 캐릭터가 없습니다.
            </div>
          )}
        </section>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-20">
        <Button
          size="lg"
          className="rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-6 gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">새 캐릭터 만들기</span>
        </Button>
      </div>

      {/* Scenario Modal */}
      <ScenarioModal />
    </main>
  )
}
