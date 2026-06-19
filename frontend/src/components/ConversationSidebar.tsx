import { useMemo, useRef, useState } from 'react'
import type { Conversation } from '@/types/nva'

/* ── Date grouping ───────────────────────────────────────────────────── */

function dateGroup(updatedAt: string): string {
  const now = new Date()
  const d = new Date(updatedAt)
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays < 1) return 'Today'
  if (diffDays < 2) return 'Yesterday'
  if (diffDays < 7) return 'This Week'
  return 'Earlier'
}

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Earlier']

/* ── Eval badge ──────────────────────────────────────────────────────── */

function EvalBadge({ score, passed }: { score?: number; passed?: boolean }) {
  if (score == null) {
    return (
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: 'var(--border-strong)', display: 'inline-block', flexShrink: 0,
      }} />
    )
  }
  const pct = Math.round(score * 100)
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      color: passed ? 'var(--success)' : 'var(--danger)',
      background: passed ? 'var(--success-bg)' : 'var(--danger-bg)',
      padding: '1px 5px',
      borderRadius: 'var(--r-full)',
      flexShrink: 0,
    }}>
      {passed ? '✓' : '✕'} {pct}%
    </span>
  )
}

/* ── Main component ──────────────────────────────────────────────────── */

interface ConversationSidebarProps {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onSetContext?: () => void
  hasContext?: boolean
  onRename?: (id: string, title: string) => void
}

export default function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onSetContext,
  hasContext = false,
  onRename,
}: ConversationSidebarProps) {
  const [search, setSearch] = useState('')
  const [starredOnly, setStarredOnly] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  function startEdit(id: string, currentTitle: string, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(id)
    setEditingTitle(currentTitle)
    setTimeout(() => editInputRef.current?.select(), 0)
  }

  function commitEdit() {
    if (editingId && editingTitle.trim()) {
      onRename?.(editingId, editingTitle.trim())
    }
    setEditingId(null)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = conversations
    if (starredOnly) list = list.filter((c) => c.has_starred)
    if (!q) return list
    return list.filter((c) => (c.title || 'New conversation').toLowerCase().includes(q))
  }, [conversations, search, starredOnly])

  const grouped = useMemo(() => {
    const map: Record<string, Conversation[]> = {}
    for (const c of filtered) {
      const g = dateGroup(c.updated_at)
      if (!map[g]) map[g] = []
      map[g].push(c)
    }
    return GROUP_ORDER.filter((g) => map[g]?.length).map((g) => ({ group: g, items: map[g] }))
  }, [filtered])

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* New chat button */}
      <div style={{ padding: 10, flexShrink: 0 }}>
        <button
          onClick={onNew}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'white',
            background: 'var(--brand)',
            border: 'none',
            borderRadius: 'var(--r-md)',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--brand-hover)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--brand)')}
        >
          + New Chat
        </button>
      </div>

      <hr style={{ borderColor: 'var(--border)', margin: '0 10px' }} />

      {/* Search */}
      <div style={{ padding: '8px 10px', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
            fontSize: 12, color: 'var(--text-dim)', pointerEvents: 'none',
          }}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            style={{
              width: '100%',
              padding: '5px 8px 5px 24px',
              fontSize: 'var(--text-xs)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              background: 'var(--bg-page)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
      </div>

      {/* Starred filter */}
      <div style={{ padding: '0 10px 8px', flexShrink: 0 }}>
        <button
          onClick={() => setStarredOnly((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', width: '100%',
            fontSize: 'var(--text-xs)', fontWeight: 500,
            color: starredOnly ? '#D97706' : 'var(--text-muted)',
            background: starredOnly ? 'rgba(217,119,6,0.08)' : 'transparent',
            border: `1px solid ${starredOnly ? 'rgba(217,119,6,0.4)' : 'var(--border)'}`,
            borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          <span>⭐</span>
          <span>{starredOnly ? 'Starred only' : 'Show starred'}</span>
          {starredOnly && (
            <span style={{ marginLeft: 'auto', fontSize: 10 }} onClick={(e) => { e.stopPropagation(); setStarredOnly(false) }}>✕</span>
          )}
        </button>
      </div>

      {/* Conversation list */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 8, minHeight: 0 }}>
        {grouped.length === 0 && (
          <p style={{ padding: '12px', fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
            {search ? 'No matching conversations.' : 'No conversations yet.'}
          </p>
        )}

        {grouped.map(({ group, items }) => (
          <div key={group}>
            <div style={{
              padding: '8px 12px 4px',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              {group}
            </div>

            {items.map((c) => {
              const isActive = c.conversation_id === activeId
              return (
                <button
                  key={c.conversation_id}
                  onClick={() => onSelect(c.conversation_id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    padding: '7px 12px',
                    textAlign: 'left',
                    background: isActive ? 'var(--brand-light)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--brand)' : '3px solid transparent',
                    border: 'none',
                    borderTop: '1px solid transparent',
                    borderBottom: '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = isActive ? 'var(--brand-light)' : 'transparent'
                  }}
                >
                  {editingId === c.conversation_id ? (
                    <input
                      ref={editInputRef}
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null) }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{
                        width: '100%', fontSize: 'var(--text-sm)', fontWeight: 600,
                        color: 'var(--text-primary)', background: 'var(--bg-page)',
                        border: '1px solid var(--brand)', borderRadius: 'var(--r-sm)',
                        padding: '1px 6px', outline: 'none',
                      }}
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => startEdit(c.conversation_id, c.title || 'New conversation', e)}
                      title="Double-click to rename"
                      style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: isActive ? 600 : 400,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      {c.has_starred && <span style={{ fontSize: 10, color: '#D97706', flexShrink: 0 }}>⭐</span>}
                      {c.title || 'New conversation'}
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                      {c.turns_count} {c.turns_count === 1 ? 'turn' : 'turns'}
                    </span>
                    <EvalBadge score={c.eval_score} passed={c.eval_passed} />
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Set context to panel */}
      <div style={{ padding: '8px 10px', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
        <button
          onClick={onSetContext}
          title="Set a custom system context prepended to every message"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '6px 10px',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            color: hasContext ? 'white' : 'var(--brand)',
            background: hasContext ? 'var(--brand)' : 'var(--brand-light)',
            border: `1px solid ${hasContext ? 'var(--brand-hover)' : 'var(--brand)'}`,
            borderRadius: 'var(--r-md)',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
            opacity: onSetContext ? 1 : 0.4,
          }}
          disabled={!onSetContext}
          onMouseEnter={(e) => { if (onSetContext) (e.currentTarget as HTMLElement).style.opacity = '0.75' }}
          onMouseLeave={(e) => { if (onSetContext) (e.currentTarget as HTMLElement).style.opacity = '1' }}
        >
          🔌 {hasContext ? 'Context active ●' : 'Set context to panel'}
        </button>
      </div>
    </aside>
  )
}
