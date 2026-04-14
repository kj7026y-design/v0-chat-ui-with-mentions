"use client"

import { useState, useRef, useEffect } from "react"
import { ChatHeader } from "@/components/chat/chat-header"
import { ChatMessageList } from "@/components/chat/chat-message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { type ChatMessage } from "@/lib/chat-types"

const initialMessages: ChatMessage[] = [
  {
    id: "1",
    type: "ai",
    content: "안녕, 오랜만이야. 오늘 날씨가 참 좋네. 같이 산책이라도 할까?",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "2",
    type: "user",
    content: "좋아! 어디로 갈까?",
    timestamp: new Date(Date.now() - 1000 * 60 * 28),
  },
  {
    id: "3",
    type: "ai",
    content: "음... 저번에 말했던 호수 공원 어때? 거기 벚꽃이 피기 시작했다던데.",
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
  },
  {
    id: "4",
    type: "event",
    content: "봄의 시작",
    eventImage: "/placeholder-event.jpg",
    eventDescription: "이무기와 함께 호수 공원으로 산책을 떠났다. 연분홍 벚꽃 잎이 바람에 흩날리고 있다.",
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
  },
  {
    id: "5",
    type: "ai",
    content: "벚꽃이 정말 예쁘다... 너도 그렇게 생각하지?",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: "6",
    type: "inner-thought",
    content: "이렇게 함께 있을 수 있어서 다행이야. 이 순간이 영원했으면 좋겠는데...",
    timestamp: new Date(Date.now() - 1000 * 60 * 14),
  },
  {
    id: "7",
    type: "user",
    content: "응, 정말 아름다워. 여기 오길 잘한 것 같아.",
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
  },
  {
    id: "8",
    type: "ai",
    content: "그치? 나도 네가 좋아해줘서 기뻐.",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
]

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleSendMessage = (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Show typing indicator
    setIsTyping(true)

    // Simulate AI response after delay
    setTimeout(() => {
      setIsTyping(false)
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: "그래, 알겠어. 조금 더 이야기해볼까?",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
    }, 2000)
  }

  const handleCommand = (command: string) => {
    if (command === "속마음") {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        const thoughtMessage: ChatMessage = {
          id: Date.now().toString(),
          type: "inner-thought",
          content: "사실 요즘 많이 외로웠어. 네가 이렇게 찾아와줘서 정말 고마워...",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, thoughtMessage])
      }, 1500)
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-neutral-900">
      {/* Fixed Header */}
      <ChatHeader characterName="이무기" level={3} />

      {/* Chat Area - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        <ChatMessageList 
          messages={messages} 
          isTyping={isTyping}
          messagesEndRef={messagesEndRef}
        />
      </main>

      {/* Fixed Input Area - positioned above global nav */}
      <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-40">
        <ChatInput 
          onSendMessage={handleSendMessage} 
          onCommand={handleCommand}
        />
      </div>
    </div>
  )
}
