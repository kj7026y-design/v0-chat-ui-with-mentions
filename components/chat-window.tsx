"use client"

import { useState, useRef, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"

export function ChatWindow() {
  const { selectedCharacter, scenario, messages, addMessage } = useAppStore()
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const simulateResponse = (userMessage: string) => {
    setIsTyping(true)

    // Simulate AI typing delay
    setTimeout(() => {
      const responses = [
        `흥미로운 이야기네요! ${userMessage.slice(0, 20)}에 대해 더 자세히 말해주시겠어요?`,
        `그렇군요... 저도 비슷한 경험이 있어요. 이런 상황에서는 어떻게 하시겠어요?`,
        `정말 멋진 생각이에요! 함께 이 여정을 계속해볼까요?`,
        `알겠어요. 그럼 저도 준비를 해야겠네요. 다음엔 어디로 가볼까요?`,
      ]
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]

      addMessage({
        role: "character",
        content: randomResponse,
      })
      setIsTyping(false)
    }, 1000 + Math.random() * 1500)
  }

  const handleSend = () => {
    if (!input.trim()) return

    addMessage({
      role: "user",
      content: input.trim(),
    })

    simulateResponse(input.trim())
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!selectedCharacter || !scenario) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-muted-foreground">캐릭터와 시나리오를 먼저 선택해주세요.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Initial scenario message */}
        {messages.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-4 mx-auto max-w-2xl">
            <p className="text-sm text-muted-foreground text-center">
              <span className="text-primary font-medium">{scenario.place}</span>
              {", "}
              <span className="text-primary font-medium">{scenario.time}</span>
            </p>
            <p className="text-foreground text-center mt-2">{scenario.situation}</p>
            <p className="text-sm text-muted-foreground text-center mt-3">
              {selectedCharacter.name}에게 첫 메시지를 보내보세요!
            </p>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[70%] rounded-2xl px-4 py-3",
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border text-foreground rounded-bl-md"
              )}
            >
              {message.role === "character" && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{selectedCharacter.avatar}</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {selectedCharacter.name}
                  </span>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
              <span className="text-xs opacity-60 mt-1 block text-right">
                {message.timestamp.toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedCharacter.avatar}</span>
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <Textarea
            placeholder="메시지를 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="resize-none min-h-[52px] max-h-[200px] bg-input border-border text-foreground placeholder:text-muted-foreground"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-[52px] px-4"
          >
            <Send className="w-5 h-5" />
            <span className="sr-only">전송</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
