"use client"

import { useState } from "react"
import type React from "react"
import { AlertModal } from "@/components/ui/app-modal"
import { Field, FieldLabel } from "@/components/ui/field"

interface ImageUploadFieldProps {
  label: string
  value?: string
  onChange: (value: string | undefined) => void
}

export function ImageUploadField({ label, value, onChange }: ImageUploadFieldProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [invalidImageOpen, setInvalidImageOpen] = useState(false)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setInvalidImageOpen(true)
      event.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result)
    }
    reader.readAsDataURL(file)
    event.target.value = ""
  }

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-3">
        <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent">
          이미지 업로드
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
        {value && (
          <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-border bg-muted">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="h-full w-full"
              aria-label={`${label} 미리보기`}
            >
              <img src={value} alt={label} className="h-full w-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[11px] font-bold leading-none text-white hover:bg-black"
              aria-label={`${label} 삭제`}
            >
              x
            </button>
          </div>
        )}
      </div>
      {isPreviewOpen && value && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-card"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-lg font-bold leading-none text-white hover:bg-black"
              aria-label="미리보기 닫기"
            >
              x
            </button>
            <img src={value} alt={label} className="max-h-[78dvh] w-full object-contain" />
          </div>
        </div>
      )}
      <AlertModal
        open={invalidImageOpen}
        title="이미지 업로드"
        message="이미지 파일만 업로드할 수 있어요."
        onOpenChange={setInvalidImageOpen}
      />
    </Field>
  )
}
