"use client"

import { useState } from "react"
import { BookOpen, Plus, MoreVertical, Calendar, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface Work {
  id: string
  title: string
  characterName: string
  characterEmoji: string
  lastUpdated: string
  messageCount: number
  coverColor: string
}

const mockWorks: Work[] = [
  {
    id: "1",
    title: "이무기와의 봄",
    characterName: "이무기",
    characterEmoji: "🐉",
    lastUpdated: "오늘",
    messageCount: 156,
    coverColor: "from-emerald-900/50 to-neutral-900",
  },
  {
    id: "2",
    title: "달빛 아래에서",
    characterName: "하늘",
    characterEmoji: "🌙",
    lastUpdated: "어제",
    messageCount: 89,
    coverColor: "from-indigo-900/50 to-neutral-900",
  },
  {
    id: "3",
    title: "카페에서의 우연",
    characterName: "민지",
    characterEmoji: "☕",
    lastUpdated: "3일 전",
    messageCount: 234,
    coverColor: "from-amber-900/50 to-neutral-900",
  },
]

export default function MyWorksPage() {
  const [works] = useState<Work[]>(mockWorks)

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 px-5 py-4 bg-black/95 backdrop-blur-sm border-b border-neutral-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-neutral-400" />
            <h1 className="text-lg font-bold text-neutral-100">내 작품</h1>
          </div>
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-800 transition-colors">
            <Plus className="w-5 h-5 text-neutral-400" />
          </button>
        </div>
      </header>

      {/* Works Grid */}
      <div className="px-5 py-6">
        <div className="grid grid-cols-1 gap-4">
          {works.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>

        {/* Empty State */}
        {works.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-neutral-600" />
            </div>
            <p className="text-neutral-500 text-sm">아직 작품이 없습니다</p>
            <p className="text-neutral-600 text-xs mt-1">채팅을 시작하면 자동으로 저장됩니다</p>
          </div>
        )}
      </div>
    </div>
  )
}

function WorkCard({ work }: { work: Work }) {
  return (
    <div className={cn(
      "relative rounded-xl overflow-hidden",
      "bg-gradient-to-br",
      work.coverColor,
      "border border-neutral-800/50"
    )}>
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
              <span className="text-lg">{work.characterEmoji}</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-100">{work.title}</h3>
              <p className="text-xs text-neutral-500">with {work.characterName}</p>
            </div>
          </div>
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-800/50 transition-colors">
            <MoreVertical className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 pt-2 border-t border-neutral-800/50">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{work.lastUpdated}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{work.messageCount}개의 메시지</span>
          </div>
        </div>
      </div>
    </div>
  )
}
