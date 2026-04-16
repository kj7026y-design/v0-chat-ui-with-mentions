"use client"

import { cn } from "@/lib/utils"

interface StatusItem {
  label: string
  value: string
  icon?: string
  color?: string
}

interface DualStatusBarProps {
  characterName: string
  characterStatus: StatusItem[]
  userStatus: StatusItem[]
}

export function DualStatusBar({ 
  characterName, 
  characterStatus, 
  userStatus 
}: DualStatusBarProps) {
  return (
    <div className="border-b border-neutral-800/50 bg-black">
      {/* Character Status Row */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-800/30">
        <span className="text-[10px] text-neutral-500 font-medium min-w-[52px]">
          {characterName}
        </span>
        <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
          {characterStatus.map((status, index) => (
            <StatusBadge key={index} status={status} />
          ))}
        </div>
      </div>
      
      {/* User Status Row */}
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-[10px] text-neutral-500 font-medium min-w-[52px]">
          나의 자아
        </span>
        <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
          {userStatus.map((status, index) => (
            <StatusBadge key={index} status={status} />
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: StatusItem }) {
  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-0.5 rounded-full",
      "bg-neutral-900 border border-neutral-800"
    )}>
      <span className="text-[10px] text-neutral-500">{status.label}:</span>
      <span className={cn(
        "text-[10px] font-medium",
        status.color || "text-neutral-300"
      )}>
        {status.value}
      </span>
      {status.icon && (
        <span className="text-[10px] ml-0.5">{status.icon}</span>
      )}
    </div>
  )
}
