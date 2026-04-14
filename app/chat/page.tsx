"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatWindow } from "@/components/chat-window"

export default function ChatPage() {
  const router = useRouter()
  const { selectedCharacter, scenario } = useAppStore()

  useEffect(() => {
    if (!selectedCharacter || !scenario) {
      router.push("/")
    }
  }, [selectedCharacter, scenario, router])

  if (!selectedCharacter || !scenario) {
    return null
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <ChatSidebar />
      <ChatWindow />
    </div>
  )
}
