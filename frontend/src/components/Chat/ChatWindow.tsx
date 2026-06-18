import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import InputBar from '@/components/InputBar'
import type { MessageTurn } from '@/types/nva'

interface ChatWindowProps {
  turns: MessageTurn[]
  streamingContent: string
  isStreaming: boolean
  onSend: (content: string) => void
  onStop?: () => void
  onRetry?: (content: string) => void
  conversationTitle?: string
}

export default function ChatWindow({
  turns,
  streamingContent,
  isStreaming,
  onSend,
  onStop,
  onRetry,
  conversationTitle,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, streamingContent])

  const isEmpty = turns.length === 0 && !isStreaming

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-surface)' }}>
      {/* Conversation title bar */}
      {conversationTitle && (
        <div style={{
          padding: '8px 16px',
          flexShrink: 0,
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          color: 'var(--text-primary)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}>
          {conversationTitle}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
        {isEmpty ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 48 }}>✈</span>
            <p style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-secondary)' }}>
              How can I help plan your trip?
            </p>
            <p style={{ fontSize: 'var(--text-sm)' }}>Ask me to search flights, check policies, or book travel.</p>
          </div>
        ) : (
          <>
            {turns.map((turn, i) => (
              <MessageBubble key={i} turn={turn} onRetry={turn.role === 'user' && !isStreaming ? onRetry : undefined} />
            ))}
            {isStreaming && streamingContent && (
              <MessageBubble
                turn={{ role: 'assistant', content: streamingContent, timestamp: new Date().toISOString() }}
                isStreaming
              />
            )}
            {isStreaming && !streamingContent && (
              <div style={{ display: 'flex', padding: '12px 16px', gap: 6 }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--brand)',
                      display: 'inline-block',
                      animation: 'bounce 0.8s infinite',
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <InputBar onSend={onSend} onStop={onStop} isStreaming={isStreaming} />
    </div>
  )
}
