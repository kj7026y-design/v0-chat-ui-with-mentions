"use client"

import Link from "next/link"
import { ChevronLeft, Gem, Sparkles, Info } from "lucide-react"
import { toast } from "sonner"
import { useAppStore, CREDIT_COSTS } from "@/lib/store"
import { CreditProductCard } from "@/components/chat/credit-product-card"

const products = [
  { amount: 100, price: "₩1,200" },
  { amount: 500, price: "₩5,500", bonus: 50, badge: "인기" },
  { amount: 1000, price: "₩9,900", bonus: 150, badge: "최대 혜택", highlighted: true },
]

export default function CreditsPage() {
  const credits = useAppStore((s) => s.credits)

  const handlePurchase = () => {
    toast("결제 기능은 준비 중이에요.", {
      description: "다음 업데이트에서 사용할 수 있어요.",
    })
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Link
            href="/mypage"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent transition-colors"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">크레딧 충전</h1>
        </div>
      </header>

      <div className="px-5 pt-6 space-y-8">
        {/* Balance Card */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs text-muted-foreground">현재 보유 크레딧</p>
          <div className="mt-2 flex items-center gap-2">
            <Gem className="h-6 w-6 text-primary" />
            <span className="text-3xl font-bold text-foreground">
              {credits.toLocaleString()}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3">
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">{CREDIT_COSTS.message}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">메시지</p>
            </div>
            <div className="text-center border-x border-border/60">
              <p className="text-sm font-semibold text-foreground">{CREDIT_COSTS.branch}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">분기</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">{CREDIT_COSTS.image}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">이미지</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground text-center">
            기능별 크레딧 사용량
          </p>
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
                onClick={handlePurchase}
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
            onClick={handlePurchase}
            className="w-full rounded-2xl border border-primary/50 bg-primary/5 p-5 text-left transition-colors hover:bg-primary/10"
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
        <div className="flex items-start gap-2 rounded-xl bg-muted/50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <p className="text-[11px] leading-relaxed text-muted-foreground text-pretty">
            실제 결제 기능은 준비 중이에요. 현재는 크레딧 구조를 미리 체험하실 수 있어요.
          </p>
        </div>
      </div>
    </div>
  )
}
