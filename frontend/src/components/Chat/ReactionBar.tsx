import { useState } from 'react'
import { reactToTurn } from '@/services/chat'

const EMOJIS = ['✈', '⭐', '👍', '👎', '❓']

interface ReactionBarProps {
  conversationId?: string
  turnIndex?: number
  initial?: Record<string, number>
}

export default function ReactionBar({ conversationId, turnIndex, initial = {} }: ReactionBarProps) {
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
