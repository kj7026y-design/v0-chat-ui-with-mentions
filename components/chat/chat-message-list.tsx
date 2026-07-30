"use client";

import {
  useState,
  useEffect,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { Check, Copy } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { type ChatMessage } from "@/lib/chat-types";
import {
  parseMessageSegments,
  shouldRenderMessageSegments,
  type MessageSegment,
} from "@/lib/message-segments";
import { parseComposerInput, type ComposerPart } from "@/lib/rp-input-parser";
import { getCommandEditableContent } from "@/lib/chat-command-editing";
import { cn } from "@/lib/utils";
import { AuthorTools } from "./author-tools";
import { MessageCandidateControls } from "./message-candidates-drawer";
import {
  InstagramCommandContent,
  PhoneCommandContent,
  StatusCommandContent,
} from "./command-content";

type ChatThemeId = "system" | "light" | "dark" | "message" | "messenger";

type ChatMessageCharacterProfile = {
  id: string;
  name: string;
  emoji?: string;
  avatarUrl?: string;
};

interface ChatThemeConfig {
  id: ChatThemeId;
  preview: {
    bg: string;
    userBubble: string;
    userText: string;
    aiBubble: string;
    aiText: string;
  };
}

function getChatThemeTextPalette(backgroundColor: string) {
  const isDark = isDarkColor(backgroundColor);
  return isDark
    ? {
        text: "#F5F5F5",
        mutedText: "rgba(245,245,245,0.74)",
        panelBg: "rgba(255,255,255,0.08)",
        panelBorder: "rgba(255,255,255,0.16)",
        indicator: "rgba(245,245,245,0.72)",
      }
    : {
        text: "#1F2937",
        mutedText: "var(--color-gray-600)",
        panelBg: "rgba(255,255,255,0.58)",
        panelBorder: "rgba(17,24,39,0.12)",
        indicator: "rgba(31,41,55,0.52)",
      };
}

// Mention target name mapping
const MENTION_NAMES: Record<string, string> = {
  hongGilDong: "홍길동",
  imugi: "이무기",
  extra: "엑스트라",
  all: "모두",
};

function getMentionDisplayNames(mentions: string[] | undefined): string[] {
  if (!mentions || mentions.length === 0) return [];
  return mentions.map((id) => MENTION_NAMES[id] || id);
}

function renderHighlightedMentions(content: string, names: string[]) {
  const mentionNames = [...new Set([...names, ...Object.values(MENTION_NAMES)])]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (mentionNames.length === 0) return content;

  const parts: ReactNode[] = [];
  let index = 0;

  while (index < content.length) {
    const matchedName = mentionNames.find((name) =>
      content.startsWith(`@${name}`, index),
    );
    if (!matchedName) {
      parts.push(content[index]);
      index += 1;
      continue;
    }

    const token = `@${matchedName}`;
    parts.push(
      <span
        key={`${token}-${index}`}
        className="mention-token rounded-md border px-1 py-0.5 font-semibold"
      >
        {token}
      </span>,
    );
    index += token.length;
  }

  return parts;
}

const chatThemes: Record<ChatThemeId, ChatThemeConfig> = {
  system: {
    id: "system",
    preview: {
      bg: "#1a1a1a",
      userBubble: "#333333",
      userText: "#FFFFFF",
      aiBubble: "#1E1E1E",
      aiText: "#E5E5E5",
    },
  },
  light: {
    id: "light",
    preview: {
      bg: "#FFFFFF",
      userBubble: "#007AFF",
      userText: "#FFFFFF",
      aiBubble: "#E9E9EB",
      aiText: "#000000",
    },
  },
  dark: {
    id: "dark",
    preview: {
      bg: "#121212",
      userBubble: "#333333",
      userText: "#FFFFFF",
      aiBubble: "#363636",
      aiText: "#F5F5F5",
    },
  },
  message: {
    id: "message",
    preview: {
      bg: "#F2F2F7",
      userBubble: "#34C759",
      userText: "#FFFFFF",
      aiBubble: "#FFFFFF",
      aiText: "#000000",
    },
  },
  messenger: {
    id: "messenger",
    preview: {
      bg: "#BACEE0",
      userBubble: "#FEE500",
      userText: "#3C1E1E",
      aiBubble: "#FFFFFF",
      aiText: "#000000",
    },
  },
};

function getEditTargetMessage(message: ChatMessage, messages: ChatMessage[]) {
  if (message.imageUrl) return message;
  if (message.content.trim() || !message.turnId) return message;

  return (
    [...messages]
      .reverse()
      .find(
        (item) =>
          item.turnId === message.turnId &&
          item.type === "ai" &&
          !item.imageUrl &&
          item.content.trim(),
      ) ?? message
  );
}

function normalizeMessageNewlines(content: string) {
  return content
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(/([^\s\n])(["“][^"“”\n]{1,500}["”])/g, "$1\n\n$2")
    .replace(/(["“][^"“”\n]{1,500}["”])([^\s\n])/g, "$1\n\n$2")
    .replace(/\n{3,}/g, "\n\n");
}

function getLatestEditableMessageId(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (isAssistantExtraMessage(message) && !message.commandId) continue;
    const editTarget = getEditTargetMessage(message, messages);
    const isCharacterLine =
      editTarget.isUserAuthoredCharacterLine &&
      editTarget.speakerType === "character";
    const isCommandMessage = Boolean(editTarget.commandId);
    const isEditable =
      editTarget.type === "user" ||
      editTarget.type === "ai" ||
      isCharacterLine ||
      isCommandMessage;
    if (isEditable && (editTarget.content.trim() || editTarget.imageUrl))
      return editTarget.id;
  }
  return null;
}

function isAssistantExtraMessage(message: ChatMessage) {
  if (message.type !== "status" || message.isGenerationError || !message.turnId)
    return false;
  return /^(📱 휴대폰|💬 SNS|INSTAGRAM|<ig>|<status>|📊 상태창|📍장소:)/.test(
    message.content.trim(),
  );
}

function getAssistantExtraMessages(
  message: ChatMessage,
  messages: ChatMessage[],
  index: number,
) {
  if (message.type !== "ai" || !message.turnId) return [];

  const extras: ChatMessage[] = [];
  for (let nextIndex = index + 1; nextIndex < messages.length; nextIndex += 1) {
    const nextMessage = messages[nextIndex];
    if (nextMessage.turnId !== message.turnId) break;
    if (isAssistantExtraMessage(nextMessage)) {
      extras.push(nextMessage);
    }
  }
  return extras;
}

function isGroupedAssistantExtra(
  message: ChatMessage,
  messages: ChatMessage[],
  index: number,
) {
  if (!isAssistantExtraMessage(message)) return false;
  return messages
    .slice(0, index)
    .some((item) => item.type === "ai" && item.turnId === message.turnId);
}

function getSpeakerProfile(
  message: ChatMessage,
  characters: ChatMessageCharacterProfile[],
) {
  return characters.find((character) => {
    if (message.speakerId && character.id === message.speakerId) return true;
    if (message.speakerName && character.name === message.speakerName)
      return true;
    return false;
  });
}

function MessageAvatar({
  imageUrl,
  fallback,
  alt,
  className,
}: {
  imageUrl?: string;
  fallback: string;
  alt: string;
  className?: string;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={cn(
          "shrink-0 rounded-full bg-secondary object-cover",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {fallback}
    </div>
  );
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
  typingLabel?: string;
  typingVariant?: "text" | "image" | "command";
  regeneratingMessageId?: string | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onRewriteMessage?: (messageId: string) => void;
  onSelectMessageCandidate?: (messageId: string, candidateId: string) => void;
  onRetryFailedMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, nextContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onBranchFromMessage?: (messageId: string) => void;
  editedMessageIds?: Set<string>;
  chatId?: string;
  chatTheme?: ChatThemeId;
  disabled?: boolean;
  textSize?: number;
  lineHeight?: number;
  characters?: ChatMessageCharacterProfile[];
}

export function ChatMessageList({
  messages,
  isTyping,
  typingLabel,
  typingVariant = "text",
  regeneratingMessageId = null,
  messagesEndRef,
  onRewriteMessage,
  onSelectMessageCandidate,
  onRetryFailedMessage,
  onEditMessage,
  onDeleteMessage,
  onBranchFromMessage,
  editedMessageIds = new Set(),
  chatId,
  chatTheme: externalChatTheme,
  disabled = false,
  textSize = 16,
  lineHeight = 1.5,
  characters = [],
}: ChatMessageListProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [internalChatTheme, setInternalChatTheme] =
    useState<ChatThemeId>("system");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (chatId) {
      const savedTheme = localStorage.getItem(
        `chat-theme-${chatId}`,
      ) as ChatThemeId;
      if (savedTheme && chatThemes[savedTheme]) {
        setInternalChatTheme(savedTheme);
      } else {
        setInternalChatTheme("system");
      }
    }

    // Listen for storage changes (when theme is updated from settings)
    const handleStorageChange = (e: StorageEvent) => {
      if (chatId && e.key === `chat-theme-${chatId}`) {
        if (e.newValue) {
          setInternalChatTheme(e.newValue as ChatThemeId);
        } else {
          setInternalChatTheme("system");
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [chatId]);

  // Use external theme if provided, otherwise use internal state
  const chatTheme = externalChatTheme ?? internalChatTheme;

  // Determine the actual theme config to use
  const getActualThemeConfig = () => {
    // Before mount, default to light to match SSR output and avoid hydration mismatch
    if (!mounted) return chatThemes.light;
    if (chatTheme === "system") {
      // Follow app theme
      return resolvedTheme === "dark" ? chatThemes.dark : chatThemes.light;
    }
    return chatThemes[chatTheme];
  };

  const themeConfig = getActualThemeConfig();
  const themeTextPalette = getChatThemeTextPalette(themeConfig.preview.bg);
  const latestEditableMessageId = getLatestEditableMessageId(messages);
  // Keep the larger bottom inset only for the initial scene/first turn.
  // Once a second turn exists, the composer no longer needs the opening-scene
  // spacing; applying pb-44 to the whole history leaves a large empty tail.
  const turnIds = new Set(
    messages.map((message) => message.turnId).filter(Boolean),
  );
  const isInitialScene = turnIds.size <= 1;
  // Bubble style rendering
  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-4 py-4",
        isInitialScene ? "pb-44" : "pb-4",
      )}
      style={
        {
          color: themeTextPalette.text,
          "--chat-theme-text": themeTextPalette.text,
          "--chat-theme-muted-text": themeTextPalette.mutedText,
          "--chat-theme-panel-bg": themeTextPalette.panelBg,
          "--chat-theme-panel-border": themeTextPalette.panelBorder,
          "--chat-theme-indicator": themeTextPalette.indicator,
        } as CSSProperties
      }
    >
      {messages.map((message, index) =>
        (() => {
          if (isGroupedAssistantExtra(message, messages, index)) return null;
          const editTarget = getEditTargetMessage(message, messages);
          const extraMessages = getAssistantExtraMessages(
            message,
            messages,
            index,
          );
          const isLatestEditableTarget =
            editTarget.id === latestEditableMessageId ||
            (editTarget.type === "ai" &&
              extraMessages.some(
                (extraMessage) => extraMessage.id === latestEditableMessageId,
              ));
          return (
            <BubbleMessageBubble
              key={message.id}
              message={message}
              extraMessages={extraMessages}
              typingLabel={typingLabel}
              regeneratingMessageId={regeneratingMessageId}
              onRewrite={onRewriteMessage}
              onSelectCandidate={onSelectMessageCandidate}
              onRetry={onRetryFailedMessage}
              onDelete={onDeleteMessage}
              onBranch={onBranchFromMessage}
              isEdited={editedMessageIds.has(editTarget.id)}
              editedMessageIds={editedMessageIds}
              themeConfig={themeConfig}
              textSize={textSize}
              lineHeight={lineHeight}
              characters={characters}
              isLatest={isLatestEditableTarget}
              latestEditableMessageId={latestEditableMessageId}
              canBranch={
                (message.type === "ai" ||
                  message.type === "status" ||
                  message.type === "inner-thought") &&
                (!message.turnId ||
                  messages[index + 1 + extraMessages.length]?.turnId !==
                    message.turnId)
              }
              editInitialContent={editTarget.content}
              isEditing={editingMessageId === message.id}
              editingMessageId={editingMessageId}
              disabled={disabled}
              onStartEdit={() => {
                if (disabled) return;
                setEditingMessageId(message.id);
              }}
              onStartMessageEdit={(targetMessageId) => {
                if (disabled) return;
                setEditingMessageId(targetMessageId);
              }}
              onCancelEdit={() => setEditingMessageId(null)}
              onSaveEdit={(nextContent) => {
                onEditMessage?.(editTarget.id, nextContent);
                setEditingMessageId(null);
              }}
              onSaveMessageEdit={(targetMessageId, nextContent) => {
                onEditMessage?.(targetMessageId, nextContent);
                setEditingMessageId(null);
              }}
            />
          );
        })(),
      )}

      {isTyping && !regeneratingMessageId && typingVariant === "image" && (
        <BubbleImageGeneratingIndicator
          label={typingLabel ?? "이미지 생성중..."}
          themeConfig={themeConfig}
        />
      )}
      {isTyping && !regeneratingMessageId && typingVariant === "command" && (
        <BubbleCommandGeneratingIndicator
          label={typingLabel ?? "명령어 생성중..."}
          themeConfig={themeConfig}
        />
      )}
      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}

// ============================================
// Bubble Style Components
// ============================================

interface BubbleMessageBubbleProps {
  message: ChatMessage;
  extraMessages?: ChatMessage[];
  typingLabel?: string;
  regeneratingMessageId?: string | null;
  onRewrite?: (messageId: string) => void;
  onSelectCandidate?: (messageId: string, candidateId: string) => void;
  onRetry?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onBranch?: (messageId: string) => void;
  isEdited?: boolean;
  editedMessageIds: Set<string>;
  themeConfig: ChatThemeConfig;
  textSize: number;
  lineHeight: number;
  characters: ChatMessageCharacterProfile[];
  isLatest: boolean;
  latestEditableMessageId: string | null;
  canBranch: boolean;
  editInitialContent: string;
  isEditing: boolean;
  editingMessageId: string | null;
  disabled?: boolean;
  onStartEdit: () => void;
  onStartMessageEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (nextContent: string) => void;
  onSaveMessageEdit: (messageId: string, nextContent: string) => void;
}

function BubbleMessageBubble({
  message,
  extraMessages = [],
  typingLabel,
  regeneratingMessageId,
  onRewrite,
  onSelectCandidate,
  onRetry,
  onDelete,
  onBranch,
  isEdited,
  editedMessageIds,
  themeConfig,
  textSize,
  lineHeight,
  characters,
  isLatest,
  latestEditableMessageId,
  canBranch,
  editInitialContent,
  isEditing,
  editingMessageId,
  disabled = false,
  onStartEdit,
  onStartMessageEdit,
  onCancelEdit,
  onSaveEdit,
  onSaveMessageEdit,
}: BubbleMessageBubbleProps) {
  const [isBranching, setIsBranching] = useState(false);
  const editableInitialContent = message.imageUrl
    ? message.originalContent?.trim() || ""
    : message.commandId
      ? getCommandEditableContent(message.content, message.commandId)
      : normalizeMessageNewlines(editInitialContent);
  const copyText = message.commandId
    ? getCommandEditableContent(message.content, message.commandId)
    : normalizeMessageNewlines(message.content);
  const [editDraft, setEditDraft] = useState(() => editableInitialContent);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const isCharacterLine = Boolean(
    message.isUserAuthoredCharacterLine && message.speakerType === "character",
  );
  const isUser = message.type === "user" && !isCharacterLine;
  const isAI = message.type === "ai";
  const isEvent = message.type === "event";
  const isInnerThought = message.type === "inner-thought";
  const isStatus = message.type === "status";
  const speakerProfile = getSpeakerProfile(message, characters);
  const themeTextPalette = getChatThemeTextPalette(themeConfig.preview.bg);

  useEffect(() => {
    if (isEditing) setEditDraft(editableInitialContent);
  }, [editableInitialContent, isEditing]);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [message.imageUrl]);

  if (message.id === regeneratingMessageId) {
    return message.commandId === "image" || message.imageUrl ? (
      <BubbleImageGeneratingIndicator
        label={typingLabel ?? "이미지 재생성 중"}
        themeConfig={themeConfig}
      />
    ) : message.commandId ? (
      <BubbleCommandGeneratingIndicator
        label={typingLabel ?? "명령어 재생성 중"}
        themeConfig={themeConfig}
      />
    ) : (
      <BubbleMessageGeneratingIndicator
        label={typingLabel ?? "답변 재생성 중"}
        themeConfig={themeConfig}
        textSize={textSize}
        lineHeight={lineHeight}
      />
    );
  }

  if (message.isGenerationError) {
    return (
      <div className="flex justify-start">
        <div
          className="max-w-[92%] rounded-xl border px-3 py-3"
          style={{
            backgroundColor: themeTextPalette.panelBg,
            borderColor: "rgba(220,38,38,0.35)",
            color: themeTextPalette.text,
          }}
        >
          <p
            className="whitespace-pre-wrap break-words [word-break:keep-all]"
            style={{
              fontSize: Math.min(14, Math.max(11, textSize)),
              lineHeight: Math.max(1.45, lineHeight),
            }}
          >
            {message.content || "답변을 생성하지 못했어요."}
          </p>
          <button
            type="button"
            onClick={() => onRetry?.(message.id)}
            disabled={disabled}
            className="mt-3 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            무료 재생성
          </button>
        </div>
      </div>
    );
  }

  // Event Card
  if (isEvent) {
    return (
      <div className="flex justify-center my-4">
        <div
          className="w-full max-w-sm overflow-hidden rounded-xl border"
          style={{
            backgroundColor: themeTextPalette.panelBg,
            borderColor: themeTextPalette.panelBorder,
            color: themeTextPalette.text,
          }}
        >
          {/* Event Image */}
          <div className="relative aspect-video bg-muted">
            {message.eventImage ? (
              <img
                src={message.eventImage}
                alt={message.content}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">🌸</span>
              </div>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />

            {/* Event Title */}
            <div className="absolute bottom-3 left-4 right-4">
              <span
                className="text-xs uppercase tracking-wider"
                style={{ color: themeTextPalette.mutedText }}
              >
                Event
              </span>
              <h4
                className="mt-0.5 text-lg font-semibold"
                style={{ color: themeTextPalette.text }}
              >
                {message.content}
              </h4>
            </div>
          </div>

          {/* Event Description */}
          {message.eventDescription && (
            <div className="px-4 py-3">
              <p
                className="text-sm leading-relaxed"
                style={{ color: themeTextPalette.mutedText }}
              >
                {message.eventDescription}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isStatus || isInnerThought) {
    const statusTextSize = Math.min(14, Math.max(11, textSize));
    const isPhoneCommand = isStatus && message.commandId === "phone";
    const isInstagramCommand = isStatus && message.commandId === "sns";
    const isStatusCommand = isStatus && message.commandId === "status";
    const isCommandMessage = Boolean(message.commandId);

    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex justify-start">
          <div
            className="max-w-[92%] rounded-xl border px-3 py-2.5"
            style={{
              backgroundColor: themeTextPalette.panelBg,
              borderColor: themeTextPalette.panelBorder,
              color: themeTextPalette.text,
              fontSize: statusTextSize,
              lineHeight: Math.max(1.45, lineHeight),
            }}
          >
            {isInstagramCommand ? (
              <InstagramCommandContent
                content={message.content}
                textColor={themeTextPalette.text}
                mutedTextColor={themeTextPalette.mutedText}
              />
            ) : isStatusCommand ? (
              <StatusCommandContent
                content={message.content}
                textColor={themeTextPalette.text}
              />
            ) : isPhoneCommand ? (
              <PhoneCommandContent
                content={message.content}
                textColor={themeTextPalette.text}
              />
            ) : (
              <p className="whitespace-pre-wrap break-words [word-break:keep-all]">
                {message.content}
              </p>
            )}
          </div>
        </div>
        {isEditing && (
          <EditMessageForm
            editDraft={editDraft}
            setEditDraft={setEditDraft}
            disabled={disabled}
            isUser={false}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
          />
        )}
        {isLatest && isCommandMessage && !isEditing && !disabled && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-150">
            <AuthorTools
              messageId={message.id}
              onRewrite={onRewrite}
              onEdit={onStartEdit}
              onDelete={onDelete}
              isEdited={isEdited}
              canRewrite
              disabled={disabled}
            />
          </div>
        )}
        {canBranch && (
          <BranchButton
            disabled={disabled}
            isBranching={isBranching}
            copyText={copyText}
            onClick={() => {
              if (disabled) return;
              setIsBranching(true);
              setTimeout(() => {
                onBranch?.(message.id);
                setIsBranching(false);
              }, 800);
            }}
          />
        )}
      </div>
    );
  }

  // Regular Message Bubble
  const mentionNames = [
    ...getMentionDisplayNames(message.mentions),
    ...(message.speakerName ? [message.speakerName] : []),
  ];
  const displayContent = normalizeMessageNewlines(message.content);
  const streamingLabel = (typingLabel?.trim() || "답변 생성 중").replace(
    /\.+$/,
    "",
  );
  const statusLabel =
    message.status === "failed"
      ? "생성 실패"
      : message.status === "repaired"
        ? "검수 후 수정됨"
        : "";
  const displayMessage =
    displayContent === message.content
      ? message
      : { ...message, content: displayContent };
  const bubbleColor = isUser
    ? themeConfig.preview.userBubble
    : themeConfig.preview.aiBubble;
  const bubbleTextColor = isUser
    ? themeConfig.preview.userText
    : themeConfig.preview.aiText;
  const mentionStyle = getMentionStyle(bubbleColor);
  const bubbleStyle = {
    backgroundColor: bubbleColor,
    color: bubbleTextColor,
    boxShadow: isDarkColor(themeConfig.preview.bg)
      ? "0 0 0 1px rgba(255,255,255,0.14)"
      : undefined,
    "--mention-bg": mentionStyle.bg,
    "--mention-text": mentionStyle.text,
    "--mention-border": mentionStyle.border,
  } as CSSProperties;
  const segments = parseMessageSegments(displayMessage);
  const shouldRenderSegments =
    !message.imageUrl && shouldRenderMessageSegments(displayMessage, segments);
  const composerParts =
    isUser && !message.imageUrl ? parseComposerInput(displayContent) : [];
  const isAutoAdvanceSource =
    isUser && message.isAutoAdvance === true && Boolean(displayContent);
  const shouldRenderComposerParts =
    isUser &&
    !isAutoAdvanceSource &&
    (composerParts.some((part) => part.type === "action") ||
      composerParts.length > 1);

  if (shouldRenderComposerParts) {
    return (
      <div className="flex flex-col items-end gap-2">
        <UserSegmentedMessage
          parts={composerParts}
          mentionNames={mentionNames}
          themeConfig={themeConfig}
          textSize={textSize}
          lineHeight={lineHeight}
          bubbleStyle={bubbleStyle}
        />

        {isEditing && (
          <EditMessageForm
            editDraft={editDraft}
            setEditDraft={setEditDraft}
            disabled={disabled}
            isUser={isUser}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
          />
        )}

        {isLatest && !isEditing && !disabled && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-150">
            <AuthorTools
              messageId={message.id}
              onRewrite={onRewrite}
              onEdit={onStartEdit}
              onDelete={onDelete}
              isEdited={isEdited}
              canRewrite={false}
              disabled={disabled}
            />
          </div>
        )}

        {canBranch && !isEditing && (
          <BranchButton
            disabled={disabled}
            isBranching={isBranching}
            copyText={copyText}
            onClick={() => {
              if (disabled) return;
              setIsBranching(true);
              setTimeout(() => {
                onBranch?.(message.id);
                setIsBranching(false);
              }, 800);
            }}
          />
        )}
      </div>
    );
  }

  if (shouldRenderSegments) {
    return (
      <div className="flex flex-col items-start">
        <AssistantSegmentedMessage
          message={message}
          segments={segments}
          mentionNames={mentionNames}
          themeConfig={themeConfig}
          textSize={textSize}
          lineHeight={lineHeight}
          isEdited={Boolean(isEdited)}
          isCharacterLine={isCharacterLine}
          extraMessages={extraMessages}
          regeneratingMessageId={regeneratingMessageId}
          typingLabel={typingLabel}
          avatarUrl={speakerProfile?.avatarUrl}
          avatarFallback={speakerProfile?.emoji}
          latestEditableMessageId={latestEditableMessageId}
          editingMessageId={editingMessageId}
          editedMessageIds={editedMessageIds}
          disabled={disabled}
          onRewrite={onRewrite}
          onEdit={onStartMessageEdit}
          onDelete={onDelete}
          onCancelEdit={onCancelEdit}
          onSaveEdit={onSaveMessageEdit}
        />

        {isEditing && (
          <EditMessageForm
            editDraft={editDraft}
            setEditDraft={setEditDraft}
            disabled={disabled}
            isUser={false}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
          />
        )}

        {!isEditing && (
          <MessageCandidateControls
            message={message}
            disabled={disabled}
            textSize={textSize}
            lineHeight={lineHeight}
            onSelectCandidate={onSelectCandidate}
          />
        )}

        {isLatest && (isAI || isCharacterLine) && !isEditing && !disabled && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-150">
            <AuthorTools
              messageId={message.id}
              onRewrite={onRewrite}
              onEdit={onStartEdit}
              onDelete={onDelete}
              isEdited={isEdited}
              canRewrite={isAI}
              disabled={disabled}
            />
          </div>
        )}

        {canBranch && !isEditing && (
          <BranchButton
            disabled={disabled}
            isBranching={isBranching}
            copyText={copyText}
            onClick={() => {
              if (disabled) return;
              setIsBranching(true);
              setTimeout(() => {
                onBranch?.(message.id);
                setIsBranching(false);
              }, 800);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "relative flex w-full",
          isUser ? "justify-end" : "justify-start",
        )}
      >
        {isCharacterLine && (
          <MessageAvatar
            className="mr-2 mt-1 h-8 w-8 text-xs"
            imageUrl={speakerProfile?.avatarUrl}
            fallback={
              speakerProfile?.emoji ?? message.speakerName?.slice(0, 1) ?? "?"
            }
            alt={message.speakerName ?? "캐릭터"}
          />
        )}
        <div
          className={cn(
            "relative w-fit max-w-[82%] rounded-2xl sm:max-w-[80%]",
            message.imageUrl && !displayContent
              ? "overflow-hidden p-0"
              : "px-4 py-2.5",
            isUser && "ml-auto",
          )}
          style={bubbleStyle}
        >
          {isCharacterLine && message.speakerName && (
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-xs font-semibold opacity-90">
                {message.speakerName}
              </span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] opacity-70">
                직접 작성
              </span>
            </div>
          )}
          {message.imageUrl && !imageLoadFailed && (
            <img
              src={message.imageUrl}
              alt={message.imageName ?? "첨부 이미지"}
              onError={() => setImageLoadFailed(true)}
              className={cn(
                "mb-2 max-h-80 w-full rounded-xl object-cover",
                !displayContent && "mb-0 rounded-2xl",
              )}
            />
          )}
          {message.imageUrl && imageLoadFailed && (
            <div
              className="rounded-xl border px-3 py-2.5"
              style={{
                backgroundColor: themeTextPalette.panelBg,
                borderColor: themeTextPalette.panelBorder,
                color: themeTextPalette.text,
              }}
            >
              <p
                className="whitespace-pre-wrap break-words [word-break:keep-all]"
                style={{
                  fontSize: Math.min(14, Math.max(11, textSize)),
                  lineHeight: Math.max(1.45, lineHeight),
                }}
              >
                이미지 생성에 실패했어요. 잠시 후 다시 시도해주세요.
              </p>
            </div>
          )}
          {displayContent && (
            <p
              className="whitespace-pre-wrap break-words [word-break:break-all] [&_.mention-token]:border-[var(--mention-border)] [&_.mention-token]:bg-[var(--mention-bg)] [&_.mention-token]:text-[var(--mention-text)]"
              style={{ fontSize: textSize, lineHeight }}
            >
              {isAutoAdvanceSource && (
                <span className="mr-2 inline-block font-semibold text-amber-300">
                  자동진행
                </span>
              )}
              {renderHighlightedMentions(displayContent, mentionNames)}
            </p>
          )}
          {!displayContent && message.status === "streaming" && (
            <div
              role="status"
              aria-live="polite"
              className="flex min-h-10 flex-col items-center justify-center gap-1.5 opacity-70"
              style={{ fontSize: Math.max(12, textSize - 1), lineHeight }}
            >
              <BubbleTypingDots color="currentColor" />
              <span>{streamingLabel}</span>
            </div>
          )}
          {displayContent && message.status === "streaming" && (
            <div
              role="status"
              aria-live="polite"
              className="mt-1 flex flex-col items-start gap-1 text-[10px] font-medium opacity-60"
            >
              <BubbleTypingDots color="currentColor" compact />
              <span>{streamingLabel}</span>
            </div>
          )}
          {statusLabel && displayContent && (
            <p className="mt-1 text-[10px] font-medium opacity-60">
              {statusLabel}
            </p>
          )}

          {/* Edited indicator dot */}
          {isEdited && !isUser && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-background" />
          )}
        </div>
      </div>

      {isEditing && (
        <EditMessageForm
          editDraft={editDraft}
          setEditDraft={setEditDraft}
          disabled={disabled}
          isUser={isUser}
          onCancelEdit={onCancelEdit}
          onSaveEdit={onSaveEdit}
        />
      )}

      {isAI && extraMessages.length > 0 && (
        <div className="w-full max-w-[82%] sm:max-w-[80%]">
          <AssistantExtraSection
            messages={extraMessages}
            regeneratingMessageId={regeneratingMessageId}
            typingLabel={typingLabel}
            textSize={textSize}
            lineHeight={lineHeight}
            themeConfig={themeConfig}
            latestEditableMessageId={latestEditableMessageId}
            editingMessageId={editingMessageId}
            editedMessageIds={editedMessageIds}
            disabled={disabled}
            onRewrite={onRewrite}
            onEdit={onStartMessageEdit}
            onDelete={onDelete}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveMessageEdit}
          />
        </div>
      )}

      {isAI && !isEditing && (
        <MessageCandidateControls
          message={message}
          disabled={disabled}
          textSize={textSize}
          lineHeight={lineHeight}
          onSelectCandidate={onSelectCandidate}
        />
      )}

      {/* Author Tools - only the latest message can be edited or deleted. */}
      {(message.imageUrl ||
        (isLatest && (isUser || isAI || isCharacterLine))) &&
        !isEditing &&
        !disabled && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-150">
            <AuthorTools
              messageId={message.id}
              onRewrite={onRewrite}
              onEdit={onStartEdit}
              onDelete={onDelete}
              isEdited={isEdited}
              canRewrite={isAI}
              disabled={disabled}
              itemType={message.imageUrl ? "image" : "message"}
            />
          </div>
        )}

      {/* Branch Button - below AI messages */}
      {canBranch && !isEditing && (
        <BranchButton
          disabled={disabled}
          isBranching={isBranching}
          copyText={copyText}
          onClick={() => {
            if (disabled) return;
            setIsBranching(true);
            setTimeout(() => {
              onBranch?.(message.id);
              setIsBranching(false);
            }, 800);
          }}
        />
      )}
    </div>
  );
}

function AssistantSegmentedMessage({
  message,
  segments,
  extraMessages,
  regeneratingMessageId,
  typingLabel,
  avatarUrl,
  avatarFallback,
  mentionNames,
  themeConfig,
  textSize,
  lineHeight,
  isEdited,
  isCharacterLine,
  latestEditableMessageId,
  editingMessageId,
  editedMessageIds,
  disabled,
  onRewrite,
  onEdit,
  onDelete,
  onCancelEdit,
  onSaveEdit,
}: {
  message: ChatMessage;
  segments: MessageSegment[];
  extraMessages: ChatMessage[];
  regeneratingMessageId?: string | null;
  typingLabel?: string;
  avatarUrl?: string;
  avatarFallback?: string;
  mentionNames: string[];
  themeConfig: ChatThemeConfig;
  textSize: number;
  lineHeight: number;
  isEdited?: boolean;
  isCharacterLine: boolean;
  latestEditableMessageId: string | null;
  editingMessageId: string | null;
  editedMessageIds: Set<string>;
  disabled: boolean;
  onRewrite?: (messageId: string) => void;
  onEdit: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (messageId: string, nextContent: string) => void;
}) {
  const firstDialogue = segments.find(
    (segment): segment is Extract<MessageSegment, { type: "dialogue" }> =>
      segment.type === "dialogue",
  );
  const speakerName = message.speakerName ?? firstDialogue?.speakerName;
  const avatarLabel = speakerName?.slice(0, 1) ?? "AI";
  const themeTextPalette = getChatThemeTextPalette(themeConfig.preview.bg);

  return (
    <div className="assistant-message-group w-full max-w-[92%] pb-1">
      <div className="assistant-message-header mb-2 flex items-center gap-2">
        <MessageAvatar
          className="h-9 w-9 text-xs font-semibold"
          imageUrl={avatarUrl}
          fallback={avatarFallback ?? avatarLabel}
          alt={speakerName ?? "AI"}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="truncate text-sm font-semibold"
              style={{ color: themeTextPalette.text }}
            >
              {speakerName ?? "AI"}
            </span>
            {isCharacterLine && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: themeTextPalette.panelBg,
                  color: themeTextPalette.mutedText,
                }}
              >
                직접 작성
              </span>
            )}
            {isEdited && !isCharacterLine && (
              <span
                className="h-2 w-2 rounded-full bg-purple-500"
                aria-label="수정됨"
              />
            )}
          </div>
        </div>
      </div>

      <div className="assistant-message-body flex w-full flex-col gap-1">
        {segments.map((segment, index) => (
          <MessageSegmentBlock
            key={`${message.id}-segment-${index}`}
            segment={segment}
            mentionNames={mentionNames}
            themeConfig={themeConfig}
            textSize={textSize}
            lineHeight={lineHeight}
          />
        ))}
        {extraMessages.length > 0 && (
          <AssistantExtraSection
            messages={extraMessages}
            regeneratingMessageId={regeneratingMessageId}
            typingLabel={typingLabel}
            textSize={textSize}
            lineHeight={lineHeight}
            themeConfig={themeConfig}
            latestEditableMessageId={latestEditableMessageId}
            editingMessageId={editingMessageId}
            editedMessageIds={editedMessageIds}
            disabled={disabled}
            onRewrite={onRewrite}
            onEdit={onEdit}
            onDelete={onDelete}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
          />
        )}
      </div>
    </div>
  );
}

function UserSegmentedMessage({
  parts,
  mentionNames,
  themeConfig,
  textSize,
  lineHeight,
  bubbleStyle,
}: {
  parts: ComposerPart[];
  mentionNames: string[];
  themeConfig: ChatThemeConfig;
  textSize: number;
  lineHeight: number;
  bubbleStyle: CSSProperties;
}) {
  const themeTextPalette = getChatThemeTextPalette(themeConfig.preview.bg);
  const narrationMentionStyle = getMentionStyle(themeConfig.preview.bg);
  const actionStyle = {
    color: themeTextPalette.mutedText,
    fontSize: textSize,
    lineHeight: Math.max(1.45, lineHeight),
    "--mention-bg": narrationMentionStyle.bg,
    "--mention-text": narrationMentionStyle.text,
    "--mention-border": narrationMentionStyle.border,
  } as CSSProperties;

  return (
    <div className="flex w-full flex-col items-end gap-2">
      {parts.map((part, index) => {
        if (part.type === "action") {
          return (
            <p
              key={`user-action-${index}`}
              className="max-w-[82%] whitespace-pre-wrap break-words px-1.5 py-0.5 text-right [word-break:keep-all] sm:max-w-[80%] [&_.mention-token]:border-[var(--mention-border)] [&_.mention-token]:bg-[var(--mention-bg)] [&_.mention-token]:text-[var(--mention-text)]"
              style={actionStyle}
            >
              {renderHighlightedMentions(part.text, mentionNames)}
            </p>
          );
        }

        return (
          <div
            key={`user-dialogue-${index}`}
            className="relative flex w-full justify-end"
          >
            <div
              className="relative w-fit max-w-[82%] rounded-2xl px-4 py-2.5 sm:max-w-[80%]"
              style={bubbleStyle}
            >
              <p
                className="whitespace-pre-wrap break-words [word-break:break-all] [&_.mention-token]:border-[var(--mention-border)] [&_.mention-token]:bg-[var(--mention-bg)] [&_.mention-token]:text-[var(--mention-text)]"
                style={{ fontSize: textSize, lineHeight }}
              >
                {renderHighlightedMentions(part.text, mentionNames)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AssistantExtraSection({
  messages,
  regeneratingMessageId,
  typingLabel,
  textSize,
  lineHeight,
  themeConfig,
  latestEditableMessageId,
  editingMessageId,
  editedMessageIds,
  disabled,
  onRewrite,
  onEdit,
  onDelete,
  onCancelEdit,
  onSaveEdit,
}: {
  messages: ChatMessage[];
  regeneratingMessageId?: string | null;
  typingLabel?: string;
  textSize: number;
  lineHeight: number;
  themeConfig: ChatThemeConfig;
  latestEditableMessageId: string | null;
  editingMessageId: string | null;
  editedMessageIds: Set<string>;
  disabled: boolean;
  onRewrite?: (messageId: string) => void;
  onEdit: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (messageId: string, nextContent: string) => void;
}) {
  const themeTextPalette = getChatThemeTextPalette(themeConfig.preview.bg);

  return (
    <div className="mt-1.5 w-full max-w-[92%] space-y-2">
      <p
        className="px-1 text-[11px] font-semibold"
        style={{ color: themeTextPalette.mutedText }}
      >
        부가 정보
      </p>
      <div className="space-y-2">
        {messages.map((message) =>
          message.id === regeneratingMessageId ? (
            <BubbleCommandGeneratingIndicator
              key={message.id}
              label={typingLabel ?? "명령어 재생성 중"}
              themeConfig={themeConfig}
            />
          ) : (
            <AssistantExtraCard
              key={message.id}
              message={message}
              textSize={Math.max(12, textSize - 2)}
              lineHeight={Math.max(1.35, lineHeight)}
              themeConfig={themeConfig}
              isLatest={message.id === latestEditableMessageId}
              isEditing={message.id === editingMessageId}
              isEdited={editedMessageIds.has(message.id)}
              disabled={disabled}
              onRewrite={onRewrite}
              onEdit={onEdit}
              onDelete={onDelete}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
            />
          ),
        )}
      </div>
    </div>
  );
}

function AssistantExtraCard({
  message,
  textSize,
  lineHeight,
  themeConfig,
  isLatest,
  isEditing,
  isEdited,
  disabled,
  onRewrite,
  onEdit,
  onDelete,
  onCancelEdit,
  onSaveEdit,
}: {
  message: ChatMessage;
  textSize: number;
  lineHeight: number;
  themeConfig: ChatThemeConfig;
  isLatest: boolean;
  isEditing: boolean;
  isEdited: boolean;
  disabled: boolean;
  onRewrite?: (messageId: string) => void;
  onEdit: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (messageId: string, nextContent: string) => void;
}) {
  const editableMessageContent = message.commandId
    ? getCommandEditableContent(message.content, message.commandId)
    : normalizeMessageNewlines(message.content);
  const [editDraft, setEditDraft] = useState(() => editableMessageContent);
  const themeTextPalette = getChatThemeTextPalette(themeConfig.preview.bg);
  const lines = message.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const titleLine = lines[0] ?? "부가 정보";
  const iconMatch = titleLine.match(/^(\S+)\s*(.*)$/);
  const icon = iconMatch?.[1] ?? "•";
  const title = iconMatch?.[2] || titleLine;
  const bodyLines = lines.slice(1);
  const isInstagramCommand = message.commandId === "sns";
  const isStatusCommand = message.commandId === "status";
  const isPhoneCommand = message.commandId === "phone";

  useEffect(() => {
    if (isEditing) setEditDraft(editableMessageContent);
  }, [editableMessageContent, isEditing]);

  return (
    <div className="space-y-1.5">
      <div
        className="relative w-full rounded-lg border px-3 py-2"
        style={{
          backgroundColor: themeTextPalette.panelBg,
          borderColor: themeTextPalette.panelBorder,
          color: themeTextPalette.mutedText,
          fontSize: textSize,
          lineHeight,
        }}
      >
        {isInstagramCommand || isStatusCommand || isPhoneCommand ? (
          <>
            {isInstagramCommand ? (
              <InstagramCommandContent
                content={message.content}
                textColor={themeTextPalette.text}
                mutedTextColor={themeTextPalette.mutedText}
              />
            ) : isStatusCommand ? (
              <StatusCommandContent
                content={message.content}
                textColor={themeTextPalette.text}
              />
            ) : (
              <PhoneCommandContent
                content={message.content}
                textColor={themeTextPalette.text}
              />
            )}
            {isEdited && (
              <span
                className="absolute right-2 top-2 h-2 w-2 rounded-full bg-purple-500"
                aria-label="수정됨"
              />
            )}
          </>
        ) : (
          <>
            <div
              className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold"
              style={{ color: themeTextPalette.text }}
            >
              <span className="text-sm leading-none">{icon}</span>
              <span>{title}</span>
              {isEdited && (
                <span
                  className="h-2 w-2 rounded-full bg-purple-500"
                  aria-label="수정됨"
                />
              )}
            </div>
            {bodyLines.length > 0 && (
              <div className="space-y-0.5">
                {bodyLines.map((line, index) => (
                  <p
                    key={`${message.id}-extra-line-${index}`}
                    className="break-words [word-break:keep-all]"
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {isEditing && (
        <EditMessageForm
          editDraft={editDraft}
          setEditDraft={setEditDraft}
          disabled={disabled}
          isUser={false}
          onCancelEdit={onCancelEdit}
          onSaveEdit={(nextContent) => onSaveEdit(message.id, nextContent)}
        />
      )}
      {isLatest && message.commandId && !isEditing && !disabled && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-150">
          <AuthorTools
            messageId={message.id}
            onRewrite={onRewrite}
            onEdit={onEdit}
            onDelete={onDelete}
            isEdited={isEdited}
            canRewrite
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

function MessageSegmentBlock({
  segment,
  mentionNames,
  themeConfig,
  textSize,
  lineHeight,
}: {
  segment: MessageSegment;
  mentionNames: string[];
  themeConfig: ChatThemeConfig;
  textSize: number;
  lineHeight: number;
}) {
  if (segment.type === "narration") {
    const themeTextPalette = getChatThemeTextPalette(themeConfig.preview.bg);
    const narrationMentionStyle = getMentionStyle(themeConfig.preview.bg);
    const narrationStyle = {
      color: themeTextPalette.text,
      fontSize: textSize,
      lineHeight,
      "--mention-bg": narrationMentionStyle.bg,
      "--mention-text": narrationMentionStyle.text,
      "--mention-border": narrationMentionStyle.border,
    } as CSSProperties;

    return (
      <p
        className="max-w-[92%] whitespace-pre-wrap break-words px-1.5 py-1.5 [word-break:break-all] [&_.mention-token]:border-[var(--mention-border)] [&_.mention-token]:bg-[var(--mention-bg)] [&_.mention-token]:text-[var(--mention-text)]"
        style={narrationStyle}
      >
        {renderHighlightedMentions(segment.content, mentionNames)}
      </p>
    );
  }

  const bubbleColor = themeConfig.preview.aiBubble;
  const bubbleTextColor = themeConfig.preview.aiText;
  const mentionStyle = getMentionStyle(bubbleColor);
  const bubbleStyle = {
    backgroundColor: bubbleColor,
    color: bubbleTextColor,
    boxShadow: isDarkColor(themeConfig.preview.bg)
      ? "0 0 0 1px rgba(255,255,255,0.14)"
      : undefined,
    "--mention-bg": mentionStyle.bg,
    "--mention-text": mentionStyle.text,
    "--mention-border": mentionStyle.border,
  } as CSSProperties;
  return (
    <div className="relative flex w-full justify-start">
      <div
        className="relative w-fit max-w-[92%] rounded-2xl px-4 py-2.5 sm:max-w-[88%]"
        style={bubbleStyle}
      >
        <p
          className="whitespace-pre-wrap break-words [word-break:break-all] [&_.mention-token]:border-[var(--mention-border)] [&_.mention-token]:bg-[var(--mention-bg)] [&_.mention-token]:text-[var(--mention-text)]"
          style={{ fontSize: textSize, lineHeight }}
        >
          {renderHighlightedMentions(segment.content, mentionNames)}
        </p>
      </div>
    </div>
  );
}

function EditMessageForm({
  editDraft,
  setEditDraft,
  disabled,
  isUser,
  onCancelEdit,
  onSaveEdit,
}: {
  editDraft: string;
  setEditDraft: (value: string) => void;
  disabled: boolean;
  isUser: boolean;
  onCancelEdit: () => void;
  onSaveEdit: (nextContent: string) => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled) return;
        onSaveEdit(normalizeMessageNewlines(editDraft));
      }}
      className={cn(
        "w-full max-w-[82%] space-y-2 sm:max-w-[80%]",
        isUser && "ml-auto",
      )}
    >
      <textarea
        value={editDraft}
        onChange={(event) => setEditDraft(event.target.value)}
        rows={6}
        autoFocus
        disabled={disabled}
        className="max-h-[50vh] min-h-[168px] w-full resize-y whitespace-pre-wrap rounded-xl border border-border bg-input px-3 py-2 text-[15px] leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-ring"
      />
      <div
        className={cn(
          "flex items-center gap-2",
          isUser ? "justify-end" : "justify-start",
        )}
      >
        <button
          type="button"
          onClick={onCancelEdit}
          disabled={disabled}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={disabled || !editDraft.trim()}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          저장
        </button>
      </div>
    </form>
  );
}

function BranchButton({
  disabled,
  isBranching,
  copyText,
  onClick,
}: {
  disabled: boolean;
  isBranching: boolean;
  copyText: string;
  onClick: () => void;
}) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;
    const timeout = window.setTimeout(() => setIsCopied(false), 1_500);
    return () => window.clearTimeout(timeout);
  }, [isCopied]);

  const handleCopy = async () => {
    const normalizedCopyText = copyText.trim();
    if (disabled || !normalizedCopyText) return;

    try {
      await navigator.clipboard.writeText(normalizedCopyText);
      setIsCopied(true);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = normalizedCopyText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      if (copied) setIsCopied(true);
    }
  };

  return (
    <div className="-mx-1 -mt-1 flex items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isBranching}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 text-[10px] text-[var(--chat-theme-muted-text)] transition-colors hover:text-[var(--chat-theme-text)]",
          isBranching && "text-[var(--chat-theme-text)]",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <svg
          className={cn("w-3 h-3", isBranching && "animate-spin")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d="M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{isBranching ? "분기 생성 중..." : "여기서부터 분기"}</span>
      </button>
      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled || !copyText.trim()}
        aria-label={isCopied ? "복사됨" : "메시지 복사"}
        title={isCopied ? "복사됨" : "메시지 복사"}
        className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--chat-theme-muted-text)] transition-colors hover:text-[var(--chat-theme-text)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCopied ? (
          <Check className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Copy className="h-3 w-3" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

function getMentionStyle(backgroundColor: string) {
  const isDark = isDarkColor(backgroundColor);
  return isDark
    ? {
        bg: "rgba(255,255,255,0.16)",
        text: "#ffffff",
        border: "rgba(255,255,255,0.24)",
      }
    : {
        bg: "rgba(0,0,0,0.08)",
        text: "#111827",
        border: "rgba(0,0,0,0.14)",
      };
}

function isDarkColor(hexColor: string) {
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return true;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance < 0.55;
}

function BubbleTypingDots({
  color,
  compact = false,
}: {
  color: string;
  compact?: boolean;
}) {
  const dotSize = compact ? "h-1 w-1" : "h-1.5 w-1.5";

  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      <span
        className={cn(
          dotSize,
          "animate-bounce rounded-full motion-reduce:animate-none [animation-delay:0ms]",
        )}
        style={{ backgroundColor: color }}
      />
      <span
        className={cn(
          dotSize,
          "animate-bounce rounded-full motion-reduce:animate-none [animation-delay:150ms]",
        )}
        style={{ backgroundColor: color }}
      />
      <span
        className={cn(
          dotSize,
          "animate-bounce rounded-full motion-reduce:animate-none [animation-delay:300ms]",
        )}
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

function BubbleCommandGeneratingIndicator({
  label,
  themeConfig,
}: {
  label: string;
  themeConfig: ChatThemeConfig;
}) {
  const themeTextPalette = getChatThemeTextPalette(themeConfig.preview.bg);
  const displayLabel = label.replace(/\.+$/u, "");

  return (
    <div className="flex justify-start">
      <div
        role="status"
        aria-live="polite"
        className="flex max-w-[92%] flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5"
        style={{
          backgroundColor: themeTextPalette.panelBg,
          borderColor: themeTextPalette.panelBorder,
          color: themeTextPalette.mutedText,
          fontSize: 11,
          lineHeight: 1.45,
        }}
      >
        <BubbleTypingDots color={themeTextPalette.indicator} compact />
        <span>{displayLabel}</span>
      </div>
    </div>
  );
}

function BubbleMessageGeneratingIndicator({
  label,
  themeConfig,
  textSize,
  lineHeight,
}: {
  label: string;
  themeConfig: ChatThemeConfig;
  textSize: number;
  lineHeight: number;
}) {
  const displayLabel = label.replace(/\.+$/u, "");

  return (
    <div className="flex justify-start">
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-10 w-fit max-w-[82%] flex-col items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 opacity-70 sm:max-w-[80%]"
        style={{
          backgroundColor: themeConfig.preview.aiBubble,
          color: themeConfig.preview.aiText,
          fontSize: Math.max(12, textSize - 1),
          lineHeight,
        }}
      >
        <BubbleTypingDots color="currentColor" />
        <span>{displayLabel}</span>
      </div>
    </div>
  );
}

function BubbleImageGeneratingIndicator({
  label,
  themeConfig,
}: {
  label: string;
  themeConfig: ChatThemeConfig;
}) {
  const [dotCount, setDotCount] = useState(1);
  const baseLabel = label.replace(/\.+$/, "");
  const themeTextPalette = getChatThemeTextPalette(themeConfig.preview.bg);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDotCount((current) => (current >= 3 ? 1 : current + 1));
    }, 360);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex justify-start">
      <div
        className="w-full max-w-[82%] overflow-hidden rounded-2xl"
        style={{
          backgroundColor: themeTextPalette.panelBg,
          borderColor: themeTextPalette.panelBorder,
        }}
      >
        <div className="flex aspect-square max-h-80 min-h-48 w-full flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 animate-bounce rounded-full [animation-delay:0ms]"
              style={{ backgroundColor: themeTextPalette.indicator }}
            />
            <span
              className="h-2 w-2 animate-bounce rounded-full [animation-delay:150ms]"
              style={{ backgroundColor: themeTextPalette.indicator }}
            />
            <span
              className="h-2 w-2 animate-bounce rounded-full [animation-delay:300ms]"
              style={{ backgroundColor: themeTextPalette.indicator }}
            />
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: themeTextPalette.mutedText }}
            aria-live="polite"
          >
            {baseLabel}
            {/* <span className="inline-block w-5 text-left">
              {".".repeat(dotCount)}
            </span> */}
          </p>
        </div>
      </div>
    </div>
  );
}
