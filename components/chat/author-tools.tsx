"use client"

import { useState } from "react"
import { RefreshCw, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AuthorToolsProps {
  messageId: string
  onRewrite?: (messageId: string) => void
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  isEdited?: boolean
}

export function AuthorTools({ 
  messageId, 
  onRewrite, 
  onEdit, 
  onDelete,
  isEdited 
}: AuthorToolsProps) {
  const tools = [
    { 
      icon: RefreshCw, 
      label: "다시 쓰기", 
      action: () => onRewrite?.(messageId),
      className: "hover:text-neutral-100 hover:bg-neutral-700"
    },
    { 
      icon: Pencil, 
      label: "문장 수정", 
      action: () => onEdit?.(messageId),
      className: "hover:text-purple-400 hover:bg-purple-900/30"
    },
    { 
      icon: Trash2, 
      label: "기억 삭제", 
      action: () => onDelete?.(messageId),
      className: "hover:text-red-400 hover:bg-red-900/30"
    },
  ]

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-900/95 border border-neutral-800 shadow-lg">
      {tools.map((tool) => (
        <button
          key={tool.label}
          onClick={tool.action}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1.5 rounded-md",
            "text-neutral-400 text-[11px] font-medium",
            "transition-all duration-150",
            tool.className
          )}
          title={tool.label}
        >
          <tool.icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{tool.label}</span>
        </button>
      ))}
      
      {/* Edited indicator */}
      {isEdited && (
        <div className="w-2 h-2 rounded-full bg-purple-500 ml-1" title="수정됨" />
      )}
    </div>
  )
}
