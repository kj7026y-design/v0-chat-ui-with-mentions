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
import { useAppStore } from "@/lib/store"
import { EventCard } from "@/components/chat/event-card"

export default function MyPage() {
  const [pushEnabled, setPushEnabled] = useState(true)
  const credits = useAppStore((s) => s.credits)
  const events = useAppStore((s) => s.events)

  const stats = [
    { label: "내 유니버스", value: "12" },
    { label: "캐릭터", value: "24" },
    { label: "누적 대화", value: "1.2k" },
  ]

  const mainMenuItems = [
    {
      icon: Gem,
      label: "나의 크레딧",
      value: credits.toLocaleString(),
      action: "충전",
      href: "/credits",
    },
    {
      icon: FolderOpen,
      label: "세계관 아카이브",
      description: "내가 저장하거나 만든 세계관",
      href: "/archive",
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
      description: "라이트 / 다크 모드 전환",
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
    <div className="min-h-screen bg-background pb-24">
      {/* Profile Section */}
      <section className="px-5 pt-8 pb-6">
        <div className="flex items-center gap-4">
          {/* Profile Image */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-muted overflow-hidden flex items-center justify-center">
              <span className="text-3xl">👤</span>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">김지은</h1>
            <p className="text-sm text-muted-foreground mt-0.5">jieun@email.com</p>
          </div>

          {/* Edit Button */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-accent transition-colors">
            <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-foreground">프로필 수정</span>
          </button>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="px-5 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Main Menu */}
      <section className="px-5 pb-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {mainMenuItems.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-4 py-4 hover:bg-accent/50 transition-colors",
                index !== mainMenuItems.length - 1 && "border-b border-border"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <item.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                )}
              </div>

              {item.value ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{item.value}</span>
                  {item.action && (
                    <button 
                      onClick={(e) => e.preventDefault()}
                      className="px-3 py-1 rounded-full bg-secondary hover:bg-accent text-xs text-secondary-foreground transition-colors"
                    >
                      {item.action}
                    </button>
                  )}
                </div>
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Event Gallery */}
      <section className="px-5 pb-6">
        <h2 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
          <ImageIcon className="w-3.5 h-3.5" />
          이벤트 갤러리
        </h2>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl px-4 py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
              아직 저장한 장면이 없어요.
              <br />
              채팅 중 마음에 드는 장면을 저장해보세요.
            </p>
          </div>
        )}
      </section>

      {/* App Settings */}
      <section className="px-5 pb-6">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
          앱 설정
        </h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {settingsItems.map((item, index) => {
            const content = (
              <>
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  {item.type === "link" && item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  )}
                </div>

                {item.type === "toggle" ? (
                  <Switch
                    checked={item.value}
                    onCheckedChange={item.onToggle}
                  />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </>
            )

            const className = cn(
              "flex items-center gap-4 px-4 py-4 hover:bg-accent/50 transition-colors",
              index !== settingsItems.length - 1 && "border-b border-border"
            )

            if (item.type === "toggle") {
              return (
                <div key={item.label} className={className}>
                  {content}
                </div>
              )
            }

            return (
              <Link key={item.label} href={item.href || "#"} className={className}>
                {content}
              </Link>
            )
          })}
        </div>
      </section>

      {/* Account Actions */}
      <section className="px-5 pb-8">
        <div className="flex flex-col gap-4 items-center pt-4">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="text-sm">로그아웃</span>
          </button>
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <UserX className="w-4 h-4" />
            <span className="text-xs">계정 탈퇴</span>
          </button>
        </div>
      </section>
    </div>
  )
}
