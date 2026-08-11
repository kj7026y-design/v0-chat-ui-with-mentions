"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { ChatMessage } from "@/lib/chat-types";
import { cn } from "@/lib/utils";
import { BookOpen, Check } from "lucide-react";
import { useEffect, useState } from "react";

function normalizeCandidateContent(content: string) {
  return content
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface MessageCandidateControlsProps {
  message: ChatMessage;
  disabled?: boolean;
  textSize: number;
  lineHeight: number;
  onSelectCandidate?: (messageId: string, candidateId: string) => void;
}

export function MessageCandidateControls({
  message,
  disabled = false,
  textSize,
  lineHeight,
  onSelectCandidate,
}: MessageCandidateControlsProps) {
  const [open, setOpen] = useState(false);
  const [expandedCandidateId, setExpandedCandidateId] = useState("");
  const candidates = message.messageCandidates ?? [];
  const alternativeCount = Math.max(0, candidates.length - 1);
  const selectedCandidateId =
    message.selectedCandidateId ?? candidates[0]?.id ?? "";

  useEffect(() => {
    if (open && selectedCandidateId) {
      setExpandedCandidateId(selectedCandidateId);
    }
  }, [open, selectedCandidateId]);

  if (alternativeCount === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setExpandedCandidateId(selectedCandidateId);
          setOpen(true);
        }}
        disabled={disabled}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--chat-theme-panel-border)] bg-[var(--chat-theme-panel-bg)] px-2.5 text-xs font-semibold text-[var(--chat-theme-text)] transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10"
        aria-label={`다른 전개 ${alternativeCount}개 보기`}
      >
        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
        <span>다른 전개 {alternativeCount}개</span>
      </button>

      <Drawer
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          setExpandedCandidateId(nextOpen ? selectedCandidateId : "");
        }}
      >
        <DrawerContent className="mx-auto max-h-[82dvh] max-w-md border-border bg-card">
          <DrawerHeader className="px-5 pb-2 pt-5 text-left">
            <DrawerTitle className="text-base font-bold">다른 전개</DrawerTitle>
            <DrawerDescription className="sr-only">
              생성된 답변 후보 목록
            </DrawerDescription>
          </DrawerHeader>

          <div className="overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
            <Accordion
              type="single"
              collapsible
              value={expandedCandidateId}
              onValueChange={setExpandedCandidateId}
              className="space-y-2"
            >
              {candidates.map((candidate, index) => {
                const selected = candidate.id === message.selectedCandidateId;
                return (
                  <AccordionItem
                    key={candidate.id}
                    value={candidate.id}
                    className={cn(
                      "overflow-hidden rounded-lg border transition-colors last:border-b",
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background/60 text-foreground",
                    )}
                  >
                    <AccordionTrigger className="items-center px-3 py-3 text-xs hover:bg-accent hover:no-underline">
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-1">
                        <span className="font-semibold">전개 {index + 1}</span>
                        {selected && (
                          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            선택됨
                          </span>
                        )}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3">
                      <div
                        className="whitespace-pre-wrap break-words [word-break:keep-all]"
                        style={{ fontSize: textSize, lineHeight }}
                      >
                        {normalizeCandidateContent(candidate.content)}
                      </div>
                      <button
                        type="button"
                        disabled={disabled || selected || !onSelectCandidate}
                        onClick={() => {
                          onSelectCandidate?.(message.id, candidate.id);
                          setExpandedCandidateId("");
                          setOpen(false);
                        }}
                        className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                      >
                        {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        {selected ? "현재 전개" : "이 전개 선택"}
                      </button>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
