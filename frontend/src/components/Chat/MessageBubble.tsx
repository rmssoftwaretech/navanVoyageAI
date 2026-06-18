import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import AgentBadge from './AgentBadge'
import type { MessageTurn } from '@/types/nva'

interface MessageBubbleProps {
  turn: MessageTurn
  isStreaming?: boolean
  onRetry?: (content: string) => void
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button
      onClick={copy}
      title="Copy to clipboard"
      style={{
        padding: '3px 8px',
        fontSize: 'var(--text-xs)',
        color: copied ? 'var(--success)' : 'var(--text-muted)',
        background: 'var(--bg-page)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-sm)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? '✓ Copied' : '⎘ Copy'}
    </button>
  )
}

export default function MessageBubble({ turn, isStreaming, onRetry }: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false)
  const isUser = turn.role === 'user'

  if (isUser) {
    return (
      <div
        className="flex justify-end px-4 py-2"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ gap: 8, alignItems: 'flex-start' }}
      >
        {/* Action buttons — show on hover */}
        {hovered && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 4, flexShrink: 0 }}>
            <CopyButton text={turn.content} />
            {onRetry && (
              <button
                onClick={() => onRetry(turn.content)}
                title="Resend this message"
                style={{
                  padding: '3px 8px',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--brand)',
                  background: 'var(--brand-light)',
                  border: '1px solid var(--brand)',
                  borderRadius: 'var(--r-sm)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                ↺ Retry
              </button>
            )}
          </div>
        )}

        <div
          style={{
            maxWidth: '70%',
            padding: '8px 14px',
            fontSize: 'var(--text-base)',
            background: 'var(--brand-light)',
            color: 'var(--text-primary)',
            border: '1px solid var(--brand-medium)',
            borderRadius: 'var(--r-lg) var(--r-sm) var(--r-lg) var(--r-lg)',
            boxShadow: 'var(--shadow-sm)',
            lineHeight: 1.5,
          }}
        >
          {turn.content}
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col px-4 py-2 gap-1.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Agent badges */}
      {turn.agents && turn.agents.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {turn.agents.map((a) => (
            <AgentBadge key={a} agent={a} />
          ))}
        </div>
      )}

      {/* AI message */}
      <div
        style={{
          maxWidth: '85%',
          padding: '10px 14px',
          fontSize: 'var(--text-base)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm) var(--r-lg) var(--r-lg) var(--r-lg)',
          boxShadow: 'var(--shadow-sm)',
          lineHeight: 1.6,
        }}
        className="prose prose-sm max-w-none"
      >
        <ReactMarkdown>{turn.content}</ReactMarkdown>
        {isStreaming && (
          <span
            className="inline-block w-1.5 h-3.5 ml-0.5 align-middle animate-pulse"
            style={{ background: 'var(--brand)' }}
          />
        )}
      </div>

      {/* Footer: timestamp + copy button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
          {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {hovered && !isStreaming && <CopyButton text={turn.content} />}
      </div>
    </div>
  )
}
