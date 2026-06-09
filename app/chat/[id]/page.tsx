"use client"

import { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { ChatHeader } from "@/components/chat/chat-header"
import { ChatMessageList } from "@/components/chat/chat-message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatSettingsDrawer } from "@/components/chat/chat-settings-drawer"
import { DualStatusBar } from "@/components/chat/dual-status-bar"
import { WorldDateDisplay } from "@/components/chat/world-date-display"
import { QuestRewardPopup } from "@/components/chat/quest-reward-popup"
import { EmptyChatState } from "@/components/chat/empty-chat-state"
import { BranchConfirmModal } from "@/components/chat/branch-confirm-modal"
import { StoryStatusCard, type StoryStatus } from "@/components/chat/story-status-card"
import { type ChatMessage } from "@/lib/chat-types"
import {
  buildUserMessage,
  generateAssistantReply,
  runCommand,
} from "@/lib/chat-engine"
import { useAppStore, CREDIT_COSTS } from "@/lib/store"

type ChatThemeId = "system" | "light" | "dark" | "message" | "messenger"

const CHARACTER_NAME = "이무기"
const CHARACTER_EMOJI = "🐉"

const storyStatus: StoryStatus = {
  chapter: "봄의 시작",
  goal: "이무기의 진짜 정체를 알아내기",
  progress: 70,
  worldDate: "4월 12일 밤",
  emotion: "경계하지만 흔들리고 있음",
}

export default function ChatPage() {
  const params = useParams()
  const chatId = params.id as string

  const credits = useAppStore((s) => s.credits)
  const spendCredit = useAppStore((s) => s.spendCredit)
  const saveEvent = useAppStore((s) => s.saveEvent)
  const createBranch = useAppStore((s) => s.createBranch)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isQuestPopupOpen, setIsQuestPopupOpen] = useState(false)
  const [editedMessageIds, setEditedMessageIds] = useState<Set<string>>(new Set())
  const [chatTheme, setChatTheme] = useState<ChatThemeId>("system")
  const [branchTargetId, setBranchTargetId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const characterStatus = [
    { label: "감정", value: "공감(Empathy)", icon: "❤️", color: "text-red-400" },
    { label: "상태", value: "Groggy", icon: "💤", color: "text-yellow-400" },
  ]

  const userStatus = [
    { label: "상태", value: "Out of it", icon: "💤", color: "text-blue-400" },
    { label: "진행", value: "퀘스트 70%", icon: "💢", color: "text-orange-400" },
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  useEffect(() => {
    const savedTheme = localStorage.getItem(`chat-theme-${chatId}`) as ChatThemeId
    setChatTheme(savedTheme || "system")
  }, [chatId])

  // --- Core send flow (uses chat-engine; easy to swap for real API) ---
  const handleSendMessage = async (content: string, mentions?: string[]) => {
    // 크레딧 차감 (메시지 1)
    if (!spendCredit(CREDIT_COSTS.message)) {
      toast.error("크레딧이 부족해요.", {
        description: "크레딧을 충전하면 계속 대화할 수 있어요.",
        action: {
          label: "충전하기",
          onClick: () => {
            window.location.href = "/credits"
          },
        },
      })
      return
    }

    const userMessage = buildUserMessage(content, mentions)
    setMessages((prev) => [...prev, userMessage])
    setIsTyping(true)

    try {
      const reply = await generateAssistantReply([...messages, userMessage], content)
      setMessages((prev) => [...prev, reply])
    } catch {
      toast.error("응답을 가져오지 못했어요. 잠시 후 다시 시도해주세요.")
    } finally {
      setIsTyping(false)
    }
  }

  const handleCommand = async (command: string) => {
    const result = await runCommand(command, CHARACTER_NAME)
    if (result.kind === "toast") {
      toast(result.message)
      return
    }
    setIsTyping(true)
    // small delay so the typing indicator is visible
    setTimeout(() => {
      setIsTyping(false)
      setMessages((prev) => [...prev, result.message])
    }, 600)
  }

  // Author tools handlers
  const handleRewriteMessage = (messageId: string) => {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: "다시 생각해보니... 네 말이 맞는 것 같아. 함께 있어서 좋아." }
            : msg
        )
      )
      toast.success("메시지를 다시 작성했어요.")
    }, 1500)
  }

  const handleEditMessage = (messageId: string) => {
    setEditedMessageIds((prev) => new Set(prev).add(messageId))
    toast("메시지 편집 기능은 다음 업데이트에서 사용할 수 있어요.")
  }

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
    toast.success("메시지를 삭제했어요.")
  }

  // --- Branch flow ---
  const handleBranchFromMessage = (messageId: string) => {
    setBranchTargetId(messageId)
  }

  const confirmBranch = () => {
    if (!branchTargetId) return
    if (!spendCredit(CREDIT_COSTS.branch)) {
      setBranchTargetId(null)
      toast.error("크레딧이 부족해요.", {
        description: "분기 생성에는 3 크레딧이 필요해요.",
      })
      return
    }
    createBranch({
      originalChatId: chatId,
      fromMessageId: branchTargetId,
      title: `${CHARACTER_NAME} 분기 ${new Date().toLocaleDateString("ko-KR")}`,
    })
    setBranchTargetId(null)
    toast.success("새로운 분기를 만들었어요.")
  }

  // --- Save event flow ---
  const handleSaveEvent = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId)
    saveEvent({
      chatId,
      title: "흔들린 침묵",
      summary: message?.content.slice(0, 60) || "기억에 남는 장면을 저장했어요.",
      emotionalTone: ["긴장", "망설임", "신뢰"],
      relatedCharacter: CHARACTER_NAME,
    })
    toast.success("이 장면을 저장했어요.", {
      description: "마이페이지 이벤트 갤러리에서 확인할 수 있어요.",
    })
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <ChatHeader
        characterName={CHARACTER_NAME}
        characterEmoji={CHARACTER_EMOJI}
        level={3}
        onMenuClick={() => setIsSettingsOpen(true)}
      />

      <WorldDateDisplay date="AC 300년 4월 16일" />

      <DualStatusBar
        characterName={CHARACTER_NAME}
        characterStatus={characterStatus}
        userStatus={userStatus}
      />

      <ChatSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        characterName={CHARACTER_NAME}
        characterEmoji={CHARACTER_EMOJI}
        chatId={chatId}
        onChatThemeChange={(theme) => setChatTheme(theme)}
      />

      <QuestRewardPopup
        isOpen={isQuestPopupOpen}
        onClose={() => setIsQuestPopupOpen(false)}
        questTitle="첫 번째 산책"
        hasDoubleAffection={true}
      />

      <BranchConfirmModal
        isOpen={branchTargetId !== null}
        onConfirm={confirmBranch}
        onCancel={() => setBranchTargetId(null)}
      />

      {/* Chat Area - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        {hasMessages && <StoryStatusCard status={storyStatus} />}

        {hasMessages ? (
          <ChatMessageList
            messages={messages}
            isTyping={isTyping}
            messagesEndRef={messagesEndRef}
            onRewriteMessage={handleRewriteMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onBranchFromMessage={handleBranchFromMessage}
            onSaveEvent={handleSaveEvent}
            editedMessageIds={editedMessageIds}
            chatId={chatId}
            chatTheme={chatTheme}
          />
        ) : (
          <div className="min-h-full pb-44">
            <EmptyChatState
              characterName={CHARACTER_NAME}
              characterEmoji={CHARACTER_EMOJI}
              onSuggestionClick={handleSendMessage}
            />
          </div>
        )}
      </main>

      {/* Fixed Input Area - positioned above global nav */}
      <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-40">
        <ChatInput onSendMessage={handleSendMessage} onCommand={handleCommand} />
      </div>
    </div>
  )
}
