"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
      <DialogContent className="border-border bg-card sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            확인
          </Button>
        </DialogFooter>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button type="button" variant={destructive ? "destructive" : "default"} onClick={handleConfirm}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
      <DialogContent className="border-border bg-card sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleConfirm()
          }}
          className="bg-input"
          autoFocus
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!value.trim()}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
