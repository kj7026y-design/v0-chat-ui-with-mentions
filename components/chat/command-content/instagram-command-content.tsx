"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { decodeCommandMarkup } from "./command-markup"

interface InstagramCommandContentProps {
  content: string
  textColor: string
  mutedTextColor: string
}

export function InstagramCommandContent({
  content,
  textColor,
  mutedTextColor,
}: InstagramCommandContentProps) {
  const lines = content.split(/\r?\n/)
  const renderedLines: ReactNode[] = []
  const isTaggedContent = content.trimStart().startsWith("<ig>")

  const renderComment = ({
    nickname,
    elapsedTime,
    comment,
    isReply,
    key,
  }: {
    nickname: string
    elapsedTime: string
    comment: string
    isReply: boolean
    key: string
  }) => (
    <div key={key} className={cn("mt-1", isReply && "mt-0")}>
      {isReply && (
        <span className="mr-1 text-xs font-medium" style={{ color: mutedTextColor }}>
          └─
        </span>
      )}
      <strong className="mr-2 font-bold" style={{ color: textColor }}>
        {nickname}
      </strong>
      {comment && (
        <>
          <span className="mt-0.5 whitespace-pre-wrap break-words" style={{ color: textColor }}>
            {comment}
          </span>
          <span className="ml-2 text-[11px] font-medium" style={{ color: mutedTextColor }}>
            {elapsedTime}
          </span>
        </>
      )}
    </div>
  )

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim()

    if (isTaggedContent) {
      const commentTag = line.match(
        /^<ig-comment (?:nickname|author)="([^"]*)" time="([^"]*)" reply="(true|false)">(.*)<\/ig-comment>$/u,
      )
      if (commentTag) {
        renderedLines.push(renderComment({
          nickname: decodeCommandMarkup(commentTag[1]),
          elapsedTime: decodeCommandMarkup(commentTag[2]),
          comment: decodeCommandMarkup(commentTag[4]),
          isReply: commentTag[3] === "true",
          key: `instagram-tagged-comment-${index}`,
        }))
        continue
      }

      const contentTag = line.match(/^<ig-(title|divider|image|caption|stats)>(.*)<\/ig-\1>$/u)
      if (contentTag) {
        const className = contentTag[1] === "divider"
          ? "mt-2 mb-4 border-b border-black"
          : contentTag[1] === "caption"
            ? "my-1"
            : contentTag[1] === "stats"
              ? "mb-2"
              : ""
        renderedLines.push(
          <div
            key={`instagram-tagged-${contentTag[1]}-${index}`}
            className={cn("whitespace-pre-wrap break-words [word-break:keep-all]", className)}
          >
            {decodeCommandMarkup(contentTag[2])}
          </div>,
        )
        continue
      }

      if (line === "<ig-gap />") {
        renderedLines.push(<div key={`instagram-tagged-gap-${index}`} className="my-4 border-b" />)
        continue
      }

      if (/^<\/?ig(?:>|-post>)/u.test(line)) continue
    }

    const commentHeader = line.match(/^(ㄴ\s+)?(.+?)\s+·\s+(\d+(?:주|일|시간|분|초))$/u)
    if (commentHeader) {
      renderedLines.push(renderComment({
        nickname: commentHeader[2].trim(),
        elapsedTime: commentHeader[3],
        comment: lines[index + 1]?.trim() ?? "",
        isReply: Boolean(commentHeader[1]),
        key: `instagram-comment-${index}`,
      }))
      index += 1
      continue
    }

    if (!line) {
      renderedLines.push(<div key={`instagram-space-${index}`} className="h-2" />)
      continue
    }

    if (line === "댓글") {
      renderedLines.push(
        <div key={`instagram-label-${index}`} className="mt-2 font-semibold" style={{ color: textColor }}>
          댓글
        </div>,
      )
      continue
    }

    renderedLines.push(
      <div key={`instagram-line-${index}`} className="whitespace-pre-wrap break-words [word-break:keep-all]">
        {line}
      </div>,
    )
  }

  return <div style={{ color: textColor }}>{renderedLines}</div>
}
