"use client"

import { useState, useEffect, useMemo, type ChangeEvent } from "react"
import { 
  ArrowLeft,
  ChevronRight, 
  Gem, 
  FolderOpen, 
  Image as ImageIcon, 
  Bell, 
  Moon,
  Sun,
  HelpCircle,
  LogOut,
  UserX,
  Edit3,
  Camera,
  Upload,
  X,
  ShieldCheck,
  Compass,
  MessageCircle,
  Plus,
  User,
  Users,
  Globe,
  Smile,
  Layers,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ConfirmModal } from "@/components/ui/app-modal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useAppStore, type SavedEvent } from "@/lib/store"
import { defaultLibrary, getStoryChatLibrary, type StoryChatLibrary } from "@/lib/storychat-storage"
import { syncStoryWorksFromDatabase } from "@/lib/story-work-client"
import {
  getCurrentUserId,
  getGeneratedMediaByUser,
  clearGeneratedMediaUserId,
  setGeneratedMediaUserId,
  syncGeneratedMediaWithServer,
  type GeneratedMedia,
} from "@/lib/generated-media-storage"
import { EventCard } from "@/components/chat/event-card"
import { EventDetailModal } from "@/components/chat/event-detail-modal"
import { getChatRooms } from "@/lib/chat-room-client"
import { getChatDisplayName, getChatList } from "@/lib/chat-list-storage"

const PROFILE_STORAGE_KEY = "storychat_profile"
const DEFAULT_PROFILE: ProfileState = {
  name: "회원",
  email: "",
}

interface ProfileState {
  name: string
  email: string
  avatarUrl?: string
}

interface MemberProfileData {
  memberId: string
  email: string
  nickname: string
  birthDate: string
  memberKind: "writer" | "general"
  writerTier: "prime" | "gold" | "silver" | null
  credit: number
}

interface AccountSessionData {
  authenticated: boolean
  accountId?: string
  username?: string
  displayName?: string
  accountType?: "staff" | "member"
  role?: "administrator" | "developer" | "operator" | "member"
}

export default function MyPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<SavedEvent | null>(null)
  const [selectedGeneratedMedia, setSelectedGeneratedMedia] = useState<GeneratedMedia | null>(null)
  const [isGeneratedMediaGalleryOpen, setIsGeneratedMediaGalleryOpen] = useState(false)
  const [generatedMedia, setGeneratedMedia] = useState<GeneratedMedia[]>([])
  const [chatRoomNames, setChatRoomNames] = useState<Record<string, string>>({})
  const [library, setLibrary] = useState<StoryChatLibrary>(defaultLibrary)
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [isAccountDeleteConfirmOpen, setIsAccountDeleteConfirmOpen] = useState(false)
  const [profile, setProfile] = useState<ProfileState>(DEFAULT_PROFILE)
  const [profileForm, setProfileForm] = useState<ProfileState>(profile)
  const [memberProfile, setMemberProfile] = useState<MemberProfileData | null>(null)
  const [accountLabel, setAccountLabel] = useState("")
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const credits = useAppStore((s) => s.credits)
  const events = useAppStore((s) => s.events)
  const isDark = mounted ? theme === "dark" : true

  useEffect(() => {
    setMounted(true)
    setLibrary(getStoryChatLibrary())
    void syncStoryWorksFromDatabase()
      .then(setLibrary)
      .catch((error) => console.warn("[story works sync failed]", error))
    setGeneratedMedia(getGeneratedMediaByUser(getCurrentUserId()))

    const syncLocalChatRoomNames = () => {
      setChatRoomNames((current) => ({
        ...Object.fromEntries(getChatList().map((chat) => [chat.id, getChatDisplayName(chat)])),
        ...current,
      }))
    }
    syncLocalChatRoomNames()
    void getChatRooms()
      .then((rooms) => {
        setChatRoomNames((current) => ({
          ...current,
          ...Object.fromEntries(rooms.map((room) => [room.roomId, room.roomName])),
        }))
      })
      .catch(() => undefined)

    let savedAvatarUrl: string | undefined
    const savedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY)
    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile) as Partial<ProfileState>
        savedAvatarUrl = parsedProfile.avatarUrl || undefined
      } catch {
        window.localStorage.removeItem(PROFILE_STORAGE_KEY)
      }
    }

    const loadAccountProfile = async () => {
      try {
        const sessionResponse = await fetch("/api/admin/session", { cache: "no-store" })
        const session = await sessionResponse.json().catch(() => ({})) as AccountSessionData
        if (!sessionResponse.ok || !session.authenticated) {
          router.push("/landing")
          return
        }

        if (session.accountId) {
          setGeneratedMediaUserId(
            session.accountId,
            session.username ? [session.username] : [],
          )
          setGeneratedMedia(getGeneratedMediaByUser(session.accountId))
          void syncGeneratedMediaWithServer(session.accountId)
            .then(setGeneratedMedia)
            .catch((error) => toast.error(
              error instanceof Error ? error.message : "생성 이미지를 동기화하지 못했습니다.",
            ))
        }

        if (session.accountType === "staff") {
          const nextProfile = {
            name: session.displayName || "관리자",
            email: session.username || "",
            avatarUrl: savedAvatarUrl,
          }
          setProfile(nextProfile)
          setProfileForm(nextProfile)
          setAccountLabel(getStaffRoleLabel(session.role))
          return
        }

        const response = await fetch("/api/member/profile", { cache: "no-store" })
        const data = await response.json().catch(() => ({})) as {
          profile?: MemberProfileData
          error?: string
        }
        if (!response.ok || !data.profile) throw new Error(data.error || "회원 정보를 불러오지 못했습니다.")
        const nextProfile = {
          name: data.profile.nickname,
          email: data.profile.email,
          avatarUrl: savedAvatarUrl,
        }
        setMemberProfile(data.profile)
        setAccountLabel(getMemberGradeLabel(data.profile))
        setProfile(nextProfile)
        setProfileForm(nextProfile)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "회원 정보를 불러오지 못했습니다.")
      } finally {
        setIsProfileLoading(false)
      }
    }
    void loadAccountProfile()

    const syncGeneratedMedia = () => setGeneratedMedia(getGeneratedMediaByUser(getCurrentUserId()))
    window.addEventListener("storychat-generated-media-updated", syncGeneratedMedia)
    window.addEventListener("storychat-chats-updated", syncLocalChatRoomNames)
    window.addEventListener("storage", syncGeneratedMedia)
    window.addEventListener("storage", syncLocalChatRoomNames)
    return () => {
      window.removeEventListener("storychat-generated-media-updated", syncGeneratedMedia)
      window.removeEventListener("storychat-chats-updated", syncLocalChatRoomNames)
      window.removeEventListener("storage", syncGeneratedMedia)
      window.removeEventListener("storage", syncLocalChatRoomNames)
    }
  }, [])

  const previewEvents = events.slice(0, 6)
  const previewGeneratedMedia = generatedMedia.slice(0, 3)
  const generatedMediaGroups = useMemo(() => {
    const groups = new Map<string, {
      key: string
      chatId?: string
      name: string
      items: GeneratedMedia[]
    }>()

    generatedMedia.forEach((media) => {
      const key = media.chatId || media.workId || "ungrouped"
      const workName = media.workId
        ? library.works.find((work) => work.id === media.workId)?.title
        : undefined
      const name = media.chatId
        ? chatRoomNames[media.chatId] || workName || "이름 없는 채팅방"
        : workName || "내 미디어"
      const current = groups.get(key)
      if (current) current.items.push(media)
      else groups.set(key, { key, chatId: media.chatId, name, items: [media] })
    })

    return Array.from(groups.values())
  }, [chatRoomNames, generatedMedia, library.works])

  const stats = [
    { label: "내 유니버스", value: library.works.length.toLocaleString(), href: "/my-works?tab=completed" },
    { label: "캐릭터", value: library.characters.length.toLocaleString(), href: "/my-works?tab=characters" },
    { label: "누적 대화", value: "1.2k", href: "/chats" },
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
      label: "내 세계관",
      description: "내가 저장하거나 만든 세계관",
      href: "/my-works?tab=scenarios",
    },
    {
      icon: FolderOpen,
      label: "내 캐릭터",
      description: "작품 만들기에 사용할 캐릭터",
      href: "/my-works?tab=characters",
    },
    {
      icon: FolderOpen,
      label: "내 자아",
      description: "채팅에서 사용할 나의 역할",
      href: "/my-works?tab=personas",
    },
    {
      icon: FolderOpen,
      label: "완성작 아카이브",
      description: "캐릭터, 세계관, 자아를 연결한 작품",
      href: "/my-works?tab=completed",
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
      icon: isDark ? Moon : Sun,
      label: "다크 모드",
      type: "toggle" as const,
      value: isDark,
      onToggle: () => setTheme(isDark ? "light" : "dark"),
    },
    {
      icon: HelpCircle,
      label: "고객센터 및 FAQ",
      type: "button" as const,
      href: "/landing",
    },
  ]

  const handleProfileEdit = () => {
    setProfileForm(profile)
    setIsProfileDialogOpen(true)
  }

  const handleProfileSave = async () => {
    if (isProfileSaving) return
    if (!profileForm.name.trim()) {
      toast.error("닉네임을 입력해주세요.")
      return
    }
    if (!profileForm.email.trim()) {
      toast.error("이메일을 입력해주세요.")
      return
    }

    setIsProfileSaving(true)
    try {
      const response = await fetch("/api/member/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: profileForm.name.trim(),
          email: profileForm.email.trim(),
        }),
      })
      const data = await response.json().catch(() => ({})) as {
        profile?: MemberProfileData
        error?: string
      }
      if (!response.ok || !data.profile) throw new Error(data.error || "프로필을 수정하지 못했습니다.")

      const nextProfile: ProfileState = {
        name: data.profile.nickname,
        email: data.profile.email,
        avatarUrl: profileForm.avatarUrl,
      }
      setMemberProfile(data.profile)
      setProfile(nextProfile)
      setProfileForm(nextProfile)
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ avatarUrl: nextProfile.avatarUrl }))
      setIsProfileDialogOpen(false)
      toast("프로필을 수정했어요.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "프로필을 수정하지 못했습니다.")
    } finally {
      setIsProfileSaving(false)
    }
  }

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined)
    clearGeneratedMediaUserId()
    toast("로그아웃했어요.")
    router.push("/landing")
    router.refresh()
  }

  const handleAccountDelete = () => {
    setIsAccountDeleteConfirmOpen(true)
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-blue-50/40 pb-24 dark:bg-neutral-950">
      <div className="px-5 pt-6">
        {/* 프로필 */}
        <div className="mb-4 flex items-center justify-between gap-3.5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200 overflow-hidden dark:bg-neutral-800">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={`${profile.name} 프로필 이미지`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User size={24} className="text-neutral-500 dark:text-neutral-400" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {isProfileLoading ? "회원 정보 불러오는 중" : profile.name}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {profile.email}
              </p>
              {accountLabel && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  {memberProfile ? `${memberProfile.memberId} · ` : ""}{accountLabel}
                </p>
              )}
            </div>
          </div>
          {memberProfile && (
            <button
              type="button"
              onClick={handleProfileEdit}
              disabled={isProfileLoading}
              className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Edit3 size={12} />
              수정
            </button>
          )}
        </div>

        {/* 통계 - "세계관"으로 용어 통일 */}
        <div className="mb-4 grid grid-cols-3 gap-2.5">
          <Link href="/my-works?tab=characters">
            <StatCard value={library.characters.length} label="캐릭터" />
          </Link>
          <Link href="/my-works?tab=scenarios">
            <StatCard value={library.works.length} label="세계관" />
          </Link>
          <Link href="/chats">
            <StatCard value="1.2k" label="누적 대화" />
          </Link>
        </div>

        {/* 크레딧 */}
        <div className="mb-5 flex items-center justify-between rounded-2xl bg-white p-4 dark:bg-neutral-900">
          <div className="flex items-center gap-2.5">
            <Gem size={18} className="text-blue-500" />
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              나의 크레딧
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {credits.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => router.push("/credits")}
              className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              충전
            </button>
          </div>
        </div>

        {/* 라이브러리 - 작품을 대표 항목으로 맨 위에, 나머지는 구성 요소 순서(캐릭터·세계관·자아)로 */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-white dark:bg-neutral-900">
          <FolderRow
            icon={Layers}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-50 dark:bg-blue-950"
            title="내 작품"
            description="캐릭터, 세계관, 자아를 연결한 작품"
            onClick={() => router.push("/my-works?tab=completed")}
            featured
          />
          <Divider />
          <FolderRow
            icon={Users}
            iconColor="text-lime-600 dark:lime-400"
            iconBg="bg-lime-50 dark:bg-lime-950"
            title="내 캐릭터"
            description="작품 만들기에 사용할 캐릭터"
            onClick={() => router.push("/my-works?tab=characters")}
          />
          <Divider />
          <FolderRow
            icon={Globe}
            iconColor="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-50 dark:bg-amber-950"
            title="내 세계관"
            description="내가 저장하거나 만든 세계관"
            onClick={() => router.push("/my-works?tab=scenarios")}
          />
          <Divider />
          <FolderRow
            icon={Smile}
            iconColor="text-violet-600 dark:text-violet-400"
            iconBg="bg-violet-50 dark:bg-violet-950"
            title="내 자아"
            description="채팅에서 사용할 나의 역할"
            onClick={() => router.push("/my-works?tab=personas")}
          />
        </div>

        {/* 생성한 이미지 & 갤러리 섹션 */}
        {(generatedMedia.length > 0 || events.length > 0) && (
          <div className="mb-6 space-y-4 rounded-2xl bg-white p-4 dark:bg-neutral-900">
            {generatedMedia.length > 0 && (
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    <ImageIcon size={14} />
                    생성한 이미지
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsGeneratedMediaGalleryOpen(true)}
                    className="flex items-center gap-0.5 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    {generatedMedia.length.toLocaleString()}개 전체보기
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {previewGeneratedMedia.map((media) => (
                    <button
                      key={media.id}
                      type="button"
                      onClick={() => setSelectedGeneratedMedia(media)}
                      className="aspect-square overflow-hidden rounded-xl border border-neutral-100 bg-neutral-100 text-left dark:border-neutral-800 dark:bg-neutral-800"
                    >
                      <img src={media.imageUrl} alt={media.title || "생성 이미지"} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {events.length > 0 && (
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    <ImageIcon size={14} />
                    이벤트 갤러리
                  </span>
                  <Link
                    href="/gallery"
                    className="flex items-center gap-0.5 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    전체 보기
                    <ChevronRight size={14} />
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {previewEvents.map((event) => (
                    <EventCard key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 앱 설정 */}
        <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
          앱 설정
        </p>
        <div className="mb-6 overflow-hidden rounded-2xl bg-white dark:bg-neutral-900">
          <ToggleRow
            icon={Bell}
            label="푸시 알림 설정"
            checked={pushEnabled}
            onChange={setPushEnabled}
          />
          <Divider />
          <ToggleRow
            icon={Moon}
            label="다크 모드"
            checked={isDark}
            onChange={() => setTheme(isDark ? "light" : "dark")}
          />
          <Divider />
          <button
            type="button"
            onClick={() => router.push("/landing")}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
          >
            <HelpCircle size={18} className="text-neutral-500 dark:text-neutral-400" />
            <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100">
              고객센터 및 FAQ
            </span>
            <ChevronRight size={16} className="text-neutral-400" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 pb-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <LogOut size={14} />
            로그아웃
          </button>
          <button
            type="button"
            onClick={handleAccountDelete}
            className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-400"
          >
            <UserX size={13} />
            계정 탈퇴
          </button>
        </div>
      </div>

      {/* 하단 내비게이션 */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-neutral-100 bg-white px-5 py-2 dark:border-neutral-900 dark:bg-neutral-950">
        <div className="flex justify-between">
          <Link href="/admin">
            <NavItem icon={ShieldCheck} label="어드민" />
          </Link>
          <Link href="/timeline">
            <NavItem icon={Compass} label="탐색" />
          </Link>
          <Link href="/chats">
            <NavItem icon={MessageCircle} label="채팅" />
          </Link>
          <Link href="/create">
            <NavItem icon={Plus} label="만들기" />
          </Link>
          <Link href="/mypage">
            <NavItem icon={User} label="마이페이지" active />
          </Link>
        </div>
      </div>

      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      {isGeneratedMediaGalleryOpen && (
        <section
          className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-background text-foreground"
          role="dialog"
          aria-modal="true"
          aria-label="생성한 이미지 전체보기"
        >
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setIsGeneratedMediaGalleryOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-accent"
                aria-label="전체보기 닫기"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="truncate text-base font-semibold">생성한 이미지</h2>
            </div>
            <span className="text-xs text-muted-foreground">{generatedMedia.length.toLocaleString()}개</span>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-5 pb-24">
              {generatedMediaGroups.map((group) => (
                <section key={group.key} className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    {group.chatId ? (
                      <Link
                        href={`/chat/${encodeURIComponent(group.chatId)}`}
                        className="flex min-w-0 items-center gap-1 text-sm font-semibold hover:text-primary"
                      >
                        <span className="truncate">{group.name}</span>
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      </Link>
                    ) : (
                      <h3 className="truncate text-sm font-semibold">{group.name}</h3>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground">{group.items.length}개</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {group.items.map((media) => (
                      <button
                        key={media.id}
                        type="button"
                        onClick={() => setSelectedGeneratedMedia(media)}
                        className="aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                      >
                        <img src={media.imageUrl} alt={media.title || "생성 이미지"} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      )}
      {selectedGeneratedMedia && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedGeneratedMedia(null)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedGeneratedMedia(null)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/85"
              aria-label="이미지 닫기"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="max-h-[78dvh] bg-black">
              <img
                src={selectedGeneratedMedia.imageUrl}
                alt={selectedGeneratedMedia.title || "생성 이미지"}
                className="mx-auto max-h-[78dvh] w-full object-contain"
              />
            </div>
            <div className="space-y-1 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{selectedGeneratedMedia.title || "AI 생성 이미지"}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(selectedGeneratedMedia.createdAt).toLocaleString("ko-KR")}
              </p>
              <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{selectedGeneratedMedia.prompt}</p>
            </div>
          </div>
        </div>
      )}

      <ProfileEditDialog
        open={isProfileDialogOpen}
        profile={profileForm}
        onOpenChange={setIsProfileDialogOpen}
        onChange={setProfileForm}
        onSave={handleProfileSave}
        isSaving={isProfileSaving}
      />
      <ConfirmModal
        open={isAccountDeleteConfirmOpen}
        title="계정 탈퇴"
        message="계정 탈퇴 안내 화면으로 이동할까요?"
        confirmText="이동"
        onOpenChange={setIsAccountDeleteConfirmOpen}
        onConfirm={() => router.push("/landing")}
      />
    </div>
  )
}

function ProfileEditDialog({
  open,
  profile,
  onOpenChange,
  onChange,
  onSave,
  isSaving,
}: {
  open: boolean
  profile: ProfileState
  onOpenChange: (open: boolean) => void
  onChange: (profile: ProfileState) => void
  onSave: () => void
  isSaving: boolean
}) {
  const update = (field: keyof ProfileState, value: string | undefined) => {
    onChange({ ...profile, [field]: value })
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일을 선택해주세요.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      update("avatarUrl", typeof reader.result === "string" ? reader.result : undefined)
    }
    reader.readAsDataURL(file)
    event.target.value = ""
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>프로필 수정</DialogTitle>
          <DialogDescription>
            DB에 저장될 닉네임과 이메일, 프로필 이미지를 수정해요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border border-border bg-muted">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="프로필 미리보기"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-accent transition-colors">
                <Upload className="h-4 w-4" />
                이미지 선택
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="sr-only"
                />
              </label>
              {profile.avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => update("avatarUrl", undefined)}
                >
                  삭제
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="profile-name" className="text-sm font-medium text-foreground">
              닉네임
            </label>
            <Input
              id="profile-name"
              value={profile.name}
              onChange={(event) => update("name", event.target.value)}
              maxLength={8}
              className="bg-input"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="profile-email" className="text-sm font-medium text-foreground">
              이메일
            </label>
            <Input
              id="profile-email"
              type="email"
              value={profile.email}
              onChange={(event) => update("email", event.target.value)}
              className="bg-input"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            취소
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getMemberGradeLabel(profile: MemberProfileData) {
  if (profile.memberKind === "general") return "일반회원"
  if (profile.writerTier === "prime") return "프라임 작가"
  if (profile.writerTier === "gold") return "골드 작가"
  return "실버 작가"
}

function getStaffRoleLabel(role: AccountSessionData["role"]) {
  if (role === "administrator") return "관리자 계정"
  if (role === "developer") return "개발자 계정"
  if (role === "operator") return "운영자 계정"
  return "직원 계정"
}

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-2xl bg-white py-3.5 text-center dark:bg-neutral-900">
      <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
    </div>
  )
}

function FolderRow({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  onClick,
  featured,
}: {
  icon: typeof Layers
  iconColor: string
  iconBg: string
  title: string
  description: string
  onClick: () => void
  featured?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${
        featured ? "bg-blue-50/60 dark:bg-blue-950/20" : ""
      }`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon size={17} className={iconColor} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {title}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      </div>
      <ChevronRight size={16} className="text-neutral-400" />
    </button>
  )
}

function ToggleRow({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: typeof Bell
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Icon size={18} className="text-neutral-500 dark:text-neutral-400" />
      <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-blue-500" : "bg-neutral-200 dark:bg-neutral-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
}

function NavItem({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof ShieldCheck
  label: string
  active?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1.5">
      <Icon
        size={20}
        className={active ? "text-blue-600 dark:text-blue-400" : "text-neutral-400"}
      />
      <span
        className={`text-[11px] ${
          active ? "font-medium text-blue-600 dark:text-blue-400" : "text-neutral-400"
        }`}
      >
        {label}
      </span>
    </div>
  )
}
