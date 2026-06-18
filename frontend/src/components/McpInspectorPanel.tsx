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
  if (type.startsWith('tot_')) return 'var(--warning)'
  return 'var(--text-muted)'
}

/* ── OutputCell with portal tooltip ─────────────────────────────────── */

function OutputCell({ value }: { value: unknown }) {
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null)

  function showTip(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTip({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 320) })
  }

  return (
    <td
      onMouseEnter={showTip}
      onMouseLeave={() => setTip(null)}
      style={{
        padding: '4px 8px',
        fontSize: 'var(--text-xs)',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-secondary)',
        maxWidth: 140,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        cursor: 'default',
        borderBottom: '1px solid var(--border-light)',
      }}
    >
      {truncate(value, 40)}
      {tip && (
        <div
          style={{
            position: 'fixed',
            top: tip.top,
            left: tip.left,
            zIndex: 99999,
            background: '#1e293b',
            color: '#e2e8f0',
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-mono)',
            padding: '8px 10px',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-lg)',
            maxWidth: 320,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            lineHeight: 1.5,
            pointerEvents: 'none',
          }}
        >
          {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
        </div>
      )}
    </td>
  )
}

/* ── Console row ─────────────────────────────────────────────────────── */

function ConsoleRow({ event }: { event: AgentEvent }) {
  const [expanded, setExpanded] = useState(false)
  const color = consoleColor(event.type)

  return (
    <div
      style={{
        padding: '4px 10px',
        borderBottom: '1px solid var(--border-light)',
        cursor: 'pointer',
        background: expanded ? 'var(--bg-hover)' : 'transparent',
      }}
      onClick={() => setExpanded((x) => !x)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>{fmtTs(event.ts)}</span>
        <span style={{
          fontSize: 10,
          padding: '1px 5px',
          borderRadius: 'var(--r-sm)',
          background: `${color}18`,
          color,
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {event.type}
        </span>
        {event.agent && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', flexShrink: 0 }}>{event.agent}</span>
        )}
        {event.tool && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', flexShrink: 0 }}>{event.tool}</span>
        )}
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.type === 'token' ? truncate(event.data, 50) : truncate(event, 60)}
        </span>
      </div>
      {expanded && (
        <pre style={{
          marginTop: 4,
          padding: 8,
          background: '#0f172a',
          color: '#e2e8f0',
          fontSize: 11,
          borderRadius: 'var(--r-md)',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          lineHeight: 1.4,
        }}>
          {JSON.stringify(event, null, 2)}
        </pre>
      )}
    </div>
  )
}

/* ── Eval tab ────────────────────────────────────────────────────────── */

const EVAL_CRITERIA = ['relevance', 'accuracy', 'policy', 'completeness', 'tone'] as const

type EvalEvent = AgentEvent & { scores?: Record<string, number>; overall?: number; passed?: boolean }

function EvalTab({ events }: { events: AgentEvent[] }) {
  const evalEvent = events.find((e) => e.type === 'eval_result') as EvalEvent | undefined

  if (!evalEvent) {
    return (
      <div style={{ padding: '12px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        <p>JudgeAgent evaluation runs after the turn completes.</p>
        <p style={{ marginTop: 6, color: 'var(--text-dim)' }}>
          Scores for {EVAL_CRITERIA.join(', ')} will appear here.
        </p>
      </div>
    )
  }

  const scores = evalEvent.scores ?? {}
  const overall = evalEvent.overall ?? null
  const passed = evalEvent.passed

  return (
    <div style={{ padding: '12px' }}>
      {overall != null && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          padding: '8px 12px',
          background: passed ? 'var(--success-bg)' : 'var(--danger-bg)',
          borderRadius: 'var(--r-md)',
        }}>
          <span style={{ fontSize: 16 }}>{passed ? '✓' : '✕'}</span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: passed ? 'var(--success)' : 'var(--danger)' }}>
            Overall: {Math.round(overall * 100)}%
          </span>
        </div>
      )}
      {EVAL_CRITERIA.map((criterion) => {
        const score = scores[criterion] ?? null
        const pct = score != null ? Math.round(score * 100) : null
        return (
          <div key={criterion} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {criterion}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                {pct != null ? `${pct}%` : '—'}
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              {pct != null && (
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)',
                  borderRadius: 3,
                  transition: 'width 0.4s ease',
                }} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────────── */

const TABS = ['Tools', 'Tokens', 'Context', 'Console', 'Network', 'Perf', 'Eval'] as const
type TabId = typeof TABS[number]

interface McpInspectorPanelProps {
  events: AgentEvent[]
  isStreaming: boolean
}

export default function McpInspectorPanel({ events, isStreaming }: McpInspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('Tools')

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

  // Derive perf entries
  const perfMap: Record<string, { start: number; end?: number; latency?: number }> = {}
  for (const e of events) {
    if (e.type === 'agent_start' && e.agent && e.ts) {
      perfMap[e.agent] = { start: e.ts }
    } else if (e.type === 'agent_done' && e.agent && e.ts) {
      if (perfMap[e.agent]) {
        perfMap[e.agent].end = e.ts
        perfMap[e.agent].latency = e.latency_ms ?? (e.ts - perfMap[e.agent].start)
      }
    }
  }
  const perfEntries: PerformanceEntry[] = Object.entries(perfMap)
    .filter(([, v]) => v.latency != null)
    .map(([agent, v]) => ({
      agent,
      start_ts: v.start,
      end_ts: v.end ?? v.start,
      latency_ms: v.latency ?? 0,
    }))

  const maxLatency = Math.max(...perfEntries.map((p) => p.latency_ms), 1)
  const doneEvent = events.find((e) => e.type === 'done') as (AgentEvent & Record<string, unknown>) | undefined
  const consoleEvents = events.filter((e) => !(e.type === 'token' && e.data))
  const totEvents = events.filter((e) => e.type.startsWith('tot_'))
  const hasActivity = events.some((e) =>
    ['agent_start', 'mcp_tool_call', 'mcp_tool_result', 'tot_start'].includes(e.type)
  )

  function tabLabel(tab: TabId): string {
    if (tab === 'Tools' && toolRows.length > 0) return `Tools ●${toolRows.length}`
    return tab
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-page)',
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 10px',
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

        {/* ── Tools ─────────────────────────────── */}
        {activeTab === 'Tools' && (
          <div>
            {!hasActivity && !isStreaming ? (
              <p style={{ padding: '12px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Tool calls will appear here during a conversation.
              </p>
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
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--warning)', fontWeight: 600 }}>
                      🌳 Tree of Thought — {totEvents.length} reasoning events
                    </span>
                  </div>
                )}
                {toolRows.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-page)' }}>
                          {['#', 'Agent', 'Tool', 'Input', 'Output', 'Status', 'ms'].map((h) => (
                            <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {toolRows.map(({ seq, call, result }) => (
                          <tr key={seq} style={{ background: seq % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-surface)' }}>
                            <td style={{ padding: '4px 8px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-light)' }}>{seq}</td>
                            <td style={{ padding: '4px 8px', color: 'var(--brand)', fontWeight: 500, borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>
                              {call.agent ?? '—'}
                            </td>
                            <td style={{ padding: '4px 8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>
                              {call.tool ?? '—'}
                            </td>
                            <OutputCell value={call.input} />
                            <OutputCell value={result?.output} />
                            <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-light)' }}>
                              <span style={{
                                fontSize: 10, padding: '1px 5px', borderRadius: 'var(--r-sm)',
                                background: result ? 'var(--success-bg)' : isStreaming ? 'var(--warning-bg)' : 'var(--border)',
                                color: result ? 'var(--success)' : isStreaming ? 'var(--warning)' : 'var(--text-muted)',
                                fontWeight: 600,
                              }}>
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
          <div style={{ padding: '12px', fontSize: 'var(--text-sm)' }}>
            {!doneEvent ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                Token counts will appear after the turn completes.
              </p>
            ) : (
              <>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, fontSize: 'var(--text-sm)' }}>
                  Turn Token Usage
                </p>
                {(['input_tokens', 'output_tokens', 'total_tokens'] as const).map((key) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    <span>{key.replace('_', ' ')}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)' }}>
                      {String(doneEvent[key] ?? '—')}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Context ───────────────────────────── */}
        {activeTab === 'Context' && (
          <div style={{ padding: '12px' }}>
            {events.filter((e) => e.type === 'agent_start').length === 0 ? (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Agent context payloads appear here when agents start.
              </p>
            ) : (
              events.filter((e) => e.type === 'agent_start').map((e, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--brand)', marginBottom: 4 }}>
                    {e.agent} — agent_start
                  </div>
                  <pre style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-page)',
                    padding: '8px',
                    borderRadius: 'var(--r-md)',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}>
                    {JSON.stringify(e, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Console ───────────────────────────── */}
        {activeTab === 'Console' && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
            {consoleEvents.length === 0 ? (
              <p style={{ padding: '12px', color: 'var(--text-muted)' }}>
                SSE events will appear here during streaming.
              </p>
            ) : (
              consoleEvents.map((e, i) => <ConsoleRow key={i} event={e} />)
            )}
          </div>
        )}

        {/* ── Network ───────────────────────────── */}
        {activeTab === 'Network' && (
          <div style={{ fontSize: 'var(--text-xs)' }}>
            {toolRows.length === 0 ? (
              <p style={{ padding: '12px', color: 'var(--text-muted)' }}>
                MCP sidecar requests appear here when tools are called.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-page)' }}>
                    {['Method', 'Tool / URL', 'Status', 'ms', 'Time'].map((h) => (
                      <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {toolRows.map(({ seq, call, result }) => (
                    <tr key={seq} style={{ background: seq % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-surface)' }}>
                      <td style={{ padding: '4px 8px', color: 'var(--brand)', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }}>POST</td>
                      <td style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                        /mcp/{call.tool}
                      </td>
                      <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-light)' }}>
                        <span style={{
                          fontSize: 10, padding: '1px 5px', borderRadius: 'var(--r-sm)',
                          background: result ? 'var(--success-bg)' : 'var(--warning-bg)',
                          color: result ? 'var(--success)' : 'var(--warning)', fontWeight: 600,
                        }}>
                          {result ? '200' : '…'}
                        </span>
                      </td>
                      <td style={{ padding: '4px 8px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-light)' }}>
                        {result?.latency_ms != null ? result.latency_ms : '—'}
                      </td>
                      <td style={{ padding: '4px 8px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-light)' }}>
                        {fmtTs(call.ts)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Perf ──────────────────────────────── */}
        {activeTab === 'Perf' && (
          <div style={{ padding: '12px' }}>
            {perfEntries.length === 0 ? (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Agent latency bars appear here after agents complete.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
                  Per-Agent Latency
                </p>
                {perfEntries.map((p) => (
                  <div key={p.agent} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--brand)', fontWeight: 500 }}>{p.agent}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        {p.latency_ms}ms
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.max(2, (p.latency_ms / maxLatency) * 100)}%`,
                        background: 'var(--brand)',
                        borderRadius: 3,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Eval ──────────────────────────────── */}
        {activeTab === 'Eval' && <EvalTab events={events} />}

      </div>
    </div>
  )
}
