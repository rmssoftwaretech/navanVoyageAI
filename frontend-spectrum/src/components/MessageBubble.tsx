import type { MessageTurn } from '@/types/nva'
import AgentBadge from './AgentBadge'

interface MessageBubbleProps {
  turn: MessageTurn
}

export default function MessageBubble({ turn }: MessageBubbleProps) {
  const isUser = turn.role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: 4,
      }}
    >
      {/* Bubble */}
      <div
        style={{
          maxWidth: '75%',
          padding: '10px 14px',
          background: isUser ? 'var(--nva-navy)' : '#f1f5f9',
          color: isUser ? '#fff' : '#1e293b',
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
        }}
      >
        {turn.content}
      </div>

      {/* Agent badges for assistant turns */}
      {!isUser && turn.agents && turn.agents.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {turn.agents.map((a) => (
            <AgentBadge key={a} agent={a} />
          ))}
        </div>
      )}

      {/* Eval score badge */}
      {!isUser && turn.eval_score !== undefined && (
        <div style={{ fontSize: 11, color: turn.eval_passed ? '#065F46' : '#991B1B' }}>
          {turn.eval_passed ? '✓' : '✕'} Eval: {(turn.eval_score * 100).toFixed(0)}%
        </div>
      )}

      {/* Timestamp */}
      <div style={{ fontSize: 11, color: '#94a3b8' }}>
        {new Date(turn.timestamp).toLocaleTimeString()}
      </div>
    </div>
  )
}

interface StreamingBubbleProps {
  content: string
}

export function StreamingBubble({ content }: StreamingBubbleProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
      <div
        style={{
          maxWidth: '75%',
          padding: '10px 14px',
          background: '#f1f5f9',
          color: '#1e293b',
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
        }}
      >
        {content}
        <span style={{ display: 'inline-block', width: 8, height: 13, background: 'var(--nva-navy)', marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />
      </div>
    </div>
  )
}
