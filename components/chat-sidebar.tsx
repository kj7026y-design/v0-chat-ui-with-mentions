"use client"

import { useAppStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { MapPin, Clock, BookOpen, Home, RotateCcw } from "lucide-react"
import Link from "next/link"

export function ChatSidebar() {
  const { selectedCharacter, scenario, clearChat } = useAppStore()

  if (!selectedCharacter || !scenario) return null

  return (
    <aside className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      <div className="p-6 flex-1 overflow-y-auto">
        {/* Character Profile */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3 p-4 bg-sidebar-accent rounded-2xl inline-block">
            {selectedCharacter.avatar}
          </div>
          <h2 className="text-xl font-bold text-sidebar-foreground">
            {selectedCharacter.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedCharacter.personality}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5 mb-6">
          {selectedCharacter.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs bg-sidebar-accent text-sidebar-accent-foreground"
            >
              {tag}
            </Badge>
          ))}
        </div>

        <Separator className="bg-sidebar-border mb-6" />

        {/* Scenario Summary */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-sidebar-foreground uppercase tracking-wider">
            시나리오 정보
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-sidebar-primary mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground block">장소</span>
                <span className="text-sm text-sidebar-foreground">{scenario.place}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-sidebar-primary mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground block">시간</span>
                <span className="text-sm text-sidebar-foreground">{scenario.time}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <BookOpen className="w-4 h-4 text-sidebar-primary mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground block">현재 상황</span>
                <p className="text-sm text-sidebar-foreground leading-relaxed">
                  {scenario.situation}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Button
          variant="outline"
          className="w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={clearChat}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          대화 초기화
        </Button>
        <Link href="/" className="block">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Home className="w-4 h-4 mr-2" />
            캐릭터 선택으로
          </Button>
        </Link>
      </div>
    </aside>
  )
}
