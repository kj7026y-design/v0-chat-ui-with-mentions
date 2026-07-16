"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Ban,
  Check,
  Coins,
  Edit3,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  UserRoundCheck,
  UsersRound,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { getAdminSessionState } from "@/lib/chat-history-client"
import {
  type ManagedMember,
  type ManagedMemberKind,
  type ManagedMemberListResponse,
  type ManagedWriterTier,
  type MemberAdminAction,
  type MemberPermissionKey,
} from "@/lib/member-admin-types"

const STAFF_ROLES = new Set(["administrator", "developer", "operator"])
const PERMISSION_OPTIONS: Array<{ value: MemberPermissionKey; label: string }> = [
  { value: "authoring", label: "작품 제작" },
  { value: "premium_models", label: "프리미엄 모델" },
  { value: "media_generation", label: "미디어 생성" },
]

const ROLE_LABELS = {
  administrator: "관리자",
  developer: "개발자",
  operator: "운영자",
  member: "회원",
} as const

const TIER_LABELS = {
  prime: "프라임 작가",
  gold: "골드 작가",
  silver: "실버 작가",
} as const

type SelectedMemberAction =
  | Omit<Extract<MemberAdminAction, { action: "set_access" }>, "memberIds">
  | Omit<Extract<MemberAdminAction, { action: "set_unsafe" }>, "memberIds">
  | Omit<Extract<MemberAdminAction, { action: "adjust_credit" }>, "memberIds">
  | Omit<Extract<MemberAdminAction, { action: "set_permission" }>, "memberIds">

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.")
  return data
}

export default function MemberAdminPage() {
  const router = useRouter()
  const [staffRole, setStaffRole] = useState<keyof typeof ROLE_LABELS | null>(null)
  const [members, setMembers] = useState<ManagedMember[]>([])
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState("")
  const [activeSearch, setActiveSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [editingMember, setEditingMember] = useState<ManagedMember | null>(null)
  const [permission, setPermission] = useState<MemberPermissionKey>("authoring")
  const [creditMode, setCreditMode] = useState<"topup" | "deduct">("topup")
  const [creditAmount, setCreditAmount] = useState("100")

  const loadMembers = useCallback(async (search: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const response = await fetch(`/api/admin/members?${params.toString()}`, { cache: "no-store" })
      const data = await readJson<ManagedMemberListResponse>(response)
      setMembers(data.members)
      setTotal(data.total)
      setSelectedIds((current) => {
        const visibleIds = new Set(data.members.map((member) => member.memberId))
        return new Set([...current].filter((memberId) => visibleIds.has(memberId)))
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "회원 목록을 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const initialize = async () => {
      try {
        const session = await getAdminSessionState()
        if (cancelled) return
        if (
          !session.authenticated || session.accountType !== "staff" ||
          !session.role || !STAFF_ROLES.has(session.role)
        ) {
          router.replace("/chats")
          return
        }
        setStaffRole(session.role)
        await loadMembers("")
      } catch {
        if (!cancelled) router.replace("/landing")
      }
    }
    void initialize()
    return () => {
      cancelled = true
    }
  }, [loadMembers, router])

  const selectedMembers = useMemo(
    () => members.filter((member) => selectedIds.has(member.memberId)),
    [members, selectedIds],
  )
  const allVisibleSelected = members.length > 0 && members.every((member) => selectedIds.has(member.memberId))

  const toggleAll = () => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(members.map((member) => member.memberId)))
  }

  const toggleMember = (memberId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  const mutateMembers = async (action: MemberAdminAction, successMessage: string, clearSelection = true) => {
    if (isMutating) return
    setIsMutating(true)
    try {
      const response = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      })
      await readJson<{ updated: number }>(response)
      toast.success(successMessage)
      if (clearSelection) setSelectedIds(new Set())
      setEditingMember(null)
      await loadMembers(activeSearch)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "회원 정보를 변경하지 못했습니다.")
    } finally {
      setIsMutating(false)
    }
  }

  const runSelectedAction = (action: SelectedMemberAction, successMessage: string) => {
    if (selectedIds.size === 0) return
    void mutateMembers({ ...action, memberIds: [...selectedIds] } as MemberAdminAction, successMessage)
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const search = searchInput.trim()
    setActiveSearch(search)
    setSelectedIds(new Set())
    void loadMembers(search)
  }

  const handleCredit = () => {
    const amount = Number(creditAmount)
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      toast.error("1 이상의 크레딧을 입력해 주세요.")
      return
    }
    runSelectedAction(
      { action: "adjust_credit", amount: creditMode === "topup" ? amount : -amount },
      `${selectedIds.size}명의 크레딧을 ${creditMode === "topup" ? "충전" : "차감"}했습니다.`,
    )
  }

  if (!staffRole) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background">
        <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" aria-label="권한 확인 중" />
      </div>
    )
  }

  return (
    <main className="min-h-full bg-background pb-8">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <UsersRound className="h-5 w-5 text-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-foreground">회원 관리</h1>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[staffRole]}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadMembers(activeSearch)}
            disabled={isLoading}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            aria-label="회원 목록 새로고침"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] space-y-5 px-4 py-5 sm:px-6">
        <form onSubmit={handleSearch} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 focus-within:border-ring">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">이메일 또는 회원 ID 검색</span>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-0 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
              placeholder="이메일 또는 회원 ID, 여러 건은 콤마로 구분"
            />
          </label>
          <Button type="submit" className="h-11 w-11 shrink-0 gap-2 px-0 sm:w-auto sm:px-4" aria-label="회원 검색">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">검색</span>
          </Button>
        </form>

        <section className="border-y border-border bg-card/40">
          <div className="flex min-h-12 flex-wrap items-center gap-2 px-3 py-2 sm:px-4">
            <span className="w-full text-sm font-medium text-foreground sm:mr-auto sm:w-auto">
              {selectedIds.size > 0 ? `${selectedIds.size}명 선택` : `회원 ${total.toLocaleString()}명`}
            </span>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0 || isMutating}
                onClick={() => runSelectedAction({ action: "set_access", allowed: true }, "접근 권한을 부여했습니다.")}
                className="gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                접근 허용
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0 || isMutating}
                onClick={() => runSelectedAction({ action: "set_access", allowed: false }, "접근 권한을 해제했습니다.")}
                className="gap-1.5"
              >
                <Ban className="h-4 w-4" />
                접근 해제
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0 || isMutating}
                onClick={() => runSelectedAction({ action: "set_unsafe", enabled: true }, "Unsafe 권한을 허용했습니다.")}
                className="gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                Unsafe 허용
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0 || isMutating}
                onClick={() => runSelectedAction({ action: "set_unsafe", enabled: false }, "Unsafe 권한을 해제했습니다.")}
                className="gap-1.5"
              >
                <ShieldOff className="h-4 w-4" />
                Unsafe 해제
              </Button>
            </div>
          </div>

          <div className="grid gap-3 border-t border-border px-3 py-3 lg:grid-cols-2 sm:px-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <UserRoundCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <select
                value={permission}
                onChange={(event) => setPermission(event.target.value as MemberPermissionKey)}
                className="h-9 min-w-36 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-ring"
                aria-label="회원 권한"
              >
                {PERMISSION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={selectedIds.size === 0 || isMutating}
                onClick={() => runSelectedAction(
                  { action: "set_permission", permission, granted: true },
                  "회원 권한을 부여했습니다.",
                )}
              >
                권한 부여
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={selectedIds.size === 0 || isMutating}
                onClick={() => runSelectedAction(
                  { action: "set_permission", permission, granted: false },
                  "회원 권한을 해제했습니다.",
                )}
              >
                권한 해제
              </Button>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
              <Coins className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div className="flex h-9 rounded-md border border-border bg-background p-0.5" role="group" aria-label="크레딧 작업">
                <button
                  type="button"
                  aria-pressed={creditMode === "topup"}
                  onClick={() => setCreditMode("topup")}
                  className={cn(
                    "min-w-14 rounded px-2 text-xs font-medium transition-colors",
                    creditMode === "topup" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
                  )}
                >
                  충전
                </button>
                <button
                  type="button"
                  aria-pressed={creditMode === "deduct"}
                  onClick={() => setCreditMode("deduct")}
                  className={cn(
                    "min-w-14 rounded px-2 text-xs font-medium transition-colors",
                    creditMode === "deduct" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
                  )}
                >
                  차감
                </button>
              </div>
              <Input
                type="number"
                min={1}
                max={1_000_000}
                step={1}
                value={creditAmount}
                onChange={(event) => setCreditAmount(event.target.value)}
                className="h-9 w-28 bg-background"
                aria-label="크레딧 수량"
              />
              <Button
                type="button"
                size="sm"
                disabled={selectedIds.size === 0 || isMutating}
                onClick={handleCredit}
              >
                적용
              </Button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left">
              <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 accent-primary"
                      aria-label="현재 목록 전체 선택"
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">회원 ID</th>
                  <th className="px-3 py-3 font-medium">회원 정보</th>
                  <th className="px-3 py-3 font-medium">나이</th>
                  <th className="px-3 py-3 font-medium">회원 등급</th>
                  <th className="px-3 py-3 text-right font-medium">크레딧</th>
                  <th className="px-3 py-3 font-medium">접근</th>
                  <th className="px-3 py-3 font-medium">Unsafe</th>
                  <th className="px-3 py-3 font-medium">권한</th>
                  <th className="w-14 px-3 py-3"><span className="sr-only">수정</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((member) => {
                  const selected = selectedIds.has(member.memberId)
                  return (
                    <tr key={member.memberId} className={cn("text-sm", selected && "bg-accent/40")}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleMember(member.memberId)}
                          className="h-4 w-4 accent-primary"
                          aria-label={`${member.displayName} 선택`}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-foreground">{member.memberId}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">{member.displayName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{member.email}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-foreground">
                        {member.age}세
                        <p className="mt-0.5 text-xs text-muted-foreground">{member.birthDate}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-foreground">
                        {member.memberKind === "writer" && member.writerTier
                          ? TIER_LABELS[member.writerTier]
                          : "일반회원"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-foreground">
                        {member.credit.toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge active={!member.isBlocked} activeText="허용" inactiveText="해제" />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge active={member.unsafeEnabled} activeText="허용" inactiveText="해제" />
                      </td>
                      <td className="max-w-52 px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {member.permissions.length > 0
                            ? member.permissions.map((key) => (
                                <span key={key} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                  {PERMISSION_OPTIONS.find((option) => option.value === key)?.label || key}
                                </span>
                              ))
                            : <span className="text-xs text-muted-foreground">없음</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setEditingMember(member)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          aria-label={`${member.displayName} 정보 수정`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {isLoading && (
            <div className="flex h-40 items-center justify-center border-t border-border">
              <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" aria-label="회원 목록 로딩 중" />
            </div>
          )}
          {!isLoading && members.length === 0 && (
            <div className="flex h-40 items-center justify-center border-t border-border text-sm text-muted-foreground">
              검색 결과가 없습니다.
            </div>
          )}
        </section>

        {selectedMembers.length > 0 && (
          <p className="text-xs text-muted-foreground">
            선택: {selectedMembers.map((member) => member.displayName).join(", ")}
          </p>
        )}
      </div>

      <MemberEditDialog
        member={editingMember}
        isSaving={isMutating}
        onOpenChange={(open) => !open && setEditingMember(null)}
        onSave={(values) => {
          if (!editingMember) return
          void mutateMembers({
            action: "update_profile",
            memberIds: [editingMember.memberId],
            values,
          }, "회원 정보를 수정했습니다.", false)
        }}
      />
    </main>
  )
}

function StatusBadge({
  active,
  activeText,
  inactiveText,
}: {
  active: boolean
  activeText: string
  inactiveText: string
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium",
      active ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive",
    )}>
      {active ? <Check className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
      {active ? activeText : inactiveText}
    </span>
  )
}

function MemberEditDialog({
  member,
  isSaving,
  onOpenChange,
  onSave,
}: {
  member: ManagedMember | null
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onSave: (values: {
    email: string
    displayName: string
    birthDate: string
    memberKind: ManagedMemberKind
    writerTier: ManagedWriterTier | null
  }) => void
}) {
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [memberKind, setMemberKind] = useState<ManagedMemberKind>("general")
  const [writerTier, setWriterTier] = useState<ManagedWriterTier>("silver")

  useEffect(() => {
    if (!member) return
    setEmail(member.email)
    setDisplayName(member.displayName)
    setBirthDate(member.birthDate || "")
    setMemberKind(member.memberKind)
    setWriterTier(member.writerTier || "silver")
  }, [member])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave({
      email: email.trim(),
      displayName: displayName.trim(),
      birthDate,
      memberKind,
      writerTier: memberKind === "writer" ? writerTier : null,
    })
  }

  return (
    <Dialog open={Boolean(member)} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>회원 정보 수정</DialogTitle>
          <DialogDescription>내부 계정 키와 회원 ID는 변경할 수 없습니다.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">회원 ID</label>
            <Input value={member?.memberId || ""} disabled className="bg-muted font-mono" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="member-display-name" className="text-sm font-medium text-foreground">표시명</label>
              <Input
                id="member-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="member-birth-date" className="text-sm font-medium text-foreground">생년월일</label>
              <Input
                id="member-birth-date"
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                min="1900-01-01"
                max={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="member-email" className="text-sm font-medium text-foreground">로그인 이메일</label>
            <Input
              id="member-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="member-kind" className="text-sm font-medium text-foreground">회원 구분</label>
              <select
                id="member-kind"
                value={memberKind}
                onChange={(event) => setMemberKind(event.target.value as ManagedMemberKind)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring"
              >
                <option value="general">일반회원</option>
                <option value="writer">작가</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="writer-tier" className="text-sm font-medium text-foreground">작가 등급</label>
              <select
                id="writer-tier"
                value={writerTier}
                onChange={(event) => setWriterTier(event.target.value as ManagedWriterTier)}
                disabled={memberKind !== "writer"}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring disabled:opacity-50"
              >
                <option value="prime">프라임</option>
                <option value="gold">골드</option>
                <option value="silver">실버</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              취소
            </Button>
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
