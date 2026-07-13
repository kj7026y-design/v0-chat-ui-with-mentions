"use client"

import { type CSSProperties } from "react"
import { useTheme } from "@/components/theme-provider"
import { type StartScenario } from "@/lib/store"
import { getIntroPreviewText, type IntroScenario } from "@/lib/storychat-storage"
import { cn } from "@/lib/utils"

type ChatThemeId = "system" | "light" | "dark" | "message" | "messenger"

interface ChatThemeConfig {
  id: ChatThemeId
  preview: {
    bg: string
    userBubble: string
    userText: string
    aiBubble: string
    aiText: string
  }
}

interface EmptyChatStateProps {
  characterName: string
  characterEmoji: string
  startScenario?: StartScenario | null
  onSuggestionClick: (suggestion: string) => void
  introScenarios?: IntroScenario[]
  selectedIntroScenarioId?: string
  onIntroSelect?: (introId: string) => void
  textSize?: number
  lineHeight?: number
  chatTheme?: ChatThemeId
}

const SUGGESTIONS = ["당신은 누구죠?", "여긴 어디예요?", "내가 왜 여기 있는 거죠?"]

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
}

function isDarkColor(hexColor: string) {
  const hex = hexColor.replace("#", "")
  if (hex.length !== 6) return true
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
  return luminance < 0.55
}

function getTextPalette(backgroundColor: string) {
  const isDark = isDarkColor(backgroundColor)
  return isDark
    ? {
        text: "#F5F5F5",
        mutedText: "rgba(245,245,245,0.72)",
        panelBg: "rgba(255,255,255,0.08)",
        panelBorder: "rgba(255,255,255,0.16)",
      }
    : {
        text: "#1F2937",
        mutedText: "rgba(31,41,55,0.68)",
        panelBg: "rgba(255,255,255,0.68)",
        panelBorder: "rgba(17,24,39,0.14)",
      }
}

function getThemeConfig(chatTheme: ChatThemeId, resolvedTheme: "light" | "dark") {
  if (chatTheme === "system") return resolvedTheme === "dark" ? chatThemes.dark : chatThemes.light
  return chatThemes[chatTheme]
}

export function EmptyChatState({
  characterName,
  characterEmoji,
  startScenario,
  onSuggestionClick,
  introScenarios = [],
  selectedIntroScenarioId,
  onIntroSelect,
  textSize = 16,
  lineHeight = 1.5,
  chatTheme = "system",
}: EmptyChatStateProps) {
  const { resolvedTheme } = useTheme()
  const hasIntros = introScenarios.length > 0
  const selectedIntro =
    introScenarios.find((intro) => intro.id === selectedIntroScenarioId) ??
    (introScenarios.length === 1 ? introScenarios[0] : undefined)
  const themeConfig = getThemeConfig(chatTheme, resolvedTheme)
  const pagePalette = getTextPalette(themeConfig.preview.bg)
  const panelPalette = getTextPalette(themeConfig.preview.aiBubble)
  const selectedCardStyle = {
    backgroundColor: `color-mix(in srgb, ${themeConfig.preview.userBubble} 12%, ${themeConfig.preview.aiBubble})`,
    borderColor: "transparent",
    color: themeConfig.preview.aiText,
  } satisfies CSSProperties
  const panelStyle = {
    backgroundColor: pagePalette.panelBg,
    borderColor: pagePalette.panelBorder,
    color: pagePalette.text,
  } satisfies CSSProperties
  const optionStyle = {
    backgroundColor: themeConfig.preview.aiBubble,
    borderColor: pagePalette.panelBorder,
    color: themeConfig.preview.aiText,
  } satisfies CSSProperties

  return (
    <div className="flex min-h-full flex-col items-center px-6 pb-8 pt-8 text-center" style={{ color: pagePalette.text }}>
      {/* Character Avatar */}
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={panelStyle}>
        <span className="text-4xl">{characterEmoji}</span>
      </div>

      <h2 className="text-lg font-semibold" style={{ color: pagePalette.text }}>{characterName}</h2>

      {hasIntros ? (
        <div className="mt-5 w-full max-w-sm space-y-4">
          {introScenarios.length > 1 && (
            <div className="space-y-2">
              <p className="font-semibold" style={{ color: pagePalette.text, fontSize: textSize, lineHeight }}>
                시작 장면을 선택하세요
              </p>
              <div className="grid gap-2">
                {introScenarios.map((intro) => {
                  const isSelected = selectedIntro?.id === intro.id
                  const currentCardPalette = isSelected ? panelPalette : pagePalette
                  return (
                  <button
                    key={intro.id}
                    type="button"
                    onClick={() => onIntroSelect?.(intro.id)}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition-colors",
                    )}
                    style={isSelected ? selectedCardStyle : panelStyle}
                  >
                    <span className="block font-semibold" style={{ color: currentCardPalette.text, fontSize: textSize, lineHeight }}>{intro.title}</span>
                    <span className="mt-1 line-clamp-2 block" style={{ color: currentCardPalette.mutedText, fontSize: Math.max(12, textSize - 2), lineHeight }}>
                      {getIntroPreviewText(intro)}
                    </span>
                  </button>
                  )
                })}
              </div>
            </div>
          )}

          {selectedIntro && (
            <ChatIntroPreview
              intro={selectedIntro}
              onOptionClick={onSuggestionClick}
              textSize={textSize}
              lineHeight={lineHeight}
              themeConfig={themeConfig}
              pagePalette={pagePalette}
              panelStyle={panelStyle}
              optionStyle={optionStyle}
            />
          )}
        </div>
      ) : (
        <>
          {startScenario && (
            <div className="mt-4 w-full max-w-xs rounded-2xl border px-4 py-3" style={panelStyle}>
              <p className="font-medium" style={{ color: pagePalette.mutedText, fontSize: Math.max(11, textSize - 4), lineHeight }}>{startScenario.title}</p>
              <p className="mt-1 text-pretty" style={{ color: pagePalette.text, fontSize: textSize, lineHeight }}>
                {startScenario.content}
              </p>
            </div>
          )}
          <div className="mt-5 w-full max-w-xs rounded-2xl border border-dashed px-4 py-4" style={panelStyle}>
            <p className="font-semibold" style={{ color: pagePalette.text, fontSize: textSize, lineHeight }}>자유 도입</p>
            <p className="mt-2" style={{ color: pagePalette.mutedText, fontSize: textSize, lineHeight }}>
              아직 정해진 시작 장면이 없어요. 원하는 방식으로 첫 문장을 입력해 이야기를 시작해보세요.
            </p>
          </div>
          <div className="flex flex-col gap-2 mt-4 w-full max-w-xs">
            {["나는 무너진 성문 앞에 멈춰 선다.", `${characterName}, 여기가 어디야?`, ...SUGGESTIONS].slice(0, 4).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSuggestionClick(suggestion)}
                className="px-4 py-3 rounded-2xl border transition-colors"
                style={{ ...optionStyle, fontSize: textSize, lineHeight }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ChatIntroPreview({
  intro,
  onOptionClick,
  textSize,
  lineHeight,
  themeConfig,
  pagePalette,
  panelStyle,
  optionStyle,
}: {
  intro: IntroScenario
  onOptionClick: (suggestion: string) => void
  textSize: number
  lineHeight: number
  themeConfig: ChatThemeConfig
  pagePalette: ReturnType<typeof getTextPalette>
  panelStyle: CSSProperties
  optionStyle: CSSProperties
}) {
  const optionPalette = getTextPalette(themeConfig.preview.aiBubble)

  return (
    <div className="overflow-hidden rounded-lg border text-left" style={panelStyle}>
      {intro.imageUrl && (
        <img src={intro.imageUrl} alt={intro.title} className="h-36 w-full object-cover" />
      )}
      <div className="space-y-3 px-4 py-4">
        <div>
          <p className="font-bold" style={{ color: pagePalette.text, fontSize: textSize, lineHeight }}>{intro.title}</p>
          {intro.scene && <p className="mt-2" style={{ color: pagePalette.mutedText, fontSize: textSize, lineHeight }}>{intro.scene}</p>}
        </div>
        {intro.firstMessage && (
          <button
            type="button"
            onClick={() => onOptionClick(intro.firstMessage ?? "")}
            className="w-full rounded-2xl border px-3 py-3 text-left transition-colors"
            style={optionStyle}
          >
            <p className="font-medium" style={{ color: optionPalette.mutedText, fontSize: Math.max(11, textSize - 4), lineHeight }}>첫 메시지</p>
            <p className="mt-1" style={{ color: optionPalette.text, fontSize: textSize, lineHeight }}>{intro.firstMessage}</p>
          </button>
        )}
        {(intro.options?.length ?? 0) > 0 && (
          <div className="space-y-2">
            {intro.options?.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onOptionClick(option)}
                className="w-full rounded-2xl border px-3 py-2.5 text-left transition-colors"
                style={{ ...optionStyle, color: optionPalette.text, fontSize: textSize, lineHeight }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
