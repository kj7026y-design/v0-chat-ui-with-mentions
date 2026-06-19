"use client"

import { useState } from "react"
import { X } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function LandingPage() {
  const [showLoginModal, setShowLoginModal] = useState(false)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            StoryChat
          </h1>
        </div>

        {/* Hero Text */}
        <div className="text-center mb-12 max-w-md">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-4 text-balance">
            당신만의 세계관을
            <br />
            완성하세요
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            AI와 함께 캐릭터를 만들고, 세계관을 설정하고,
            <br />
            당신만의 이야기를 펼쳐보세요.
          </p>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => setShowLoginModal(true)}
          className="px-8 py-4 bg-primary text-primary-foreground font-semibold text-base rounded-full hover:bg-primary/90 transition-colors"
        >
          지금 시작하기
        </button>

        {/* Secondary Link */}
        <p className="mt-6 text-muted-foreground text-sm">
          이미 계정이 있으신가요?{" "}
          <button 
            onClick={() => setShowLoginModal(true)}
            className="text-foreground hover:text-primary transition-colors underline underline-offset-2"
          >
            로그인
          </button>
        </p>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center relative z-10">
        <p className="text-muted-foreground text-xs">
          계속 진행하면 서비스 약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  )
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const socialLogins = [
    {
      id: "naver",
      name: "네이버로 계속하기",
      bgColor: "bg-[#03C75A]",
      textColor: "text-white",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
        </svg>
      ),
    },
    {
      id: "kakao",
      name: "카카오로 계속하기",
      bgColor: "bg-[#FEE500]",
      textColor: "text-[#191919]",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M12 3C6.477 3 2 6.463 2 10.692c0 2.623 1.74 4.927 4.377 6.272-.19.712-.69 2.58-.79 2.981-.121.492.181.484.38.352.157-.103 2.5-1.697 3.511-2.388.499.075 1.011.115 1.522.115 5.523 0 10-3.463 10-7.692C22 6.463 17.523 3 12 3z"/>
        </svg>
      ),
    },
    {
      id: "google",
      name: "Google로 계속하기",
      bgColor: "bg-white border border-border",
      textColor: "text-black",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      ),
    },
    {
      id: "x",
      name: "X로 계속하기",
      bgColor: "bg-background border border-border",
      textColor: "text-foreground",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-4 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:w-full sm:max-w-md">
        <div className="bg-popover rounded-t-2xl sm:rounded-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-lg font-semibold text-popover-foreground">로그인</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-3">
            <p className="text-muted-foreground text-sm text-center mb-4">
              소셜 계정으로 간편하게 시작하세요
            </p>

            {socialLogins.map((login) => (
              <Link
                key={login.id}
                href="/"
                className={cn(
                  "flex items-center justify-center gap-3 w-full py-3.5 rounded-xl font-medium transition-opacity hover:opacity-90",
                  login.bgColor,
                  login.textColor
                )}
              >
                {login.icon}
                <span className="text-sm">{login.name}</span>
              </Link>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border">
            <p className="text-muted-foreground text-xs text-center">
              로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의합니다.
            </p>
          </div>

          {/* Safe Area Padding */}
          <div className="h-[env(safe-area-inset-bottom)] sm:hidden" />
        </div>
      </div>
    </>
  )
}
