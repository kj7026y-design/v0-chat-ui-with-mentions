"use client"

import { useState, useEffect, type ChangeEvent } from "react"
import { 
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
import {
  getCurrentUserId,
  getGeneratedMediaByUser,
  type GeneratedMedia,
} from "@/lib/generated-media-storage"
import { EventCard } from "@/components/chat/event-card"
import { EventDetailModal } from "@/components/chat/event-detail-modal"

const PROFILE_STORAGE_KEY = "storychat_profile"
const DEFAULT_PROFILE: ProfileState = {
  name: "김지은",
  email: "jieun@email.com",
}

interface ProfileState {
  name: string
  email: string
  avatarUrl?: string
}

export default function MyPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<SavedEvent | null>(null)
  const [selectedGeneratedMedia, setSelectedGeneratedMedia] = useState<GeneratedMedia | null>(null)
  const [generatedMedia, setGeneratedMedia] = useState<GeneratedMedia[]>([])
  const [library, setLibrary] = useState<StoryChatLibrary>(defaultLibrary)
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [isAccountDeleteConfirmOpen, setIsAccountDeleteConfirmOpen] = useState(false)
  const [profile, setProfile] = useState<ProfileState>(DEFAULT_PROFILE)
  const [profileForm, setProfileForm] = useState<ProfileState>(profile)
  const credits = useAppStore((s) => s.credits)
  const events = useAppStore((s) => s.events)
  const isDark = mounted ? theme === "dark" : true

  useEffect(() => {
    setMounted(true)
    setLibrary(getStoryChatLibrary())
    setGeneratedMedia(getGeneratedMediaByUser(getCurrentUserId()))

    const savedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY)
    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile) as Partial<ProfileState>
        const nextProfile = {
          ...DEFAULT_PROFILE,
          name: parsedProfile.name?.trim() || DEFAULT_PROFILE.name,
          email: parsedProfile.email?.trim() || DEFAULT_PROFILE.email,
          avatarUrl: parsedProfile.avatarUrl || undefined,
        }
        setProfile(nextProfile)
        setProfileForm(nextProfile)
      } catch {
        window.localStorage.removeItem(PROFILE_STORAGE_KEY)
      }
    }

    const syncGeneratedMedia = () => setGeneratedMedia(getGeneratedMediaByUser(getCurrentUserId()))
    window.addEventListener("storychat-generated-media-updated", syncGeneratedMedia)
    window.addEventListener("storage", syncGeneratedMedia)
    return () => {
      window.removeEventListener("storychat-generated-media-updated", syncGeneratedMedia)
      window.removeEventListener("storage", syncGeneratedMedia)
    }
  }, [])

  const previewEvents = events.slice(0, 6)
  const previewGeneratedMedia = generatedMedia.slice(0, 6)

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

  const handleProfileSave = () => {
    if (!profileForm.name.trim()) {
      toast.error("이름을 입력해주세요.")
      return
    }
    if (!profileForm.email.trim()) {
      toast.error("이메일을 입력해주세요.")
      return
    }

    const nextProfile: ProfileState = {
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
      avatarUrl: profileForm.avatarUrl,
    }
    setProfile(nextProfile)
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile))
    setIsProfileDialogOpen(false)
    toast("프로필을 수정했어요.")
  }

  const handleLogout = () => {
    toast("로그아웃했어요.")
    router.push("/landing")
  }

  const handleAccountDelete = () => {
    setIsAccountDeleteConfirmOpen(true)
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background pb-6">
      {/* Profile Section */}
      <section className="px-5 pt-8 pb-6">
        <div className="flex items-center gap-4">
          {/* Profile Image */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-muted overflow-hidden flex items-center justify-center">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={`${profile.name} 프로필 이미지`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl">👤</span>
              )}
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{profile.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{profile.email}</p>
          </div>

          {/* Edit Button */}
          <button
            onClick={handleProfileEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-accent transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-foreground">프로필 수정</span>
          </button>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="px-5 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-card border border-border rounded-xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Main Menu */}
      <section className="px-5 pb-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {mainMenuItems.map((item, index) => {
            const innerContent = (
              <>
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  )}
                </div>

                {item.value ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{item.value}</span>
                    {item.action && (
                      <span className="px-3 py-1 rounded-full bg-secondary text-xs text-secondary-foreground">
                        {item.action}
                      </span>
                    )}
                  </div>
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </>
            )

            const itemClass = cn(
              "flex items-center gap-4 px-4 py-4 w-full hover:bg-accent transition-colors",
              index !== mainMenuItems.length - 1 && "border-b border-border"
            )

            if (item.href) {
              return (
                <Link key={item.label} href={item.href} className={itemClass}>
                  {innerContent}
                </Link>
              )
            }

            return null
          })}
        </div>
      </section>

      {/* Generated Media */}
      <section className="px-5 pb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <ImageIcon className="w-3.5 h-3.5" />
            생성한 이미지
          </h2>
          <span className="text-xs text-muted-foreground">{generatedMedia.length.toLocaleString()}개</span>
        </div>

        {previewGeneratedMedia.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {previewGeneratedMedia.map((media) => (
              <button
                key={media.id}
                type="button"
                onClick={() => setSelectedGeneratedMedia(media)}
                className="overflow-hidden rounded-xl border border-border bg-card text-left"
              >
                <div className="aspect-square bg-muted">
                  <img src={media.imageUrl} alt={media.title || "생성 이미지"} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-0.5 px-2 py-2">
                  <p className="line-clamp-1 text-[11px] font-semibold text-foreground">{media.title || "AI 생성 이미지"}</p>
                  <p className="line-clamp-1 text-[10px] text-muted-foreground">
                    {media.workId || media.chatId || "내 미디어"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl px-4 py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
              아직 생성한 이미지가 없어요.
              <br />
              채팅에서 /이미지 명령어로 장면을 만들어보세요.
            </p>
          </div>
        )}
      </section>

      {/* Event Gallery */}
      <section className="px-5 pb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <ImageIcon className="w-3.5 h-3.5" />
            이벤트 갤러리
          </h2>
          {events.length > 0 && (
            <Link
              href="/gallery"
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              전체 보기
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {events.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {previewEvents.map((event) => (
              <EventCard key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
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

      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      {selectedGeneratedMedia && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
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
                
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
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
              "flex items-center gap-4 px-4 py-4 w-full hover:bg-accent transition-colors",
              index !== settingsItems.length - 1 && "border-b border-border"
            )

            if (item.type === "toggle") {
              return (
                <div key={item.label} className={className}>
                  {content}
                </div>
              )
            }

            if ("href" in item && item.href) {
              return (
                <Link key={item.label} href={item.href} className={className}>
                  {content}
                </Link>
              )
            }

            return null
          })}
        </div>
      </section>

      {/* Account Actions */}
      <section className="px-5 pb-8">
        <div className="flex flex-col gap-4 items-center pt-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">로그아웃</span>
          </button>
          <button
            onClick={handleAccountDelete}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <UserX className="w-4 h-4" />
            <span className="text-xs">계정 탈퇴</span>
          </button>
        </div>
      </section>

      <ProfileEditDialog
        open={isProfileDialogOpen}
        profile={profileForm}
        onOpenChange={setIsProfileDialogOpen}
        onChange={setProfileForm}
        onSave={handleProfileSave}
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
}: {
  open: boolean
  profile: ProfileState
  onOpenChange: (open: boolean) => void
  onChange: (profile: ProfileState) => void
  onSave: () => void
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
            마이페이지에 표시될 이름, 이메일, 프로필 이미지를 수정해요.
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
              이름
            </label>
            <Input
              id="profile-name"
              value={profile.name}
              onChange={(event) => update("name", event.target.value)}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={onSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
