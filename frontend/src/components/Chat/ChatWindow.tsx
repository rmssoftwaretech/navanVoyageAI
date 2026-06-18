import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import type { MessageTurn } from '@/types/nva'

interface ChatWindowProps {
  turns: MessageTurn[]
  streamingContent: string
  isStreaming: boolean
  onSend: (content: string) => void
  conversationTitle?: string
}

export default function ChatWindow({
  turns,
  streamingContent,
  isStreaming,
  onSend,
  conversationTitle,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, streamingContent])

  const isEmpty = turns.length === 0 && !isStreaming

  return (
    <div className="flex flex-col h-full">
      {/* Conversation header */}
      {conversationTitle && (
        <div
          className="px-4 py-2 flex-shrink-0 text-sm font-medium"
          style={{ borderBottom: '1px solid var(--border)', color: 'var(--navy)' }}
        >
          {conversationTitle}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-muted)' }}>
            <span className="text-5xl">✈</span>
            <p className="text-sm font-medium" style={{ color: 'var(--navy)' }}>
              How can I help plan your trip?
            </p>
            <p className="text-xs">Ask me to search flights, check policies, or book travel.</p>
          </div>
        ) : (
          <>
            {turns.map((turn, i) => (
              <MessageBubble key={i} turn={turn} />
            ))}
            {/* Streaming assistant message */}
            {isStreaming && streamingContent && (
              <MessageBubble
                turn={{
                  role: 'assistant',
                  content: streamingContent,
                  timestamp: new Date().toISOString(),
                }}
                isStreaming
              />
            )}
            {/* Typing indicator when streaming but no tokens yet */}
            {isStreaming && !streamingContent && (
              <div className="flex px-4 py-3 gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: 'var(--navy)', animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={onSend} disabled={isStreaming} />
    </div>
  )
}
