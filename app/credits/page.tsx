"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, Gem, Sparkles, Info, X } from "lucide-react"
import { toast } from "sonner"
import { useAppStore, CREDIT_COSTS } from "@/lib/store"
import { CreditProductCard } from "@/components/chat/credit-product-card"
import { cn } from "@/lib/utils"
import { getCreditHistory, subscribeCreditUpdates, type CreditHistoryItem } from "@/lib/credit-storage"

const products = [
  { amount: 100, price: "₩1,200" },
  { amount: 500, price: "₩5,500", bonus: 50, badge: "인기" },
  { amount: 1000, price: "₩9,900", bonus: 150, badge: "최대 혜택", highlighted: true },
]

type CreditHistoryTab = "all" | "earned" | "spent"

const creditHistoryTabs: Array<{ id: CreditHistoryTab; label: string }> = [
  { id: "all", label: "전체" },
  { id: "earned", label: "지급" },
  { id: "spent", label: "사용" },
]

const demoCreditHistory: CreditHistoryItem[] = [
  { id: "demo-1", type: "earned", title: "가입 보너스", amount: 100, description: "기본 체험 크레딧", createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: "demo-2", type: "spent", title: "채팅 답변 생성", amount: -1, description: "이무기와 대화", createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
  { id: "demo-3", type: "spent", title: "이미지 생성", amount: -1, description: "주요 장면 이미지", createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
  { id: "demo-4", type: "earned", title: "출석 체크", amount: 10, description: "일일 출석 보상", createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
  { id: "demo-5", type: "spent", title: "분기 생성", amount: -3, description: "대화 분기 생성", createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
  { id: "demo-6", type: "spent", title: "채팅 답변 생성", amount: -1, description: "비 오는 서점의 대화", createdAt: new Date(Date.now() - 1000 * 60 * 130).toISOString() },
  { id: "demo-7", type: "earned", title: "크레딧 충전", amount: 550, description: "₩5,500 상품 · 보너스 포함", createdAt: new Date(Date.now() - 1000 * 60 * 170).toISOString() },
  { id: "demo-8", type: "spent", title: "OpenAI 답변 생성", amount: -3, description: "고급 모델 답변", createdAt: new Date(Date.now() - 1000 * 60 * 210).toISOString() },
  { id: "demo-9", type: "spent", title: "이미지 재생성", amount: -1, description: "수정 후 이미지 재생성", createdAt: new Date(Date.now() - 1000 * 60 * 260).toISOString() },
  { id: "demo-10", type: "earned", title: "이벤트 보상", amount: 30, description: "테스트 보상", createdAt: new Date(Date.now() - 1000 * 60 * 320).toISOString() },
  { id: "demo-11", type: "spent", title: "채팅 답변 생성", amount: -1, description: "황혼의 검객", createdAt: new Date(Date.now() - 1000 * 60 * 390).toISOString() },
  { id: "demo-12", type: "spent", title: "분기 생성", amount: -3, description: "다른 선택지 저장", createdAt: new Date(Date.now() - 1000 * 60 * 460).toISOString() },
]

export default function CreditsPage() {
  const credits = useAppStore((s) => s.credits)
  const chargeCredit = useAppStore((s) => s.chargeCredit)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyTab, setHistoryTab] = useState<CreditHistoryTab>("all")
  const [history, setHistory] = useState<CreditHistoryItem[]>([])
  const displayHistory = [...history, ...demoCreditHistory]
  const visibleHistory = useMemo(
    () => displayHistory.filter((item) => historyTab === "all" || item.type === historyTab),
    [displayHistory, historyTab],
  )

  useEffect(() => {
    const syncHistory = () => setHistory(getCreditHistory())
    syncHistory()
    return subscribeCreditUpdates(syncHistory)
  }, [])

  const handlePurchase = (product: typeof products[number]) => {
    const total = product.amount + (product.bonus ?? 0)
    chargeCredit(total, "크레딧 충전", `${product.price} 상품${product.bonus ? ` · 보너스 ${product.bonus} 포함` : ""}`)
    toast.success(`${total.toLocaleString()} 크레딧이 충전됐어요.`)
  }

  const handleSubscribe = () => {
    chargeCredit(2000, "프리미엄 월간 지급", "월간 구독 체험 보상")
    toast.success("2,000 크레딧이 지급됐어요.")
  }

  const formatHistoryDate = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "날짜 없음"
    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const renderHistoryDescription = (item: CreditHistoryItem) => {
    return [item.description, formatHistoryDate(item.createdAt)].filter(Boolean).join(" · ")
  }

  const handleAttendanceReward = () => {
    const todayKey = new Date().toISOString().slice(0, 10)
    const storageKey = "storychat_credit_attendance_date"
    if (typeof window !== "undefined" && window.localStorage.getItem(storageKey) === todayKey) {
      toast("오늘 출석 보상은 이미 받았어요.")
      return
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, todayKey)
    }
    chargeCredit(10, "출석 체크", "일일 출석 보상")
    toast.success("출석 보상 10 크레딧을 받았어요.")
  }

  const emptyHistoryText = historyTab === "earned"
    ? "지급 내역이 없어요."
    : historyTab === "spent"
      ? "사용 내역이 없어요."
      : "아직 크레딧 내역이 없어요."

  const renderUsageCosts = () => (
    <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted p-3">
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">
          {CREDIT_COSTS.message} <span className="text-[10px] font-medium text-muted-foreground">소요</span>
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">메시지 한번 전송 시</p>
      </div>
      <div className="border-x border-border text-center">
        <p className="text-sm font-semibold text-foreground">
          {CREDIT_COSTS.branch} <span className="text-[10px] font-medium text-muted-foreground">소요</span>
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">분기 생성 1번당</p>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">
          {CREDIT_COSTS.image} <span className="text-[10px] font-medium text-muted-foreground">소요</span>
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">이미지 한번 전송시</p>
      </div>
    </div>
  )

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background backdrop-blur-sm px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Link
            href="/mypage"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent transition-colors"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">나의 크레딧</h1>
        </div>
      </header>

      <div className="px-5 pt-6 space-y-8">
        {/* Balance Card */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs text-muted-foreground">현재 보유 크레딧</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Gem className="h-6 w-6 shrink-0 text-primary" />
              <span className="truncate text-3xl font-bold text-foreground">
                {credits.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
            >
              사용내역 보기
            </button>
          </div>
        </section>

        <section>
          <button
            type="button"
            onClick={handleAttendanceReward}
            className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">출석 체크</p>
                <p className="mt-1 text-xs text-muted-foreground">하루 한 번 10 크레딧을 받을 수 있어요.</p>
              </div>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">+10</span>
            </div>
          </button>
        </section>

        {/* Charge Products */}
        <section>
          <h2 className="mb-4 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            크레딧 충전
          </h2>
          <div className="space-y-3">
            {products.map((p) => (
              <CreditProductCard
                key={p.amount}
                amount={p.amount}
                price={p.price}
                bonus={p.bonus}
                badge={p.badge}
                highlighted={p.highlighted}
                onClick={() => handlePurchase(p)}
              />
            ))}
          </div>
        </section>

        {/* Subscription */}
        <section>
          <h2 className="mb-4 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            월간 구독
          </h2>
          <button
            onClick={handleSubscribe}
            className="w-full rounded-2xl border border-primary bg-accent p-5 text-left transition-colors hover:bg-secondary"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-base font-bold text-foreground">프리미엄 월간</span>
              <span className="ml-auto text-base font-bold text-foreground">₩14,900</span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {[
                "매월 2,000 크레딧 지급",
                "이미지 생성 무제한",
                "신규 스토리팩 우선 이용",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </button>
        </section>

        {/* Notice */}
        <div className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <p className="text-[11px] leading-relaxed text-muted-foreground text-pretty">
            실제 결제 기능은 준비 중이에요. 현재는 크레딧 구조를 미리 체험하실 수 있어요.
          </p>
        </div>
      </div>
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-background text-foreground" role="dialog" aria-modal="true" aria-label="크레딧 사용내역">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
            <div>
              <h2 className="text-lg font-bold">크레딧 사용내역</h2>
              <p className="text-xs text-muted-foreground">지급 및 사용 기록을 확인합니다.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl space-y-6 px-5 py-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
            <section>
              <h3 className="mb-3 px-1 text-sm font-bold text-foreground">기능별 크레딧 사용량</h3>
              {renderUsageCosts()}
            </section>

            <section className="space-y-3">
              <div className="sticky top-0 z-10 -mx-5 bg-background/95 px-5 py-2 backdrop-blur">
                <div className="grid grid-cols-3 rounded-xl border border-border bg-muted/60 p-1">
                {creditHistoryTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setHistoryTab(tab.id)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                      historyTab === tab.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
                </div>
              </div>

              <div className="space-y-2">
                {visibleHistory.length > 0 ? visibleHistory.map((item) => (
                  <article key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold",
                            item.type === "earned"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-300",
                          )}
                        >
                          {item.type === "earned" ? "지급" : "사용"}
                        </span>
                        <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{renderHistoryDescription(item)}</p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-sm font-bold tabular-nums",
                        item.amount > 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300",
                      )}
                    >
                      {item.amount > 0 ? "+" : ""}
                      {item.amount.toLocaleString()}
                    </p>
                  </article>
                )) : (
                  <div className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center">
                    <p className="text-sm text-muted-foreground">{emptyHistoryText}</p>
                  </div>
                )}
              </div>
            </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
