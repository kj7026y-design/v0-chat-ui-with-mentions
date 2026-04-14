"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, MessageCircle, PlusCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { icon: Home, label: "홈", href: "/" },
  { icon: MessageCircle, label: "채팅", href: "/chat/1" },
  { icon: PlusCircle, label: "만들기", href: "/create" },
  { icon: User, label: "마이페이지", href: "/mypage" },
]

export function BottomNavBar() {
  const pathname = usePathname()

  return (
    <nav className="bg-neutral-900/80 backdrop-blur-md border-t border-neutral-800/50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href === "/chat/1" && pathname?.startsWith("/chat"))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors",
                isActive ? "text-neutral-100" : "text-neutral-500"
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
