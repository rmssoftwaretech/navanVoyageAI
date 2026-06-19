import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import AgentBadge from './AgentBadge'
import FlightResultsPanel from './FlightResultsPanel'
import ReactionBar from './ReactionBar'
import NoteModal, { type Note } from '@/components/NoteModal'
import { deleteCachedResponse, starTurn, submitFeedback } from '@/services/chat'
import type { FlightResult, MessageTurn } from '@/types/nva'

function noteKey(conversationId: string, turnIndex: number) {
  return `nva_note_${conversationId}_${turnIndex}`
}

function loadNote(conversationId?: string, turnIndex?: number): Note | undefined {
  if (!conversationId || turnIndex == null) return undefined
  try {
    const raw = localStorage.getItem(noteKey(conversationId, turnIndex))
    return raw ? JSON.parse(raw) : undefined
  } catch { return undefined }
}

function saveNote(conversationId: string, turnIndex: number, note: Note) {
  localStorage.setItem(noteKey(conversationId, turnIndex), JSON.stringify(note))
}

function deleteNote(conversationId: string, turnIndex: number) {
  localStorage.removeItem(noteKey(conversationId, turnIndex))
}

interface MessageBubbleProps {
  turn: MessageTurn
  turnIndex?: number
  conversationId?: string
  isStreaming?: boolean
  debugMode?: boolean
  onRetry?: (content: string) => void
  onSelectFlight?: (flight: FlightResult) => void
  onStarChange?: (conversationId: string, hasStarred: boolean, turnIndex: number) => void
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

function PerfBar({ perf }: { perf: NonNullable<MessageTurn['perf']> }) {
  const latStr = perf.latency_ms >= 1000
    ? `${(perf.latency_ms / 1000).toFixed(1)}s`
    : `${perf.latency_ms}ms`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
      <span style={chipStyle}>
        ⏱ {latStr}
      </span>
      <span style={chipStyle}>
        ↑ {perf.input_tokens.toLocaleString()} tokens
      </span>
      <span style={chipStyle}>
        ↓ {perf.output_tokens.toLocaleString()} tokens
      </span>
      {perf.model && (
        <span style={{ ...chipStyle, fontFamily: 'monospace' }}>
          {perf.model}
        </span>
      )}
    </div>
  )
}

const chipStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  padding: '2px 7px',
  background: 'var(--bg-page)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
}

function CacheBadge({ cacheKey }: { cacheKey: string }) {
  const [deleted, setDeleted] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteCachedResponse(cacheKey)
      setDeleted(true)
    } catch {
      setDeleting(false)
    }
  }

  if (deleted) return null

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 'var(--text-xs)', fontWeight: 600,
          padding: '2px 8px',
          background: 'rgba(217,119,6,0.1)',
          border: '1px solid rgba(217,119,6,0.35)',
          borderRadius: 'var(--r-sm)',
          color: '#92600A',
        }}
      >
        ⚡ Cached
      </span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Remove this response from cache"
        style={{
          fontSize: 'var(--text-xs)',
          padding: '2px 7px',
          color: deleting ? 'var(--text-dim)' : '#b45309',
          background: 'transparent',
          border: '1px solid rgba(217,119,6,0.3)',
          borderRadius: 'var(--r-sm)',
          cursor: deleting ? 'default' : 'pointer',
          opacity: deleting ? 0.6 : 1,
        }}
      >
        {deleting ? '…' : '✕ Delete cache'}
      </button>
    </div>
  )
}

function FeedbackBar({ conversationId, turnIndex }: { conversationId?: string; turnIndex?: number }) {
  const [rating, setRating] = useState<'up' | 'down' | null>(null)
  const [flagged, setFlagged] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function handleRate(r: 'up' | 'down') {
    setRating(r)
    setShowComment(true)
  }

  async function handleFlag() {
    if (flagged || !conversationId) return
    setFlagged(true)
    await submitFeedback(conversationId, turnIndex ?? 0, 'flag').catch(() => {})
  }

  async function handleSubmit() {
    if (!conversationId) return
    await submitFeedback(conversationId, turnIndex ?? 0, rating!, comment.trim() || undefined).catch(() => {})
    setShowComment(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Thanks for your feedback
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Was this helpful?</span>
      <button onClick={() => handleRate('up')} title="Helpful" style={fbBtn(rating === 'up')}>👍</button>
      <button onClick={() => handleRate('down')} title="Not helpful" style={fbBtn(rating === 'down')}>👎</button>
      <button onClick={handleFlag} title="Flag this response" style={fbBtn(flagged)}>🚩</button>
      {showComment && (
        <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
          <input
            type="text"
            placeholder="Add a comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            style={{
              fontSize: 'var(--text-xs)',
              padding: '3px 8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-page)',
              color: 'var(--text-primary)',
              outline: 'none',
              width: 180,
            }}
          />
          <button onClick={handleSubmit} style={{ ...fbBtn(false), padding: '3px 8px', fontSize: 'var(--text-xs)', color: 'var(--brand)', borderColor: 'var(--brand)' }}>Send</button>
          <button onClick={handleSubmit} style={{ ...fbBtn(false), padding: '3px 8px', fontSize: 'var(--text-xs)' }}>Skip</button>
        </div>
      )}
    </div>
  )
}

function fbBtn(active: boolean): React.CSSProperties {
  return {
    padding: '2px 6px',
    fontSize: 13,
    background: active ? 'var(--brand-light)' : 'transparent',
    border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
    borderRadius: 'var(--r-sm)',
    cursor: 'pointer',
    lineHeight: 1.4,
  }
}

// ── Debug panel sub-components ────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  search: '#3b82f6', policy: '#f59e0b', destination: '#10b981',
  booking: '#8b5cf6', support: '#06b6d4', orchestrator: 'var(--brand)',
}

function JsonBlock({ data, dir, label }: { data: unknown; dir?: '→' | '←'; label?: string }) {
  const [exp, setExp] = useState(false)
  const preview = typeof data === 'string' ? data : JSON.stringify(data)
  const truncated = preview.length > 80 ? preview.slice(0, 80) + '…' : preview
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        onClick={() => setExp((x) => !x)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', padding: '3px 0' }}
      >
        {dir && (
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', color: dir === '→' ? '#60a5fa' : '#34d399', flexShrink: 0 }}>{dir}</span>
        )}
        {label && <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{label}</span>}
        <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {exp ? '' : truncated}
        </span>
        <span style={{ fontSize: 9, color: '#475569', flexShrink: 0 }}>{exp ? '▲' : '▼'}</span>
      </div>
      {exp && (
        <pre style={{ margin: '4px 0 0', padding: '8px 10px', background: '#020617', color: '#e2e8f0', fontSize: 10, fontFamily: 'var(--font-mono)', borderRadius: 4, overflow: 'auto', whiteSpace: 'pre', lineHeight: 1.45, maxHeight: 240 }}>
          {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}

function AgentCard({ call }: { call: { agent: string; input?: unknown; output?: unknown; latency_ms?: number } }) {
  const color = AGENT_COLORS[call.agent] ?? '#94a3b8'
  return (
    <div style={{ border: `1px solid ${color}35`, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', background: `${color}10`, borderBottom: `1px solid ${color}25` }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: call.output ? '#34d399' : '#f59e0b', flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color }}>{call.agent}Agent</span>
        {call.latency_ms != null && (
          <span style={{ fontSize: 9, color: '#64748b', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{call.latency_ms}ms</span>
        )}
      </div>
      <div style={{ padding: '6px 8px', background: '#0f172a' }}>
        {call.input != null
          ? <JsonBlock data={call.input} dir="→" label="request" />
          : <p style={{ fontSize: 10, color: '#475569', fontStyle: 'italic', margin: 0 }}>No request payload</p>}
        {call.output != null
          ? <JsonBlock data={call.output} dir="←" label="response" />
          : <p style={{ fontSize: 10, color: '#475569', fontStyle: 'italic', margin: 0 }}>Awaiting response…</p>}
      </div>
    </div>
  )
}

function ToolCard({ call }: { call: { tool: string; input?: unknown; output?: unknown; latency_ms?: number } }) {
  return (
    <div style={{ border: '1px solid #a855f730', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', background: '#a855f710', borderBottom: '1px solid #a855f725' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: call.output ? '#34d399' : '#f59e0b', flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#c084fc', fontFamily: 'var(--font-mono)' }}>/tools/{call.tool}</span>
        {call.latency_ms != null && (
          <span style={{ fontSize: 9, color: '#64748b', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{call.latency_ms}ms</span>
        )}
      </div>
      <div style={{ padding: '6px 8px', background: '#0f172a' }}>
        {call.input != null
          ? <JsonBlock data={call.input} dir="→" label="POST body" />
          : <p style={{ fontSize: 10, color: '#475569', fontStyle: 'italic', margin: 0 }}>No request body</p>}
        {call.output != null
          ? <JsonBlock data={call.output} dir="←" label="200 response" />
          : <p style={{ fontSize: 10, color: '#475569', fontStyle: 'italic', margin: 0 }}>Awaiting response…</p>}
      </div>
    </div>
  )
}

// ── Debug panel ───────────────────────────────────────────────────────────────

type DebugTab = 'agents' | 'mcp' | 'perf'

function DebugPanel({ turn }: { turn: MessageTurn }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<DebugTab>('agents')
  const toolCalls = turn.tool_calls ?? []
  const agentCalls = turn.agent_calls ?? []
  const agentNames = turn.agents ?? []

  const summary = [
    agentNames.length > 0 && `${agentNames.length} agent${agentNames.length > 1 ? 's' : ''}`,
    toolCalls.length > 0 && `${toolCalls.length} MCP call${toolCalls.length > 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{ marginTop: 6 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 'var(--text-xs)', color: '#92693A',
          background: 'rgba(146,105,58,0.07)',
          border: '1px solid rgba(146,105,58,0.35)',
          borderRadius: 'var(--r-sm)', padding: '2px 8px', cursor: 'pointer',
        }}
      >
        <span>{open ? '▼' : '▶'}</span>
        <span>🐛 Debug</span>
        {summary && <span style={{ opacity: 0.7 }}>· {summary}</span>}
      </button>

      {open && (
        <div style={{
          marginTop: 6,
          border: '1px solid #1e293b',
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
          background: '#0f172a',
        }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: '#020617' }}>
            {([
              { id: 'agents' as DebugTab, label: `Agents${agentCalls.length > 0 ? ` (${agentCalls.length})` : agentNames.length > 0 ? ` (${agentNames.length})` : ''}` },
              { id: 'mcp' as DebugTab, label: `MCP Tools${toolCalls.length > 0 ? ` (${toolCalls.length})` : ''}` },
              { id: 'perf' as DebugTab, label: 'Perf' },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '5px 10px', fontSize: 10, fontWeight: tab === t.id ? 700 : 400,
                  color: tab === t.id ? '#e2e8f0' : '#64748b',
                  background: 'transparent', border: 'none',
                  borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >{t.label}</button>
            ))}
          </div>

          {/* Tab body */}
          <div style={{ padding: '8px 10px', maxHeight: 340, overflowY: 'auto' }}>

            {/* Agents tab */}
            {tab === 'agents' && (
              <>
                {agentCalls.length > 0 ? (
                  agentCalls.map((ac, i) => <AgentCard key={i} call={ac} />)
                ) : agentNames.length > 0 ? (
                  <div>
                    <p style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8 }}>Agents invoked (no handshake payload captured):</p>
                    {agentNames.map((a) => (
                      <div key={a} style={{ fontSize: 10, color: AGENT_COLORS[a] ?? '#94a3b8', padding: '3px 0', fontWeight: 600 }}>• {a}Agent</div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>No agent handshakes for this turn.</p>
                )}
              </>
            )}

            {/* MCP Tools tab */}
            {tab === 'mcp' && (
              <>
                {toolCalls.length > 0 ? (
                  toolCalls.map((tc, i) => <ToolCard key={i} call={tc} />)
                ) : (
                  <p style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>No MCP tool calls for this turn.</p>
                )}
              </>
            )}

            {/* Perf tab */}
            {tab === 'perf' && (
              turn.perf ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    ['Model', turn.perf.model ?? '—'],
                    ['Latency', `${turn.perf.latency_ms}ms`],
                    ['Input tokens', String(turn.perf.input_tokens)],
                    ['Output tokens', String(turn.perf.output_tokens)],
                    ['Total tokens', String(turn.perf.input_tokens + turn.perf.output_tokens)],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 10, fontSize: 10, padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                      <span style={{ color: '#64748b', minWidth: 90 }}>{k}</span>
                      <span style={{ color: '#e2e8f0', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>No performance data.</p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MessageBubble({ turn, turnIndex, conversationId, isStreaming, debugMode = false, onRetry, onSelectFlight, onStarChange }: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [savedNote, setSavedNote] = useState<Note | undefined>(() => loadNote(conversationId, turnIndex))
  const [starred, setStarred] = useState(!!turn.starred)
  const isUser = turn.role === 'user'

  async function handleStar() {
    const next = !starred
    setStarred(next)
    if (conversationId && turnIndex != null) {
      await starTurn(conversationId, turnIndex, next).catch(() => {})
      onStarChange?.(conversationId, next, turnIndex)
    }
  }

  function handleNoteSave(note: Note) {
    if (conversationId && turnIndex != null) {
      saveNote(conversationId, turnIndex, note)
      setSavedNote(note)
    }
  }

  function handleNoteDelete() {
    if (conversationId && turnIndex != null) {
      deleteNote(conversationId, turnIndex)
      setSavedNote(undefined)
    }
  }

  if (isUser) {
    return (
      <div
        className="flex justify-end px-4 py-2"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ gap: 8, alignItems: 'flex-start' }}
      >
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
      style={starred ? { borderLeft: '3px solid #D97706', paddingLeft: 13 } : undefined}
    >
      {/* Structured flight results — full-width grid above the advisory text */}
      {!isStreaming && turn.flight_results && turn.flight_results.length > 0 && onSelectFlight && (
        <div style={{ width: '100%', maxWidth: 860 }}>
          <FlightResultsPanel results={turn.flight_results} onSelect={onSelectFlight} />
        </div>
      )}

      {/* Cache badge */}
      {turn.from_cache && turn.cache_key && (
        <div>
          <CacheBadge cacheKey={turn.cache_key} />
        </div>
      )}

      {/* Agent badges */}
      {turn.agents && turn.agents.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {turn.agents.map((a) => (
            <AgentBadge key={a} agent={a} />
          ))}
        </div>
      )}

      {/* Section label when flight results are shown above */}
      {!isStreaming && turn.flight_results && turn.flight_results.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 860, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
            Policy Advisory
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
      )}

      {/* AI message bubble */}
      <div
        style={{
          maxWidth: turn.flight_results?.length ? '100%' : '85%',
          width: turn.flight_results?.length ? 860 : undefined,
          padding: '10px 14px',
          fontSize: 'var(--text-base)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm) var(--r-lg) var(--r-lg) var(--r-lg)',
          boxShadow: 'var(--shadow-sm)',
          lineHeight: 1.6,
        }}
        className={turn.flight_results?.length ? 'nva-advisory' : 'prose prose-sm max-w-none'}
      >
        <ReactMarkdown>{turn.content}</ReactMarkdown>
        {isStreaming && (
          <span
            className="inline-block w-1.5 h-3.5 ml-0.5 align-middle animate-pulse"
            style={{ background: 'var(--brand)' }}
          />
        )}
      </div>

      {/* Below-bubble section — only when done streaming */}
      {!isStreaming && turn.content && (
        <div style={{ maxWidth: turn.flight_results?.length ? 860 : '85%', display: 'flex', flexDirection: 'column', gap: 6 }}>

          {/* Debug panel */}
          {debugMode && <DebugPanel turn={turn} />}

          {/* Perf metrics */}
          {turn.perf && <PerfBar perf={turn.perf} />}

          {/* Reaction bar — always visible, star button included */}
          <ReactionBar
            conversationId={conversationId}
            turnIndex={turnIndex}
            initial={turn.reactions}
            starred={starred}
            onStar={handleStar}
          />

          {/* Footer row: timestamp + copy + note + star + feedback */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {hovered && <CopyButton text={turn.content} />}
              {hovered && (
                <button
                  onClick={() => setNoteOpen(true)}
                  title={savedNote ? 'Edit note' : 'Add note'}
                  style={{
                    padding: '3px 8px', fontSize: 'var(--text-xs)',
                    color: savedNote ? 'var(--gold, #D97706)' : 'var(--text-muted)',
                    background: savedNote ? 'rgba(217,119,6,0.08)' : 'var(--bg-page)',
                    border: `1px solid ${savedNote ? 'rgba(217,119,6,0.4)' : 'var(--border)'}`,
                    borderRadius: 'var(--r-sm)', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {savedNote ? '✏ Note ●' : '✏ Note'}
                </button>
              )}
              {!hovered && savedNote && (
                <span title={savedNote.note} style={{ fontSize: 10, color: 'var(--gold, #D97706)', cursor: 'pointer' }} onClick={() => setNoteOpen(true)}>✏ ●</span>
              )}
            </div>
            <FeedbackBar conversationId={conversationId} turnIndex={turnIndex} />
          </div>

          {/* Saved note display */}
          {savedNote && (
            <div style={{
              marginTop: 4, padding: '7px 10px',
              background: 'rgba(217,119,6,0.06)',
              border: '1px solid rgba(217,119,6,0.25)',
              borderRadius: 'var(--r-md)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{ flexShrink: 0 }}>📝</span>
              <div style={{ flex: 1 }}>
                {savedNote.highlight && (
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 3, borderLeft: '2px solid rgba(217,119,6,0.4)', paddingLeft: 6 }}>
                    "{savedNote.highlight}"
                  </div>
                )}
                {savedNote.note}
              </div>
              <button
                onClick={handleNoteDelete}
                title="Remove note"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 11, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      <NoteModal
        isOpen={noteOpen}
        onClose={() => setNoteOpen(false)}
        onSave={handleNoteSave}
        existingNote={savedNote}
      />

      {/* Timestamp only while streaming */}
      {isStreaming && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
          {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}
