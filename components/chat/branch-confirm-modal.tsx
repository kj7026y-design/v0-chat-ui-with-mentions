"use client"

interface BranchConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function BranchConfirmModal({ isOpen, onConfirm, onCancel }: BranchConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xs bg-popover rounded-2xl border border-border p-5 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-6 h-6 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-foreground">새로운 분기 만들기</h3>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          이 장면부터 새로운 이야기로 이어갈까요?
        </p>
        <p className="text-xs text-muted-foreground mt-2">분기 생성에는 3 크레딧이 필요해요.</p>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors"
          >
            분기 만들기
          </button>
        </div>
      </div>
    </div>
  )
}
