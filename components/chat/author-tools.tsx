"use client";

import { useState } from "react";
import { RefreshCw, Pencil, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui/app-modal";

interface AuthorToolsProps {
  messageId: string;
  onRewrite?: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  canRewrite?: boolean;
  disabled?: boolean;
  itemType?: "message" | "image";
}

export function AuthorTools({
  messageId,
  onRewrite,
  onEdit,
  onDelete,
  canRewrite = true,
  disabled = false,
  itemType = "message",
}: AuthorToolsProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const isImage = itemType === "image";
  const tools = [
    {
      icon: RefreshCw,
      label: isImage ? "새로 생성" : "다시 쓰기",
      action: () => onRewrite?.(messageId),
      visible: canRewrite,
    },
    {
      icon: Pencil,
      label: isImage ? "프롬프트 수정" : "문장 수정",
      action: () => onEdit?.(messageId),
      visible: true,
    },
  ];

  return (
    <div className="flex items-center gap-1">
      {tools
        .filter((tool) => tool.visible)
        .map((tool) => (
          <button
            key={tool.label}
            type="button"
            onClick={tool.action}
            disabled={disabled}
            aria-label={tool.label}
            title={tool.label}
            className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--chat-theme-muted-text)] transition-colors hover:text-[var(--chat-theme-text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <tool.icon className="h-3 w-3" aria-hidden="true" />
          </button>
        ))}

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsDeleteConfirmOpen(true);
        }}
        aria-label={isImage ? "이미지 삭제" : "메시지 삭제"}
        title={isImage ? "이미지 삭제" : "메시지 삭제"}
        className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--chat-theme-muted-text)] transition-colors hover:text-[var(--chat-theme-text)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 className="h-3 w-3" aria-hidden="true" />
      </button>

      <ConfirmModal
        open={isDeleteConfirmOpen}
        title={isImage ? "이미지를 삭제할까요?" : "메시지를 삭제할까요?"}
        message={
          isImage
            ? "삭제한 이미지는 되돌릴 수 없어요. 채팅과 갤러리에서 이 이미지를 삭제합니다."
            : "삭제한 메시지는 되돌릴 수 없어요. 이 메시지를 채팅에서 삭제합니다."
        }
        confirmText="삭제"
        destructive
        onOpenChange={setIsDeleteConfirmOpen}
        onConfirm={() => onDelete?.(messageId)}
      />
    </div>
  );
}
