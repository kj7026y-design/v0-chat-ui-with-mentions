"use client";

import type { ReactNode } from "react";
import { decodeCommandMarkup } from "./command-markup";

const PHONE_SECTION_TITLES = new Set([
  "📱 휴대폰",
  "🖼️ 배경화면",
  "📞 최근 통화 기록",
  "💬 최근 문자 목록",
  "👥 단체 채팅",
  "🔍 최근 브라우저 검색 기록",
  "▶️ 최근 유튜브 시청 기록",
  "💳 최근 결제 내역",
  "📱 최근 실행 앱",
]);

const SPACED_PHONE_LIST_SECTIONS = new Set([
  "💬 최근 문자 목록",
  "👥 단체 채팅",
  "💳 최근 결제 내역",
]);

interface PhoneCommandContentProps {
  content: string;
  textColor: string;
  renderSearchText?: (text: string, key: string) => ReactNode;
}

function renderPhoneLine(
  line: string,
  renderSearchText?: (text: string, key: string) => ReactNode,
  keyPrefix = "phone-line",
) {
  return line.split(/(<phone-time>.*?<\/phone-time>)/gu).map((part, index) => {
    const timeTag = part.match(/^<phone-time>(.*?)<\/phone-time>$/u);
    if (timeTag) {
      const text = decodeCommandMarkup(timeTag[1]);
      return (
        <span
          key={`phone-time-${index}`}
          style={{ color: "var(--color-gray-400)" }}
        >
          {renderSearchText?.(text, `${keyPrefix}-time-${index}`) ?? text}
        </span>
      );
    }
    const text = decodeCommandMarkup(part);
    return renderSearchText?.(text, `${keyPrefix}-text-${index}`) ?? text;
  });
}

function getSpacedPhoneLineIndexes(lines: string[]) {
  const spacedIndexes = new Set<number>();
  let currentSection = "";
  let listItemIndex = 0;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (PHONE_SECTION_TITLES.has(trimmedLine)) {
      currentSection = trimmedLine;
      listItemIndex = 0;
      return;
    }
    if (!trimmedLine || !SPACED_PHONE_LIST_SECTIONS.has(currentSection)) return;
    if (currentSection === "👥 단체 채팅" && /^\[.*\]$/u.test(trimmedLine))
      return;

    const isCharacterReply =
      currentSection === "💬 최근 문자 목록" && trimmedLine.startsWith("↪");
    if (!isCharacterReply && listItemIndex > 0) spacedIndexes.add(index);
    listItemIndex += 1;
  });

  return spacedIndexes;
}

export function PhoneCommandContent({
  content,
  textColor,
  renderSearchText,
}: PhoneCommandContentProps) {
  const lines = content.split(/\r?\n/);
  const spacedLineIndexes = getSpacedPhoneLineIndexes(lines);

  return (
    <div
      className="font-mono text-[11px] leading-[1.55] tracking-[-0.025em] sm:text-xs"
      style={{ color: textColor }}
    >
      {lines.map((line, index) => {
        const statusTag = line
          .trim()
          .match(
            /^<phone-status><phone-time>(.*)<\/phone-time><phone-icons>(.*)<\/phone-icons><\/phone-status>$/u,
          );
        const legacyStatus = line.match(/^(\d{1,2}:\d{2})\s{2,}(.+)$/u);
        if (statusTag || legacyStatus) {
          return (
            <div
              key={`phone-status-${index}`}
              className="flex w-full min-w-[260px] items-center justify-between gap-4"
            >
              <span style={{ color: "var(--color-gray-400)" }}>
                {renderPhoneLine(
                  statusTag?.[1] ?? legacyStatus?.[1] ?? "",
                  renderSearchText,
                  `phone-status-time-${index}`,
                )}
              </span>
              <span className="whitespace-nowrap text-right">
                {renderPhoneLine(
                  statusTag?.[2] ?? legacyStatus?.[2] ?? "",
                  renderSearchText,
                  `phone-status-icons-${index}`,
                )}
              </span>
            </div>
          );
        }
        if (
          line.trim() === "<phone-divider></phone-divider>" ||
          /^━{5,}$/u.test(line.trim())
        ) {
          return (
            <div
              key={`phone-divider-${index}`}
              className="mt-2 mb-3 border-b border-black"
            />
          );
        }

        const trimmedLine = line.trim();
        if (PHONE_SECTION_TITLES.has(trimmedLine)) {
          const hasPreviousSection = lines
            .slice(0, index)
            .some((previousLine) =>
              PHONE_SECTION_TITLES.has(previousLine.trim()),
            );
          return (
            <div key={`phone-section-${index}`}>
              {hasPreviousSection && <div className="my-3 border-b" />}
              <div className="font-bold">
                {renderSearchText?.(
                  trimmedLine,
                  `phone-section-${index}`,
                ) ?? trimmedLine}
              </div>
            </div>
          );
        }
        if (!line) {
          const nextLine = lines[index + 1]?.trim() ?? "";
          return PHONE_SECTION_TITLES.has(nextLine) ? null : (
            <div key={`phone-space-${index}`} className="h-2" />
          );
        }
        return (
          <div
            key={`phone-line-${index}`}
            className={`whitespace-pre-wrap break-words [word-break:keep-all]${spacedLineIndexes.has(index) ? " mt-1" : ""}`}
          >
            {renderPhoneLine(
              line,
              renderSearchText,
              `phone-line-${index}`,
            )}
          </div>
        );
      })}
    </div>
  );
}
