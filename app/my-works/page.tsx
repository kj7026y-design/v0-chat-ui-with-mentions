"use client"

import { useState, useRef, useEffect } from "react"
import { BookOpen, Plus, MoreVertical, Calendar, MapPin, Play, ChevronRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type TabId = "characters" | "scenarios" | "completed"

interface Tab {
  id: TabId
  label: string
}

const tabs: Tab[] = [
  { id: "characters", label: "캐릭터" },
  { id: "scenarios", label: "세계관" },
  { id: "completed", label: "완성본" },
]

// Mock data
interface Character {
  id: string
  name: string
  image?: string
  emoji: string
  tags: string[]
  description: string
}

interface Scenario {
  id: string
  title: string
  startDate: string
  coverColor: string
  events: string[]
  description: string
}

interface CompletedWork {
  id: string
  characterId: string
  characterName: string
  characterEmoji: string
  scenarioId: string
  scenarioTitle: string
  lastMessage: string
  messageCount: number
  lastUpdated: string
}

const mockCharacters: Character[] = [
  {
    id: "c1",
    name: "이무기",
    emoji: "🐉",
    tags: ["신비로운", "고독한", "지혜로운"],
    description: "천년을 기다린 용이 되지 못한 존재",
  },
  {
    id: "c2",
    name: "하늘",
    emoji: "🌸",
    tags: ["활발한", "따뜻한", "순수한"],
    description: "항상 밝은 에너지를 가진 이웃집 친구",
  },
  {
    id: "c3",
    name: "루나",
    emoji: "🌙",
    tags: ["신비로운", "차분한", "예술적"],
    description: "달빛 아래서만 나타나는 비밀스러운 존재",
  },
]

const mockScenarios: Scenario[] = [
  {
    id: "s1",
    title: "잊혀진 왕국",
    startDate: "AC 300년 4월 16일",
    coverColor: "from-emerald-900/30 to-neutral-900",
    events: ["왕국의 몰락", "숨겨진 예언서 발견", "용의 각성"],
    description: "천년의 잠에서 깨어난 왕국의 마지막 이야기",
  },
  {
    id: "s2",
    title: "현대 서울",
    startDate: "2024년 3월 1일",
    coverColor: "from-blue-900/30 to-neutral-900",
    events: ["우연한 만남", "비밀의 카페", "운명의 선택"],
    description: "평범한 일상 속 특별한 인연",
  },
  {
    id: "s3",
    title: "별들의 도시",
    startDate: "SC 2187년 1월 1일",
    coverColor: "from-purple-900/30 to-neutral-900",
    events: ["첫 접촉", "은하 전쟁", "새로운 시작"],
    description: "우주 저편에서 펼쳐지는 모험",
  },
]

const mockCompletedWorks: CompletedWork[] = [
  {
    id: "w1",
    characterId: "c1",
    characterName: "이무기",
    characterEmoji: "🐉",
    scenarioId: "s1",
    scenarioTitle: "잊혀진 왕국",
    lastMessage: "그래, 알겠어. 함께 가자.",
    messageCount: 156,
    lastUpdated: "오늘",
  },
  {
    id: "w2",
    characterId: "c2",
    characterName: "하늘",
    characterEmoji: "🌸",
    scenarioId: "s2",
    scenarioTitle: "현대 서울",
    lastMessage: "내일 카페에서 만나!",
    messageCount: 89,
    lastUpdated: "어제",
  },
  {
    id: "w3",
    characterId: "c3",
    characterName: "루나",
    characterEmoji: "🌙",
    scenarioId: "s3",
    scenarioTitle: "별들의 도시",
    lastMessage: "별빛이 우리를 인도할 거야.",
    messageCount: 234,
    lastUpdated: "3일 전",
  },
]

export default function MyWorksPage() {
  const [activeTab, setActiveTab] = useState<TabId>("characters")
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Update indicator position when tab changes
  useEffect(() => {
    const activeIndex = tabs.findIndex(t => t.id === activeTab)
    const activeTabElement = tabRefs.current[activeIndex]
    if (activeTabElement) {
      setIndicatorStyle({
        left: activeTabElement.offsetLeft,
        width: activeTabElement.offsetWidth,
      })
    }
  }, [activeTab])

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black border-b border-neutral-800/50">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-neutral-400" />
            <h1 className="text-lg font-bold text-neutral-100">내 작품</h1>
          </div>
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-800 transition-colors">
            <Plus className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Sticky Tabs */}
        <div className="relative px-5">
          <div className="flex">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[index] = el }}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.id ? "text-neutral-100" : "text-neutral-500"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Sliding Indicator */}
          <div
            className="absolute bottom-0 h-0.5 bg-neutral-100 transition-all duration-300 ease-out"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
          />
        </div>
      </header>

      {/* Tab Content */}
      <div className="px-5 py-6">
        {activeTab === "characters" && <CharactersTab characters={mockCharacters} />}
        {activeTab === "scenarios" && <ScenariosTab scenarios={mockScenarios} />}
        {activeTab === "completed" && <CompletedTab works={mockCompletedWorks} />}
      </div>
    </div>
  )
}

// Characters Tab - Card Format
function CharactersTab({ characters }: { characters: Character[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {characters.map((character) => (
        <div
          key={character.id}
          className="bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800/50"
        >
          {/* Character Image/Avatar */}
          <div className="aspect-[4/3] bg-neutral-800 flex items-center justify-center">
            <span className="text-5xl">{character.emoji}</span>
          </div>
          
          {/* Character Info */}
          <div className="p-3">
            <h3 className="text-sm font-semibold text-neutral-100 mb-1">
              {character.name}
            </h3>
            <p className="text-xs text-neutral-500 line-clamp-1 mb-2">
              {character.description}
            </p>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {character.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-[10px] bg-neutral-800 text-neutral-400 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
      
      {/* Add Character Card */}
      <button className="aspect-auto min-h-[180px] bg-neutral-900/50 rounded-xl border border-dashed border-neutral-700 flex flex-col items-center justify-center gap-2 hover:bg-neutral-900 hover:border-neutral-600 transition-colors">
        <Plus className="w-6 h-6 text-neutral-600" />
        <span className="text-xs text-neutral-500">새 캐릭터</span>
      </button>
    </div>
  )
}

// Scenarios Tab - Poster Format
function ScenariosTab({ scenarios }: { scenarios: Scenario[] }) {
  return (
    <div className="flex flex-col gap-4">
      {scenarios.map((scenario) => (
        <div
          key={scenario.id}
          className={cn(
            "relative rounded-xl overflow-hidden bg-gradient-to-br border border-neutral-800/50",
            scenario.coverColor
          )}
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-neutral-100">
                  {scenario.title}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3 h-3 text-neutral-500" />
                  <span className="text-xs text-neutral-500">{scenario.startDate}</span>
                </div>
              </div>
              <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-800/50 transition-colors">
                <MoreVertical className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            
            {/* Description */}
            <p className="text-sm text-neutral-400 mb-3">
              {scenario.description}
            </p>
            
            {/* Key Events */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">주요 사건</span>
              <div className="flex flex-wrap gap-2">
                {scenario.events.map((event, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-neutral-600" />
                    <span className="text-xs text-neutral-400">{event}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {/* Add Scenario */}
      <button className="py-6 rounded-xl border border-dashed border-neutral-700 flex flex-col items-center justify-center gap-2 hover:bg-neutral-900/50 hover:border-neutral-600 transition-colors">
        <Plus className="w-6 h-6 text-neutral-600" />
        <span className="text-xs text-neutral-500">새 세계관</span>
      </button>
    </div>
  )
}

// Completed Works Tab - Combined List
function CompletedTab({ works }: { works: CompletedWork[] }) {
  return (
    <div className="flex flex-col gap-3">
      {works.map((work) => (
        <div
          key={work.id}
          className="bg-neutral-900 rounded-xl border border-neutral-800/50 overflow-hidden"
        >
          <div className="p-4">
            {/* Header Row */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center">
                <span className="text-xl">{work.characterEmoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-100">
                    {work.characterName}
                  </span>
                  <span className="text-neutral-600">+</span>
                  <span className="text-sm text-neutral-400">
                    {work.scenarioTitle}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">
                  {work.lastMessage}
                </p>
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-800/50">
              <div className="flex items-center gap-4">
                <span className="text-xs text-neutral-500">
                  {work.messageCount}개 메시지
                </span>
                <span className="text-xs text-neutral-500">
                  {work.lastUpdated}
                </span>
              </div>
              
              {/* Continue Button */}
              <Link
                href={`/chat/${work.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
              >
                <Play className="w-3.5 h-3.5 text-neutral-300" />
                <span className="text-xs font-medium text-neutral-300">대화 이어가기</span>
              </Link>
            </div>
          </div>
        </div>
      ))}
      
      {works.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-neutral-600" />
          </div>
          <p className="text-neutral-500 text-sm">아직 완성본이 없습니다</p>
          <p className="text-neutral-600 text-xs mt-1">캐릭터와 세계관을 조합해 시작하세요</p>
        </div>
      )}
    </div>
  )
}
