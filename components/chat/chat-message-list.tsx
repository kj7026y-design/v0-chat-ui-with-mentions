"use client"

import { useState, type RefObject } from "react"
import { type ChatMessage } from "@/lib/chat-types"
import { cn } from "@/lib/utils"
import { AuthorTools } from "./author-tools"

interface ChatMessageListProps {
  messages: ChatMessage[]
  isTyping: boolean
  messagesEndRef: RefObject<HTMLDivElement | null>
  onRewriteMessage?: (messageId: string) => void
  onEditMessage?: (messageId: string) => void
  onDeleteMessage?: (messageId: string) => void
  editedMessageIds?: Set<string>
}

export function ChatMessageList({ 
  messages, 
  isTyping, 
  messagesEndRef,
  onRewriteMessage,
  onEditMessage,
  onDeleteMessage,
  editedMessageIds = new Set()
}: ChatMessageListProps) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 pb-44">
      {messages.map((message) => (
        <MessageBubble 
          key={message.id} 
          message={message}
          onRewrite={onRewriteMessage}
          onEdit={onEditMessage}
          onDelete={onDeleteMessage}
          isEdited={editedMessageIds.has(message.id)}
        />
      ))}

      {/* Typing Indicator */}
      {isTyping && <TypingIndicator />}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
  onRewrite?: (messageId: string) => void
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  isEdited?: boolean
}

function MessageBubble({ message, onRewrite, onEdit, onDelete, isEdited }: MessageBubbleProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isUser = message.type === "user"
  const isAI = message.type === "ai"
  const isEvent = message.type === "event"
  const isInnerThought = message.type === "inner-thought"

  // Event Card
  if (isEvent) {
    return (
      <div className="flex justify-center my-4">
        <div className="w-full max-w-sm rounded-xl bg-neutral-800 overflow-hidden">
          {/* Event Image */}
          <div className="relative aspect-video bg-neutral-700">
            {message.eventImage ? (
              <img
                src={message.eventImage}
                alt={message.content}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">🌸</span>
              </div>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-800/90 to-transparent" />
            
            {/* Event Title */}
            <div className="absolute bottom-3 left-4 right-4">
              <span className="text-xs text-neutral-400 uppercase tracking-wider">Event</span>
              <h4 className="text-lg font-semibold text-neutral-100 mt-0.5">
                {message.content}
              </h4>
            </div>
          </div>
          
          {/* Event Description */}
          {message.eventDescription && (
            <div className="px-4 py-3">
              <p className="text-sm text-neutral-300 leading-relaxed">
                {message.eventDescription}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Inner Thought Bubble (속마음)
  if (isInnerThought) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-neutral-800/50 border border-neutral-700/50 border-dashed">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-sm">💭</span>
            <span className="text-xs text-neutral-500 font-medium">/속마음</span>
          </div>
          <p className="text-sm text-neutral-400 italic leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  // Regular Message Bubble
  return (
    <div 
      className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}
      onMouseEnter={() => isAI && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <div
          className={cn(
            "max-w-[80%] px-4 py-2.5 rounded-2xl relative",
            isUser
              ? "bg-neutral-100 text-neutral-900"
              : "bg-neutral-800 text-neutral-100"
          )}
        >
          <p className="text-[15px] leading-relaxed">{message.content}</p>
          
          {/* Edited indicator dot */}
          {isEdited && !isUser && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-neutral-900" />
          )}
        </div>
      </div>
      
      {/* Author Tools - visible on hover for AI messages */}
      {isAI && isHovered && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-150">
          <AuthorTools
            messageId={message.id}
            onRewrite={onRewrite}
            onEdit={onEdit}
            onDelete={onDelete}
            isEdited={isEdited}
          />
        </div>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="px-4 py-3 rounded-2xl bg-neutral-800">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neutral-500 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-neutral-500 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-neutral-500 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}
