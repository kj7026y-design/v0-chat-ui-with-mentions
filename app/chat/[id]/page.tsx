"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatSettingsDrawer } from "@/components/chat/chat-settings-drawer";
import {
  ChatUtilityModal,
  type ChatUtilityModalType,
} from "@/components/chat/chat-utility-modal";
import { ChatModelDrawer } from "@/components/chat/chat-model-drawer";
import { WorkIntroModal } from "@/components/chat/work-intro-modal";
import { QuestRewardPopup } from "@/components/chat/quest-reward-popup";
import { EmptyChatState } from "@/components/chat/empty-chat-state";
import { BranchConfirmModal } from "@/components/chat/branch-confirm-modal";
import {
  StoryStatusCard,
  type StoryStatus,
} from "@/components/chat/story-status-card";
import { AlertModal, ConfirmModal } from "@/components/ui/app-modal";
import {
  AUTO_COMMAND_IDS,
  MAX_COMMAND_SUGGESTIONS,
  SLASH_COMMANDS,
  type ChatMessage,
} from "@/lib/chat-types";
import {
  buildUserMessages,
  fitAssistantReplyToTurnBudget,
  generateAssistantReply,
  generateFalImage,
  getAssistantReplyLengthBudget,
  getDialogueAssistCharCount,
  getMessageContentCharCount,
  type ChatStreamEvent,
  type ImageCommandContext,
  parseChatInputSegments,
  runCommand,
} from "@/lib/chat-engine";
import { getChatMemoryMemo } from "@/lib/chat-memory-storage";
import { kp } from "@/lib/chat-commands/shared";
import { formatEditedCommandContent } from "@/lib/chat-command-editing";
import { areAssistantResponsesSubstantiallyDuplicate } from "@/lib/response-similarity";
import {
  appendMessageCandidate,
  buildRegenerationAvoidContent,
  finalizeMessageCandidates,
  getMessageCandidateContents,
  selectMessageCandidate,
} from "@/lib/message-candidates";
import {
  clearChatHistory,
  deleteChatMessages as deleteStoredChatMessages,
  getAdminSessionState,
  loadChatHistoryPage,
  saveChatMessages,
} from "@/lib/chat-history-client";
import { useAppStore, CREDIT_COSTS } from "@/lib/store";
import {
  defaultChats,
  getChatDisplayName,
  getChatList,
  saveChatList,
  type ChatListItemData,
} from "@/lib/chat-list-storage";
import { ensureChatRoom } from "@/lib/chat-room-client";
import {
  defaultChatReadingSettings,
  getChatReadingSettings,
  type ChatReadingSettings,
} from "@/lib/chat-settings-storage";
import { buildModelUserMessageFromInput } from "@/lib/rp-input-parser";
import {
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL_ID,
  getChatModelConfig,
  getChatModelId,
  saveChatModelId,
  type ChatModelId,
} from "@/lib/chat-models";
import {
  FREE_IMAGE_GENERATION_LIMIT,
  IMAGE_GENERATION_CREDIT_COST,
  attachMediaToMessage,
  chargeImageGenerationCredit,
  deleteGeneratedMedia,
  getCurrentUserId,
  getImageGenerationUsage,
  incrementFreeImageGenerationUsage,
  setGeneratedMediaUserId,
  syncGeneratedMediaWithServer,
  saveGeneratedMedia,
} from "@/lib/generated-media-storage";
import {
  defaultLibrary,
  getStoryChatLibrary,
  saveStoryChatLibrary,
  normalizeIntroScenarios,
  type StoryChatLibrary,
} from "@/lib/storychat-storage";
import { PersonaSelectModal } from "@/components/my-works/persona-select-modal";
import { syncStoryWorksFromDatabase } from "@/lib/story-work-client";
import {
  findChatSearchResultIds,
  normalizeChatSearchQuery,
} from "@/lib/chat-search";
import { withReturnTo } from "@/lib/safe-navigation";
import { useAccountSession } from "@/hooks/use-account-session";
import { canEditStoryWork } from "@/lib/work-permissions";

type ChatThemeId = "system" | "light" | "dark" | "message" | "messenger";

const CHAT_UTILITY_HISTORY_KEY = "__storyChatUtilityModal";
const CHAT_THEME_BACKGROUNDS: Record<Exclude<ChatThemeId, "system">, string> = {
  light: "#FFFFFF",
  dark: "#121212",
  message: "#F2F2F7",
  messenger: "#BACEE0",
};

function getChatThemeBackground(
  chatTheme: ChatThemeId,
  resolvedTheme: "light" | "dark",
) {
  if (chatTheme === "system") {
    return resolvedTheme === "dark"
      ? CHAT_THEME_BACKGROUNDS.dark
      : CHAT_THEME_BACKGROUNDS.light;
  }
  return CHAT_THEME_BACKGROUNDS[chatTheme];
}

function getTransparentChatThemeBackground(backgroundColor: string) {
  return /^#[0-9a-f]{6}$/i.test(backgroundColor)
    ? `${backgroundColor}00`
    : "transparent";
}

const CHARACTER_NAME = "이무기";
const CHARACTER_EMOJI = "🐉";
const AUTO_IMAGE_GENERATION_CHANCE = 0;
const AUTO_IMAGE_GENERATION_LIMIT = 3;
const AUTO_ADVANCE_MODEL_CONTENT = `[System: 사용자가 새 행동이나 대사를 입력하지 않고 침묵하고 있습니다. 직전 장면의 확정 상태를 유지한 채 캐릭터의 행동이나 다음 대사로 스토리를 자연스럽게 한 단계 이어가세요. 사용자의 새 행동, 대사, 감정, 동의나 반응을 대신 만들지 마세요.]`;
const COMMAND_NAME_BY_ID: Record<
  NonNullable<ChatMessage["commandId"]>,
  string
> = {
  phone: "휴대폰",
  sns: "SNS",
  status: "상태창",
  audience: "시청자반응",
  summary: "요약",
  image: "이미지",
};

function getCommandLoadingLabel(commandName: string, characterName: string) {
  const normalizedCommand = commandName.replace(/^\//u, "").trim();
  if (normalizedCommand === "이미지") return "이미지 생성중...";
  if (normalizedCommand === "시청자반응") return "시청자 반응 생성중...";
  const displayCommand =
    normalizedCommand === "상태바" ? "상태창" : normalizedCommand;
  const commandLabel = displayCommand || "명령어";
  return `${characterName || "캐릭터"}의 ${commandLabel}${kp(commandLabel, "을", "를")} 보는 중`;
}

function getTextCommandId(commandName: string): ChatMessage["commandId"] {
  const normalizedCommand = commandName.replace(/^\//u, "").trim();
  if (normalizedCommand === "이미지") return "image";
  if (normalizedCommand === "휴대폰") return "phone";
  if (normalizedCommand === "SNS") return "sns";
  if (normalizedCommand === "상태창" || normalizedCommand === "상태바")
    return "status";
  if (normalizedCommand === "시청자반응") return "audience";
  if (normalizedCommand === "요약") return "summary";
  return undefined;
}

function getCommandGenerationErrorContent(commandName: string) {
  const normalizedCommand = commandName.replace(/^\//u, "").trim();
  if (normalizedCommand === "이미지") {
    return "이미지 생성에 실패했어요. 잠시 후 다시 시도해주세요.";
  }
  if (normalizedCommand === "SNS") {
    return "SNS 내용을 생성하지 못했어요. 잠시 후 다시 시도해주세요.";
  }
  if (normalizedCommand === "상태창" || normalizedCommand === "상태바") {
    return "상태창 내용을 생성하지 못했어요. 잠시 후 다시 시도해주세요.";
  }
  return "명령어 내용을 생성하지 못했어요. 잠시 후 다시 시도해주세요.";
}

function getGeneratedImageProvider(message: ChatMessage) {
  return message.provider === "fal" ? ("fal" as const) : ("custom" as const);
}

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
};

function getStatusLocation(statusBarText?: string) {
  return statusBarText
    ?.split("\n")
    .map((line) => line.trim())
    .find(Boolean);
}

function makeTurnId() {
  return `turn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function isAutoAdvanceTurn(message: ChatMessage, allMessages: ChatMessage[]) {
  if (
    message.isAutoAdvance === true ||
    message.retryPayload?.autoAdvance === true
  )
    return true;
  if (!message.turnId) return false;

  const sameTurnMessages = allMessages.filter(
    (candidate) => candidate.turnId === message.turnId,
  );
  return !sameTurnMessages.some((candidate) => candidate.type === "user");
}

function getLatestAssistantContent(allMessages: ChatMessage[]) {
  return (
    [...allMessages]
      .reverse()
      .find((message) => message.type === "ai" && message.content.trim())
      ?.content.trim() || ""
  );
}

function rejectDuplicateAssistantResponse(content: string, reference: string) {
  if (
    reference &&
    areAssistantResponsesSubstantiallyDuplicate(content, reference)
  ) {
    throw new Error("새 답변이 이전 답변을 반복해서 채택하지 않았어요.");
  }
}

function isPersistableChatMessage(message: ChatMessage) {
  if (message.status === "streaming" || message.status === "pending")
    return false;
  return Boolean(
    message.content.trim() || message.imageUrl || message.eventImage,
  );
}

function getChatMessageFingerprint(message: ChatMessage) {
  return JSON.stringify(message);
}

function inferEmotion(text: string, fallback = "차분함") {
  const content = text.toLowerCase();
  if (/놀|당황|흔들|멈칫|충격|두려/.test(content)) return "긴장";
  if (/웃|미소|따뜻|기뻐|좋/.test(content)) return "온화함";
  if (/분노|화|차갑|날카|노려/.test(content)) return "경계";
  if (/비밀|침묵|망설|숨/.test(content)) return "망설임";
  if (/고개를 끄덕|믿|신뢰|괜찮/.test(content)) return "신뢰";
  return fallback;
}

function inferPersonaEmotion(text: string, fallback = "몰입") {
  if (/놀|당황|무섭|두려|긴장/.test(text)) return "놀람";
  if (/웃|기쁘|좋|반가/.test(text)) return "즐거움";
  if (/왜|뭐|어디|누구|궁금|묻/.test(text)) return "호기심";
  if (/다가|바라|살펴|따라/.test(text)) return "집중";
  return fallback;
}

function inferLocation(text: string, fallback?: string) {
  const candidates = [
    "연습실",
    "라이브바",
    "옥상",
    "항구",
    "방파제",
    "서점",
    "창가 자리",
    "왕성",
    "안개 숲",
    "예언자의 탑",
    "카페",
    "골목",
    "성문",
  ];
  return candidates.find((location) => text.includes(location)) || fallback;
}

function getCompactChapterLabel(title?: string) {
  const trimmed = title?.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(
    /^(프롤로그|\d+\s*(?:장|화|챕터)|chapter\s*\d+)/i,
  );
  return match?.[1].replace(/\s+/g, "") ?? trimmed.split(/[:：·-]/)[0]?.trim();
}

function getCompactCharacterState(status: StoryStatus) {
  if (status.characterEmotion) return status.characterEmotion;
  const compactStatus = status.characterStatus
    ?.split(/[,.，。·|]/)[0]
    ?.replace(/\s*상태로.*$/, "")
    ?.trim();
  if (!compactStatus) return undefined;
  return compactStatus.length > 10
    ? `${compactStatus.slice(0, 10)}...`
    : compactStatus;
}

function getAutoImageCount(chatId: string) {
  if (typeof window === "undefined") return 0;
  return (
    Number(window.localStorage.getItem(`chat-auto-image-count-${chatId}`)) || 0
  );
}

function incrementAutoImageCount(chatId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    `chat-auto-image-count-${chatId}`,
    String(getAutoImageCount(chatId) + 1),
  );
}

function getSelectedIntroScenarioKey(chatId: string) {
  return `storychat_selected_intro_${chatId}`;
}

function isMajorSceneCandidate(
  userContent: string,
  replyContent: string,
  status: Partial<StoryStatus>,
) {
  const combined = `${userContent}\n${replyContent}`;
  if (!/[가-힣]/.test(replyContent)) return false;
  if (
    status.nextEventCondition &&
    /발생|드러|열립|이어집/.test(status.nextEventCondition)
  )
    return true;
  return /처음|비밀|발견|고백|전투|위기|눈물|손을|다가|키스|문이|깨어|돌아|결심|사라|죽|구하|마주|놀|긴장|신뢰|단서|운명/.test(
    combined,
  );
}

function shouldAutoGenerateImage(
  chatId: string,
  userContent: string,
  replyContent: string,
  status: Partial<StoryStatus>,
) {
  if (AUTO_IMAGE_GENERATION_CHANCE <= 0) return false;
  if (getAutoImageCount(chatId) >= AUTO_IMAGE_GENERATION_LIMIT) return false;
  if (!isMajorSceneCandidate(userContent, replyContent, status)) return false;
  return Math.random() < AUTO_IMAGE_GENERATION_CHANCE;
}

function buildNextRuntimeStatus({
  baseStatus,
  previousStatus,
  userContent,
  replyContent,
}: {
  baseStatus: StoryStatus;
  previousStatus: Partial<StoryStatus>;
  userContent: string;
  replyContent: string;
}): Partial<StoryStatus> {
  const combined = `${userContent}\n${replyContent}`;
  const currentProgress =
    previousStatus.chapterProgress ?? baseStatus.chapterProgress ?? 0;
  const nextProgress = baseStatus.useChapters
    ? Math.min(100, currentProgress + 3 + Math.floor(Math.random() * 4))
    : undefined;
  const characterEmotion = inferEmotion(
    replyContent,
    previousStatus.characterEmotion || baseStatus.characterEmotion || "차분함",
  );
  const personaEmotion = inferPersonaEmotion(
    userContent,
    previousStatus.personaEmotion || baseStatus.personaEmotion || "몰입",
  );

  return {
    characterEmotion,
    characterStatus: `${characterEmotion} 상태로 대화의 흐름을 받아들이고 있다.`,
    personaEmotion,
    personaStatus: `${personaEmotion}을 느끼며 현재 장면에 반응하고 있다.`,
    currentLocation: inferLocation(
      combined,
      previousStatus.currentLocation || baseStatus.currentLocation,
    ),
    chapterProgress: nextProgress,
    currentMission: baseStatus.currentMission,
    currentGoal:
      baseStatus.currentGoal ||
      (userContent
        ? `${userContent.slice(0, 28)}${userContent.length > 28 ? "..." : ""}`
        : undefined),
    nextEventCondition:
      characterEmotion === "신뢰"
        ? "신뢰가 더 쌓이면 숨겨진 이야기가 드러납니다."
        : characterEmotion === "경계"
          ? "긴장이 풀리거나 설득에 성공하면 다음 흐름이 열립니다."
          : "다음 선택과 대화 반응에 따라 장면이 이어집니다.",
    weather: previousStatus.weather || baseStatus.weather || "20˚/31˚ 맑음",
  };
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const chatId = params.id as string;
  const { session: accountSession, isLoading: isAccountSessionLoading } =
    useAccountSession();

  const credits = useAppStore((s) => s.credits);
  const spendCredit = useAppStore((s) => s.spendCredit);
  const createBranch = useAppStore((s) => s.createBranch);
  const startScenario = useAppStore((s) => s.startScenario);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | undefined>(undefined);
  const [typingVariant, setTypingVariant] = useState<
    "text" | "image" | "command"
  >("text");
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<
    string | null
  >(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [chatUtilityModal, setChatUtilityModal] =
    useState<ChatUtilityModalType | null>(null);
  const [isModelDrawerOpen, setIsModelDrawerOpen] = useState(false);
  const [isStatusPanelOpen, setIsStatusPanelOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState(-1);
  const [isSearchBusy, setIsSearchBusy] = useState(false);
  const [isQuestPopupOpen, setIsQuestPopupOpen] = useState(false);
  const [editedMessageIds, setEditedMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [chatTheme, setChatTheme] = useState<ChatThemeId>("system");
  const [readingSettings, setReadingSettings] = useState<ChatReadingSettings>(
    defaultChatReadingSettings,
  );
  const [selectedModelId, setSelectedModelId] = useState<ChatModelId>(
    DEFAULT_CHAT_MODEL_ID,
  );
  const [branchTargetId, setBranchTargetId] = useState<string | null>(null);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isImageLimitModalOpen, setIsImageLimitModalOpen] = useState(false);
  const [runtimeStoryStatus, setRuntimeStoryStatus] = useState<
    Partial<StoryStatus>
  >({});
  const [selectedIntroScenarioId, setSelectedIntroScenarioId] =
    useState<string>("");
  const [insertTextRequest, setInsertTextRequest] = useState<{
    id: number;
    text: string;
  } | null>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [library, setLibrary] = useState<StoryChatLibrary>(defaultLibrary);
  const [chatMeta, setChatMeta] = useState<ChatListItemData | null>(
    defaultChats.find((chat) => chat.id === chatId) ?? null,
  );
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isLoadingOlderHistory, setIsLoadingOlderHistory] = useState(false);
  const [isHistoryPersistenceEnabled, setIsHistoryPersistenceEnabled] =
    useState(false);
  const [isRestoredGenerationPending, setIsRestoredGenerationPending] =
    useState(false);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [hasOlderHistory, setHasOlderHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const isLoadingOlderHistoryRef = useRef(false);
  const latestMessageIdRef = useRef<string | null>(null);
  const persistedMessageFingerprintsRef = useRef<Map<string, string>>(
    new Map(),
  );
  const pendingMessageFingerprintsRef = useRef<Map<string, string>>(new Map());
  const historyOperationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const historyErrorShownRef = useRef(false);
  const searchRequestIdRef = useRef(0);
  const searchResultIds = useMemo(
    () => findChatSearchResultIds(messages, searchQuery),
    [messages, searchQuery],
  );
  const activeSearchMessageId =
    activeSearchResultIndex >= 0
      ? searchResultIds[activeSearchResultIndex]
      : undefined;
  const characterName = chatMeta?.characterName ?? CHARACTER_NAME;
  const roomName = chatMeta ? getChatDisplayName(chatMeta) : characterName;
  const characterEmoji = chatMeta?.characterEmoji ?? CHARACTER_EMOJI;
  const currentWork =
    library.works.find((work) => work.id === chatId) ??
    library.works.find((work) => {
      const character = library.characters.find(
        (item) => item.id === work.characterId,
      );
      return character?.name === characterName;
    });
  const canEditCurrentWork =
    !isAccountSessionLoading && canEditStoryWork(currentWork, accountSession);

  useEffect(() => {
    const getHistoryModal = (state: unknown): ChatUtilityModalType | null => {
      if (!state || typeof state !== "object") return null;
      const value = (state as Record<string, unknown>)[CHAT_UTILITY_HISTORY_KEY];
      return value === "gallery" || value === "timeline" ? value : null;
    };
    const syncUtilityModal = (event?: PopStateEvent) => {
      setChatUtilityModal(getHistoryModal(event?.state ?? window.history.state));
    };

    syncUtilityModal();
    window.addEventListener("popstate", syncUtilityModal);
    return () => window.removeEventListener("popstate", syncUtilityModal);
  }, []);

  const openChatUtilityModal = (type: ChatUtilityModalType) => {
    window.history.pushState(
      { ...window.history.state, [CHAT_UTILITY_HISTORY_KEY]: type },
      "",
      window.location.href,
    );
    setChatUtilityModal(type);
  };

  const closeChatUtilityModal = () => {
    const activeHistoryModal = window.history.state?.[CHAT_UTILITY_HISTORY_KEY];
    if (activeHistoryModal === chatUtilityModal) window.history.back();
    else setChatUtilityModal(null);
  };
  const currentWorld = currentWork
    ? library.worlds.find((world) => world.id === currentWork.worldId)
    : undefined;
  const currentCharacter = currentWork
    ? library.characters.find(
        (character) => character.id === currentWork.characterId,
      )
    : library.characters.find((character) => character.name === characterName);
  const currentPersona = currentWork
    ? library.personas.find((persona) => persona.id === currentWork.personaId)
    : undefined;

  useEffect(() => {
    if (currentWork && !currentPersona) {
      setIsPersonaModalOpen(true);
    }
  }, [currentWork, currentPersona]);

  const handlePersonaSelectedInChat = (personaId: string) => {
    if (!currentWork) return;
    const updatedWork = { ...currentWork, personaId };
    const updatedLibrary = {
      ...library,
      works: library.works.map((item) =>
        item.id === currentWork.id ? updatedWork : item,
      ),
    };
    saveStoryChatLibrary(updatedLibrary);
    setLibrary(updatedLibrary);
    setIsPersonaModalOpen(false);
    toast.success("대화 자아가 설정되었습니다.");
  };
  const workCharacters = currentWorld
    ? library.works
        .filter((work) => work.worldId === currentWorld.id)
        .map((work) =>
          library.characters.find(
            (character) => character.id === work.characterId,
          ),
        )
        .filter((character): character is NonNullable<typeof character> =>
          Boolean(character),
        )
    : [];
  const workPersonas = currentWorld
    ? library.works
        .filter((work) => work.worldId === currentWorld.id)
        .map((work) =>
          library.personas.find((persona) => persona.id === work.personaId),
        )
        .filter((persona): persona is NonNullable<typeof persona> =>
          Boolean(persona),
        )
    : [];
  const inputCharacters = Array.from(
    new Map(
      [currentCharacter, ...workCharacters]
        .filter((character): character is NonNullable<typeof character> =>
          Boolean(character),
        )
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
  );
  const chatInputCharacters = inputCharacters.length
    ? inputCharacters
    : [{ id: "imugi", name: characterName, emoji: characterEmoji }];
  const introScenarios = currentWork
    ? normalizeIntroScenarios(currentWork)
    : [];
  const introScenarioIds = introScenarios.map((intro) => intro.id).join("|");
  const selectedIntroScenario =
    introScenarios.find((intro) => intro.id === selectedIntroScenarioId) ??
    (introScenarios.length === 1 ? introScenarios[0] : undefined);
  const handleIntroScenarioSelect = (introId: string) => {
    setSelectedIntroScenarioId(introId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(getSelectedIntroScenarioKey(chatId), introId);
    }
  };

  useEffect(() => {
    if (introScenarios.length === 0) {
      setSelectedIntroScenarioId((current) => (current === "" ? current : ""));
      return;
    }

    const savedIntroId = window.localStorage.getItem(
      getSelectedIntroScenarioKey(chatId),
    );
    const nextIntroId = introScenarios.some(
      (intro) => intro.id === savedIntroId,
    )
      ? savedIntroId
      : introScenarios[0]?.id;

    const normalizedIntroId = nextIntroId ?? "";
    setSelectedIntroScenarioId((current) =>
      current === normalizedIntroId ? current : normalizedIntroId,
    );
  }, [chatId, introScenarioIds]);

  const progressSettings =
    currentWork?.storyProgressSettings ?? currentWorld?.storyProgressSettings;
  const hasConfiguredChapters = Boolean(
    progressSettings?.useChapters &&
    (progressSettings.chapters?.length ?? 0) > 0,
  );
  const useChapters = hasConfiguredChapters;
  const activeChapter =
    progressSettings?.chapters.find(
      (chapter) =>
        chapter.title ===
        (currentWork?.currentChapter || currentWorld?.currentChapter),
    ) ?? progressSettings?.chapters[0];
  const canUseDefaultImugiStatus =
    characterName === storyStatus.characterName &&
    Boolean(currentWork || currentCharacter);
  const baseChatStoryStatus: StoryStatus = {
    useChapters,
    currentChapterId: useChapters
      ? (activeChapter?.id ?? storyStatus.currentChapterId)
      : undefined,
    currentChapterTitle: useChapters
      ? currentWork?.currentChapter ||
        currentWorld?.currentChapter ||
        activeChapter?.title
      : undefined,
    chapterProgress: useChapters ? currentWorld?.progress : undefined,
    currentMission: useChapters
      ? activeChapter?.mission ||
        currentWork?.currentGoal ||
        currentWorld?.currentGoal
      : undefined,
    currentGoal: useChapters
      ? currentWork?.currentGoal ||
        currentWorld?.currentGoal ||
        activeChapter?.goal
      : currentWork?.currentGoal || currentWorld?.currentGoal,
    worldDate:
      currentWork?.worldDate || currentWorld?.worldDate || currentWorld?.era,
    currentLocation: getStatusLocation(currentWork?.statusBarText),
    characterName,
    characterEmotion: canUseDefaultImugiStatus
      ? storyStatus.characterEmotion
      : undefined,
    characterStatus: canUseDefaultImugiStatus
      ? storyStatus.characterStatus
      : undefined,
    personaName: currentPersona?.name || "나",
    personaEmotion: canUseDefaultImugiStatus
      ? storyStatus.personaEmotion
      : undefined,
    personaStatus: canUseDefaultImugiStatus
      ? storyStatus.personaStatus
      : undefined,
    nextEventCondition: useChapters
      ? activeChapter?.nextChapterCondition
      : undefined,
    weather: "20˚/31˚ 맑음",
  };
  const chatStoryStatus: StoryStatus = {
    ...baseChatStoryStatus,
    ...runtimeStoryStatus,
    useChapters,
    characterName,
    personaName: currentPersona?.name || "나",
  };
  const modelUserName =
    currentPersona?.name || chatStoryStatus.personaName || "사용자";
  const buildModelContentFromUserInput = (content: string) => {
    return buildModelUserMessageFromInput(content, modelUserName);
  };
  const canShowProgressStatus = hasConfiguredChapters;
  const selectedModel = getChatModelConfig(selectedModelId);
  const headerStatusSummary = [
    getCompactChapterLabel(chatStoryStatus.currentChapterTitle),
    chatStoryStatus.chapterProgress !== undefined
      ? `${chatStoryStatus.chapterProgress}%`
      : undefined,
    getCompactCharacterState(chatStoryStatus),
  ]
    .filter(Boolean)
    .join(" · ");

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const reportHistoryError = (error: unknown) => {
    console.error("[chat history sync failed]", error);
    if (historyErrorShownRef.current) return;
    historyErrorShownRef.current = true;
    toast.error(
      error instanceof Error
        ? error.message
        : "채팅 내역을 DB와 동기화하지 못했어요.",
    );
  };

  const enqueueHistoryOperation = (operation: () => Promise<unknown>) => {
    historyOperationQueueRef.current = historyOperationQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await operation();
      })
      .catch(reportHistoryError);
  };

  const buildImageCommandContext = (
    recentMessages: ChatMessage[] = messages,
    statusOverride?: StoryStatus,
  ): ImageCommandContext => ({
    work: currentWork,
    world: currentWorld,
    character: currentCharacter,
    persona: currentPersona,
    status: statusOverride ?? chatStoryStatus,
    recentMessages,
    memoryMemo: getChatMemoryMemo(chatId),
  });

  const buildGeneratedImageMessage = async ({
    turnId,
    contextMessages,
    statusOverride,
    titleSuffix = "생성 이미지",
  }: {
    turnId: string;
    contextMessages: ChatMessage[];
    statusOverride?: StoryStatus;
    titleSuffix?: string;
  }): Promise<ChatMessage | null> => {
    const userId = getCurrentUserId();
    const usage = getImageGenerationUsage(userId);
    const shouldUseFreeImage =
      usage.freeImageGenerationsUsed < FREE_IMAGE_GENERATION_LIMIT;
    if (!shouldUseFreeImage && credits < IMAGE_GENERATION_CREDIT_COST)
      return null;

    const result = await runCommand(
      "이미지",
      characterName,
      buildImageCommandContext(contextMessages, statusOverride),
      selectedModelId,
    );
    if (result.kind !== "message" || !result.message.imageUrl) return null;

    const media = saveGeneratedMedia({
      imageUrl: result.message.imageUrl,
      prompt: result.message.originalContent || "",
      provider: getGeneratedImageProvider(result.message),
      workId: currentWork?.id,
      chatId,
      characterId: currentCharacter?.id,
      userId,
      messageId: result.message.id,
      title: `${characterName} ${titleSuffix}`,
    });

    const imageMessage = {
      ...result.message,
      turnId,
      mediaId: media.id,
    };
    attachMediaToMessage(imageMessage.id, media.id);
    if (shouldUseFreeImage) {
      incrementFreeImageGenerationUsage(userId);
    } else {
      if (
        !spendCredit(
          IMAGE_GENERATION_CREDIT_COST,
          "이미지 생성",
          `${characterName} 주요 장면 자동 생성`,
        )
      )
        return null;
      chargeImageGenerationCredit(userId);
    }
    return imageMessage;
  };

  const buildAutoCommandMessages = async ({
    turnId,
    contextMessages,
    statusOverride,
    commandIds,
  }: {
    turnId: string;
    contextMessages: ChatMessage[];
    statusOverride: StoryStatus;
    commandIds: string[];
  }) => {
    const autoMessages: ChatMessage[] = [];
    const selectedCommands = SLASH_COMMANDS.filter(
      (command) =>
        commandIds.includes(command.id) &&
        AUTO_COMMAND_IDS.includes(command.id),
    ).slice(0, MAX_COMMAND_SUGGESTIONS);

    for (const command of selectedCommands) {
      try {
        const result = await runCommand(
          command.name,
          characterName,
          buildImageCommandContext(contextMessages, statusOverride),
          selectedModelId,
        );
        if (result.kind === "message") {
          autoMessages.push({ ...result.message, turnId });
        }
      } catch (error) {
        console.error(`[auto command] ${command.id} generation failed`, error);
      }
    }
    return autoMessages;
  };

  useEffect(() => {
    let cancelled = false;

    setMessages([]);
    setIsHistoryLoading(true);
    setIsLoadingOlderHistory(false);
    setIsHistoryPersistenceEnabled(false);
    setIsRestoredGenerationPending(false);
    setHistoryCursor(null);
    setHasOlderHistory(false);
    isLoadingOlderHistoryRef.current = false;
    latestMessageIdRef.current = null;
    persistedMessageFingerprintsRef.current.clear();
    pendingMessageFingerprintsRef.current.clear();
    historyErrorShownRef.current = false;

    const restoreHistory = async () => {
      try {
        const session = await getAdminSessionState();
        if (cancelled || !session.authenticated) return;
        if (session.accountId) {
          setGeneratedMediaUserId(session.accountId, session.username ? [session.username] : []);
          void syncGeneratedMediaWithServer(session.accountId).catch(() => undefined);
        }

        const page = await loadChatHistoryPage(
          chatId,
          undefined,
          characterName,
        );
        if (cancelled) return;

        for (const message of page.messages) {
          persistedMessageFingerprintsRef.current.set(
            message.id,
            getChatMessageFingerprint(message),
          );
        }
        setMessages(page.messages);
        const restoredPendingGeneration = page.messages.some(
          (message) => message.type === "ai" && message.status === "streaming",
        );
        setIsRestoredGenerationPending(restoredPendingGeneration);
        setIsTyping(restoredPendingGeneration);
        if (restoredPendingGeneration) {
          setTypingLabel("답변을 생성하는 중...");
          setTypingVariant("text");
        }
        setHistoryCursor(page.nextCursor);
        setHasOlderHistory(page.hasMore);
        setIsHistoryPersistenceEnabled(true);
      } catch (error) {
        if (!cancelled) reportHistoryError(error);
      } finally {
        if (!cancelled) setIsHistoryLoading(false);
      }
    };

    void restoreHistory();
    return () => {
      cancelled = true;
    };
  }, [characterName, chatId]);

  useEffect(() => {
    if (isHistoryLoading || !isRestoredGenerationPending) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const pollGeneration = async () => {
      try {
        const page = await loadChatHistoryPage(chatId, undefined, characterName);
        if (cancelled) return;
        const stillPending = page.messages.some(
          (message) => message.type === "ai" && message.status === "streaming",
        );
        if (stillPending) {
          pollTimer = setTimeout(() => void pollGeneration(), 2000);
          return;
        }

        for (const message of page.messages) {
          persistedMessageFingerprintsRef.current.set(
            message.id,
            getChatMessageFingerprint(message),
          );
        }
        setMessages(page.messages);
        setHistoryCursor(page.nextCursor);
        setHasOlderHistory(page.hasMore);
        setIsRestoredGenerationPending(false);
        setIsTyping(false);
        setTypingLabel(undefined);
        setTypingVariant("text");
      } catch {
        if (!cancelled) {
          pollTimer = setTimeout(() => void pollGeneration(), 3000);
        }
      }
    };

    setIsTyping(true);
    setTypingLabel((current) => current || "답변을 생성하는 중...");
    pollTimer = setTimeout(() => void pollGeneration(), 1000);
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [
    characterName,
    chatId,
    isHistoryLoading,
    isRestoredGenerationPending,
  ]);

  useEffect(() => {
    if (!isHistoryPersistenceEnabled || isHistoryLoading) return;

    const changedMessages = messages.filter((message) => {
      if (!isPersistableChatMessage(message)) return false;
      const fingerprint = getChatMessageFingerprint(message);
      return (
        persistedMessageFingerprintsRef.current.get(message.id) !==
          fingerprint &&
        pendingMessageFingerprintsRef.current.get(message.id) !== fingerprint
      );
    });
    if (changedMessages.length === 0) return;

    const snapshots = changedMessages.map((message) => ({
      message,
      fingerprint: getChatMessageFingerprint(message),
    }));
    for (const { message, fingerprint } of snapshots) {
      pendingMessageFingerprintsRef.current.set(message.id, fingerprint);
    }
    enqueueHistoryOperation(async () => {
      try {
        await saveChatMessages(
          chatId,
          snapshots.map(({ message }) => message),
          characterName,
        );
        for (const { message, fingerprint } of snapshots) {
          if (
            pendingMessageFingerprintsRef.current.get(message.id) !==
            fingerprint
          )
            continue;
          persistedMessageFingerprintsRef.current.set(message.id, fingerprint);
          pendingMessageFingerprintsRef.current.delete(message.id);
        }
      } catch (error) {
        for (const { message, fingerprint } of snapshots) {
          if (
            pendingMessageFingerprintsRef.current.get(message.id) ===
            fingerprint
          ) {
            pendingMessageFingerprintsRef.current.delete(message.id);
          }
        }
        throw error;
      }
    });
  }, [
    characterName,
    chatId,
    isHistoryLoading,
    isHistoryPersistenceEnabled,
    messages,
  ]);

  const loadOlderHistory = async () => {
    if (
      !isHistoryPersistenceEnabled ||
      !hasOlderHistory ||
      !historyCursor ||
      isLoadingOlderHistoryRef.current
    )
      return;

    const container = scrollContainerRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;
    isLoadingOlderHistoryRef.current = true;
    setIsLoadingOlderHistory(true);

    try {
      const page = await loadChatHistoryPage(
        chatId,
        historyCursor,
        characterName,
      );
      for (const message of page.messages) {
        persistedMessageFingerprintsRef.current.set(
          message.id,
          getChatMessageFingerprint(message),
        );
      }
      setMessages((current) => {
        const existingIds = new Set(current.map((message) => message.id));
        const olderMessages = page.messages.filter(
          (message) => !existingIds.has(message.id),
        );
        return [...olderMessages, ...current];
      });
      setHistoryCursor(page.nextCursor);
      setHasOlderHistory(page.hasMore);

      window.requestAnimationFrame(() => {
        const nextContainer = scrollContainerRef.current;
        if (!nextContainer) return;
        nextContainer.scrollTop =
          previousScrollTop +
          (nextContainer.scrollHeight - previousScrollHeight);
      });
    } catch (error) {
      reportHistoryError(error);
    } finally {
      isLoadingOlderHistoryRef.current = false;
      setIsLoadingOlderHistory(false);
    }
  };

  const loadAllHistoryForSearch = async () => {
    let combinedMessages = messages;
    let nextCursor = historyCursor;
    const visitedCursors = new Set<string>();

    if (
      !isHistoryPersistenceEnabled ||
      !hasOlderHistory ||
      !nextCursor ||
      isLoadingOlderHistoryRef.current
    ) {
      return combinedMessages;
    }

    isLoadingOlderHistoryRef.current = true;
    setIsLoadingOlderHistory(true);

    try {
      while (nextCursor) {
        if (visitedCursors.has(nextCursor)) break;
        visitedCursors.add(nextCursor);
        const page = await loadChatHistoryPage(
          chatId,
          nextCursor,
          characterName,
        );
        for (const message of page.messages) {
          persistedMessageFingerprintsRef.current.set(
            message.id,
            getChatMessageFingerprint(message),
          );
        }

        const existingIds = new Set(
          combinedMessages.map((message) => message.id),
        );
        const olderMessages = page.messages.filter(
          (message) => !existingIds.has(message.id),
        );
        combinedMessages = [...olderMessages, ...combinedMessages];
        nextCursor = page.hasMore ? page.nextCursor : null;
      }

      setMessages(combinedMessages);
      setHistoryCursor(null);
      setHasOlderHistory(false);
      return combinedMessages;
    } catch (error) {
      reportHistoryError(error);
      setMessages(combinedMessages);
      return combinedMessages;
    } finally {
      isLoadingOlderHistoryRef.current = false;
      setIsLoadingOlderHistory(false);
    }
  };

  const handleSearchOpen = () => {
    setIsSearchOpen(true);
    setIsStatusPanelOpen(false);
    setIsSettingsOpen(false);
    setIsModelDrawerOpen(false);
  };

  const handleSearchClose = () => {
    searchRequestIdRef.current += 1;
    setIsSearchOpen(false);
    setSearchInput("");
    setSearchQuery("");
    setActiveSearchResultIndex(-1);
    setIsSearchBusy(false);
  };

  const handleSearchSubmit = async () => {
    const normalizedQuery = normalizeChatSearchQuery(searchInput);
    if (!normalizedQuery) {
      setSearchQuery("");
      setActiveSearchResultIndex(-1);
      return;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setIsSearchBusy(true);
    try {
      const searchableMessages = await loadAllHistoryForSearch();
      if (requestId !== searchRequestIdRef.current) return;
      const resultIds = findChatSearchResultIds(
        searchableMessages,
        normalizedQuery,
      );
      setSearchInput(normalizedQuery);
      setSearchQuery(normalizedQuery);
      setActiveSearchResultIndex(resultIds.length - 1);
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setIsSearchBusy(false);
      }
    }
  };

  const moveSearchResult = (direction: "older" | "newer") => {
    setActiveSearchResultIndex((current) => {
      if (searchResultIds.length === 0) return -1;
      const offset = direction === "older" ? -1 : 1;
      return Math.min(
        searchResultIds.length - 1,
        Math.max(0, current + offset),
      );
    });
  };

  useEffect(() => {
    if (!isSearchOpen || !activeSearchMessageId) return;

    const frame = window.requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const target = Array.from(
        container.querySelectorAll<HTMLElement>("[data-chat-message-id]"),
      ).find(
        (element) =>
          element.dataset.chatMessageId === activeSearchMessageId,
      );
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeSearchMessageId, isSearchOpen, messages.length]);

  useEffect(() => {
    if (!searchQuery) return;
    setActiveSearchResultIndex((current) => {
      if (searchResultIds.length === 0) return -1;
      return Math.min(Math.max(current, 0), searchResultIds.length - 1);
    });
  }, [searchQuery, searchResultIds.length]);

  useEffect(() => {
    const latestMessageId = messages.at(-1)?.id ?? null;
    const hasNewLatestMessage = latestMessageId !== latestMessageIdRef.current;
    if (
      !isSearchOpen &&
      (isTyping || hasNewLatestMessage) &&
      !isLoadingOlderHistoryRef.current
    ) {
      scrollToBottom(latestMessageIdRef.current ? "smooth" : "auto");
    }
    latestMessageIdRef.current = latestMessageId;
  }, [messages, isTyping, isSearchOpen]);

  useEffect(() => {
    searchRequestIdRef.current += 1;
    setIsSearchOpen(false);
    setSearchInput("");
    setSearchQuery("");
    setActiveSearchResultIndex(-1);
    setIsSearchBusy(false);
    const savedTheme = localStorage.getItem(
      `chat-theme-${chatId}`,
    ) as ChatThemeId;
    setChatTheme(savedTheme || "system");
    setReadingSettings(getChatReadingSettings(chatId));
    setSelectedModelId(getChatModelId(chatId));
    setRuntimeStoryStatus({});
  }, [chatId]);

  useEffect(() => {
    const syncModel = () => setSelectedModelId(getChatModelId(chatId));
    window.addEventListener("storage", syncModel);
    window.addEventListener("storychat-chat-model-updated", syncModel);
    return () => {
      window.removeEventListener("storage", syncModel);
      window.removeEventListener("storychat-chat-model-updated", syncModel);
    };
  }, [chatId]);

  const handleModelChange = (modelId: ChatModelId) => {
    setSelectedModelId(modelId);
    saveChatModelId(chatId, modelId);
  };

  const showModelCreditShortage = () => {
    const lowestCostModel = CHAT_MODELS.reduce((lowest, model) =>
      model.creditCostPerReply < lowest.creditCostPerReply ? model : lowest,
    );
    const canSwitchToLowerCostModel =
      selectedModel.id !== lowestCostModel.id &&
      credits >= lowestCostModel.creditCostPerReply;

    toast.error(
      `크레딧이 부족해 ${selectedModel.label} 모델을 사용할 수 없어요.`,
      {
        description: canSwitchToLowerCostModel
          ? `${lowestCostModel.label} 모델로 전환하거나 크레딧을 충전해 주세요.`
          : "크레딧을 충전해 주세요.",
        action: canSwitchToLowerCostModel
          ? {
              label: `${lowestCostModel.label}로 전환`,
              onClick: () => handleModelChange(lowestCostModel.id),
            }
          : {
              label: "충전하기",
              onClick: () => {
                router.push(
                  withReturnTo(
                    "/credits",
                    `/chat/${encodeURIComponent(chatId)}`,
                  ),
                );
              },
            },
      },
    );
  };

  useEffect(() => {
    const syncChatMeta = () => {
      setChatMeta(getChatList().find((chat) => chat.id === chatId) ?? null);
      setLibrary(getStoryChatLibrary());
    };
    syncChatMeta();
    void syncStoryWorksFromDatabase()
      .then(setLibrary)
      .catch((error) => console.warn("[story works sync failed]", error));
    window.addEventListener("storage", syncChatMeta);
    window.addEventListener("storychat-chats-updated", syncChatMeta);
    window.addEventListener("storychat-library-updated", syncChatMeta);
    return () => {
      window.removeEventListener("storage", syncChatMeta);
      window.removeEventListener("storychat-chats-updated", syncChatMeta);
      window.removeEventListener("storychat-library-updated", syncChatMeta);
    };
  }, [chatId]);

  useEffect(() => {
    let cancelled = false;

    void ensureChatRoom(chatId, characterName)
      .then((room) => {
        if (cancelled || !room) return;
        const chats = getChatList();
        const nextChats = chats.map((chat) =>
          chat.id === chatId ? { ...chat, roomName: room.roomName } : chat,
        );
        saveChatList(nextChats);
        setChatMeta((current) =>
          current ? { ...current, roomName: room.roomName } : current,
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [characterName, chatId]);

  // --- Core send flow (uses chat-engine; easy to swap for real API) ---
  const handleSendMessage = async (
    content: string,
    mentions?: string[],
    image?: { url: string; name?: string },
    options?: { autoAdvance?: boolean },
  ) => {
    const displayContent = content.trim();
    const isAutoAdvance = options?.autoAdvance === true && !image;
    const hasAutoAdvanceDirective = isAutoAdvance && Boolean(displayContent);
    if (!displayContent && !image && !isAutoAdvance) return;
    const parsedInputs =
      isAutoAdvance && !hasAutoAdvanceDirective
        ? []
        : parseChatInputSegments(displayContent, chatInputCharacters, mentions);
    if (
      parsedInputs.some(
        (input) => input.kind === "character_line" && input.isEmptyLine,
      )
    ) {
      toast.error("대사 내용을 입력하세요.");
      return;
    }

    const replyCreditCost = selectedModel.creditCostPerReply;
    if (credits < replyCreditCost) {
      showModelCreditShortage();
      return;
    }

    const confirmedMessages = finalizeMessageCandidates(messages);
    const turnId = makeTurnId();
    const userMessages =
      isAutoAdvance && !hasAutoAdvanceDirective
        ? []
        : buildUserMessages(
            displayContent,
            chatInputCharacters,
            mentions,
            image,
          ).map((message) => ({
            ...message,
            ...(!message.isUserAuthoredCharacterLine
              ? {
                  originalContent: buildModelContentFromUserInput(
                    message.content,
                  ),
                }
              : {}),
            turnId,
            status: "completed" as const,
            ...(isAutoAdvance ? { isAutoAdvance: true } : {}),
          }));
    const latestUserMessage = userMessages.at(-1);
    const modelContent = isAutoAdvance
      ? displayContent || AUTO_ADVANCE_MODEL_CONTENT
      : latestUserMessage?.originalContent ||
        latestUserMessage?.content ||
        displayContent;
    const openingMessageId = selectedIntroScenario
      ? `intro-${chatId}-${selectedIntroScenario.id}`
      : "";
    const openingContent =
      confirmedMessages.length === 0
        ? selectedIntroScenario?.firstMessage?.trim()
        : "";
    const openingMessage: ChatMessage | null = openingContent
      ? {
          id: openingMessageId,
          type: "ai",
          content: openingContent,
          timestamp: new Date(),
          status: "completed",
          speakerId: currentCharacter?.id,
          speakerName: characterName,
        }
      : null;
    const historyBeforeUser = openingMessage
      ? [openingMessage]
      : confirmedMessages;
    const generationHistory =
      userMessages.length > 0
        ? [...historyBeforeUser, ...userMessages]
        : historyBeforeUser;
    const openingIsInHistory = Boolean(
      openingMessageId &&
      historyBeforeUser.some((message) => message.id === openingMessageId),
    );
    const generationIntro =
      openingIsInHistory && selectedIntroScenario
        ? { ...selectedIntroScenario, firstMessage: undefined }
        : selectedIntroScenario;
    const characterMessageId = `assistant-${turnId}`;
    const streamingMessage: ChatMessage = {
      id: characterMessageId,
      type: "ai",
      content: "",
      timestamp: new Date(),
      status: "streaming",
      speakerId: currentCharacter?.id,
      speakerName: characterName,
      turnId,
      isAutoAdvance,
    };
    const handleStreamEvent = (event: ChatStreamEvent) => {
      if (event.event_type === "phase") {
        setTypingLabel(event.phase_label);
        if (process.env.NODE_ENV !== "production") {
          console.debug("[generation phase]", {
            runId: event.run_id,
            phase: event.phase,
            elapsedMs: event.elapsed_ms,
          });
        }
        return;
      }
      if (event.event_type === "raw_delta") return;

      setMessages((prev) =>
        prev.map((message) => {
          if (message.id !== characterMessageId) return message;
          if (event.is_final_event) {
            const savedContent = event.saved_content ?? message.content;
            if (event.mismatch && process.env.NODE_ENV !== "production") {
              console.debug("[generation stream mismatch]", {
                runId: event.run_id,
                streamedContentLength: message.content.length,
                savedContentLength: savedContent.length,
              });
            }

            return {
              ...message,
              id: event.message_id || message.id,
              content: savedContent,
              status: event.status === "failed" ? "failed" : "completed",
              generationRunId: event.run_id,
              provider: event.provider,
              model: event.model,
              attemptedModel: event.attempted_model,
              outputModel: event.output_model ?? undefined,
              validationStatus: event.validation_status,
              validationFailures: event.validation_failures,
              validationAttempts: event.validation_attempts,
              repairAttempted: event.repair_attempted,
              fallback: event.fallback,
              fallbackProvider: event.fallback_provider,
              fallbackModel: event.fallback_model,
              providerOutcome: event.provider_outcome,
              timeoutStage: event.timeout_stage,
              geminiErrorCode: event.gemini_error_code,
              geminiErrorStatus: event.gemini_error_status,
              generationErrorCode: event.generation_error_code,
              generationErrorStatus: event.generation_error_status,
              generationErrorMessage:
                event.generation_error_message ?? event.error,
              savedContent,
              streamedContent: message.content,
            };
          }

          return {
            ...message,
            content: `${message.content}${event.content ?? ""}`,
            status: "streaming",
          };
        }),
      );
    };
    setMessages((prev) => {
      const confirmedPreviousMessages = finalizeMessageCandidates(prev);
      return [
        ...(confirmedPreviousMessages.length === 0 && openingMessage
          ? [openingMessage]
          : confirmedPreviousMessages),
        ...userMessages,
        streamingMessage,
      ];
    });
    setIsTyping(true);
    setTypingLabel(isAutoAdvance ? "스토리를 이어가는 중..." : undefined);
    setTypingVariant("text");
    const autoCommandIds = readingSettings.selectedCommandIds.filter((id) =>
      AUTO_COMMAND_IDS.includes(id),
    );
    const plannedDialogueAssistChars = getDialogueAssistCharCount(
      autoCommandIds,
      characterName,
      buildImageCommandContext(generationHistory),
    );
    const answerLength = getAssistantReplyLengthBudget(
      plannedDialogueAssistChars,
    );

    try {
      const reply = {
        ...(await generateAssistantReply(
          generationHistory,
          modelContent,
          generationIntro,
          buildImageCommandContext(generationHistory),
          selectedModelId,
          {
            roomId: chatId,
            userMessageId: latestUserMessage?.id,
            userMessageContent: latestUserMessage?.content,
            userMessageTimestamp: latestUserMessage?.timestamp.toISOString(),
            characterMessageId,
            bypassRoleplayRules: readingSettings.testBypassRoleplayRules,
            debugRawRoleplayStream: readingSettings.testRawRoleplayStream,
            autoAdvance: isAutoAdvance,
            autoAdvanceDirective: hasAutoAdvanceDirective
              ? displayContent
              : undefined,
            answerLength,
            onStreamEvent: handleStreamEvent,
          },
        )),
        turnId,
        isAutoAdvance,
      };
      if (isAutoAdvance) {
        rejectDuplicateAssistantResponse(
          reply.content,
          getLatestAssistantContent(generationHistory),
        );
      }
      if (
        !spendCredit(
          replyCreditCost,
          "채팅 답변 생성",
          `${selectedModel.label} 모델 답변`,
        )
      ) {
        throw new Error("Insufficient reply credits");
      }
      const nextRuntimeStatus = buildNextRuntimeStatus({
        baseStatus: baseChatStoryStatus,
        previousStatus: runtimeStoryStatus,
        userContent: displayContent,
        replyContent: reply.content,
      });
      const nextChatStoryStatus = {
        ...chatStoryStatus,
        ...nextRuntimeStatus,
      };
      setRuntimeStoryStatus(nextRuntimeStatus);

      const autoCommandMessages = await buildAutoCommandMessages({
        turnId,
        contextMessages: [...generationHistory, reply],
        statusOverride: nextChatStoryStatus,
        commandIds: autoCommandIds,
      });
      const fittedReplyContent = fitAssistantReplyToTurnBudget(
        reply.content,
        getMessageContentCharCount(autoCommandMessages),
      );
      const finalReply =
        fittedReplyContent === reply.content
          ? reply
          : {
              ...reply,
              content: fittedReplyContent,
              savedContent: fittedReplyContent,
            };
      const contextMessages = [
        ...generationHistory,
        finalReply,
        ...autoCommandMessages,
      ];
      const shouldGenerateAutoImage = shouldAutoGenerateImage(
        chatId,
        displayContent,
        reply.content,
        nextChatStoryStatus,
      );
      let autoImageMessage: ChatMessage | null = null;
      if (shouldGenerateAutoImage) {
        setTypingLabel("주요 장면 이미지 생성중...");
        setTypingVariant("image");
        autoImageMessage = await buildGeneratedImageMessage({
          turnId,
          contextMessages,
          statusOverride: nextChatStoryStatus,
          titleSuffix: "주요 장면",
        });
        if (autoImageMessage) incrementAutoImageCount(chatId);
      }

      setMessages((prev) => [
        ...prev.map((message) =>
          message.id === characterMessageId ? finalReply : message,
        ),
        ...autoCommandMessages,
        ...(autoImageMessage ? [autoImageMessage] : []),
      ]);
    } catch (error) {
      const errorText =
        error instanceof Error ? error.message : "응답을 가져오지 못했어요.";
      const errorMessage: ChatMessage = {
        id: characterMessageId,
        type: "status",
        content: `${errorText}\n다시 생성할 수 있습니다.`,
        timestamp: new Date(),
        status: "failed",
        turnId,
        isAutoAdvance,
        isGenerationError: true,
        retryPayload: {
          content,
          mentions,
          image,
          turnId,
          autoAdvance: isAutoAdvance,
        },
      };
      setMessages((prev) =>
        prev.some((message) => message.id === characterMessageId)
          ? prev.map((message) =>
              message.id === characterMessageId
                ? { ...message, ...errorMessage }
                : message,
            )
          : [...prev, errorMessage],
      );
      toast.error(errorText);
    } finally {
      setIsTyping(false);
      setTypingLabel(undefined);
      setTypingVariant("text");
    }
  };

  const handleRetryFailedMessage = async (messageId: string) => {
    const failedMessageIndex = messages.findIndex(
      (message) => message.id === messageId,
    );
    const failedMessage = messages[failedMessageIndex];
    const retryPayload = failedMessage?.retryPayload;
    if (!failedMessage || !retryPayload) return;

    const retryIsAutoAdvance = isAutoAdvanceTurn(failedMessage, messages);
    const retryIsRegeneration = Boolean(
      retryPayload.regenerationAvoidContent?.trim(),
    );
    // Retry the conversation as it existed immediately before this failure.
    // Looking through the entire current history can select a later user turn;
    // trusting a persisted turn id alone can select an older edited version.
    const retryMessages =
      failedMessageIndex >= 0
        ? messages.slice(0, failedMessageIndex)
        : messages.filter((message) => message.id !== messageId);
    const payloadTurnId = retryPayload.turnId || failedMessage.turnId;
    const retrySourceUserMessage =
      retryMessages.findLast(
        (message) =>
          message.type === "user" &&
          message.turnId === payloadTurnId &&
          message.content.trim(),
      ) ??
      retryMessages.findLast(
        (message) => message.type === "user" && message.content.trim(),
      );
    const retryTurnId = retryIsAutoAdvance
      ? payloadTurnId || makeTurnId()
      : retrySourceUserMessage?.turnId || payloadTurnId || makeTurnId();
    const retryUserContent =
      retrySourceUserMessage?.content.trim() || retryPayload.content;
    const retryModelContent = retryIsAutoAdvance
      ? retryUserContent || AUTO_ADVANCE_MODEL_CONTENT
      : retryUserContent;
    const refreshedRetryPayload = {
      ...retryPayload,
      content: retryUserContent,
      turnId: retryTurnId,
    };
    const characterMessageId = `assistant-${retryTurnId}`;
    const streamingMessage: ChatMessage = {
      id: characterMessageId,
      type: "ai",
      content: "",
      timestamp: new Date(),
      status: "streaming",
      speakerId: currentCharacter?.id,
      speakerName: characterName,
      turnId: retryTurnId,
      isAutoAdvance: retryIsAutoAdvance,
    };
    const handleStreamEvent = (event: ChatStreamEvent) => {
      if (event.event_type === "phase") {
        setTypingLabel(
          retryIsRegeneration ? "답변 재생성 중" : event.phase_label,
        );
        if (process.env.NODE_ENV !== "production") {
          console.debug("[generation phase]", {
            runId: event.run_id,
            phase: event.phase,
            elapsedMs: event.elapsed_ms,
          });
        }
      }
    };
    setMessages([...retryMessages, streamingMessage]);
    setRegeneratingMessageId(characterMessageId);
    setIsTyping(true);
    setTypingLabel(
      retryIsRegeneration
        ? "답변 재생성 중"
        : retryIsAutoAdvance
          ? "스토리를 이어가는 중..."
          : undefined,
    );
    setTypingVariant("text");
    const autoCommandIds = readingSettings.selectedCommandIds.filter((id) =>
      AUTO_COMMAND_IDS.includes(id),
    );
    const plannedDialogueAssistChars = getDialogueAssistCharCount(
      autoCommandIds,
      characterName,
      buildImageCommandContext(retryMessages),
    );
    const answerLength = getAssistantReplyLengthBudget(
      plannedDialogueAssistChars,
    );

    try {
      const retryCreditCost = selectedModel.creditCostPerReply;
      if (retryCreditCost > 0 && credits < retryCreditCost) {
        showModelCreditShortage();
        setMessages([...retryMessages, failedMessage]);
        return;
      }

      const reply = {
        ...(await generateAssistantReply(
          retryMessages,
          retryModelContent,
          selectedIntroScenario,
          buildImageCommandContext(retryMessages),
          selectedModelId,
          {
            roomId: chatId,
            userMessageId: retryIsAutoAdvance
              ? undefined
              : retrySourceUserMessage?.id,
            characterMessageId,
            bypassRoleplayRules: readingSettings.testBypassRoleplayRules,
            debugRawRoleplayStream: readingSettings.testRawRoleplayStream,
            autoAdvance: retryIsAutoAdvance,
            autoAdvanceDirective:
              retryIsAutoAdvance &&
              retryUserContent !== AUTO_ADVANCE_MODEL_CONTENT
                ? retryUserContent
                : undefined,
            retryAttempt: true,
            regenerationAvoidContent: retryPayload.regenerationAvoidContent,
            answerLength,
            onStreamEvent: handleStreamEvent,
          },
        )),
        turnId: retryTurnId,
        isAutoAdvance: retryIsAutoAdvance,
      };
      const retryDuplicateReference =
        retryPayload.regenerationAvoidContent ||
        (retryIsAutoAdvance ? getLatestAssistantContent(retryMessages) : "");
      rejectDuplicateAssistantResponse(reply.content, retryDuplicateReference);
      if (
        retryCreditCost > 0 &&
        !spendCredit(
          retryCreditCost,
          "답변 재생성",
          `${selectedModel.label} 모델 재생성`,
        )
      ) {
        throw new Error("Insufficient model credits");
      }
      const nextRuntimeStatus = buildNextRuntimeStatus({
        baseStatus: baseChatStoryStatus,
        previousStatus: runtimeStoryStatus,
        userContent: retryIsAutoAdvance ? "" : retryUserContent,
        replyContent: reply.content,
      });
      const nextChatStoryStatus = {
        ...chatStoryStatus,
        ...nextRuntimeStatus,
      };
      setRuntimeStoryStatus(nextRuntimeStatus);

      const autoCommandMessages = await buildAutoCommandMessages({
        turnId: retryTurnId,
        contextMessages: [...retryMessages, reply],
        statusOverride: nextChatStoryStatus,
        commandIds: autoCommandIds,
      });
      const fittedReplyContent = fitAssistantReplyToTurnBudget(
        reply.content,
        getMessageContentCharCount(autoCommandMessages),
      );
      const finalReply =
        fittedReplyContent === reply.content
          ? reply
          : {
              ...reply,
              content: fittedReplyContent,
              savedContent: fittedReplyContent,
            };
      const contextMessages = [
        ...retryMessages,
        finalReply,
        ...autoCommandMessages,
      ];
      const shouldGenerateAutoImage = shouldAutoGenerateImage(
        chatId,
        retryUserContent,
        reply.content,
        nextChatStoryStatus,
      );
      let autoImageMessage: ChatMessage | null = null;
      if (shouldGenerateAutoImage) {
        setTypingLabel("주요 장면 이미지 생성중...");
        setTypingVariant("image");
        autoImageMessage = await buildGeneratedImageMessage({
          turnId: retryTurnId,
          contextMessages,
          statusOverride: nextChatStoryStatus,
          titleSuffix: "주요 장면",
        });
        if (autoImageMessage) incrementAutoImageCount(chatId);
      }

      setMessages((prev) => [
        ...prev.map((message) =>
          message.id === characterMessageId ? finalReply : message,
        ),
        ...autoCommandMessages,
        ...(autoImageMessage ? [autoImageMessage] : []),
      ]);
    } catch (error) {
      const errorText =
        error instanceof Error ? error.message : "다시 생성하지 못했어요.";
      const failureContent = retryIsRegeneration
        ? `새 답변을 채택하지 않았어요.\n${errorText}\n다시 생성할 수 있습니다.`
        : `${errorText}\n다시 생성할 수 있습니다.`;
      setMessages((prev) =>
        prev.some((message) => message.id === characterMessageId)
          ? prev.map((message) =>
              message.id === characterMessageId
                ? {
                    ...failedMessage,
                    ...message,
                    type: "status",
                    content: failureContent,
                    timestamp: new Date(),
                    turnId: failedMessage.turnId,
                    isGenerationError: true,
                    generationErrorMessage:
                      message.generationErrorMessage || errorText,
                    retryPayload: refreshedRetryPayload,
                    status: "failed",
                  }
                : message,
            )
          : [
              ...prev,
              {
                ...failedMessage,
                type: "status",
                content: failureContent,
                timestamp: new Date(),
                isGenerationError: true,
                generationErrorMessage: errorText,
                retryPayload: refreshedRetryPayload,
                status: "failed",
              },
            ],
      );
      toast.error(errorText);
    } finally {
      setRegeneratingMessageId(null);
      setIsTyping(false);
      setTypingLabel(undefined);
      setTypingVariant("text");
    }
  };

  const handleCommand = async (command: string) => {
    const normalizedCommand = command.replace(/^\//, "").trim();
    const isImageCommand = normalizedCommand === "이미지";
    const commandId = getTextCommandId(normalizedCommand);
    const commandLoadingLabel = getCommandLoadingLabel(
      normalizedCommand,
      characterName,
    );
    const userId = getCurrentUserId();
    const usage = getImageGenerationUsage(userId);
    const shouldUseFreeImage =
      isImageCommand &&
      usage.freeImageGenerationsUsed < FREE_IMAGE_GENERATION_LIMIT;
    const shouldUsePaidImage = isImageCommand && !shouldUseFreeImage;
    if (shouldUsePaidImage && credits < IMAGE_GENERATION_CREDIT_COST) {
      setIsImageLimitModalOpen(true);
      return;
    }

    setIsTyping(true);
    setTypingLabel(commandLoadingLabel);
    setTypingVariant(isImageCommand ? "image" : "command");

    try {
      const startedAt = Date.now();
      const turnId = makeTurnId();
      const result = await runCommand(
        command,
        characterName,
        buildImageCommandContext(),
        selectedModelId,
      );
      const minimumLoadingDuration = isImageCommand ? 1400 : 450;
      const remainingDelay = Math.max(
        0,
        minimumLoadingDuration - (Date.now() - startedAt),
      );
      if (remainingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      }

      if (result.kind === "toast") {
        toast(result.message);
        return;
      }
      let nextMessage = { ...result.message, turnId };
      if (isImageCommand && nextMessage.imageUrl) {
        const media = saveGeneratedMedia({
          imageUrl: nextMessage.imageUrl,
          prompt: nextMessage.originalContent || "",
          provider: getGeneratedImageProvider(nextMessage),
          workId: currentWork?.id,
          chatId,
          characterId: currentCharacter?.id,
          userId,
          messageId: nextMessage.id,
          title: `${characterName} 생성 이미지`,
        });
        nextMessage = { ...nextMessage, mediaId: media.id };
        attachMediaToMessage(nextMessage.id, media.id);
        if (shouldUseFreeImage) {
          incrementFreeImageGenerationUsage(userId);
        } else {
          if (
            !spendCredit(
              IMAGE_GENERATION_CREDIT_COST,
              "이미지 생성",
              `${characterName} 이미지 명령어`,
            )
          ) {
            throw new Error("Insufficient credits");
          }
          chargeImageGenerationCredit(userId);
        }
        toast.success(
          shouldUseFreeImage
            ? "무료 이미지 생성 1회를 사용했어요."
            : "크레딧으로 이미지를 생성했어요.",
        );
      }
      setMessages((prev) => [...prev, nextMessage]);
    } catch (error) {
      console.error(`[command] ${normalizedCommand} generation failed`, error);
      const generationErrorMessage =
        error instanceof Error ? error.message : "명령어 생성에 실패했습니다.";
      const errorMessage: ChatMessage = {
        id: `command-error-${Date.now()}`,
        type: isImageCommand ? "status_img" : "status",
        commandId,
        content: getCommandGenerationErrorContent(normalizedCommand),
        timestamp: new Date(),
        status: "failed",
        isGenerationError: Boolean(commandId),
        generationErrorMessage,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setTypingLabel(undefined);
      setTypingVariant("text");
    }
  };

  // Author tools handlers
  const handleRewriteMessage = async (messageId: string) => {
    const targetIndex = messages.findIndex(
      (message) => message.id === messageId,
    );
    const targetMessage = messages[targetIndex];
    if (targetIndex < 0 || !targetMessage) return;

    const targetCommandId =
      targetMessage.commandId ?? (targetMessage.imageUrl ? "image" : undefined);
    if (targetCommandId) {
      const commandName = COMMAND_NAME_BY_ID[targetCommandId];
      const isImageCommand = targetCommandId === "image";
      if (!commandName) {
        toast.error("다시 생성할 명령어를 찾지 못했어요.");
        return;
      }

      setIsTyping(true);
      setTypingLabel(getCommandLoadingLabel(commandName, characterName));
      setTypingVariant(isImageCommand ? "image" : "command");
      setRegeneratingMessageId(messageId);

      try {
        const result = await runCommand(
          commandName,
          characterName,
          buildImageCommandContext(messages.slice(0, targetIndex)),
          selectedModelId,
        );
        if (result.kind !== "message") {
          toast(result.message);
          return;
        }
        if (isImageCommand && !result.message.imageUrl) {
          throw new Error("이미지 재생성 결과가 올바르지 않습니다.");
        }

        let regeneratedMessage = result.message;
        if (isImageCommand && result.message.imageUrl) {
          const userId = getCurrentUserId();
          const media = saveGeneratedMedia({
            imageUrl: result.message.imageUrl,
            prompt: result.message.originalContent || "",
            provider: getGeneratedImageProvider(result.message),
            workId: currentWork?.id,
            chatId,
            characterId: currentCharacter?.id,
            userId,
            messageId,
            title: `${characterName} 무료 재생성 이미지`,
          });
          regeneratedMessage = { ...result.message, mediaId: media.id };
          attachMediaToMessage(messageId, media.id);
          if (targetMessage.mediaId && targetMessage.mediaId !== media.id) {
            deleteGeneratedMedia(targetMessage.mediaId);
          }
        }

        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  ...regeneratedMessage,
                  id: message.id,
                  turnId: message.turnId,
                  commandId: targetCommandId,
                  timestamp: new Date(),
                  status: "completed",
                  isGenerationError: false,
                  retryPayload: undefined,
                  generationErrorMessage: undefined,
                }
              : message,
          ),
        );
        setEditedMessageIds((prev) => new Set(prev).add(messageId));
        toast.success(
          isImageCommand
            ? "이미지를 무료로 다시 생성했어요."
            : "명령어 메시지를 다시 생성했어요.",
        );
      } catch (error) {
        const errorText =
          error instanceof Error
            ? error.message
            : "명령어 메시지를 다시 생성하지 못했어요.";
        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  type: isImageCommand ? "status_img" : "status",
                  content: getCommandGenerationErrorContent(commandName),
                  status: "failed",
                  isGenerationError: true,
                  generationErrorMessage: errorText,
                  timestamp: new Date(),
                }
              : message,
          ),
        );
        toast.error("명령어 메시지를 다시 생성하지 못했어요.");
      } finally {
        setRegeneratingMessageId(null);
        setIsTyping(false);
        setTypingLabel(undefined);
        setTypingVariant("text");
      }
      return;
    }

    if (targetMessage.type !== "ai") return;

    const isAutoAdvanceRewrite = isAutoAdvanceTurn(targetMessage, messages);
    const turnMessages = targetMessage.turnId
      ? messages.filter((message) => message.turnId === targetMessage.turnId)
      : [];
    const messagesBeforeTarget = messages.slice(0, targetIndex);
    const sourceUserMessage =
      messagesBeforeTarget.findLast(
        (message) =>
          message.type === "user" &&
          message.turnId === targetMessage.turnId &&
          message.content.trim(),
      ) ??
      (isAutoAdvanceRewrite
        ? undefined
        : messagesBeforeTarget.findLast(
            (message) => message.type === "user" && message.content.trim(),
          ));
    const userContent = isAutoAdvanceRewrite
      ? sourceUserMessage?.content.trim() || AUTO_ADVANCE_MODEL_CONTENT
      : (sourceUserMessage?.content || "").trim();
    if (!userContent) {
      toast.error("다시 생성할 사용자 메시지를 찾지 못했어요.");
      return;
    }

    const rewriteHistoryBase = messagesBeforeTarget;
    // Regeneration must not include the answer being replaced. Supplying the old
    // assistant message as context makes the model treat it as the preferred
    // continuation and often reproduce it verbatim.
    const rewriteHistory = rewriteHistoryBase;
    const rewriteCommandIds = [
      ...new Set(
        turnMessages
          .map((message) => message.commandId)
          .filter(
            (commandId): commandId is NonNullable<ChatMessage["commandId"]> =>
              Boolean(commandId && AUTO_COMMAND_IDS.includes(commandId)),
          ),
      ),
    ];
    const plannedDialogueAssistChars = getDialogueAssistCharCount(
      rewriteCommandIds,
      characterName,
      buildImageCommandContext(rewriteHistory),
    );
    const answerLength = getAssistantReplyLengthBudget(
      plannedDialogueAssistChars,
    );
    const handleRewriteStreamEvent = (event: ChatStreamEvent) => {
      if (event.event_type === "phase") {
        // 재생성 중에는 공급자 단계 문구가 재생성 상태를 덮어쓰지 않게 한다.
        setTypingLabel("답변 재생성 중");
      }
    };
    setRegeneratingMessageId(messageId);
    setIsTyping(true);
    setTypingLabel("답변 재생성 중");
    setTypingVariant("text");

    try {
      const regenerationAvoidContent =
        buildRegenerationAvoidContent(targetMessage);
      const rewrittenReply = await generateAssistantReply(
        rewriteHistory,
        userContent,
        selectedIntroScenario,
        buildImageCommandContext(rewriteHistory),
        selectedModelId,
        {
          roomId: chatId,
          bypassRoleplayRules: readingSettings.testBypassRoleplayRules,
          debugRawRoleplayStream: readingSettings.testRawRoleplayStream,
          onStreamEvent: handleRewriteStreamEvent,
          regenerationAvoidContent,
          autoAdvance: isAutoAdvanceRewrite,
          autoAdvanceDirective:
            isAutoAdvanceRewrite && userContent !== AUTO_ADVANCE_MODEL_CONTENT
              ? userContent
              : undefined,
          answerLength,
        },
      );
      const regeneratedAutoCommandMessages =
        rewriteCommandIds.length > 0 && targetMessage.turnId
          ? await buildAutoCommandMessages({
              turnId: targetMessage.turnId,
              contextMessages: [...rewriteHistory, rewrittenReply],
              statusOverride: chatStoryStatus,
              commandIds: rewriteCommandIds,
            })
          : [];
      const fittedRewriteContent = fitAssistantReplyToTurnBudget(
        rewrittenReply.content,
        getMessageContentCharCount(regeneratedAutoCommandMessages),
      );
      const finalRewrittenReply =
        fittedRewriteContent === rewrittenReply.content
          ? rewrittenReply
          : {
              ...rewrittenReply,
              content: fittedRewriteContent,
              savedContent: fittedRewriteContent,
            };
      for (const existingContent of getMessageCandidateContents(
        targetMessage,
      )) {
        rejectDuplicateAssistantResponse(
          finalRewrittenReply.content,
          existingContent,
        );
      }
      const regeneratedCommandsByMessageId = new Map(
        regeneratedAutoCommandMessages.flatMap((freshMessage) => {
          const existingMessage = turnMessages.find(
            (message) => message.commandId === freshMessage.commandId,
          );
          return existingMessage
            ? [
                [
                  existingMessage.id,
                  {
                    ...freshMessage,
                    id: existingMessage.id,
                    turnId: existingMessage.turnId,
                  },
                ] as const,
              ]
            : [];
        }),
      );
      const currentCompanionMessages = turnMessages.filter((message) =>
        Boolean(
          message.commandId && rewriteCommandIds.includes(message.commandId),
        ),
      );
      const generatedCompanionMessages = [
        ...regeneratedCommandsByMessageId.values(),
      ];

      setMessages((prev) => {
        const currentTarget = prev.find((message) => message.id === messageId);
        if (!currentTarget) return prev;

        const messageWithCandidate = appendMessageCandidate(
          {
            ...currentTarget,
            isAutoAdvance: isAutoAdvanceRewrite || currentTarget.isAutoAdvance,
          },
          finalRewrittenReply,
          {
            currentCompanionMessages,
            generatedCompanionMessages,
          },
        );
        const withCandidate = prev.map((message) =>
          message.id === messageId ? messageWithCandidate : message,
        );

        return selectMessageCandidate(
          withCandidate,
          messageId,
          messageWithCandidate.selectedCandidateId ?? "",
        );
      });
      setEditedMessageIds((prev) => new Set(prev).add(messageId));
      toast.success("새 전개를 추가했어요.");
    } catch (error) {
      const errorText =
        error instanceof Error ? error.message : "다시 작성하지 못했어요.";
      toast.error(errorText);
    } finally {
      setRegeneratingMessageId(null);
      setIsTyping(false);
      setTypingLabel(undefined);
      setTypingVariant("text");
    }
  };

  const handleRetryMessage = (messageId: string) => {
    const failedMessage = messages.find((message) => message.id === messageId);
    if (failedMessage?.commandId) {
      return handleRewriteMessage(messageId);
    }
    return handleRetryFailedMessage(messageId);
  };

  const handleSelectMessageCandidate = (
    messageId: string,
    candidateId: string,
  ) => {
    setMessages((prev) => selectMessageCandidate(prev, messageId, candidateId));
  };

  const handleEditMessage = async (messageId: string, nextContent: string) => {
    const trimmedContent = nextContent.trim();
    if (!trimmedContent) {
      toast.error("메시지를 비워둘 수 없어요.");
      return;
    }

    const confirmedMessages = finalizeMessageCandidates(messages);
    const targetMessage = confirmedMessages.find(
      (message) => message.id === messageId,
    );
    if (targetMessage?.imageUrl) {
      const userId = getCurrentUserId();
      const usage = getImageGenerationUsage(userId);
      const shouldUseFreeImage =
        usage.freeImageGenerationsUsed < FREE_IMAGE_GENERATION_LIMIT;
      if (!shouldUseFreeImage && credits < IMAGE_GENERATION_CREDIT_COST) {
        setIsImageLimitModalOpen(true);
        return;
      }

      setRegeneratingMessageId(messageId);
      setIsTyping(true);
      setTypingLabel("이미지 수정 중");
      setTypingVariant("image");

      try {
        const generatedImage = await generateFalImage(trimmedContent);
        const media = saveGeneratedMedia({
          imageUrl: generatedImage.imageUrl,
          prompt: trimmedContent,
          provider: generatedImage.provider,
          workId: currentWork?.id,
          chatId,
          characterId: currentCharacter?.id,
          userId,
          messageId: targetMessage.id,
          title: `${characterName} 수정 이미지`,
        });
        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  type: "status_img",
                  commandId: "image",
                  content: "",
                  originalContent: trimmedContent,
                  imageUrl: generatedImage.imageUrl,
                  imageName: `${characterName} AI 이미지.jpg`,
                  mediaId: media.id,
                  provider: generatedImage.provider,
                  model: generatedImage.model,
                  status: "completed",
                  isGenerationError: false,
                  generationErrorMessage: undefined,
                }
              : message,
          ),
        );
        attachMediaToMessage(targetMessage.id, media.id);
        if (targetMessage.mediaId && targetMessage.mediaId !== media.id) {
          deleteGeneratedMedia(targetMessage.mediaId);
        }
        if (shouldUseFreeImage) {
          incrementFreeImageGenerationUsage(userId);
        } else {
          if (
            !spendCredit(
              IMAGE_GENERATION_CREDIT_COST,
              "이미지 수정",
              `${characterName} 이미지 프롬프트 수정`,
            )
          ) {
            throw new Error("Insufficient credits");
          }
          chargeImageGenerationCredit(userId);
        }
        setEditedMessageIds((prev) => new Set(prev).add(messageId));
        toast.success("수정한 프롬프트로 이미지를 생성했어요.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "수정한 이미지 생성에 실패했어요.",
        );
      } finally {
        setRegeneratingMessageId(null);
        setIsTyping(false);
        setTypingLabel(undefined);
        setTypingVariant("text");
      }
      return;
    }

    const storedContent = targetMessage?.commandId
      ? formatEditedCommandContent(
          targetMessage.content,
          targetMessage.commandId,
          trimmedContent,
        )
      : trimmedContent;
    const shouldRegenerateImages = Boolean(
      targetMessage?.turnId &&
      confirmedMessages.some(
        (message) =>
          message.turnId === targetMessage.turnId && message.imageUrl,
      ),
    );
    const editedMessages = confirmedMessages.map((msg) => {
      if (msg.id !== messageId) return msg;

      if (msg.type === "user" && !msg.isUserAuthoredCharacterLine) {
        const nextModelContent = buildModelContentFromUserInput(trimmedContent);
        return {
          ...msg,
          content: trimmedContent,
          originalContent: nextModelContent,
        };
      }

      return { ...msg, content: storedContent };
    });

    setMessages(editedMessages);
    setEditedMessageIds((prev) => new Set(prev).add(messageId));

    if (shouldRegenerateImages && targetMessage?.turnId) {
      const userId = getCurrentUserId();
      const usage = getImageGenerationUsage(userId);
      const shouldUseFreeImage =
        usage.freeImageGenerationsUsed < FREE_IMAGE_GENERATION_LIMIT;
      if (!shouldUseFreeImage && credits < IMAGE_GENERATION_CREDIT_COST) {
        setIsImageLimitModalOpen(true);
        return;
      }

      setIsTyping(true);
      setTypingLabel("이미지 재생성중...");
      setTypingVariant("image");

      try {
        const result = await runCommand(
          "이미지",
          characterName,
          buildImageCommandContext(editedMessages),
          selectedModelId,
        );
        if (result.kind !== "message" || !result.message.imageUrl) {
          throw new Error("Image regeneration failed");
        }
        const media = saveGeneratedMedia({
          imageUrl: result.message.imageUrl,
          prompt: result.message.originalContent || "",
          provider: getGeneratedImageProvider(result.message),
          workId: currentWork?.id,
          chatId,
          characterId: currentCharacter?.id,
          userId,
          messageId: result.message.id,
          title: `${characterName} 재생성 이미지`,
        });
        setMessages((prev) =>
          prev.map((message) =>
            message.turnId === targetMessage.turnId && message.imageUrl
              ? {
                  ...message,
                  type: "status_img",
                  content: "",
                  imageUrl: result.message.imageUrl,
                  imageName: result.message.imageName,
                  mediaId: media.id,
                }
              : message,
          ),
        );
        if (shouldUseFreeImage) {
          incrementFreeImageGenerationUsage(userId);
        } else {
          if (
            !spendCredit(
              IMAGE_GENERATION_CREDIT_COST,
              "이미지 재생성",
              "메시지 수정 후 이미지 재생성",
            )
          ) {
            throw new Error("Insufficient credits");
          }
          chargeImageGenerationCredit(userId);
        }
        toast.success("메시지를 수정하고 이미지를 다시 생성했어요.");
      } catch {
        setMessages((prev) =>
          prev.map((message) =>
            message.turnId === targetMessage.turnId && message.imageUrl
              ? {
                  ...message,
                  type: "status_img",
                  content:
                    "이미지 재생성에 실패했어요. 잠시 후 다시 시도해주세요.",
                  imageUrl: undefined,
                  imageName: undefined,
                  commandId: "image",
                  status: "failed",
                  isGenerationError: true,
                  generationErrorMessage: "이미지 재생성에 실패했습니다.",
                }
              : message,
          ),
        );
        toast.error("이미지를 다시 생성하지 못했어요.");
      } finally {
        setIsTyping(false);
        setTypingLabel(undefined);
        setTypingVariant("text");
      }
      return;
    }

    toast.success("메시지를 수정했어요.");
  };

  const handleDeleteMessage = (messageId: string) => {
    const targetMessage = messages.find((message) => message.id === messageId);
    if (targetMessage?.mediaId) {
      deleteGeneratedMedia(targetMessage.mediaId);
    }
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    persistedMessageFingerprintsRef.current.delete(messageId);
    if (isHistoryPersistenceEnabled) {
      enqueueHistoryOperation(() =>
        deleteStoredChatMessages(chatId, [messageId]),
      );
    }
    toast.success("메시지를 삭제했어요.");
  };

  // --- Branch flow ---
  const handleBranchFromMessage = (messageId: string) => {
    const targetMessage = messages.find((message) => message.id === messageId);
    if (!targetMessage?.turnId) {
      setBranchTargetId(messageId);
      return;
    }

    const lastMessageInTurn = messages.findLast(
      (message) => message.turnId === targetMessage.turnId,
    );
    setBranchTargetId(lastMessageInTurn?.id ?? messageId);
  };

  const confirmBranch = () => {
    if (!branchTargetId) return;
    if (!spendCredit(CREDIT_COSTS.branch, "분기 생성", "대화 분기 생성")) {
      setBranchTargetId(null);
      toast.error("크레딧이 부족해요.", {
        description: "분기 생성에는 3 크레딧이 필요해요.",
      });
      return;
    }
    createBranch({
      originalChatId: chatId,
      fromMessageId: branchTargetId,
      title: `${characterName} 분기 ${new Date().toLocaleDateString("ko-KR")}`,
    });
    setBranchTargetId(null);
    toast.success("새로운 분기를 만들었어요.");
  };

  const hasMessages = messages.length > 0;
  const chatBackgroundColor = getChatThemeBackground(chatTheme, resolvedTheme);
  const chatBottomOverlay = `linear-gradient(0deg, ${chatBackgroundColor} 50%, ${getTransparentChatThemeBackground(chatBackgroundColor)} 100%)`;

  const handleClearChat = () => {
    setIsClearConfirmOpen(true);
  };

  const handleLeaveChat = () => {
    setIsSettingsOpen(false);
    router.push("/chats");
  };

  return (
    <div
      className="relative flex h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden bg-background transition-colors duration-200"
      style={{ backgroundColor: chatBackgroundColor }}
    >
      <ChatHeader
        characterName={roomName}
        characterEmoji={characterEmoji}
        modelLabel={selectedModel.badge ?? selectedModel.label}
        statusSummary={canShowProgressStatus ? headerStatusSummary : undefined}
        isStatusOpen={isStatusPanelOpen}
        onProfileClick={() => setIsIntroOpen(true)}
        onStatusClick={() => setIsStatusPanelOpen((current) => !current)}
        onModelClick={() => setIsModelDrawerOpen(true)}
        onMenuClick={() => setIsSettingsOpen(true)}
        isSearchMode={isSearchOpen}
        searchValue={searchInput}
        searchBusy={isSearchBusy}
        onSearchOpen={handleSearchOpen}
        onSearchClose={handleSearchClose}
        onSearchValueChange={setSearchInput}
        onSearchSubmit={() => void handleSearchSubmit()}
        backgroundColor={chatBackgroundColor}
      />

      {!isSearchOpen &&
        canShowProgressStatus &&
        readingSettings.showStoryStatus && (
        <StoryStatusCard
          status={chatStoryStatus}
          workId={chatId}
          canEditWork={canEditCurrentWork}
          compactPanel
          open={isStatusPanelOpen}
          onOpenChange={setIsStatusPanelOpen}
        />
      )}

      <ChatSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        characterName={characterName}
        characterEmoji={characterEmoji}
        chatId={chatId}
        creditBalance={credits}
        currentPersona={currentPersona}
        canShowProgressStatus={canShowProgressStatus}
        onChatThemeChange={(theme) => setChatTheme(theme)}
        onReadingSettingsChange={setReadingSettings}
        onClearChat={handleClearChat}
        onLeaveChat={handleLeaveChat}
        onGalleryOpen={() => openChatUtilityModal("gallery")}
        onTimelineOpen={() => openChatUtilityModal("timeline")}
      />

      <ChatUtilityModal
        type={chatUtilityModal}
        chatId={chatId}
        roomName={roomName}
        characterName={characterName}
        onClose={closeChatUtilityModal}
      />

      <ChatModelDrawer
        open={isModelDrawerOpen}
        onOpenChange={setIsModelDrawerOpen}
        selectedModelId={selectedModelId}
        creditBalance={credits}
        onModelChange={handleModelChange}
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
          setMessages([]);
          setEditedMessageIds(new Set());
          setHistoryCursor(null);
          setHasOlderHistory(false);
          persistedMessageFingerprintsRef.current.clear();
          if (isHistoryPersistenceEnabled) {
            enqueueHistoryOperation(() => clearChatHistory(chatId));
          }
          setIsSettingsOpen(false);
          toast.success("대화를 초기화했어요.");
        }}
      />
      <AlertModal
        open={isImageLimitModalOpen}
        title="이미지 생성 안내"
        message={`무료 이미지 생성 5회를 모두 사용했어요. 추가 생성은 크레딧이 필요합니다. 현재는 크레딧 ${IMAGE_GENERATION_CREDIT_COST}개가 필요해요.`}
        onOpenChange={setIsImageLimitModalOpen}
      />

      {/* Chat Area - Scrollable */}
      {isLoadingOlderHistory && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-full border border-border bg-background/90 p-2 shadow-sm backdrop-blur">
          <LoaderCircle
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-label="과거 대화 불러오는 중"
          />
        </div>
      )}
      <main
        ref={scrollContainerRef}
        onScroll={(event) => {
          const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
          if (!isSearchOpen && scrollTop <= 120) void loadOlderHistory();
          setShowScrollToTop(scrollTop > 200);
          setShowScrollToBottom(scrollHeight - scrollTop - clientHeight > 200);

          setIsScrolling(true);
          if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
          scrollTimerRef.current = setTimeout(() => {
            setIsScrolling(false);
          }, 3000);
        }}
        className="min-h-0 flex-1 overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))] pt-11 transition-colors duration-200"
        style={{ backgroundColor: chatBackgroundColor }}
      >
        {isHistoryLoading ? (
          <div
            className="flex min-h-full items-center justify-center"
            role="status"
            aria-label="채팅 내역 불러오는 중"
          >
            <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : hasMessages || isTyping ? (
          <ChatMessageList
            messages={messages}
            isTyping={isTyping}
            typingLabel={typingLabel}
            typingVariant={typingVariant}
            regeneratingMessageId={regeneratingMessageId}
            messagesEndRef={messagesEndRef}
            onRewriteMessage={handleRewriteMessage}
            onSelectMessageCandidate={handleSelectMessageCandidate}
            onRetryFailedMessage={handleRetryMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onBranchFromMessage={handleBranchFromMessage}
            editedMessageIds={editedMessageIds}
            chatId={chatId}
            chatTheme={chatTheme}
            textSize={readingSettings.textSize}
            lineHeight={readingSettings.lineHeight}
            characters={chatInputCharacters}
            disabled={isTyping || isHistoryLoading}
            searchQuery={searchQuery}
            activeSearchMessageId={activeSearchMessageId}
          />
        ) : (
          <div className="min-h-full">
            <EmptyChatState
              characterName={characterName}
              characterEmoji={characterEmoji}
              startScenario={startScenario}
              introScenarios={introScenarios}
              selectedIntroScenarioId={selectedIntroScenario?.id}
              onIntroSelect={handleIntroScenarioSelect}
              onSuggestionClick={(suggestion) => handleSendMessage(suggestion)}
              textSize={readingSettings.textSize}
              lineHeight={readingSettings.lineHeight}
              chatTheme={chatTheme}
            />
          </div>
        )}
      </main>

      {/* Scroll Navigation Floating Buttons (스크롤 중에만 우측 하단에 표시, 멈추면 자동으로 숨김) */}
      {!isSearchOpen &&
        isScrolling &&
        (showScrollToTop || showScrollToBottom) && (
        <div className="fixed bottom-20 right-3 z-40 flex flex-col gap-1.5 transition-all duration-300 animate-in fade-in duration-200">
          {showScrollToTop && (
            <button
              type="button"
              onClick={() =>
                scrollContainerRef.current?.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }
              aria-label="맨 위로 가기"
              title="맨 위로 가기"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-all hover:bg-accent hover:scale-105 active:scale-95"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          )}
          {showScrollToBottom && (
            <button
              type="button"
              onClick={() =>
                scrollContainerRef.current?.scrollTo({
                  top: scrollContainerRef.current.scrollHeight,
                  behavior: "smooth",
                })
              }
              aria-label="맨 아래로 가기"
              title="맨 아래로 가기"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-all hover:bg-accent hover:scale-105 active:scale-95"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {isSearchOpen ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-border backdrop-blur"
          style={{ backgroundColor: chatBackgroundColor }}
        >
          <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 pb-[env(safe-area-inset-bottom)]">
            <span
              className="text-xs font-medium text-muted-foreground"
              aria-live="polite"
            >
              {isSearchBusy
                ? "검색 중"
                : `${activeSearchResultIndex >= 0 ? activeSearchResultIndex + 1 : 0} / ${searchResultIds.length}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveSearchResult("older")}
                disabled={
                  isSearchBusy ||
                  searchResultIds.length === 0 ||
                  activeSearchResultIndex <= 0
                }
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent disabled:cursor-default disabled:text-muted-foreground/35"
                aria-label="이전 검색 결과"
              >
                <ChevronUp className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => moveSearchResult("newer")}
                disabled={
                  isSearchBusy ||
                  searchResultIds.length === 0 ||
                  activeSearchResultIndex >= searchResultIds.length - 1
                }
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent disabled:cursor-default disabled:text-muted-foreground/35"
                aria-label="다음 검색 결과"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 back-blur"
          style={{ background: chatBottomOverlay }}
        >
          <ChatInput
            onSendMessage={handleSendMessage}
            onCommand={handleCommand}
            characters={chatInputCharacters}
            disabled={isTyping || isHistoryLoading}
            insertTextRequest={insertTextRequest}
          />
        </div>
      )}
      {currentWork && (
        <PersonaSelectModal
          isOpen={isPersonaModalOpen}
          onClose={() => setIsPersonaModalOpen(false)}
          work={currentWork}
          library={library}
          onPersonaSelect={handlePersonaSelectedInChat}
        />
      )}
    </div>
  );
}
