import { useCallback, useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble'
import TravelSearchForm from './TravelSearchForm'
import InputBar from '@/components/InputBar'
import ShareModal from '@/components/ShareModal'
import BookingWizard from '@/components/Booking/BookingWizard'
import type { FlightResult, MessageTurn } from '@/types/nva'

interface ChatWindowProps {
  turns: MessageTurn[]
  streamingContent: string
  isStreaming: boolean
  onSend: (content: string) => void
  onStop?: () => void
  onRetry?: (content: string) => void
  conversationTitle?: string
  debugMode?: boolean
  conversationId?: string
  onAttachmentChange?: (filename: string | null, context: string | null) => void
  onStarChange?: (conversationId: string, hasStarred: boolean, turnIndex: number) => void
}

export default function ChatWindow({
  turns,
  streamingContent,
  isStreaming,
  onSend,
  onStop,
  onRetry,
  conversationTitle,
  debugMode = false,
  conversationId,
  onAttachmentChange,
  onStarChange,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [bookingFlight, setBookingFlight] = useState<FlightResult | null>(null)

  const handleSelectFlight = useCallback((flight: FlightResult) => {
    setBookingFlight(flight)
  }, [])

  function handleBooked(reference: string) {
    onSend(`Booking confirmed! Reference: **${reference}**`)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, streamingContent])

  const isEmpty = turns.length === 0 && !isStreaming

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-surface)' }}>
      {/* Booking wizard overlay */}
      {bookingFlight && (
        <BookingWizard
          flight={bookingFlight}
          onClose={() => setBookingFlight(null)}
          onBooked={(ref) => { handleBooked(ref); setBookingFlight(null) }}
        />
      )}

      {/* Conversation title bar */}
      {conversationTitle && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px',
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {conversationTitle}
          </span>
          {conversationId && turns.length > 0 && (
            <button
              onClick={() => setShareOpen(true)}
              title="Share this conversation"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', fontSize: 'var(--text-xs)', fontWeight: 500,
                color: 'var(--text-muted)', background: 'transparent',
                border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              🔗 Share
            </button>
          )}
        </div>
      )}

      {shareOpen && conversationId && (
        <ShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          conversationId={conversationId}
          conversationTitle={conversationTitle}
          turns={turns}
        />
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
        {isEmpty ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '16px 24px' }}>
            <TravelSearchForm onSearch={onSend} disabled={isStreaming} />
          </div>
        ) : (
          <>
            {turns.map((turn, i) => (
              <MessageBubble
                key={i}
                turn={turn}
                turnIndex={i}
                conversationId={conversationId}
                debugMode={debugMode}
                onRetry={turn.role === 'user' && !isStreaming ? onRetry : undefined}
                onSelectFlight={turn.role === 'assistant' ? handleSelectFlight : undefined}
                onStarChange={onStarChange}
              />
            ))}
            {isStreaming && streamingContent && (
              <MessageBubble
                turn={{ role: 'assistant', content: streamingContent, timestamp: new Date().toISOString() }}
                isStreaming
              />
            )}
            {isStreaming && !streamingContent && (
              <div style={{ display: 'flex', padding: '12px 16px' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '6px 14px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-full)',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" stroke="var(--border-strong)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>Thinking…</span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <InputBar onSend={onSend} onStop={onStop} isStreaming={isStreaming} onAttachmentChange={onAttachmentChange} />
    </div>
  )
}
