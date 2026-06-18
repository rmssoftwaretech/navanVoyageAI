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

function ConsoleRow({ event }: { event: AgentEvent }) {
  const [expanded, setExpanded] = useState(false)
  const color = consoleColor(event.type)
  return (
    <div
      onClick={() => setExpanded((x) => !x)}
      style={{
        padding: '4px 10px', borderBottom: '1px solid var(--border-light)',
        cursor: 'pointer', background: expanded ? 'var(--bg-hover)' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>{fmtTs(event.ts)}</span>
        <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 'var(--r-sm)', background: `${color}18`, color, fontWeight: 700, flexShrink: 0 }}>
          {event.type}
        </span>
        {event.agent && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', flexShrink: 0 }}>{event.agent}</span>}
        {event.tool && <span style={{ fontSize: 'var(--text-xs)', color: '#a855f7', flexShrink: 0 }}>{event.tool}</span>}
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.type === 'token' ? truncate(event.data, 50) : truncate(event, 60)}
        </span>
      </div>
      {expanded && (
        <pre style={{ marginTop: 4, padding: 8, background: '#0f172a', color: '#e2e8f0', fontSize: 11, borderRadius: 'var(--r-md)', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.4 }}>
          {JSON.stringify(event, null, 2)}
        </pre>
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

const TABS = ['Connect', 'Tools', 'Tokens', 'Context', 'Console', 'Network', 'Perf', 'Eval'] as const
type TabId = typeof TABS[number]

interface McpInspectorPanelProps {
  events: AgentEvent[]
  isStreaming: boolean
  evalData?: EvalData | null
  mcpInfo?: McpInfo | null
}

export default function McpInspectorPanel({ events, isStreaming, evalData, mcpInfo }: McpInspectorPanelProps) {
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

  const consoleEvents = events.filter((e) => !(e.type === 'token' && e.data))
  const totEvents = events.filter((e) => e.type.startsWith('tot_'))
  const hasActivity = events.some((e) => ['agent_start', 'mcp_tool_call', 'mcp_tool_result', 'tot_start'].includes(e.type))

  function tabLabel(tab: TabId): string {
    if (tab === 'Tools' && toolRows.length > 0) return `Tools ●${toolRows.length}`
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

        {/* ── Connect ───────────────────────────── */}
        {activeTab === 'Connect' && <ConnectTab mcpInfo={mcpInfo} />}

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

        {/* ── Context ───────────────────────────── */}
        {activeTab === 'Context' && (
          <div style={{ padding: '12px' }}>
            {events.filter((e) => e.type === 'agent_start').length === 0 ? (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Agent context payloads appear when agents start.</p>
            ) : (
              events.filter((e) => e.type === 'agent_start').map((e, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--brand)', marginBottom: 4 }}>{e.agent} — agent_start</div>
                  <pre style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', background: 'var(--bg-page)', padding: '8px', borderRadius: 'var(--r-md)', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
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
              <p style={{ padding: '12px', color: 'var(--text-muted)' }}>SSE events appear here during streaming.</p>
            ) : (
              consoleEvents.map((e, i) => <ConsoleRow key={i} event={e} />)
            )}
          </div>
        )}

        {/* ── Network ───────────────────────────── */}
        {activeTab === 'Network' && (
          <div style={{ fontSize: 'var(--text-xs)' }}>
            {toolRows.length === 0 ? (
              <p style={{ padding: '12px', color: 'var(--text-muted)' }}>MCP sidecar requests appear when tools are called.</p>
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
                      <td style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)', color: '#a855f7', borderBottom: '1px solid var(--border-light)' }}>/tools/{call.tool}</td>
                      <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-light)' }}>
                        <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 'var(--r-sm)', background: result ? 'var(--success-bg)' : 'var(--warning-bg)', color: result ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                          {result ? '200' : '…'}
                        </span>
                      </td>
                      <td style={{ padding: '4px 8px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-light)' }}>{result?.latency_ms != null ? result.latency_ms : '—'}</td>
                      <td style={{ padding: '4px 8px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-light)' }}>{fmtTs(call.ts)}</td>
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
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Agent latency bars appear after agents complete.</p>
            ) : (
              <>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Per-Agent Latency</p>
                {perfEntries.map((p) => (
                  <div key={p.agent} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--brand)', fontWeight: 500 }}>{p.agent}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{p.latency_ms}ms</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max(2, (p.latency_ms / maxLatency) * 100)}%`, background: 'var(--brand)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Eval ──────────────────────────────── */}
        {activeTab === 'Eval' && <EvalTab evalData={evalData} />}

      </div>
    </div>
  )
}
