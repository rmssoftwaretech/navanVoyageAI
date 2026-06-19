import { useState } from 'react'
import { reactToTurn } from '@/services/chat'

const EMOJIS = ['✈', '🔖', '👍', '👎', '❓']

interface ReactionBarProps {
  conversationId?: string
  turnIndex?: number
  initial?: Record<string, number>
  starred?: boolean
  onStar?: () => void
}

export default function ReactionBar({ conversationId, turnIndex, initial = {}, starred, onStar }: ReactionBarProps) {
  const [reactions, setReactions] = useState<Record<string, number>>(initial)
  const [myReaction, setMyReaction] = useState<string | null>(null)

  async function handleClick(emoji: string) {
    if (!conversationId || turnIndex == null) return
    setReactions((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }))
    setMyReaction(emoji)
    await reactToTurn(conversationId, turnIndex, emoji).catch(() => {})
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {/* Star button — first so it's easiest to reach */}
      {onStar !== undefined && (
        <button
          onClick={onStar}
          title={starred ? 'Unstar this message' : 'Star this message'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 8px', fontSize: 14, lineHeight: 1.4,
            background: starred ? 'rgba(217,119,6,0.12)' : 'var(--bg-page)',
            border: `1px solid ${starred ? 'rgba(217,119,6,0.5)' : 'var(--border)'}`,
            borderRadius: 'var(--r-full)',
            color: starred ? '#D97706' : 'var(--text-muted)',
            cursor: 'pointer', transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => { if (!starred) e.currentTarget.style.borderColor = '#D97706' }}
          onMouseLeave={(e) => { if (!starred) e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          {starred ? '⭐' : '☆'}
        </button>
      )}

      {EMOJIS.map((emoji) => {
        const count = reactions[emoji] ?? 0
        const active = emoji === myReaction
        return (
          <button
            key={emoji}
            onClick={() => handleClick(emoji)}
            title={`React ${emoji}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 7px',
              fontSize: 13, lineHeight: 1.4,
              background: active ? 'var(--brand-light)' : 'var(--bg-page)',
              border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
              borderRadius: 'var(--r-full)',
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--brand)' }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: active ? 'var(--brand)' : 'var(--text-muted)' }}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
