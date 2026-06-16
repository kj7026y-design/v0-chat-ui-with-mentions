"use client"

import { useState, useEffect } from "react"
import { X, Heart, Image as ImageIcon, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuestRewardPopupProps {
  isOpen: boolean
  onClose: () => void
  questTitle: string
  rewardImage?: string
  hasDoubleAffection?: boolean
}

export function QuestRewardPopup({
  isOpen,
  onClose,
  questTitle,
  rewardImage,
  hasDoubleAffection = true,
}: QuestRewardPopupProps) {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 100)
      // Prevent body scroll when popup is open
      document.body.style.overflow = 'hidden'
      return () => {
        clearTimeout(timer)
        document.body.style.overflow = ''
      }
    } else {
      setShowContent(false)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Popup Content */}
      <div className={cn(
        "relative w-[90%] max-w-sm max-h-[85vh] mx-auto bg-background rounded-2xl overflow-y-auto",
        "border border-border",
        "transform transition-all duration-300",
        showContent ? "scale-100 opacity-100" : "scale-95 opacity-0"
      )}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/70 hover:bg-black/80 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Quest Complete Header */}
        <div className="relative px-6 pt-8 pb-4 text-center bg-gradient-to-b from-muted/50 to-transparent">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <span className="text-xs font-semibold text-yellow-500 uppercase tracking-wider">
              Quest Complete
            </span>
            <Sparkles className="w-5 h-5 text-yellow-500" />
          </div>
          <h3 className="text-lg font-bold text-foreground">{questTitle}</h3>
        </div>

        {/* Reward Image */}
        <div className="relative mx-6 aspect-square rounded-xl overflow-hidden bg-muted border border-border">
          {rewardImage ? (
            <img
              src={rewardImage}
              alt="퀘스트 보상 이미지"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">희귀 이미지</span>
            </div>
          )}
          
          {/* Rare Badge */}
          <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-purple-600/90 backdrop-blur-sm">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">
              Rare
            </span>
          </div>
        </div>

        {/* Rewards Section */}
        <div className="px-6 py-4 space-y-3">
          {/* Double Affection Bonus */}
          {hasDoubleAffection && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-950/30 border border-red-900/50">
              <div className="flex items-center gap-1">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-400">호감도 더블!</p>
                <p className="text-xs text-red-400/70">+20 호감도 획득</p>
              </div>
              <span className="text-lg font-bold text-red-400">x2</span>
            </div>
          )}

          {/* Gallery Save Notice */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted border border-border">
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              이미지가 <span className="text-foreground font-medium">갤러리</span>에 저장되었습니다.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
