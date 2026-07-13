"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Info, LogOut, Pencil, Trash2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface AlertModalProps {
  open: boolean
  title?: string
  message: string
  onOpenChange: (open: boolean) => void
}

export function AlertModal({ open, title = "알림", message, onOpenChange }: AlertModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(calc(100vw-2rem),340px)] gap-0 rounded-[20px] border-0 bg-[#FFFFFF] px-5 pb-5 pt-6 text-[#1A1A1A] shadow-2xl shadow-black/25 dark:bg-[#2E2E2C] dark:text-[#F5F5F3]"
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[#9B9A93] transition-colors hover:bg-black/5 hover:text-[#1A1A1A] dark:text-[#888780] dark:hover:bg-white/10 dark:hover:text-[#F5F5F3]"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-[14px] flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary">
          <Info className="h-[22px] w-[22px]" />
        </div>

        <DialogHeader className="gap-2 text-left">
          <DialogTitle className="text-[18px] font-medium leading-tight tracking-normal text-[#1A1A1A] dark:text-[#F5F5F3]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[14px] font-normal leading-[1.6] text-[#6B6B68] dark:text-[#B4B2A9]">
            {message}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            확인
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ConfirmModalProps {
  open: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ConfirmModal({
  open,
  title = "확인",
  message,
  confirmText = "확인",
  cancelText = "취소",
  destructive = false,
  onOpenChange,
  onConfirm,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onOpenChange(false)
    onConfirm()
  }

  if (destructive) {
    const DangerIcon = getDangerConfirmIcon(title, confirmText)

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="w-[min(calc(100vw-2rem),340px)] gap-0 rounded-[20px] border-0 bg-[#FFFFFF] px-5 pb-5 pt-6 text-[#1A1A1A] shadow-2xl shadow-black/25 dark:bg-[#2E2E2C] dark:text-[#F5F5F3]"
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[#9B9A93] transition-colors hover:bg-black/5 hover:text-[#1A1A1A] dark:text-[#888780] dark:hover:bg-white/10 dark:hover:text-[#F5F5F3]"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-[14px] flex h-11 w-11 items-center justify-center rounded-xl bg-[#FCEBEB] text-[#A32D2D] dark:bg-[#791F1F] dark:text-[#F09595]">
            <DangerIcon className="h-[22px] w-[22px]" />
          </div>

          <DialogHeader className="gap-2 text-left">
            <DialogTitle className="text-[18px] font-medium leading-tight tracking-normal text-[#1A1A1A] dark:text-[#F5F5F3]">
              {title}
            </DialogTitle>
            <DialogDescription className="text-[14px] font-normal leading-[1.6] text-[#6B6B68] dark:text-[#B4B2A9]">
              {message}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-[#E24B4A] px-4 text-[14px] font-medium text-white transition-colors hover:bg-[#D64241]"
            >
              {confirmText}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-transparent px-4 text-[14px] font-medium text-[#6B6B68] transition-colors hover:bg-black/5 hover:text-[#1A1A1A] dark:text-[#B4B2A9] dark:hover:bg-white/10 dark:hover:text-[#F5F5F3]"
            >
              {cancelText}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(calc(100vw-2rem),340px)] gap-0 rounded-[20px] border-0 bg-[#FFFFFF] px-5 pb-5 pt-6 text-[#1A1A1A] shadow-2xl shadow-black/25 dark:bg-[#2E2E2C] dark:text-[#F5F5F3]"
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[#9B9A93] transition-colors hover:bg-black/5 hover:text-[#1A1A1A] dark:text-[#888780] dark:hover:bg-white/10 dark:hover:text-[#F5F5F3]"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-[14px] flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary">
          <Info className="h-[22px] w-[22px]" />
        </div>

        <DialogHeader className="gap-2 text-left">
          <DialogTitle className="text-[18px] font-medium leading-tight tracking-normal text-[#1A1A1A] dark:text-[#F5F5F3]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[14px] font-normal leading-[1.6] text-[#6B6B68] dark:text-[#B4B2A9]">
            {message}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {confirmText}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-transparent px-4 text-[14px] font-medium text-[#6B6B68] transition-colors hover:bg-black/5 hover:text-[#1A1A1A] dark:text-[#B4B2A9] dark:hover:bg-white/10 dark:hover:text-[#F5F5F3]"
          >
            {cancelText}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getDangerConfirmIcon(title: string, confirmText: string) {
  const text = `${title} ${confirmText}`
  if (/나가기|로그아웃|탈퇴/.test(text)) return LogOut
  if (/삭제|초기화|지우|비우/.test(text)) return Trash2
  return AlertTriangle
}

interface PromptModalProps {
  open: boolean
  title?: string
  message: string
  defaultValue?: string
  confirmText?: string
  cancelText?: string
  onOpenChange: (open: boolean) => void
  onConfirm: (value: string) => void
}

export function PromptModal({
  open,
  title = "입력",
  message,
  defaultValue = "",
  confirmText = "저장",
  cancelText = "취소",
  onOpenChange,
  onConfirm,
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    if (open) setValue(defaultValue)
  }, [defaultValue, open])

  const handleConfirm = () => {
    const nextValue = value.trim()
    if (!nextValue) return
    onOpenChange(false)
    onConfirm(nextValue)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(calc(100vw-2rem),340px)] gap-0 rounded-[20px] border-0 bg-[#FFFFFF] px-5 pb-5 pt-6 text-[#1A1A1A] shadow-2xl shadow-black/25 dark:bg-[#2E2E2C] dark:text-[#F5F5F3]"
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[#9B9A93] transition-colors hover:bg-black/5 hover:text-[#1A1A1A] dark:text-[#888780] dark:hover:bg-white/10 dark:hover:text-[#F5F5F3]"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-[14px] flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary">
          <Pencil className="h-[22px] w-[22px]" />
        </div>

        <DialogHeader className="gap-2 text-left">
          <DialogTitle className="text-[18px] font-medium leading-tight tracking-normal text-[#1A1A1A] dark:text-[#F5F5F3]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[14px] font-normal leading-[1.6] text-[#6B6B68] dark:text-[#B4B2A9]">
            {message}
          </DialogDescription>
        </DialogHeader>
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleConfirm()
          }}
          className="mt-5 h-11 border-border bg-background text-[14px] text-foreground"
          autoFocus
        />

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!value.trim()}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {confirmText}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-transparent px-4 text-[14px] font-medium text-[#6B6B68] transition-colors hover:bg-black/5 hover:text-[#1A1A1A] dark:text-[#B4B2A9] dark:hover:bg-white/10 dark:hover:text-[#F5F5F3]"
          >
            {cancelText}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
