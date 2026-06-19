import { useEffect, useMemo, useState } from 'react'
import { getAdminConversations } from '@/services/admin'

interface Turn {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  agents?: string[]
  eval_score?: number
  eval_passed?: boolean
  starred?: boolean
  reactions?: Record<string, number>
}

interface Conversation {
  conversation_id: string
  title: string
  user: string
  created_at: string
  updated_at: string
  turns_count: number
  turns: Turn[]
}

function fmtTs(iso: string): string {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString() } catch { return iso }
}

function scoreColor(n: number): string {
  if (n >= 0.85) return '#065F46'
  if (n >= 0.70) return '#92400E'
  return '#991B1B'
}

function scoreBg(n: number): string {
  if (n >= 0.85) return '#D1FAE5'
  if (n >= 0.70) return '#FEF3C7'
  return '#FEE2E2'
}

const AGENT_COLORS: Record<string, string> = {
  search: '#1D4ED8', policy: '#92400E', destination: '#065F46',
  booking: '#5B21B6', judge: '#D97706',
}

export default function ChatHistoryTab() {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<Conversation | null>(null)

  useEffect(() => {
    getAdminConversations(50)
      .then((data) => setConvs(data as Conversation[]))
      .catch(() => setError('Failed to load conversations.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!filter.trim()) return convs
    const q = filter.toLowerCase()
    return convs.filter(
      (c) => c.title?.toLowerCase().includes(q) || c.user?.toLowerCase().includes(q)
    )
  }, [convs, filter])

  function handleExport() {
    if (!selected) return
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nva-conv-${selected.conversation_id.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--text-muted)' }}>
        Loading chat history…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-xs" style={{ color: '#991B1B' }}>
        {error}
      </div>
    )
  }

  return (
    <div className="flex gap-3 h-full overflow-hidden">

      {/* Left: conversation list */}
      <div
        className="flex flex-col flex-shrink-0 overflow-hidden"
        style={{ width: 260, border: '1px solid var(--border)' }}
      >
        {/* Filter */}
        <div className="p-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <input
            type="text"
            placeholder="Filter by user or title…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full text-xs px-2 py-1"
            style={{ border: '1px solid var(--border)', outline: 'none' }}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              {convs.length === 0 ? 'No conversations yet.' : 'No matches.'}
            </div>
          ) : (
            filtered.map((c) => {
              const isActive = selected?.conversation_id === c.conversation_id
              const assistantTurns = (c.turns ?? []).filter((t) => t.role === 'assistant' && t.eval_score !== undefined)
              const avgScore = assistantTurns.length
                ? assistantTurns.reduce((s, t) => s + (t.eval_score ?? 0), 0) / assistantTurns.length
                : null

              return (
                <button
                  key={c.conversation_id}
                  onClick={() => setSelected(c)}
                  className="w-full text-left px-3 py-2 flex flex-col gap-0.5"
                  style={{
                    background: isActive ? '#EFF6FF' : 'transparent',
                    borderBottom: '1px solid var(--border)',
                    borderLeft: isActive ? '3px solid var(--navy)' : '3px solid transparent',
                  }}
                >
                  <span
                    className="text-xs font-semibold truncate"
                    style={{ color: isActive ? 'var(--navy)' : 'var(--text)' }}
                  >
                    {c.title || 'Untitled'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.user}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtDate(c.updated_at)}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.turns_count ?? 0} turns</span>
                  </div>
                  {avgScore !== null && (
                    <span
                      className="text-xs px-1.5 py-0.5 font-mono mt-0.5 self-start"
                      style={{ background: scoreBg(avgScore), color: scoreColor(avgScore) }}
                    >
                      avg {(avgScore * 100).toFixed(0)}%
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right: inline thread */}
      <div className="flex flex-col flex-1 overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {!selected ? (
          <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--text-muted)' }}>
            Select a conversation to view the thread.
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div
              className="flex items-center justify-between px-4 py-2 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold" style={{ color: 'var(--navy)' }}>
                  {selected.title || 'Untitled'}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {selected.user} · {fmtTs(selected.updated_at)} · {selected.turns_count ?? 0} turns
                </span>
              </div>
              <button
                onClick={handleExport}
                className="px-3 py-1 text-xs font-semibold"
                style={{ border: '1px solid var(--navy)', color: 'var(--navy)', background: 'transparent' }}
              >
                ↓ Export JSON
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {(selected.turns ?? []).length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No turns in this conversation.</p>
              ) : (
                (selected.turns ?? []).map((turn, i) => (
                  <TurnBubble key={i} turn={turn} conversationId={selected.conversation_id} turnIndex={i} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function loadNote(conversationId: string, turnIndex: number) {
  try {
    const raw = localStorage.getItem(`nva_note_${conversationId}_${turnIndex}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function TurnBubble({ turn, conversationId, turnIndex }: { turn: Turn; conversationId: string; turnIndex: number }) {
  const isUser = turn.role === 'user'
  const note = !isUser ? loadNote(conversationId, turnIndex) : null
  const activeReactions = Object.entries(turn.reactions ?? {}).filter(([, c]) => c > 0)

  return (
    <div
      className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
      style={turn.starred ? { borderLeft: '3px solid #D97706', paddingLeft: 8 } : undefined}
    >
      {/* Starred label */}
      {turn.starred && (
        <span style={{ fontSize: 10, color: '#D97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
          ⭐ Starred
        </span>
      )}

      <div
        className="max-w-prose px-3 py-2 text-xs"
        style={{
          background: isUser ? 'var(--navy)' : 'var(--surface)',
          color: isUser ? '#fff' : 'var(--text)',
          border: isUser ? 'none' : '1px solid var(--border)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {turn.content}
      </div>

      {/* Reactions */}
      {activeReactions.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {activeReactions.map(([emoji, count]) => (
            <span key={emoji} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '1px 7px', fontSize: 11,
              background: 'var(--bg-page)',
              border: '1px solid var(--border)',
              borderRadius: 999,
            }}>
              {emoji}
              {count > 1 && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{count}</span>}
            </span>
          ))}
        </div>
      )}

      {/* Note */}
      {note && (
        <div style={{
          padding: '5px 9px',
          background: 'rgba(217,119,6,0.06)',
          border: '1px solid rgba(217,119,6,0.25)',
          borderRadius: 6,
          fontSize: 10,
          color: 'var(--text-secondary, #374151)',
          lineHeight: 1.5,
          display: 'flex', gap: 6, alignItems: 'flex-start',
          maxWidth: '80%',
        }}>
          <span>📝</span>
          <div>
            {note.highlight && (
              <div style={{ fontStyle: 'italic', color: '#92600A', marginBottom: 2, borderLeft: '2px solid rgba(217,119,6,0.4)', paddingLeft: 5 }}>
                "{note.highlight}"
              </div>
            )}
            {note.note}
          </div>
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 px-1 flex-wrap">
        <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{fmtTs(turn.timestamp)}</span>

        {!isUser && (turn.agents ?? []).map((a) => (
          <span key={a} style={{
            background: `${AGENT_COLORS[a] ?? '#6B7280'}22`,
            color: AGENT_COLORS[a] ?? '#6B7280',
            border: `1px solid ${AGENT_COLORS[a] ?? '#6B7280'}44`,
            fontSize: 10, padding: '1px 6px',
          }}>{a}</span>
        ))}

        {!isUser && turn.eval_score !== undefined && (
          <span style={{
            background: scoreBg(turn.eval_score),
            color: scoreColor(turn.eval_score),
            fontSize: 10, padding: '1px 6px', fontFamily: 'monospace',
          }}>
            {turn.eval_passed ? '✓' : '✕'} {(turn.eval_score * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  )
}
