"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Compass, Home, MessageCircle, PlusCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { icon: Home, label: "홈", href: "/" },
  { icon: Compass, label: "탐색", href: "/explore" },
  { icon: MessageCircle, label: "채팅", href: "/chats" },
  { icon: PlusCircle, label: "만들기", href: "/create" },
  { icon: User, label: "마이페이지", href: "/mypage" },
]

export function BottomNavBar() {
  const pathname = usePathname()
  const isChatRoom = /^\/chat\/[^/]+$/.test(pathname ?? "")

  if (isChatRoom) return null

  return (
    <nav className="bg-background backdrop-blur-md border-t border-border">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href === "/chats" && pathname?.startsWith("/chat"))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-2.5 py-2 transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
      
      {/* Safe Area Padding for iPhone */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
