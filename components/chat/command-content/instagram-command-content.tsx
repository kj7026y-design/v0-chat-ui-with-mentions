"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { decodeCommandMarkup } from "./command-markup";

interface InstagramCommandContentProps {
  content: string;
  textColor: string;
  mutedTextColor: string;
}

const INSTAGRAM_COMMENT_TAG_PATTERN =
  /^<ig-comment (?:nickname|author)="([^"]*)" time="([^"]*)" reply="(true|false)"(?: reply-to="([^"]*)")?>(.*)<\/ig-comment>$/u;

interface TaggedInstagramComment {
  line: string;
  nickname: string;
  isReply: boolean;
  replyTo?: string;
  comment: string;
}

function parseTaggedInstagramComment(
  line: string,
): TaggedInstagramComment | undefined {
  const match = line.trim().match(INSTAGRAM_COMMENT_TAG_PATTERN);
  if (!match) return undefined;
  return {
    line,
    nickname: decodeCommandMarkup(match[1]),
    isReply: match[3] === "true",
    replyTo: match[4] ? decodeCommandMarkup(match[4]) : undefined,
    comment: decodeCommandMarkup(match[5]),
  };
}

function normalizeInstagramReplyTarget(value?: string) {
  return value
    ?.replace(/^@/u, "")
    .replace(/[._-]+$/u, "")
    .toLowerCase();
}

function getInstagramReplyTarget(comment: TaggedInstagramComment) {
  if (comment.replyTo) return normalizeInstagramReplyTarget(comment.replyTo);
  const mentionedNickname = comment.comment.match(
    /@([A-Za-z0-9][A-Za-z0-9._-]{0,23})/u,
  )?.[1];
  return normalizeInstagramReplyTarget(mentionedNickname);
}

function orderTaggedInstagramCommentLines(lines: string[]) {
  const orderedLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== "<ig-post>") {
      orderedLines.push(lines[index]);
      continue;
    }

    const postEndIndex = lines.findIndex(
      (line, lineIndex) => lineIndex > index && line.trim() === "</ig-post>",
    );
    if (postEndIndex < 0) {
      orderedLines.push(lines[index]);
      continue;
    }

    const postLines = lines.slice(index + 1, postEndIndex);
    const comments = postLines
      .map(parseTaggedInstagramComment)
      .filter((comment): comment is TaggedInstagramComment => Boolean(comment));
    const contentLines = postLines.filter(
      (line) => !parseTaggedInstagramComment(line),
    );
    const topLevelComments = comments.filter((comment) => !comment.isReply);
    const topLevelByNickname = new Map(
      topLevelComments.map((comment) => [
        comment.nickname.toLowerCase(),
        comment,
      ]),
    );
    const repliesByParent = new Map<
      TaggedInstagramComment,
      TaggedInstagramComment[]
    >();
    const unresolvedReplies: TaggedInstagramComment[] = [];

    for (
      let commentIndex = 0;
      commentIndex < comments.length;
      commentIndex += 1
    ) {
      const comment = comments[commentIndex];
      if (!comment.isReply) continue;
      const explicitParent = topLevelByNickname.get(
        getInstagramReplyTarget(comment) ?? "",
      );
      const fallbackParent = [...comments.slice(0, commentIndex)]
        .reverse()
        .find((candidate) => !candidate.isReply);
      const parent = explicitParent ?? fallbackParent;
      if (!parent) {
        unresolvedReplies.push(comment);
        continue;
      }
      repliesByParent.set(parent, [
        ...(repliesByParent.get(parent) ?? []),
        comment,
      ]);
    }

    orderedLines.push(lines[index], ...contentLines);
    for (const comment of topLevelComments) {
      orderedLines.push(comment.line);
      orderedLines.push(
        ...(repliesByParent.get(comment) ?? []).map((reply) => reply.line),
      );
    }
    orderedLines.push(
      ...unresolvedReplies.map((reply) => reply.line),
      lines[postEndIndex],
    );
    index = postEndIndex;
  }

  return orderedLines;
}

export function InstagramCommandContent({
  content,
  textColor,
  mutedTextColor,
}: InstagramCommandContentProps) {
  const rawLines = content.split(/\r?\n/);
  const renderedLines: ReactNode[] = [];
  const isTaggedContent = content.trimStart().startsWith("<ig>");
  const lines = isTaggedContent
    ? orderTaggedInstagramCommentLines(rawLines)
    : rawLines;

  const renderComment = ({
    nickname,
    elapsedTime,
    comment,
    isReply,
    key,
  }: {
    nickname: string;
    elapsedTime: string;
    comment: string;
    isReply: boolean;
    key: string;
  }) => (
    <div key={key} className={cn("mt-1", isReply && "mt-0")}>
      {isReply && (
        <span
          className="mr-1 text-xs font-medium"
          style={{ color: mutedTextColor }}
        >
          └
        </span>
      )}
      <strong className="mr-2 font-bold" style={{ color: textColor }}>
        {nickname}
      </strong>
      {comment && (
        <>
          <span
            className="mt-0.5 whitespace-pre-wrap break-words"
            style={{ color: textColor }}
          >
            {comment}
          </span>
          <span
            className="ml-2 text-[11px] font-medium"
            style={{ color: mutedTextColor }}
          >
            {elapsedTime}
          </span>
        </>
      )}
    </div>
  );

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (isTaggedContent) {
      const commentTag = line.match(INSTAGRAM_COMMENT_TAG_PATTERN);
      if (commentTag) {
        renderedLines.push(
          renderComment({
            nickname: decodeCommandMarkup(commentTag[1]),
            elapsedTime: decodeCommandMarkup(commentTag[2]),
            comment: decodeCommandMarkup(commentTag[5]),
            isReply: commentTag[3] === "true",
            key: `instagram-tagged-comment-${index}`,
          }),
        );
        continue;
      }

      const contentTag = line.match(
        /^<ig-(title|divider|image|caption|stats)>(.*)<\/ig-\1>$/u,
      );
      if (contentTag) {
        const className =
          contentTag[1] === "divider"
            ? "mt-2 mb-4 border-b border-black"
            : contentTag[1] === "caption"
              ? "my-1"
              : contentTag[1] === "stats"
                ? "mb-2"
                : "";
        renderedLines.push(
          <div
            key={`instagram-tagged-${contentTag[1]}-${index}`}
            className={cn(
              "whitespace-pre-wrap break-words [word-break:keep-all]",
              className,
            )}
          >
            {decodeCommandMarkup(contentTag[2])}
          </div>,
        );
        continue;
      }

      if (line === "<ig-gap />") {
        renderedLines.push(
          <div
            key={`instagram-tagged-gap-${index}`}
            className="my-4 border-b"
          />,
        );
        continue;
      }

      if (/^<\/?ig(?:>|-post>)/u.test(line)) continue;
    }

    const commentHeader = line.match(
      /^(ㄴ\s+)?(.+?)\s+·\s+(\d+(?:주|일|시간|분|초))$/u,
    );
    if (commentHeader) {
      renderedLines.push(
        renderComment({
          nickname: commentHeader[2].trim(),
          elapsedTime: commentHeader[3],
          comment: lines[index + 1]?.trim() ?? "",
          isReply: Boolean(commentHeader[1]),
          key: `instagram-comment-${index}`,
        }),
      );
      index += 1;
      continue;
    }

    if (!line) {
      renderedLines.push(
        <div key={`instagram-space-${index}`} className="h-2" />,
      );
      continue;
    }

    if (/^(?:🅾\s*)?INSTAGRAM(?:\s*·.*)?$/iu.test(line)) {
      renderedLines.push(
        <div
          key={`instagram-edited-title-${index}`}
          className="whitespace-pre-wrap break-words font-bold [word-break:keep-all]"
        >
          {line}
        </div>,
        <div
          key={`instagram-edited-divider-${index}`}
          className="mt-2 mb-4 border-b border-black"
        />,
      );
      continue;
    }

    if (line === "댓글") {
      renderedLines.push(
        <div
          key={`instagram-label-${index}`}
          className="mt-2 font-semibold"
          style={{ color: textColor }}
        >
          댓글
        </div>,
      );
      continue;
    }

    renderedLines.push(
      <div
        key={`instagram-line-${index}`}
        className="whitespace-pre-wrap break-words [word-break:keep-all]"
      >
        {line}
      </div>,
    );
  }

  return <div style={{ color: textColor }}>{renderedLines}</div>;
}
