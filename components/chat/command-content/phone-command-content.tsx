"use client"

import { decodeCommandMarkup } from "./command-markup"

const PHONE_SECTION_TITLES = new Set([
  "📞 최근 통화 기록",
  "💬 최근 문자 목록",
  "🔍 최근 브라우저 검색 기록",
  "▶️ 최근 유튜브 시청 기록",
  "💳 최근 결제 내역",
  "📱 최근 실행 앱",
])

interface PhoneCommandContentProps {
  content: string
  textColor: string
}

export function PhoneCommandContent({
  content,
  textColor,
}: PhoneCommandContentProps) {
  const lines = content.split(/\r?\n/)

  return (
    <div
      className="font-mono text-[11px] leading-[1.55] tracking-[-0.025em] sm:text-xs"
      style={{ color: textColor }}
    >
      {lines.map((line, index) => {
        const statusTag = line.trim().match(
          /^<phone-status><phone-time>(.*)<\/phone-time><phone-icons>(.*)<\/phone-icons><\/phone-status>$/u,
        )
        const legacyStatus = line.match(/^(\d{1,2}:\d{2})\s{2,}(.+)$/u)
        if (statusTag || legacyStatus) {
          return (
            <div
              key={`phone-status-${index}`}
              className="flex w-full min-w-[260px] items-center justify-between gap-4"
            >
              <span>{decodeCommandMarkup(statusTag?.[1] ?? legacyStatus?.[1] ?? "")}</span>
              <span className="whitespace-nowrap text-right">
                {decodeCommandMarkup(statusTag?.[2] ?? legacyStatus?.[2] ?? "")}
              </span>
            </div>
          )
        }
        if (line.trim() === "<phone-divider></phone-divider>" || /^━{5,}$/u.test(line.trim())) {
          return <div key={`phone-divider-${index}`} className="mt-2 mb-3 border-b border-black" />
        }

        const trimmedLine = line.trim()
        if (PHONE_SECTION_TITLES.has(trimmedLine)) {
          const hasPreviousSection = lines
            .slice(0, index)
            .some((previousLine) => PHONE_SECTION_TITLES.has(previousLine.trim()))
          return (
            <div key={`phone-section-${index}`}>
              {hasPreviousSection && <div className="my-3 border-b" />}
              <div className="font-bold">{trimmedLine}</div>
            </div>
          )
        }
        if (!line) {
          const nextLine = lines[index + 1]?.trim() ?? ""
          return PHONE_SECTION_TITLES.has(nextLine)
            ? null
            : <div key={`phone-space-${index}`} className="h-2" />
        }
        return (
          <div
            key={`phone-line-${index}`}
            className="whitespace-pre-wrap break-words [word-break:keep-all]"
          >
            {line}
          </div>
        )
      })}
    </div>
  )
}
