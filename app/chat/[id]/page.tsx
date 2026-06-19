"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChatHeader } from "@/components/chat/chat-header"
import { ChatMessageList } from "@/components/chat/chat-message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatSettingsDrawer } from "@/components/chat/chat-settings-drawer"
import { WorkIntroModal } from "@/components/chat/work-intro-modal"
import { QuestRewardPopup } from "@/components/chat/quest-reward-popup"
import { EmptyChatState } from "@/components/chat/empty-chat-state"
import { BranchConfirmModal } from "@/components/chat/branch-confirm-modal"
import { StoryStatusCard, type StoryStatus } from "@/components/chat/story-status-card"
import { ConfirmModal } from "@/components/ui/app-modal"
import { SLASH_COMMANDS, type ChatMessage } from "@/lib/chat-types"
import {
  buildUserMessage,
  generateAssistantReply,
  type ImageCommandContext,
  parseChatInput,
  runCommand,
} from "@/lib/chat-engine"
import { useAppStore, CREDIT_COSTS } from "@/lib/store"
import { defaultChats, getChatList, type ChatListItemData } from "@/lib/chat-list-storage"
import { defaultChatReadingSettings, getChatReadingSettings, type ChatReadingSettings } from "@/lib/chat-settings-storage"
import { defaultLibrary, getStoryChatLibrary, normalizeIntroScenarios, type StoryChatLibrary } from "@/lib/storychat-storage"

type ChatThemeId = "system" | "light" | "dark" | "message" | "messenger"

const CHARACTER_NAME = "이무기"
const CHARACTER_EMOJI = "🐉"

const storyStatus: StoryStatus = {
  useChapters: true,
  currentChapterId: "chapter_1",
  currentChapterTitle: "봄의 시작",
  chapterProgress: 70,
  currentMission: "이무기의 진짜 정체를 알아내기",
  currentGoal: "그가 숨기는 과거에 접근하기",
  worldDate: "4월 12일 밤",
  characterName: "이무기",
  characterEmotion: "신남",
  characterStatus: "경계는 풀렸지만 아직 중요한 비밀은 말하지 않고 있음",
  personaName: "지은",
  personaEmotion: "즐거움",
  personaStatus: "상황에 호기심을 느끼며 대화에 몰입하고 있음",
  nextEventCondition: "신뢰도 상승 또는 핵심 단서 발견 시 발생",
}

function getStatusLocation(statusBarText?: string) {
  return statusBarText
    ?.split("\n")
    .map((line) => line.trim())
    .find(Boolean)
}

function makeTurnId() {
  return `turn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const chatId = params.id as string

  const credits = useAppStore((s) => s.credits)
  const spendCredit = useAppStore((s) => s.spendCredit)
  const createBranch = useAppStore((s) => s.createBranch)
  const startScenario = useAppStore((s) => s.startScenario)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [typingLabel, setTypingLabel] = useState<string | undefined>(undefined)
  const [typingVariant, setTypingVariant] = useState<"text" | "image">("text")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isQuestPopupOpen, setIsQuestPopupOpen] = useState(false)
  const [editedMessageIds, setEditedMessageIds] = useState<Set<string>>(new Set())
  const [chatTheme, setChatTheme] = useState<ChatThemeId>("system")
  const [readingSettings, setReadingSettings] = useState<ChatReadingSettings>(defaultChatReadingSettings)
  const [branchTargetId, setBranchTargetId] = useState<string | null>(null)
  const [isIntroOpen, setIsIntroOpen] = useState(false)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)
  const [selectedIntroScenarioId, setSelectedIntroScenarioId] = useState<string>("")
  const [insertTextRequest, setInsertTextRequest] = useState<{ id: number; text: string } | null>(null)
  const [library, setLibrary] = useState<StoryChatLibrary>(defaultLibrary)
  const [chatMeta, setChatMeta] = useState<ChatListItemData | null>(
    defaultChats.find((chat) => chat.id === chatId) ?? null,
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const characterName = chatMeta?.characterName ?? CHARACTER_NAME
  const characterEmoji = chatMeta?.characterEmoji ?? CHARACTER_EMOJI
  const currentWork =
    library.works.find((work) => work.id === chatId) ??
    library.works.find((work) => {
      const character = library.characters.find((item) => item.id === work.characterId)
      return character?.name === characterName
    })
  const currentWorld = currentWork
    ? library.worlds.find((world) => world.id === currentWork.worldId)
    : undefined
  const currentCharacter = currentWork
    ? library.characters.find((character) => character.id === currentWork.characterId)
    : library.characters.find((character) => character.name === characterName)
  const currentPersona = currentWork
    ? library.personas.find((persona) => persona.id === currentWork.personaId)
    : undefined
  const workCharacters = currentWorld
    ? library.works
        .filter((work) => work.worldId === currentWorld.id)
        .map((work) => library.characters.find((character) => character.id === work.characterId))
        .filter((character): character is NonNullable<typeof character> => Boolean(character))
    : []
  const workPersonas = currentWorld
    ? library.works
        .filter((work) => work.worldId === currentWorld.id)
        .map((work) => library.personas.find((persona) => persona.id === work.personaId))
        .filter((persona): persona is NonNullable<typeof persona> => Boolean(persona))
    : []
  const inputCharacters = Array.from(
    new Map(
      [
        currentCharacter,
        ...workCharacters,
      ]
        .filter((character): character is NonNullable<typeof character> => Boolean(character))
        .map((character) => [
          character.id,
          {
            id: character.id,
            name: character.name,
            emoji: character.emoji,
            avatarUrl: character.avatarUrl,
            role: character.role,
            summary: character.summary,
          },
        ]),
    ).values(),
  )
  const chatInputCharacters = inputCharacters.length
    ? inputCharacters
    : [{ id: "imugi", name: characterName, emoji: characterEmoji }]
  const introScenarios = currentWork ? normalizeIntroScenarios(currentWork) : []
  const selectedIntroScenario =
    introScenarios.find((intro) => intro.id === selectedIntroScenarioId) ??
    (introScenarios.length === 1 ? introScenarios[0] : undefined)
  const progressSettings = currentWork?.storyProgressSettings ?? currentWorld?.storyProgressSettings
  const useChapters = progressSettings?.useChapters ?? false
  const activeChapter =
    progressSettings?.chapters.find((chapter) => chapter.title === (currentWork?.currentChapter || currentWorld?.currentChapter)) ??
    progressSettings?.chapters[0]
  const canUseDefaultImugiStatus = characterName === storyStatus.characterName && Boolean(currentWork || currentCharacter)
  const chatStoryStatus: StoryStatus = {
    useChapters,
    currentChapterId: useChapters ? activeChapter?.id ?? storyStatus.currentChapterId : undefined,
    currentChapterTitle: useChapters
      ? currentWork?.currentChapter || currentWorld?.currentChapter || activeChapter?.title
      : undefined,
    chapterProgress: useChapters ? currentWorld?.progress : undefined,
    currentMission: useChapters ? activeChapter?.mission || currentWork?.currentGoal || currentWorld?.currentGoal : undefined,
    currentGoal: useChapters ? currentWork?.currentGoal || currentWorld?.currentGoal || activeChapter?.goal : undefined,
    worldDate: currentWork?.worldDate || currentWorld?.worldDate || currentWorld?.era,
    currentLocation: getStatusLocation(currentWork?.statusBarText),
    characterName,
    characterEmotion: canUseDefaultImugiStatus ? storyStatus.characterEmotion : undefined,
    characterStatus: canUseDefaultImugiStatus ? storyStatus.characterStatus : undefined,
    personaName: currentPersona?.name || "나",
    personaEmotion: canUseDefaultImugiStatus ? storyStatus.personaEmotion : undefined,
    personaStatus: canUseDefaultImugiStatus ? storyStatus.personaStatus : undefined,
    nextEventCondition: useChapters ? activeChapter?.nextChapterCondition : undefined,
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const buildImageCommandContext = (recentMessages: ChatMessage[] = messages): ImageCommandContext => ({
    work: currentWork,
    world: currentWorld,
    character: currentCharacter,
    persona: currentPersona,
    status: chatStoryStatus,
    recentMessages,
  })

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  useEffect(() => {
    const savedTheme = localStorage.getItem(`chat-theme-${chatId}`) as ChatThemeId
    setChatTheme(savedTheme || "system")
    setReadingSettings(getChatReadingSettings(chatId))
  }, [chatId])

  useEffect(() => {
    const syncChatMeta = () => {
      setChatMeta(getChatList().find((chat) => chat.id === chatId) ?? null)
      setLibrary(getStoryChatLibrary())
    }
    syncChatMeta()
    window.addEventListener("storage", syncChatMeta)
    window.addEventListener("storychat-chats-updated", syncChatMeta)
    return () => {
      window.removeEventListener("storage", syncChatMeta)
      window.removeEventListener("storychat-chats-updated", syncChatMeta)
    }
  }, [chatId])

  // --- Core send flow (uses chat-engine; easy to swap for real API) ---
  const handleSendMessage = async (
    content: string,
    mentions?: string[],
    image?: { url: string; name?: string },
  ) => {
    const parsedInput = parseChatInput(content, chatInputCharacters, mentions)
    if (parsedInput.kind === "character_line" && parsedInput.isEmptyLine) {
      toast.error("대사 내용을 입력하세요.")
      return
    }

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

    const turnId = makeTurnId()
    const userMessage = { ...buildUserMessage(content, chatInputCharacters, mentions, image), turnId }
    setMessages((prev) => [...prev, userMessage])
    setIsTyping(true)
    setTypingLabel(undefined)
    setTypingVariant("text")

    try {
      const reply = {
        ...(await generateAssistantReply(
          [...messages, userMessage],
          content,
          selectedIntroScenario,
          buildImageCommandContext([...messages, userMessage]),
        )),
        turnId,
      }
      const autoCommandMessages: ChatMessage[] = []
      if (readingSettings.alwaysShowCommandSuggestions && readingSettings.selectedCommandIds.length > 0) {
        const selectedCommands = SLASH_COMMANDS.filter((command) =>
          readingSettings.selectedCommandIds.includes(command.id),
        ).slice(0, 2)

        for (const command of selectedCommands) {
          const isImageAutoCommand = command.name === "이미지"
          if (isImageAutoCommand) {
            setTypingLabel("이미지 생성중...")
            setTypingVariant("image")
          }
          const commandStartedAt = Date.now()
          const result = await runCommand(command.name, characterName, buildImageCommandContext([...messages, userMessage, reply]))
          if (isImageAutoCommand) {
            const remainingDelay = Math.max(0, 1400 - (Date.now() - commandStartedAt))
            if (remainingDelay > 0) {
              await new Promise((resolve) => setTimeout(resolve, remainingDelay))
            }
          }
          if (result.kind === "message") {
            autoCommandMessages.push({ ...result.message, turnId })
          } else {
            toast(result.message)
          }
          if (isImageAutoCommand) {
            setTypingLabel(undefined)
            setTypingVariant("text")
          }
        }
      }
      setMessages((prev) => [...prev, reply, ...autoCommandMessages])
    } catch {
      const errorMessage: ChatMessage = {
        id: `reply-error-${Date.now()}`,
        type: "status",
        content: "답변을 생성하지 못했어요. 무료로 다시 생성할 수 있습니다.",
        timestamp: new Date(),
        turnId,
        isGenerationError: true,
        retryPayload: {
          content,
          mentions,
          image,
          turnId,
        },
      }
      setMessages((prev) => [...prev, errorMessage])
      toast.error("응답을 가져오지 못했어요.")
    } finally {
      setIsTyping(false)
      setTypingLabel(undefined)
      setTypingVariant("text")
    }
  }

  const handleRetryFailedMessage = async (messageId: string) => {
    const failedMessage = messages.find((message) => message.id === messageId)
    const retryPayload = failedMessage?.retryPayload
    if (!failedMessage || !retryPayload) return

    const retryTurnId = retryPayload.turnId || failedMessage.turnId || makeTurnId()
    const retryMessages = messages.filter((message) => message.id !== messageId)
    setMessages(retryMessages)
    setIsTyping(true)
    setTypingLabel(undefined)
    setTypingVariant("text")

    try {
      const reply = {
        ...(await generateAssistantReply(
          retryMessages,
          retryPayload.content,
          selectedIntroScenario,
          buildImageCommandContext(retryMessages),
        )),
        turnId: retryTurnId,
      }
      const autoCommandMessages: ChatMessage[] = []
      if (readingSettings.alwaysShowCommandSuggestions && readingSettings.selectedCommandIds.length > 0) {
        const selectedCommands = SLASH_COMMANDS.filter((command) =>
          readingSettings.selectedCommandIds.includes(command.id),
        ).slice(0, 2)

        for (const command of selectedCommands) {
          const isImageAutoCommand = command.name === "이미지"
          if (isImageAutoCommand) {
            setTypingLabel("이미지 생성중...")
            setTypingVariant("image")
          }
          const commandStartedAt = Date.now()
          const result = await runCommand(command.name, characterName, buildImageCommandContext([...retryMessages, reply]))
          if (isImageAutoCommand) {
            const remainingDelay = Math.max(0, 1400 - (Date.now() - commandStartedAt))
            if (remainingDelay > 0) {
              await new Promise((resolve) => setTimeout(resolve, remainingDelay))
            }
          }
          if (result.kind === "message") {
            autoCommandMessages.push({ ...result.message, turnId: retryTurnId })
          } else {
            toast(result.message)
          }
          if (isImageAutoCommand) {
            setTypingLabel(undefined)
            setTypingVariant("text")
          }
        }
      }
      setMessages((prev) => [...prev, reply, ...autoCommandMessages])
    } catch {
      setMessages((prev) => [...prev, failedMessage])
      toast.error("다시 생성하지 못했어요.")
    } finally {
      setIsTyping(false)
      setTypingLabel(undefined)
      setTypingVariant("text")
    }
  }

  const handleCommand = async (command: string) => {
    const isImageCommand = command.replace(/^\//, "").trim() === "이미지"
    setIsTyping(true)
    setTypingLabel(isImageCommand ? "이미지 생성중..." : undefined)
    setTypingVariant(isImageCommand ? "image" : "text")

    try {
      const startedAt = Date.now()
      const turnId = makeTurnId()
      const result = await runCommand(command, characterName, buildImageCommandContext())
      const remainingDelay = isImageCommand ? Math.max(0, 1400 - (Date.now() - startedAt)) : 0
      if (remainingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDelay))
      }

      if (result.kind === "toast") {
        toast(result.message)
        return
      }
      setMessages((prev) => [...prev, { ...result.message, turnId }])
    } catch {
      const errorMessage: ChatMessage = {
        id: `image-error-${Date.now()}`,
        type: "status",
        content: "이미지 생성에 실패했어요. 잠시 후 다시 시도해주세요.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
      setTypingLabel(undefined)
      setTypingVariant("text")
    }
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

  const handleEditMessage = async (messageId: string, nextContent: string) => {
    const trimmedContent = nextContent.trim()
    if (!trimmedContent) {
      toast.error("메시지를 비워둘 수 없어요.")
      return
    }

    const targetMessage = messages.find((message) => message.id === messageId)
    const shouldRegenerateImages = Boolean(
      targetMessage?.turnId &&
        messages.some((message) => message.turnId === targetMessage.turnId && message.imageUrl),
    )
    const editedMessages = messages.map((msg) =>
        msg.id === messageId
          ? { ...msg, content: trimmedContent }
          : msg,
    )

    setMessages(editedMessages)
    setEditedMessageIds((prev) => new Set(prev).add(messageId))

    if (shouldRegenerateImages && targetMessage?.turnId) {
      setIsTyping(true)
      setTypingLabel("이미지 재생성중...")
      setTypingVariant("image")

      try {
        const result = await runCommand("이미지", characterName, buildImageCommandContext(editedMessages))
        if (result.kind !== "message" || !result.message.imageUrl) {
          throw new Error("Image regeneration failed")
        }
        setMessages((prev) =>
          prev.map((message) =>
            message.turnId === targetMessage.turnId && message.imageUrl
              ? {
                  ...message,
                  type: "ai",
                  content: "",
                  imageUrl: result.message.imageUrl,
                  imageName: result.message.imageName,
                }
              : message,
          ),
        )
        toast.success("메시지를 수정하고 이미지를 다시 생성했어요.")
      } catch {
        setMessages((prev) =>
          prev.map((message) =>
            message.turnId === targetMessage.turnId && message.imageUrl
              ? {
                  ...message,
                  type: "status",
                  content: "이미지 재생성에 실패했어요. 잠시 후 다시 시도해주세요.",
                  imageUrl: undefined,
                  imageName: undefined,
                }
              : message,
          ),
        )
        toast.error("이미지를 다시 생성하지 못했어요.")
      } finally {
        setIsTyping(false)
        setTypingLabel(undefined)
        setTypingVariant("text")
      }
      return
    }

    toast.success("메시지를 수정했어요.")
  }

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
    toast.success("메시지를 삭제했어요.")
  }

  // --- Branch flow ---
  const handleBranchFromMessage = (messageId: string) => {
    const targetMessage = messages.find((message) => message.id === messageId)
    if (!targetMessage?.turnId) {
      setBranchTargetId(messageId)
      return
    }

    const lastMessageInTurn = messages.findLast((message) => message.turnId === targetMessage.turnId)
    setBranchTargetId(lastMessageInTurn?.id ?? messageId)
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
      title: `${characterName} 분기 ${new Date().toLocaleDateString("ko-KR")}`,
    })
    setBranchTargetId(null)
    toast.success("새로운 분기를 만들었어요.")
  }

  const hasMessages = messages.length > 0

  const handleClearChat = () => {
    setIsClearConfirmOpen(true)
  }

  const handleLeaveChat = () => {
    setIsSettingsOpen(false)
    router.push("/chats")
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <ChatHeader
        characterName={characterName}
        characterEmoji={characterEmoji}
        level={3}
        onProfileClick={() => setIsIntroOpen(true)}
        onMenuClick={() => setIsSettingsOpen(true)}
      />

      <StoryStatusCard
        status={chatStoryStatus}
      />

      <ChatSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        characterName={characterName}
        characterEmoji={characterEmoji}
        chatId={chatId}
        onChatThemeChange={(theme) => setChatTheme(theme)}
        onReadingSettingsChange={setReadingSettings}
        onClearChat={handleClearChat}
        onLeaveChat={handleLeaveChat}
      />

      <WorkIntroModal
        open={isIntroOpen}
        onClose={() => setIsIntroOpen(false)}
        work={currentWork}
        world={currentWorld}
        character={currentCharacter}
        characters={workCharacters}
        personas={workPersonas}
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
      <ConfirmModal
        open={isClearConfirmOpen}
        title="대화 초기화"
        message="현재 대화를 모두 초기화할까요?"
        confirmText="초기화"
        destructive
        onOpenChange={setIsClearConfirmOpen}
        onConfirm={() => {
          setMessages([])
          setEditedMessageIds(new Set())
          setIsSettingsOpen(false)
          toast.success("대화를 초기화했어요.")
        }}
      />

      {/* Chat Area - Scrollable */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        {hasMessages || isTyping ? (
          <ChatMessageList
            messages={messages}
            isTyping={isTyping}
            typingLabel={typingLabel}
            typingVariant={typingVariant}
            messagesEndRef={messagesEndRef}
            onRewriteMessage={handleRewriteMessage}
            onRetryFailedMessage={handleRetryFailedMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onBranchFromMessage={handleBranchFromMessage}
            editedMessageIds={editedMessageIds}
            chatId={chatId}
            chatTheme={chatTheme}
            textSize={readingSettings.textSize}
            lineHeight={readingSettings.lineHeight}
            alwaysShowCommandSuggestions={readingSettings.alwaysShowCommandSuggestions}
            selectedCommandIds={readingSettings.selectedCommandIds}
            disabled={isTyping}
          />
        ) : (
          <div className="min-h-full">
              <EmptyChatState
                characterName={characterName}
                characterEmoji={characterEmoji}
                startScenario={startScenario}
                introScenarios={introScenarios}
                selectedIntroScenarioId={selectedIntroScenario?.id}
                onIntroSelect={setSelectedIntroScenarioId}
                onSuggestionClick={(suggestion) => handleSendMessage(suggestion)}
                textSize={readingSettings.textSize}
                lineHeight={readingSettings.lineHeight}
              />
          </div>
        )}
      </main>

      {/* Input Area - normal block in flex column */}
      <div className="shrink-0">
        <ChatInput
          onSendMessage={handleSendMessage}
          onCommand={handleCommand}
          characters={chatInputCharacters}
          disabled={isTyping}
          insertTextRequest={insertTextRequest}
        />
      </div>
    </div>
  )
}
