"use client"

import { useState } from "react"
import { 
  ChevronRight, 
  Gem, 
  FolderOpen, 
  Image as ImageIcon, 
  Bell, 
  Moon,
  HelpCircle,
  LogOut,
  UserX,
  Edit3
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"

export default function MyPage() {
  const [pushEnabled, setPushEnabled] = useState(true)

  const stats = [
    { label: "내 유니버스", value: "12" },
    { label: "캐릭터", value: "24" },
    { label: "누적 대화", value: "1.2k" },
  ]

  const mainMenuItems = [
    {
      icon: Gem,
      label: "나의 크레딧",
      value: "350",
      action: "충전",
      href: "/credits",
    },
    {
      icon: FolderOpen,
      label: "시나리오 아카이브",
      description: "내가 저장하거나 만든 시나리오",
      href: "/archive",
    },
    {
      icon: ImageIcon,
      label: "이벤트 갤러리",
      description: "대화 중 발생한 이미지 모음",
      href: "/gallery",
    },
  ]

  const settingsItems = [
    {
      icon: Bell,
      label: "푸시 알림 설정",
      type: "toggle" as const,
      value: pushEnabled,
      onToggle: () => setPushEnabled(!pushEnabled),
    },
    {
      icon: Moon,
      label: "테마 설정",
      type: "link" as const,
      description: "다크 모드",
      href: "/themes",
    },
    {
      icon: HelpCircle,
      label: "고객센터 및 FAQ",
      type: "link" as const,
      href: "/help",
    },
  ]

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Profile Section */}
      <section className="px-5 pt-8 pb-6">
        <div className="flex items-center gap-4">
          {/* Profile Image */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center">
              <span className="text-3xl">👤</span>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-neutral-100">김지은</h1>
            <p className="text-sm text-neutral-500 mt-0.5">jieun@email.com</p>
          </div>

          {/* Edit Button */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors">
            <Edit3 className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-300">프로필 수정</span>
          </button>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="px-5 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-neutral-900 rounded-xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-neutral-100">{stat.value}</p>
              <p className="text-xs text-neutral-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Main Menu */}
      <section className="px-5 pb-6">
        <div className="bg-neutral-900 rounded-xl overflow-hidden">
          {mainMenuItems.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-4 py-4 hover:bg-neutral-800/50 transition-colors",
                index !== mainMenuItems.length - 1 && "border-b border-neutral-800"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-neutral-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-200">{item.label}</p>
                {item.description && (
                  <p className="text-xs text-neutral-500 mt-0.5">{item.description}</p>
                )}
              </div>

              {item.value ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-100">{item.value}</span>
                  {item.action && (
                    <button 
                      onClick={(e) => e.preventDefault()}
                      className="px-3 py-1 rounded-full bg-neutral-700 hover:bg-neutral-600 text-xs text-neutral-200 transition-colors"
                    >
                      {item.action}
                    </button>
                  )}
                </div>
              ) : (
                <ChevronRight className="w-5 h-5 text-neutral-600" />
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* App Settings */}
      <section className="px-5 pb-6">
        <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3 px-1">
          앱 설정
        </h2>
        <div className="bg-neutral-900 rounded-xl overflow-hidden">
          {settingsItems.map((item, index) => (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-4 px-4 py-4",
                index !== settingsItems.length - 1 && "border-b border-neutral-800"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-neutral-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-200">{item.label}</p>
                {item.type === "link" && item.description && (
                  <p className="text-xs text-neutral-500 mt-0.5">{item.description}</p>
                )}
              </div>

              {item.type === "toggle" ? (
                <Switch
                  checked={item.value}
                  onCheckedChange={item.onToggle}
                  className="data-[state=checked]:bg-neutral-500 data-[state=unchecked]:bg-neutral-700"
                />
              ) : (
                <Link href={item.href || "#"} className="p-2 -mr-2">
                  <ChevronRight className="w-5 h-5 text-neutral-600" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Account Actions */}
      <section className="px-5 pb-8">
        <div className="flex flex-col gap-4 items-center pt-4">
          <button className="flex items-center gap-2 text-neutral-500 hover:text-neutral-400 transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="text-sm">로그아웃</span>
          </button>
          <button className="flex items-center gap-2 text-neutral-600 hover:text-neutral-500 transition-colors">
            <UserX className="w-4 h-4" />
            <span className="text-xs">계정 탈퇴</span>
          </button>
        </div>
      </section>
    </div>
  )
}
