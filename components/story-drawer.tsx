"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Play, X } from "lucide-react"

export function StoryDrawer() {
  const router = useRouter()
  const {
    selectedStory,
    isStoryDrawerOpen,
    closeStoryDrawer,
    setUserName,
    userName,
  } = useAppStore()
  const [localName, setLocalName] = useState(userName)

  if (!selectedStory) return null

  const handleStart = () => {
    if (localName.trim()) {
      setUserName(localName.trim())
      closeStoryDrawer()
      router.push("/chat")
    }
  }

  return (
    <Drawer open={isStoryDrawerOpen} onOpenChange={closeStoryDrawer}>
      <DrawerContent className="max-h-[85vh] bg-popover/95 backdrop-blur-xl border-t border-border/50">
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader className="relative pt-6 pb-4">
            <button
              onClick={closeStoryDrawer}
              className="absolute right-4 top-4 p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <DrawerTitle className="text-2xl font-bold text-foreground text-left">
              {selectedStory.title}
            </DrawerTitle>
            <div className="flex gap-2 mt-2">
              {selectedStory.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </DrawerHeader>

          <div className="px-4 pb-8 space-y-6">
            {/* Synopsis */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                줄거리
              </h4>
              <p className="text-foreground/90 leading-relaxed">
                {selectedStory.fullSynopsis}
              </p>
            </div>

            {/* Characters */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
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
                      <p className="font-medium text-foreground">{char.name}</p>
                      <p className="text-xs text-muted-foreground">{char.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User Name Input */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                당신의 이름을 알려주세요
              </h4>
              <Input
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="이름 입력..."
                className="bg-secondary/50 border-0 h-12 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Start Button */}
            <Button
              onClick={handleStart}
              disabled={!localName.trim()}
              className="w-full h-14 text-lg font-semibold bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5 mr-2 fill-current" />
              이야기 속으로 들어가기
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
