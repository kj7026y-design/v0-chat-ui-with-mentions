"use client"

import { useState } from "react"
import Link from "next/link"
import { X, Clock, Palette, SlidersHorizontal, Image as ImageIcon, User, Trash2, LogOut, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatSettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  characterName: string
  characterEmoji: string
}

const timelineEvents = [
  { id: "1", title: "첫 만남", date: "2024년 3월 1일" },
  { id: "2", title: "이무기의 생일", date: "2024년 4월 15일" },
  { id: "3", title: "우리의 100일", date: "2024년 6월 9일" },
]

const themeOptions = [
  { id: "dark", label: "다크", color: "bg-neutral-900", ring: "ring-neutral-100" },
  { id: "kakao", label: "카톡", color: "bg-[#9bbbd4]", ring: "ring-[#9bbbd4]" },
  { id: "classic", label: "클래식", color: "bg-[#e8ddd4]", ring: "ring-[#e8ddd4]" },
  { id: "pink", label: "핑크", color: "bg-[#ffb8c6]", ring: "ring-[#ffb8c6]" },
]

const sharedMedia = [
  "/placeholder-media-1.jpg",
  "/placeholder-media-2.jpg",
  "/placeholder-media-3.jpg",
  "/placeholder-media-4.jpg",
  "/placeholder-media-5.jpg",
  "/placeholder-media-6.jpg",
]

export function ChatSettingsDrawer({ 
  isOpen, 
  onClose, 
  characterName, 
  characterEmoji 
}: ChatSettingsDrawerProps) {
  const [selectedTheme, setSelectedTheme] = useState("dark")
  const [spicyLevel, setSpicyLevel] = useState(50)
  const [uniqueLevel, setUniqueLevel] = useState(70)

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 w-[80%] max-w-sm bg-neutral-900 shadow-2xl transition-transform duration-300 ease-out overflow-y-auto",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-neutral-900/95 backdrop-blur-sm px-4 py-4 flex items-center justify-between border-b border-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
              <span className="text-lg">{characterEmoji}</span>
            </div>
            <div>
              <h2 className="font-semibold text-neutral-100">{characterName}</h2>
              <p className="text-xs text-neutral-500">세계관 날짜: 2024년 6월 15일</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-800 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-6">
          {/* Timeline Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-neutral-400" />
              <h3 className="text-sm font-medium text-neutral-300">타임라인</h3>
            </div>
            <div className="bg-neutral-800/50 rounded-lg overflow-hidden">
              {timelineEvents.map((event, index) => (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5",
                    index !== timelineEvents.length - 1 && "border-b border-neutral-700/50"
                  )}
                >
                  <span className="text-sm text-neutral-200">{event.title}</span>
                  <span className="text-xs text-neutral-500">{event.date}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-2 py-2 text-sm text-neutral-400 hover:text-neutral-300 transition-colors">
              전체 보기 →
            </button>
          </section>

          {/* Theme Section */}
          <section>
            <Link 
              href="/themes"
              className="flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-neutral-800/50 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-neutral-400" />
                <h3 className="text-sm font-medium text-neutral-300">채팅 테마</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  {themeOptions.slice(0, 4).map((theme) => (
                    <div
                      key={theme.id}
                      className={cn(
                        "w-5 h-5 rounded-full",
                        theme.color,
                        selectedTheme === theme.id && "ring-1 ring-offset-1 ring-offset-neutral-900 ring-neutral-400"
                      )}
                    />
                  ))}
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
              </div>
            </Link>
          </section>

          {/* Personality Tuning Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
              <h3 className="text-sm font-medium text-neutral-300">성격 튜닝</h3>
            </div>
            <div className="space-y-4">
              {/* Spicy Level */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-400">매운맛</span>
                  <span className="text-xs text-neutral-500">{spicyLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={spicyLevel}
                  onChange={(e) => setSpicyLevel(Number(e.target.value))}
                  className="w-full h-1.5 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-neutral-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-neutral-100 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                />
              </div>

              {/* Unique Level */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-400">독특함</span>
                  <span className="text-xs text-neutral-500">{uniqueLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={uniqueLevel}
                  onChange={(e) => setUniqueLevel(Number(e.target.value))}
                  className="w-full h-1.5 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-neutral-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-neutral-100 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                />
              </div>
            </div>
          </section>

          {/* Shared Media Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-neutral-400" />
              <h3 className="text-sm font-medium text-neutral-300">공유 미디어</h3>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {sharedMedia.map((_, index) => (
                <div
                  key={index}
                  className="aspect-square bg-neutral-800 rounded-md flex items-center justify-center"
                >
                  <ImageIcon className="w-5 h-5 text-neutral-600" />
                </div>
              ))}
            </div>
            <button className="w-full mt-2 py-2 text-sm text-neutral-400 hover:text-neutral-300 transition-colors">
              전체 보기 →
            </button>
          </section>

          {/* My Persona Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-neutral-400" />
              <h3 className="text-sm font-medium text-neutral-300">내 자아</h3>
            </div>
            <div className="bg-neutral-800/50 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center">
                  <User className="w-6 h-6 text-neutral-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-200">지은</p>
                  <p className="text-xs text-neutral-500">22세 / 대학생</p>
                </div>
                <button className="px-3 py-1.5 text-xs text-neutral-300 bg-neutral-700 hover:bg-neutral-600 rounded-md transition-colors">
                  수정
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Danger Zone */}
        <div className="px-4 py-6 mt-4 border-t border-neutral-800/50 space-y-2">
          <button className="w-full flex items-center justify-center gap-2 py-3 text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
            대화 초기화
          </button>
          <button className="w-full flex items-center justify-center gap-2 py-3 text-sm text-red-400 hover:bg-neutral-800 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
            채팅방 나가기
          </button>
        </div>
      </div>
    </>
  )
}
