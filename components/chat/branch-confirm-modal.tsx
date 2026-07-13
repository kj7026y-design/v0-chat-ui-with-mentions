"use client"

import { GitBranch, X } from "lucide-react"

interface BranchConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function BranchConfirmModal({ isOpen, onConfirm, onCancel }: BranchConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onCancel}
      />

      <div className="relative w-[min(calc(100vw-2rem),340px)] rounded-[20px] bg-[#FFFFFF] px-5 pb-5 pt-6 text-[#1A1A1A] shadow-2xl shadow-black/25 animate-in fade-in zoom-in-95 duration-200 dark:bg-[#2E2E2C] dark:text-[#F5F5F3]">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[#9B9A93] transition-colors hover:bg-black/5 hover:text-[#1A1A1A] dark:text-[#888780] dark:hover:bg-white/10 dark:hover:text-[#F5F5F3]"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-[14px] flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary">
          <GitBranch className="h-[22px] w-[22px]" />
        </div>

        <h3 className="text-[18px] font-medium leading-tight tracking-normal text-[#1A1A1A] dark:text-[#F5F5F3]">
          새로운 분기 만들기
        </h3>
        <p className="mt-2 text-[14px] font-normal leading-[1.6] text-[#6B6B68] dark:text-[#B4B2A9]">
          이 장면부터 새로운 이야기로 이어갈까요?
          <br />
          분기 생성에는 3 크레딧이 필요해요.
        </p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            분기 만들기
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-transparent px-4 text-[14px] font-medium text-[#6B6B68] transition-colors hover:bg-black/5 hover:text-[#1A1A1A] dark:text-[#B4B2A9] dark:hover:bg-white/10 dark:hover:text-[#F5F5F3]"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
