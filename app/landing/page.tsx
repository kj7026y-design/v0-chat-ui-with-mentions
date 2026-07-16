"use client"

import { useState, type FormEvent } from "react"
import {
  BriefcaseBusiness,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const [showLoginModal, setShowLoginModal] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="fixed inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground">StoryChat</h1>

        <div className="mb-12 max-w-md text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            당신만의 세계관을
            <br />
            완성하세요
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            AI와 함께 캐릭터를 만들고, 세계관을 설정하고,
            <br />
            당신만의 이야기를 펼쳐보세요.
          </p>
        </div>

        <button
          onClick={() => setShowLoginModal(true)}
          className="rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          지금 시작하기
        </button>

        <p className="mt-6 text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <button
            onClick={() => setShowLoginModal(true)}
            className="text-foreground underline underline-offset-2 transition-colors hover:text-primary"
          >
            로그인
          </button>
        </p>
      </main>

      <footer className="relative z-10 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          계속 진행하면 서비스 약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </footer>

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </div>
  )
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [accountType, setAccountType] = useState<"staff" | "member">("staff")
  const [identifier, setIdentifier] = useState("admin")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const changeAccountType = (nextType: "staff" | "member") => {
    if (nextType === accountType) return
    setAccountType(nextType)
    setIdentifier(nextType === "staff" ? "admin" : "")
    setPassword("")
    setShowPassword(false)
    setError("")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    setError("")
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType, identifier, password }),
      })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(data.error || "로그인하지 못했습니다.")
      router.push("/chats")
      router.refresh()
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "로그인하지 못했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-x-4 bottom-0 z-50 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2">
        <div className="animate-in overflow-hidden rounded-t-2xl border border-border bg-popover duration-300 slide-in-from-bottom-4 sm:rounded-2xl sm:fade-in sm:slide-in-from-bottom-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-lg font-semibold text-popover-foreground">로그인</h3>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-accent"
              aria-label="로그인 닫기"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <form className="space-y-4 p-5" onSubmit={handleSubmit}>
            <div
              className="grid grid-cols-2 rounded-lg bg-muted p-1"
              role="group"
              aria-label="계정 유형"
            >
              <button
                type="button"
                aria-pressed={accountType === "staff"}
                onClick={() => changeAccountType("staff")}
                className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors ${
                  accountType === "staff"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                직원
              </button>
              <button
                type="button"
                aria-pressed={accountType === "member"}
                onClick={() => changeAccountType("member")}
                className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors ${
                  accountType === "member"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                회원
              </button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {accountType === "staff"
                ? "관리자·개발자·운영자는 아이디로 로그인합니다."
                : "작가와 일반 회원은 이메일로 로그인합니다."}
            </p>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-popover-foreground">
                {accountType === "staff" ? "아이디" : "이메일"}
              </span>
              <span className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 focus-within:border-ring">
                {accountType === "staff"
                  ? <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  : <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                <input
                  type={accountType === "staff" ? "text" : "email"}
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  autoComplete={accountType === "staff" ? "username" : "email"}
                  placeholder={accountType === "staff" ? "아이디" : "name@example.com"}
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                  autoFocus
                  required
                />
              </span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-popover-foreground">비밀번호</span>
              <span className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 focus-within:border-ring">
                <LockKeyhole className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                  required
                />
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  aria-pressed={showPassword}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                    : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </span>
            </label>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              로그인
            </button>
          </form>

          <div className="border-t border-border px-5 py-4">
            <p className="text-center text-xs text-muted-foreground">
              로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의합니다.
            </p>
          </div>
          <div className="h-[env(safe-area-inset-bottom)] sm:hidden" />
        </div>
      </div>
    </>
  )
}
