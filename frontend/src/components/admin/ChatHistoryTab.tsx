import { useEffect, useMemo, useState } from 'react'
import { getAdminConversations, deleteAdminConversation } from '@/services/admin'

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── localStorage helpers for local starred / notes ────────────────────────────

function lsKey(conversationId: string, turnIndex: number, kind: 'star' | 'note') {
  return `nva_${kind}_${conversationId}_${turnIndex}`
}

function loadStarred(conversationId: string, turnIndex: number): boolean {
  try { return localStorage.getItem(lsKey(conversationId, turnIndex, 'star')) === '1' } catch { return false }
}

function saveStarred(conversationId: string, turnIndex: number, val: boolean) {
  try {
    if (val) localStorage.setItem(lsKey(conversationId, turnIndex, 'star'), '1')
    else localStorage.removeItem(lsKey(conversationId, turnIndex, 'star'))
  } catch { /* ignore */ }
}

function loadNote(conversationId: string, turnIndex: number): string {
  try { return localStorage.getItem(lsKey(conversationId, turnIndex, 'note')) ?? '' } catch { return '' }
}

function saveNote(conversationId: string, turnIndex: number, text: string) {
  try {
    if (text.trim()) localStorage.setItem(lsKey(conversationId, turnIndex, 'note'), text)
    else localStorage.removeItem(lsKey(conversationId, turnIndex, 'note'))
  } catch { /* ignore */ }
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 4 14 4" />
      <path d="M6 4V2h4v2" />
      <path d="M3 4l1 10h8l1-10" />
      <line x1="6.5" y1="7" x2="6.5" y2="11" />
      <line x1="9.5" y1="7" x2="9.5" y2="11" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChatHistoryTab() {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    getAdminConversations(50)
      .then((data) => setConvs(data as Conversation[]))
      .catch(() => setError('Failed to load conversations.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteAdminConversation(id)
      setConvs((prev) => prev.filter((c) => c.conversation_id !== id))
      if (selected?.conversation_id === id) setSelected(null)
    } catch { /* ignore */ } finally {
      setDeletingId(null)
    }
  }

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
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 12, color: 'var(--text-muted)' }}>Loading chat history…</div>
  }

  if (error) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 12, color: '#991B1B' }}>{error}</div>
  }

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%', overflow: 'hidden' }}>

      {/* ── Left: conversation list ── */}
      <div style={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--border)' }}>

        {/* Search */}
        <div style={{ padding: '8px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <input
            type="text"
            placeholder="Search by user or title…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: '100%', fontSize: 11, padding: '4px 8px', border: '1px solid var(--border)', outline: 'none', background: 'var(--bg-page)', color: 'var(--text-primary)', borderRadius: 4 }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 12, fontSize: 11, color: 'var(--text-muted)' }}>
              {convs.length === 0 ? 'No conversations yet.' : 'No matches.'}
            </div>
          ) : (
            filtered.map((c) => {
              const isActive = selected?.conversation_id === c.conversation_id
              const isDeleting = deletingId === c.conversation_id
              const isHovered = hoveredId === c.conversation_id
              const assistantTurns = (c.turns ?? []).filter((t) => t.role === 'assistant' && t.eval_score !== undefined)
              const avgScore = assistantTurns.length
                ? assistantTurns.reduce((s, t) => s + (t.eval_score ?? 0), 0) / assistantTurns.length
                : null
              const hasStarred = (c.turns ?? []).some((t, i) =>
                t.starred || loadStarred(c.conversation_id, i)
              )

              return (
                <div
                  key={c.conversation_id}
                  onMouseEnter={() => setHoveredId(c.conversation_id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    position: 'relative',
                    background: isActive ? '#EFF6FF' : isHovered ? 'var(--bg-hover, #f5f5f5)' : 'transparent',
                    borderBottom: '1px solid var(--border)',
                    borderLeft: isActive ? '3px solid var(--brand, #1E3A5F)' : '3px solid transparent',
                    opacity: isDeleting ? 0.45 : 1,
                    transition: 'background 0.1s, opacity 0.15s',
                  }}
                >
                  {/* Row content */}
                  <button
                    onClick={() => setSelected(c)}
                    disabled={isDeleting}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 36px 8px 10px',
                      background: 'transparent', border: 'none',
                      cursor: isDeleting ? 'default' : 'pointer',
                      display: 'flex', flexDirection: 'column', gap: 2,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {hasStarred && <span style={{ fontSize: 10 }}>⭐</span>}
                      <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? 'var(--brand, #1E3A5F)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {c.title || 'Untitled'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.user}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>·</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDate(c.updated_at)}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>·</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.turns_count ?? 0}t</span>
                    </div>
                    {avgScore !== null && (
                      <span style={{ fontSize: 10, padding: '1px 6px', fontFamily: 'monospace', background: scoreBg(avgScore), color: scoreColor(avgScore), alignSelf: 'flex-start', marginTop: 2 }}>
                        avg {(avgScore * 100).toFixed(0)}%
                      </span>
                    )}
                  </button>

                  {/* Delete button — visible on hover */}
                  <button
                    onClick={(e) => handleDelete(e, c.conversation_id)}
                    disabled={isDeleting}
                    title="Delete conversation"
                    style={{
                      position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 24, height: 24, border: 'none', borderRadius: 4,
                      background: isHovered ? 'transparent' : 'transparent',
                      color: '#EF4444',
                      cursor: isDeleting ? 'default' : 'pointer',
                      opacity: isHovered && !isDeleting ? 1 : 0,
                      transition: 'opacity 0.15s, background 0.1s',
                      pointerEvents: isHovered ? 'auto' : 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE2E2' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    {isDeleting ? <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>…</span> : <TrashIcon />}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right: thread ── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {!selected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 12, color: 'var(--text-muted)' }}>
            Select a conversation to view the thread.
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand, #1E3A5F)' }}>{selected.title || 'Untitled'}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {selected.user} · {fmtTs(selected.updated_at)} · {selected.turns_count ?? 0} turns
                </span>
              </div>
              <button
                onClick={handleExport}
                style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, border: '1px solid var(--brand, #1E3A5F)', color: 'var(--brand, #1E3A5F)', background: 'transparent', cursor: 'pointer', borderRadius: 4 }}
              >
                ↓ Export JSON
              </button>
            </div>

            {/* Turns */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(selected.turns ?? []).length === 0 ? (
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No turns in this conversation.</p>
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

// ── TurnBubble ────────────────────────────────────────────────────────────────

function TurnBubble({ turn, conversationId, turnIndex }: { turn: Turn; conversationId: string; turnIndex: number }) {
  const isUser = turn.role === 'user'
  const [starred, setStarred] = useState(() =>
    turn.starred || loadStarred(conversationId, turnIndex)
  )
  const [note, setNote] = useState(() => loadNote(conversationId, turnIndex))
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [hovered, setHovered] = useState(false)

  const activeReactions = Object.entries(turn.reactions ?? {}).filter(([, c]) => c > 0)

  function toggleStar(e: React.MouseEvent) {
    e.stopPropagation()
    const next = !starred
    setStarred(next)
    saveStarred(conversationId, turnIndex, next)
  }

  function openNoteEditor() {
    setNoteDraft(note)
    setEditingNote(true)
  }

  function saveNoteEdit() {
    const trimmed = noteDraft.trim()
    setNote(trimmed)
    saveNote(conversationId, turnIndex, trimmed)
    setEditingNote(false)
  }

  function deleteNote() {
    setNote('')
    saveNote(conversationId, turnIndex, '')
    setEditingNote(false)
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 4,
        alignItems: isUser ? 'flex-end' : 'flex-start',
        borderLeft: starred ? '3px solid #D97706' : '3px solid transparent',
        paddingLeft: starred ? 8 : 0,
        transition: 'border-color 0.15s',
      }}
    >
      {/* Starred label */}
      {starred && (
        <span style={{ fontSize: 10, color: '#D97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
          ⭐ Starred
        </span>
      )}

      {/* Bubble + action buttons row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flexDirection: isUser ? 'row-reverse' : 'row' }}>
        <div
          style={{
            maxWidth: '75%', padding: '8px 12px', fontSize: 12,
            background: isUser ? 'var(--brand, #1E3A5F)' : 'var(--bg-surface)',
            color: isUser ? '#fff' : 'var(--text-primary)',
            border: isUser ? 'none' : '1px solid var(--border)',
            borderRadius: 8,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}
        >
          {turn.content}
        </div>

        {/* Action buttons — visible on hover */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 3,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
          pointerEvents: hovered ? 'auto' : 'none',
          flexShrink: 0,
        }}>
          {/* Star */}
          <button
            onClick={toggleStar}
            title={starred ? 'Unstar' : 'Star this turn'}
            style={{
              width: 24, height: 24, border: '1px solid var(--border)', borderRadius: 4,
              background: starred ? '#FEF3C7' : 'var(--bg-page)',
              color: starred ? '#D97706' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            } as React.CSSProperties}
          >
            {starred ? '⭐' : '☆'}
          </button>

          {/* Note */}
          <button
            onClick={openNoteEditor}
            title={note ? 'Edit note' : 'Add note'}
            style={{
              width: 24, height: 24, border: '1px solid var(--border)', borderRadius: 4,
              background: note ? '#FFFBEB' : 'var(--bg-page)',
              color: note ? '#D97706' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            📝
          </button>
        </div>
      </div>

      {/* Reactions */}
      {activeReactions.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {activeReactions.map(([emoji, count]) => (
            <span key={emoji} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '1px 7px', fontSize: 11,
              background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 999,
            }}>
              {emoji}
              {count > 1 && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{count}</span>}
            </span>
          ))}
        </div>
      )}

      {/* Note display */}
      {note && !editingNote && (
        <div
          onClick={openNoteEditor}
          style={{
            padding: '5px 10px', maxWidth: '70%',
            background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.25)',
            borderRadius: 6, fontSize: 11, color: '#374151', lineHeight: 1.5,
            cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'flex-start',
          }}
          title="Click to edit note"
        >
          <span>📝</span>
          <span>{note}</span>
        </div>
      )}

      {/* Note editor */}
      {editingNote && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '70%' }}>
          <textarea
            autoFocus
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Add a note about this turn…"
            rows={3}
            style={{
              fontSize: 11, padding: '6px 8px', resize: 'vertical',
              border: '1px solid var(--border)', borderRadius: 4,
              background: 'var(--bg-page)', color: 'var(--text-primary)',
              outline: 'none', minWidth: 220,
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={saveNoteEdit} style={{ fontSize: 11, padding: '3px 10px', background: 'var(--brand, #1E3A5F)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              Save
            </button>
            {note && (
              <button onClick={deleteNote} style={{ fontSize: 11, padding: '3px 10px', background: 'transparent', color: '#EF4444', border: '1px solid #EF4444', borderRadius: 4, cursor: 'pointer' }}>
                Delete
              </button>
            )}
            <button onClick={() => setEditingNote(false)} style={{ fontSize: 11, padding: '3px 10px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '0 2px' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtTs(turn.timestamp)}</span>

        {!isUser && (turn.agents ?? []).map((a) => (
          <span key={a} style={{
            background: `${AGENT_COLORS[a] ?? '#6B7280'}22`,
            color: AGENT_COLORS[a] ?? '#6B7280',
            border: `1px solid ${AGENT_COLORS[a] ?? '#6B7280'}44`,
            fontSize: 10, padding: '1px 6px', borderRadius: 3,
          }}>{a}</span>
        ))}

        {!isUser && turn.eval_score !== undefined && (
          <span style={{
            background: scoreBg(turn.eval_score), color: scoreColor(turn.eval_score),
            fontSize: 10, padding: '1px 6px', fontFamily: 'monospace', borderRadius: 3,
          }}>
            {turn.eval_passed ? '✓' : '✕'} {(turn.eval_score * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  )
}
