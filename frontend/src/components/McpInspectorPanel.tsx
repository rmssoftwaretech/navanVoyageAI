import { useState } from 'react'
import type { AgentEvent, PerformanceEntry } from '@/types/nva'

/* ── Helpers ─────────────────────────────────────────────────────────── */

function truncate(val: unknown, len: number): string {
  const s = typeof val === 'string' ? val : (JSON.stringify(val) ?? '')
  return s.length > len ? s.slice(0, len) + '…' : s
}

function fmtTs(ts?: number): string {
  if (!ts) return '--'
  return new Date(ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function consoleColor(type: string): string {
  if (type === 'agent_start') return 'var(--info)'
  if (type === 'token') return 'var(--text-dim)'
  if (type === 'mcp_tool_call') return '#a855f7'
  if (type === 'mcp_tool_result') return '#06b6d4'
  if (type === 'agent_done') return 'var(--success)'
  if (type === 'done') return 'var(--success)'
  if (type === 'error') return 'var(--danger)'
  if (type === 'agent_route') return 'var(--brand)'
  if (type.startsWith('tot_')) return 'var(--warning)'
  return 'var(--text-muted)'
}

function JsonBlock({ data, label, dir }: { data: unknown; label: string; dir?: '→' | '←' }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer' }}
        onClick={() => setExpanded((x) => !x)}
      >
        {dir && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: dir === '→' ? 'var(--brand)' : 'var(--success)',
            fontFamily: 'var(--font-mono)',
          }}>{dir}</span>
        )}
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 'auto' }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <pre style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          background: '#0f172a',
          color: '#e2e8f0',
          padding: '8px 10px',
          borderRadius: 'var(--r-md)',
          overflow: 'auto',
          whiteSpace: 'pre',
          lineHeight: 1.4,
          margin: 0,
        }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
      {!expanded && (
        <div style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          background: 'var(--bg-page)',
          color: 'var(--text-secondary)',
          padding: '4px 8px',
          borderRadius: 'var(--r-sm)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          border: '1px solid var(--border-light)',
        }}>
          {truncate(data, 90)}
        </div>
      )}
    </div>
  )
}

/* ── OutputCell with portal tooltip ─────────────────────────────────── */

function OutputCell({ value }: { value: unknown }) {
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null)
  function showTip(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTip({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 340) })
  }
  return (
    <td
      onMouseEnter={showTip}
      onMouseLeave={() => setTip(null)}
      style={{
        padding: '4px 8px', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)',
        color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'default',
        borderBottom: '1px solid var(--border-light)',
      }}
    >
      {truncate(value, 40)}
      {tip && (
        <div style={{
          position: 'fixed', top: tip.top, left: tip.left, zIndex: 99999,
          background: '#1e293b', color: '#e2e8f0', fontSize: 'var(--text-xs)',
          fontFamily: 'var(--font-mono)', padding: '8px 10px',
          borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)',
          maxWidth: 340, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          lineHeight: 1.5, pointerEvents: 'none',
        }}>
          {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
        </div>
      )}
    </td>
  )
}

/* ── Console row ─────────────────────────────────────────────────────── */

function consolePreview(event: AgentEvent): string {
  switch (event.type) {
    case 'agent_route': return `→ [${(event.agents as string[] ?? []).join(', ') || 'direct'}] intent=${event.intent ?? '?'} — ${event.reasoning ?? ''}`
    case 'agent_start': return `→ dispatch to ${event.agent}: ${truncate(event.input, 55)}`
    case 'agent_done': return `← ${event.agent} done (${event.latency_ms ?? '?'}ms): ${truncate(event.output, 45)}`
    case 'mcp_tool_call': return `→ ${event.tool} ${truncate(event.input, 55)}`
    case 'mcp_tool_result': return `← ${event.tool} (${event.latency_ms ?? '?'}ms): ${truncate(event.output, 45)}`
    case 'token': return truncate(event.data, 60)
    case 'tot_start': return `🌳 Starting Tree of Thought — ${event.branches ?? '?'} branches`
    case 'tot_branch': return `🌿 Branch ${event.index ?? '?'} [${event.angle ?? ''}] ${truncate(event.content, 45)}`
    case 'tot_evaluate': return `⚖ Branch ${event.index ?? '?'} score=${typeof event.score === 'number' ? event.score.toFixed(2) : '?'} — ${truncate(event.rationale, 45)}`
    case 'tot_selected': return `✓ Selected branch ${event.index ?? '?'}: ${truncate(event.content, 50)}`
    case 'tot_error': return `✕ ToT error: ${event.error ?? 'unknown'}`
    case 'eval_result': {
      const pct = event.score != null ? `${Math.round(Number(event.score) * 100)}%` : '?'
      return `🧑‍⚖️ JudgeAgent: ${pct} ${event.content ? `— ${truncate(event.content, 45)}` : ''}`
    }
    case 'done': return `✓ Turn complete — input=${event.input_tokens ?? '?'} out=${event.output_tokens ?? '?'} model=${event.model ?? '?'}`
    case 'error': return `✕ ${event.error ?? 'unknown error'}`
    default: return truncate(event, 65)
  }
}

function ConsoleRow({ event }: { event: AgentEvent }) {
  const [expanded, setExpanded] = useState(false)
  const color = consoleColor(event.type)
  const isTot = event.type.startsWith('tot_')
  const isHandshake = event.type === 'agent_route' || event.type === 'agent_start' || event.type === 'agent_done'

  return (
    <div
      onClick={() => setExpanded((x) => !x)}
      style={{
        padding: '4px 10px', borderBottom: '1px solid var(--border-light)',
        cursor: 'pointer',
        background: expanded ? 'var(--bg-hover)' : isTot ? 'rgba(245,158,11,0.04)' : 'transparent',
        borderLeft: isTot ? '2px solid var(--warning)' : event.type === 'eval_result' ? '2px solid var(--success)' : '2px solid transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>{fmtTs(event.ts)}</span>
        {/* ToT icon — visible tree SVG for all tot_* events */}
        {isTot && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }} aria-label="Tree of Thought">
            {/* trunk */}
            <line x1="12" y1="22" x2="12" y2="13" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round"/>
            {/* left branch */}
            <line x1="12" y1="16" x2="6"  y2="10" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round"/>
            {/* right branch */}
            <line x1="12" y1="16" x2="18" y2="10" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round"/>
            {/* left leaf */}
            <circle cx="6"  cy="8" r="2.5" fill="var(--warning)"/>
            {/* right leaf */}
            <circle cx="18" cy="8" r="2.5" fill="var(--warning)"/>
            {/* center top */}
            <circle cx="12" cy="5" r="2.5" fill="var(--warning)"/>
            <line x1="12" y1="13" x2="12" y2="7.5" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
        <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 'var(--r-sm)', background: `${color}18`, color, fontWeight: 700, flexShrink: 0, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.type}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {consolePreview(event)}
        </span>
        {isHandshake && event.latency_ms != null && (
          <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
            {event.latency_ms}ms
          </span>
        )}
      </div>
      {expanded && (
        <pre style={{ marginTop: 4, padding: 8, background: '#0f172a', color: '#e2e8f0', fontSize: 11, borderRadius: 'var(--r-md)', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.4 }}>
          {JSON.stringify(event, null, 2)}
        </pre>
      )}
    </div>
  )
}

/* ── Agent Events tab ────────────────────────────────────────────────── */

const AGENT_COLORS: Record<string, string> = {
  search: '#3b82f6',
  policy: '#f59e0b',
  destination: '#10b981',
  booking: '#8b5cf6',
  support: '#06b6d4',
  orchestrator: 'var(--brand)',
}

function agentColor(name: string) {
  return AGENT_COLORS[name] ?? 'var(--text-secondary)'
}

interface HandshakePair {
  agent: string
  startEvent?: AgentEvent
  doneEvent?: AgentEvent
}

function AgentEventsTab({ events, isStreaming }: { events: AgentEvent[]; isStreaming: boolean }) {
  const routeEvent = events.find((e) => e.type === 'agent_route')

  // Build ordered list of agent handshake pairs
  const pairs: HandshakePair[] = []
  const pairMap: Record<string, HandshakePair> = {}
  for (const e of events) {
    const agentStr = e.agent as string | undefined
    if (e.type === 'agent_start' && agentStr && agentStr !== 'orchestrator') {
      const p: HandshakePair = { agent: agentStr, startEvent: e }
      pairs.push(p)
      pairMap[agentStr] = p
    } else if (e.type === 'agent_done' && agentStr && agentStr !== 'orchestrator') {
      if (pairMap[agentStr]) {
        pairMap[agentStr].doneEvent = e
      }
    }
  }

  if (!routeEvent && pairs.length === 0 && !isStreaming) {
    return (
      <div style={{ padding: '12px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        <p style={{ marginBottom: 6 }}>No agent handshakes yet.</p>
        <p style={{ color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Agent-to-agent JSON messages appear here as the Orchestrator dispatches and receives results from sub-agents.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Routing decision card */}
      {routeEvent && (
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px',
            background: 'var(--bg-page)',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Route
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--brand)', fontWeight: 600 }}>
              orchestrator
            </span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>→</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              [{(routeEvent.agents as string[] ?? []).join(', ') || 'direct'}]
            </span>
            {routeEvent.intent && (
              <span style={{
                marginLeft: 'auto', fontSize: 10, padding: '1px 6px',
                background: 'var(--brand-light)', color: 'var(--brand)',
                borderRadius: 'var(--r-sm)', fontWeight: 600,
              }}>
                {routeEvent.intent}
              </span>
            )}
          </div>

          {/* Route body */}
          <div style={{ padding: '8px 10px' }}>
            {routeEvent.reasoning && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>
                "{routeEvent.reasoning}"
              </p>
            )}
            <JsonBlock
              data={{
                type: 'agent_route',
                from: 'orchestrator',
                agents: routeEvent.agents,
                intent: routeEvent.intent,
                reasoning: routeEvent.reasoning,
                input_preview: routeEvent.input_preview,
              }}
              label="routing decision payload"
              dir="→"
            />
          </div>
        </div>
      )}

      {/* Per-agent handshake cards */}
      {pairs.map((pair, i) => {
        const color = agentColor(pair.agent)
        const isRunning = pair.startEvent && !pair.doneEvent && isStreaming
        const latency = pair.doneEvent?.latency_ms

        return (
          <div key={i} style={{
            border: `1px solid ${color}40`,
            borderRadius: 'var(--r-md)',
            overflow: 'hidden',
          }}>
            {/* Agent header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px',
              background: `${color}10`,
              borderBottom: `1px solid ${color}30`,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: isRunning ? 'var(--warning)' : pair.doneEvent ? 'var(--success)' : 'var(--border)',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color }}>{pair.agent}Agent</span>
              <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 'auto' }}>
                {isRunning ? (
                  <span style={{ color: 'var(--warning)' }}>running…</span>
                ) : latency != null ? (
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{latency}ms</span>
                ) : null}
              </span>
            </div>

            {/* Request */}
            <div style={{ padding: '8px 10px', borderBottom: pair.doneEvent ? `1px solid ${color}20` : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>→</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  orchestrator → {pair.agent}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 'auto' }}>{fmtTs(pair.startEvent?.ts)}</span>
              </div>
              {pair.startEvent?.input ? (
                <JsonBlock data={pair.startEvent.input} label="request payload" dir="→" />
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>No input payload captured</div>
              )}
            </div>

            {/* Response */}
            {pair.doneEvent && (
              <div style={{ padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>←</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {pair.agent} → orchestrator
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 'auto' }}>{fmtTs(pair.doneEvent.ts)}</span>
                </div>
                <JsonBlock data={pair.doneEvent.output} label="response payload" dir="←" />
              </div>
            )}

            {/* Running placeholder */}
            {isRunning && !pair.doneEvent && (
              <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }} />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--warning)', fontStyle: 'italic' }}>awaiting response…</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Network tab ────────────────────────────────────────────────────── */

interface ToolRow { seq: number; call: AgentEvent; result?: AgentEvent }

function NetworkTab({ toolRows, isStreaming }: { toolRows: ToolRow[]; isStreaming: boolean }) {
  const [expandedSeq, setExpandedSeq] = useState<number | null>(null)
  const [detailPane, setDetailPane] = useState<'request' | 'response'>('request')

  if (toolRows.length === 0) {
    return (
      <p style={{ padding: '12px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        MCP sidecar requests appear when tools are called.
      </p>
    )
  }

  const selected = toolRows.find((r) => r.seq === expandedSeq)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Request table */}
      <div style={{ overflowX: 'auto', flexShrink: 0, borderBottom: expandedSeq ? '1px solid var(--border)' : undefined }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-page)' }}>
              {['', 'Method', 'Tool / URL', 'Agent', 'Status', 'ms', 'Time'].map((h) => (
                <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {toolRows.map(({ seq, call, result }) => {
              const isSelected = expandedSeq === seq
              const rowBg = isSelected
                ? 'var(--brand-light)'
                : seq % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-surface)'
              return (
                <tr
                  key={seq}
                  onClick={() => { setExpandedSeq(isSelected ? null : seq); setDetailPane('request') }}
                  style={{ background: rowBg, cursor: 'pointer' }}
                >
                  <td style={{ padding: '4px 6px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-light)', width: 20 }}>{seq}</td>
                  <td style={{ padding: '4px 8px', color: 'var(--brand)', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }}>POST</td>
                  <td style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)', color: '#a855f7', borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>
                    /tools/{call.tool}
                  </td>
                  <td style={{ padding: '4px 8px', color: 'var(--brand)', fontWeight: 500, borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>
                    {call.agent ?? '—'}
                  </td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{
                      fontSize: 10, padding: '1px 5px', borderRadius: 'var(--r-sm)', fontWeight: 600,
                      background: result ? 'var(--success-bg)' : isStreaming ? 'var(--warning-bg)' : 'var(--border)',
                      color: result ? 'var(--success)' : isStreaming ? 'var(--warning)' : 'var(--text-muted)',
                    }}>
                      {result ? '200' : isStreaming ? '…' : 'pending'}
                    </span>
                  </td>
                  <td style={{ padding: '4px 8px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-light)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {result?.latency_ms != null ? `${result.latency_ms}ms` : '—'}
                  </td>
                  <td style={{ padding: '4px 8px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>
                    {fmtTs(call.ts)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Sub-tab strip */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-page)', flexShrink: 0 }}>
            {(['request', 'response'] as const).map((pane) => (
              <button
                key={pane}
                onClick={() => setDetailPane(pane)}
                style={{
                  padding: '5px 12px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: detailPane === pane ? 600 : 400,
                  color: detailPane === pane ? 'var(--brand)' : 'var(--text-muted)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: detailPane === pane ? '2px solid var(--brand)' : '2px solid transparent',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {pane === 'request' ? '→ Request' : '← Response'}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            {/* Summary chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', fontSize: 10, color: 'var(--text-dim)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#a855f7' }}>/tools/{selected.call.tool}</span>
              {selected.result?.latency_ms != null && (
                <span style={{ fontFamily: 'var(--font-mono)' }}>{selected.result.latency_ms}ms</span>
              )}
            </div>
          </div>

          {/* Request pane */}
          {detailPane === 'request' && (
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* URL + method row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-page)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>POST</span>
                <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: '#a855f7' }}>
                  http://amadeus-mcp:8101/tools/{selected.call.tool}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 'auto' }}>{fmtTs(selected.call.ts)}</span>
              </div>

              {/* Headers */}
              <div>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Headers</p>
                {[
                  ['Content-Type', 'application/json'],
                  ['Accept', 'application/json'],
                  ['X-Agent', selected.call.agent ?? 'unknown'],
                  ['X-Tool', selected.call.tool ?? 'unknown'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8, fontSize: 'var(--text-xs)', padding: '3px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-dim)', minWidth: 120, fontFamily: 'var(--font-mono)' }}>{k}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Body */}
              <div>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Body</p>
                {selected.call.input != null ? (
                  <pre style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)',
                    background: '#0f172a', color: '#e2e8f0',
                    padding: '10px 12px', borderRadius: 'var(--r-md)',
                    overflow: 'auto', whiteSpace: 'pre', lineHeight: 1.5, margin: 0,
                  }}>
                    {JSON.stringify(selected.call.input, null, 2)}
                  </pre>
                ) : (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', fontStyle: 'italic' }}>No request body captured</p>
                )}
              </div>
            </div>
          )}

          {/* Response pane */}
          {detailPane === 'response' && (
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Status row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: selected.result ? 'var(--success-bg)' : 'var(--bg-page)', borderRadius: 'var(--r-sm)', border: `1px solid ${selected.result ? 'var(--success)' : 'var(--border)'}` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: selected.result ? 'var(--success)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {selected.result ? '200 OK' : isStreaming ? '… pending' : '— no response'}
                </span>
                {selected.result?.latency_ms != null && (
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {selected.result.latency_ms}ms
                  </span>
                )}
                <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 'auto' }}>{fmtTs(selected.result?.ts)}</span>
              </div>

              {/* Headers */}
              <div>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Headers</p>
                {[
                  ['Content-Type', 'application/json'],
                  ['X-Tool', selected.call.tool ?? 'unknown'],
                  ['X-Latency-Ms', selected.result?.latency_ms != null ? String(selected.result.latency_ms) : '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8, fontSize: 'var(--text-xs)', padding: '3px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-dim)', minWidth: 120, fontFamily: 'var(--font-mono)' }}>{k}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Body */}
              <div>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Body</p>
                {selected.result?.output != null ? (
                  <pre style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)',
                    background: '#0f172a', color: '#e2e8f0',
                    padding: '10px 12px', borderRadius: 'var(--r-md)',
                    overflow: 'auto', whiteSpace: 'pre', lineHeight: 1.5, margin: 0,
                  }}>
                    {JSON.stringify(selected.result.output, null, 2)}
                  </pre>
                ) : (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    {isStreaming ? 'Waiting for response…' : 'No response body captured'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Eval tab ────────────────────────────────────────────────────────── */

const EVAL_CRITERIA: Array<[string, string]> = [
  ['relevance', 'Relevance'],
  ['accuracy', 'Accuracy'],
  ['policy_compliance', 'Policy'],
  ['completeness', 'Completeness'],
  ['tone', 'Tone'],
]

interface EvalData {
  scores?: Record<string, number>
  total_score?: number
  passed?: boolean
  reasoning?: string
  model?: string
  timestamp?: string
}

function EvalTab({ evalData }: { evalData?: EvalData | null }) {
  if (!evalData || !evalData.scores) {
    return (
      <div style={{ padding: '12px' }}>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 6 }}>
          JudgeAgent evaluation runs fire-and-forget after the turn completes (~3–5 s).
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
          Criteria scored: {EVAL_CRITERIA.map(([, label]) => label).join(', ')}.
        </p>
      </div>
    )
  }
  const { scores, total_score, passed, reasoning, model, timestamp } = evalData
  const pctTotal = total_score != null ? Math.round(total_score * 100) : null
  return (
    <div style={{ padding: '12px' }}>
      {pctTotal != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', background: passed ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: 'var(--r-md)' }}>
          <span style={{ fontSize: 18 }}>{passed ? '✓' : '✕'}</span>
          <div>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: passed ? 'var(--success)' : 'var(--danger)' }}>
              {pctTotal}% — {passed ? 'Passed' : 'Failed'}
            </span>
            {reasoning && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>{reasoning}</p>}
          </div>
        </div>
      )}
      {EVAL_CRITERIA.map(([key, label]) => {
        const raw = scores[key] ?? null
        const pct = raw != null ? Math.round(raw * 100) : null
        return (
          <div key={key} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                {pct != null ? `${pct}%` : '—'}
              </span>
            </div>
            <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              {pct != null && (
                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)', borderRadius: 3, transition: 'width 0.4s ease' }} />
              )}
            </div>
          </div>
        )
      })}
      {(model || timestamp) && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-light)', fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
          {model && <span>Model: {model}</span>}
          {model && timestamp && <span> · </span>}
          {timestamp && <span>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      )}
    </div>
  )
}

/* ── Connect / Handshake tab ─────────────────────────────────────────── */

interface McpInfo {
  server_url?: string
  connected?: boolean
  latency_ms?: number
  server_info?: { name: string; version: string }
  protocol_version?: string
  tools?: Array<{ name: string; description: string; inputSchema: unknown }>
  handshake?: {
    initialize_request?: unknown
    initialize_response?: unknown
    tools_list_request?: unknown
  }
}

function ConnectTab({ mcpInfo }: { mcpInfo?: McpInfo | null }) {
  if (!mcpInfo) {
    return (
      <div style={{ padding: '12px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        Loading MCP server info…
      </div>
    )
  }
  const { server_url, connected, latency_ms, server_info, protocol_version, tools, handshake } = mcpInfo
  return (
    <div style={{ padding: '12px' }}>
      {/* Connection status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 12px', background: connected ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: 'var(--r-md)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: connected ? 'var(--success)' : 'var(--danger)' }}>
            {connected ? 'Connected' : 'Disconnected'}{latency_ms != null ? ` · ${latency_ms}ms` : ''}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{server_url}</div>
        </div>
      </div>

      {/* Server info */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Server</p>
        {[
          ['Name', server_info?.name],
          ['Version', server_info?.version],
          ['Protocol', protocol_version],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 8, fontSize: 'var(--text-xs)', padding: '3px 0', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ color: 'var(--text-dim)', minWidth: 80 }}>{k}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{v ?? '—'}</span>
          </div>
        ))}
      </div>

      {/* JSON Handshake */}
      {handshake && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>MCP Protocol Handshake</p>
          <JsonBlock data={handshake.initialize_request} label="initialize (request)" dir="→" />
          <JsonBlock data={handshake.initialize_response} label="initialize (response)" dir="←" />
          <JsonBlock data={handshake.tools_list_request} label="tools/list (request)" dir="→" />
        </div>
      )}

      {/* Available tools */}
      {tools && tools.length > 0 && (
        <div>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Available Tools ({tools.length})
          </p>
          {tools.map((tool) => (
            <div key={tool.name} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#a855f7', fontFamily: 'var(--font-mono)' }}>
                  {tool.name}
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 4 }}>{tool.description}</p>
              <JsonBlock data={tool.inputSchema} label="inputSchema" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────────── */

const TABS = ['Console', 'AgentEvents', 'Network', 'Perf', 'Tools', 'Tokens', 'Eval', 'Connect'] as const
type TabId = typeof TABS[number]

interface McpInspectorPanelProps {
  events: AgentEvent[]
  isStreaming: boolean
  evalData?: EvalData | null
  mcpInfo?: McpInfo | null
}

export default function McpInspectorPanel({ events, isStreaming, evalData, mcpInfo }: McpInspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('Console')

  // Pair mcp_tool_call with mcp_tool_result
  const toolRows: Array<{ seq: number; call: AgentEvent; result?: AgentEvent }> = []
  for (const e of events) {
    if (e.type === 'mcp_tool_call') {
      toolRows.push({ seq: toolRows.length + 1, call: e })
    } else if (e.type === 'mcp_tool_result') {
      const pending = toolRows.find((r) => r.call.tool === e.tool && !r.result)
      if (pending) pending.result = e
    }
  }

  // Perf
  const perfMap: Record<string, { start: number; end?: number; latency?: number }> = {}
  for (const e of events) {
    if (e.type === 'agent_start' && e.agent && e.ts) perfMap[e.agent] = { start: e.ts }
    else if (e.type === 'agent_done' && e.agent && e.ts && perfMap[e.agent]) {
      perfMap[e.agent].end = e.ts
      perfMap[e.agent].latency = e.latency_ms ?? (e.ts - perfMap[e.agent].start)
    }
  }
  const perfEntries: PerformanceEntry[] = Object.entries(perfMap)
    .filter(([, v]) => v.latency != null)
    .map(([agent, v]) => ({ agent, start_ts: v.start, end_ts: v.end ?? v.start, latency_ms: v.latency ?? 0 }))
  const maxLatency = Math.max(...perfEntries.map((p) => p.latency_ms), 1)

  // Tokens from done event
  const doneEvent = events.find((e) => e.type === 'done') as (AgentEvent & Record<string, unknown>) | undefined

  // AgentEvents: count pairs for badge
  const agentHandshakeCount = events.filter((e) => e.type === 'agent_start' && (e.agent as string) !== 'orchestrator').length

  const consoleEvents = events.filter((e) => !(e.type === 'token' && e.data))
  const totEvents = events.filter((e) => e.type.startsWith('tot_'))
  const hasActivity = events.some((e) => ['agent_start', 'mcp_tool_call', 'mcp_tool_result', 'tot_start'].includes(e.type))

  function tabLabel(tab: TabId): string {
    if (tab === 'Tools' && toolRows.length > 0) return `Tools ●${toolRows.length}`
    if (tab === 'AgentEvents' && agentHandshakeCount > 0) return `AgentEvents ●${agentHandshakeCount}`
    return tab
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-page)', overflowX: 'auto', flexShrink: 0 }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 9px',
              fontSize: 'var(--text-xs)',
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? 'var(--brand)' : 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--brand)' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>

        {/* ── Console ───────────────────────────── */}
        {activeTab === 'Console' && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
            {consoleEvents.length === 0 ? (
              <p style={{ padding: '12px', color: 'var(--text-muted)' }}>SSE events appear here during streaming.</p>
            ) : (
              consoleEvents.map((e, i) => <ConsoleRow key={i} event={e} />)
            )}
          </div>
        )}

        {/* ── AgentEvents ───────────────────────── */}
        {activeTab === 'AgentEvents' && <AgentEventsTab events={events} isStreaming={isStreaming} />}

        {/* ── Network ───────────────────────────── */}
        {activeTab === 'Network' && <NetworkTab toolRows={toolRows} isStreaming={isStreaming} />}

        {/* ── Perf ──────────────────────────────── */}
        {activeTab === 'Perf' && (
          <div style={{ padding: '12px' }}>
            {perfEntries.length === 0 ? (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Agent latency bars appear after agents complete.</p>
            ) : (
              <>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Per-Agent Latency</p>
                {perfEntries.map((p) => (
                  <div key={p.agent} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: agentColor(p.agent), fontWeight: 500 }}>{p.agent}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{p.latency_ms}ms</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max(2, (p.latency_ms / maxLatency) * 100)}%`, background: agentColor(p.agent), borderRadius: 3, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Tools ─────────────────────────────── */}
        {activeTab === 'Tools' && (
          <div>
            {!hasActivity && !isStreaming ? (
              <div style={{ padding: '12px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                <p style={{ marginBottom: 6 }}>No tool calls yet.</p>
                <p style={{ color: 'var(--text-dim)', lineHeight: 1.6 }}>
                  To trigger MCP tools, ask about flights with <strong>origin, destination, and date</strong>
                  — e.g. <em>"Find flights from SFO to NRT on 2025-08-10"</em>.
                </p>
              </div>
            ) : (
              <>
                {isStreaming && toolRows.length === 0 && (
                  <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', display: 'inline-block' }} />
                    Agents running…
                  </div>
                )}
                {totEvents.length > 0 && (
                  <div style={{ padding: '6px 12px', background: 'var(--warning-bg)', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--warning)', fontWeight: 600 }}>🌳 Tree of Thought — {totEvents.length} events</span>
                  </div>
                )}
                {toolRows.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-page)' }}>
                          {['#', 'Agent', 'Tool', 'Input', 'Output', 'Status', 'ms'].map((h) => (
                            <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {toolRows.map(({ seq, call, result }) => (
                          <tr key={seq} style={{ background: seq % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-surface)' }}>
                            <td style={{ padding: '4px 8px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-light)' }}>{seq}</td>
                            <td style={{ padding: '4px 8px', color: 'var(--brand)', fontWeight: 500, borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>{call.agent ?? '—'}</td>
                            <td style={{ padding: '4px 8px', color: '#a855f7', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>{call.tool ?? '—'}</td>
                            <OutputCell value={call.input} />
                            <OutputCell value={result?.output} />
                            <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-light)' }}>
                              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 'var(--r-sm)', background: result ? 'var(--success-bg)' : isStreaming ? 'var(--warning-bg)' : 'var(--border)', color: result ? 'var(--success)' : isStreaming ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 600 }}>
                                {result ? 'done' : isStreaming ? 'running' : 'pending'}
                              </span>
                            </td>
                            <td style={{ padding: '4px 8px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>
                              {result?.latency_ms != null ? result.latency_ms : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Tokens ────────────────────────────── */}
        {activeTab === 'Tokens' && (
          <div style={{ padding: '12px' }}>
            {!doneEvent ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                Token counts appear here after the turn completes.
              </p>
            ) : (
              <>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, fontSize: 'var(--text-sm)' }}>Turn Token Usage</p>
                {(['input_tokens', 'output_tokens', 'total_tokens'] as const).map((key) => {
                  const val = doneEvent[key]
                  const label = key.replace(/_/g, ' ')
                  return (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{label}</span>
                    <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--brand)' }}>
                      {val != null ? Number(val).toLocaleString() : '—'}
                    </span>
                  </div>
                  )
                })}
                <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.5 }}>
                  * Output count estimated (~4 chars/token) when streaming doesn't include usage.
                </p>
              </>
            )}
          </div>
        )}

        {/* ── Eval ──────────────────────────────── */}
        {activeTab === 'Eval' && <EvalTab evalData={evalData} />}

        {/* ── Connect ───────────────────────────── */}
        {activeTab === 'Connect' && <ConnectTab mcpInfo={mcpInfo} />}

      </div>
    </div>
  )
}
