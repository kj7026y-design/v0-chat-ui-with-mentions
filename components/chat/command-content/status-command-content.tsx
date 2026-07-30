"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { decodeCommandMarkup } from "./command-markup"

interface StatusCommandContentProps {
  content: string
  textColor: string
  renderSearchText?: (text: string, key: string) => ReactNode
}

export function StatusCommandContent({
  content,
  textColor,
  renderSearchText,
}: StatusCommandContentProps) {
  if (!content.trimStart().startsWith("<status>")) {
    const [firstLine = "", ...bodyLines] = content.split(/\r?\n/u)
    if (/상태창/u.test(firstLine)) {
      return (
        <div style={{ color: textColor }}>
          <div className="whitespace-pre-wrap break-words font-bold [word-break:keep-all]">
            {renderSearchText?.(firstLine, "status-title") ?? firstLine}
          </div>
          <div className="mt-2 mb-3 border-b border-black" />
          <div className="whitespace-pre-wrap break-words [word-break:keep-all]">
            {renderSearchText?.(bodyLines.join("\n"), "status-body") ??
              bodyLines.join("\n")}
          </div>
        </div>
      )
    }
    return (
      <div className="whitespace-pre-wrap break-words [word-break:keep-all]">
        {renderSearchText?.(content, "status-content") ?? content}
      </div>
    )
  }

  const renderedLines: ReactNode[] = []

  content.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim()
    if (/^<\/?status>$/u.test(line)) return

    const dividerTag = line.match(/^<status-divider tone="(strong|muted)"><\/status-divider>$/u)
    if (dividerTag) {
      renderedLines.push(
        <div
          key={`status-divider-${index}`}
          className={dividerTag[1] === "strong" ? "mt-2 mb-3 border-b border-black" : "my-3 border-b"}
        />,
      )
      return
    }

    const contentTag = line.match(/^<status-(title|date|meta|summary|thought)>(.*)<\/status-\1>$/u)
    if (!contentTag) return

    const type = contentTag[1]
    renderedLines.push(
      <div
        key={`status-${type}-${index}`}
        className={cn(
          "whitespace-pre-wrap break-words [word-break:keep-all]",
          type === "thought" && "mt-3",
        )}
      >
        {(() => {
          const text = decodeCommandMarkup(contentTag[2])
          return renderSearchText?.(text, `status-${type}-${index}`) ?? text
        })()}
      </div>,
    )
  })

  return <div style={{ color: textColor }}>{renderedLines}</div>
}
