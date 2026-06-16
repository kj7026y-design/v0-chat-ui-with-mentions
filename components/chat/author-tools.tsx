"use client"

import { RefreshCw, Pencil, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

interface AuthorToolsProps {
  messageId: string
  onRewrite?: (messageId: string) => void
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  isEdited?: boolean
  canRewrite?: boolean
  disabled?: boolean
}

export function AuthorTools({ 
  messageId, 
  onRewrite, 
  onEdit, 
  onDelete,
  isEdited,
  canRewrite = true,
  disabled = false,
}: AuthorToolsProps) {
  const tools = [
    { 
      icon: RefreshCw, 
      label: "다시 쓰기", 
      action: () => onRewrite?.(messageId),
      className: "hover:text-foreground hover:bg-accent",
      visible: canRewrite,
    },
    { 
      icon: Pencil, 
      label: "문장 수정", 
      action: () => onEdit?.(messageId),
      className: "hover:text-purple-400 hover:bg-purple-900/30",
      visible: true,
    },
  ]

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-popover border border-border shadow-lg">
      {tools.filter((tool) => tool.visible).map((tool) => (
        <button
          key={tool.label}
          onClick={tool.action}
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1.5 rounded-md",
            "text-muted-foreground text-[11px] font-medium",
            "transition-all duration-150",
            "disabled:cursor-not-allowed disabled:opacity-50",
            tool.className
          )}
          title={tool.label}
        >
          <tool.icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{tool.label}</span>
        </button>
      ))}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            disabled={disabled}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-md",
              "text-muted-foreground text-[11px] font-medium",
              "transition-all duration-150 hover:text-red-400 hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-50",
            )}
            title="기억 삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">기억 삭제</span>
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>메시지를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제한 메시지는 되돌릴 수 없어요. 이 메시지를 채팅에서 삭제합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete?.(messageId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Edited indicator */}
      {isEdited && (
        <div className="w-2 h-2 rounded-full bg-purple-500 ml-1" title="수정됨" />
      )}
    </div>
  )
}
