import ReactMarkdown from 'react-markdown'
import AgentBadge from './AgentBadge'
import type { MessageTurn } from '@/types/nva'

interface MessageBubbleProps {
  turn: MessageTurn
  isStreaming?: boolean
}

export default function MessageBubble({ turn, isStreaming }: MessageBubbleProps) {
  const isUser = turn.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-2">
        <div
          className="max-w-[70%] px-4 py-2.5 text-sm"
          style={{ background: '#F3F4F6', color: 'var(--text)', boxShadow: 'var(--shadow-card)' }}
        >
          {turn.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col px-4 py-2 gap-1.5">
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
        className="max-w-[85%] px-4 py-2.5 text-sm prose prose-sm max-w-none"
        style={{ background: 'white', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' }}
      >
        <ReactMarkdown>{turn.content}</ReactMarkdown>
        {isStreaming && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle animate-pulse" style={{ background: 'var(--navy)' }} />
        )}
      </div>

      {/* Timestamp */}
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}
