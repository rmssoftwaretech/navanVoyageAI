import { useState, useEffect } from 'react'
import { getMcpBindings, type McpServer, type McpAgentBinding, type McpToolSchema } from '@/services/admin'

// ── Shared styles ─────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
  background: 'var(--bg-surface)',
  padding: '14px 16px',
}

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
}

// ── Access-level badge ────────────────────────────────────────────────────────

const ACCESS_CONFIG = {
  caller:     { label: 'Active Caller',  bg: '#dcfce7', text: '#15803d' },
  reader:     { label: 'Reader',         bg: '#dbeafe', text: '#1d4ed8' },
  supervisor: { label: 'Supervisor',     bg: '#fef3c7', text: '#b45309' },
  none:       { label: 'No MCP Access',  bg: '#f3f4f6', text: '#6b7280' },
} as const

function AccessBadge({ access }: { access: string }) {
  const c = ACCESS_CONFIG[access as keyof typeof ACCESS_CONFIG] ?? ACCESS_CONFIG.none
  return (
    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 'var(--r-full)', background: c.bg, color: c.text, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color = status === 'connected' ? 'var(--success)' : status === 'error' ? 'var(--danger)' : '#9ca3af'
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

// ── Tool chip ─────────────────────────────────────────────────────────────────

const TOOL_COLORS: Record<string, { bg: string; text: string }> = {
  search_flights:  { bg: '#dbeafe', text: '#1d4ed8' },
  search_hotels:   { bg: '#dcfce7', text: '#15803d' },
  search_cars:     { bg: '#ede9fe', text: '#6d28d9' },
  book_car:        { bg: '#fef3c7', text: '#b45309' },
  cancel_car:      { bg: '#fee2e2', text: '#b91c1c' },
  book_hotel:      { bg: '#d1fae5', text: '#065f46' },
  cancel_hotel:    { bg: '#fee2e2', text: '#b91c1c' },
}

const TOOL_ICONS: Record<string, string> = {
  search_flights: '✈',
  search_hotels:  '🏨',
  search_cars:    '🚗',
  book_car:       '🔑',
  cancel_car:     '✕',
  book_hotel:     '🛎',
  cancel_hotel:   '✕',
}

function ToolChip({ name, onClick }: { name: string; onClick?: () => void }) {
  const c = TOOL_COLORS[name] ?? { bg: 'var(--border)', text: 'var(--text-muted)' }
  return (
    <button
      onClick={onClick}
      style={{ fontSize: 9, padding: '2px 8px', borderRadius: 'var(--r-full)', background: c.bg, color: c.text, fontWeight: 700, whiteSpace: 'nowrap', border: 'none', cursor: onClick ? 'pointer' : 'default' }}
    >
      {TOOL_ICONS[name] ?? '⚙'} {name}
    </button>
  )
}

// ── Tool schema drawer ────────────────────────────────────────────────────────

function SchemaProperty({ name, prop, required }: { name: string; prop: { type: string; description?: string; enum?: string[] }; required: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 8px', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <code style={{ ...MONO, color: 'var(--brand)', fontSize: 11 }}>{name}</code>
        <span style={{ ...MONO, color: 'var(--text-dim)', fontSize: 9 }}>{prop.type}</span>
        {required && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 'var(--r-full)', background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>required</span>}
      </div>
      {prop.description && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>{prop.description}</p>}
      {prop.enum && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {prop.enum.map((v) => (
            <span key={v} style={{ ...MONO, fontSize: 9, padding: '1px 5px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)' }}>{v}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function ToolSchemaCard({ tool, defaultOpen }: { tool: McpToolSchema; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const c = TOOL_COLORS[tool.name] ?? { bg: 'var(--border)', text: 'var(--text-muted)' }
  const props = tool.inputSchema?.properties ?? {}
  const required = tool.inputSchema?.required ?? []

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-page)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontSize: 14 }}>
          {{ search_flights: '✈', search_hotels: '🏨', search_cars: '🚗' }[tool.name] ?? '⚙'}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ ...MONO, fontSize: 12, color: c.text, fontWeight: 700 }}>{tool.name}</code>
            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 'var(--r-full)', background: c.bg, color: c.text, fontWeight: 600 }}>{tool.server}</span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '2px 0 0' }}>{tool.description}</p>
        </div>
        <span style={{ color: 'var(--text-dim)', fontSize: 12, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Schema body */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div style={{ padding: '6px 14px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Input Parameters</span>
            <span style={{ ...MONO, fontSize: 9, color: 'var(--text-dim)' }}>({Object.keys(props).length} params, {required.length} required)</span>
          </div>
          <div>
            {Object.entries(props).map(([k, v]) => (
              <SchemaProperty key={k} name={k} prop={v as { type: string; description?: string; enum?: string[] }} required={required.includes(k)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── MCP Server status card ────────────────────────────────────────────────────

function ServerCard({ server }: { server: McpServer }) {
  const isOk = server.status === 'connected'

  return (
    <div style={{ ...CARD, borderLeft: `3px solid ${isOk ? 'var(--success)' : 'var(--danger)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <StatusDot status={server.status} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{server.label}</span>
            <span style={{ ...MONO, fontSize: 9, padding: '1px 6px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--r-full)', color: 'var(--text-muted)' }}>v{server.version}</span>
            <span style={{ ...MONO, fontSize: 9, padding: '1px 6px', background: isOk ? '#dcfce7' : '#fee2e2', borderRadius: 'var(--r-full)', color: isOk ? '#15803d' : '#dc2626', fontWeight: 700 }}>
              {isOk ? 'connected' : 'error'}
            </span>
            {isOk && server.latency_ms !== undefined && (
              <span style={{ ...MONO, fontSize: 9, padding: '1px 6px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--r-full)', color: 'var(--text-muted)' }}>
                {server.latency_ms}ms
              </span>
            )}
          </div>
          <p style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>{server.url}</p>
        </div>
        <span style={{ fontSize: 9, padding: '2px 8px', background: '#f3f4f6', borderRadius: 'var(--r-full)', color: '#6b7280', fontWeight: 600 }}>
          {server.transport}
        </span>
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 10 }}>{server.description}</p>

      {/* Tool chips for this server */}
      {server.tools.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tools:</span>
          {server.tools.map((t: { name: string }) => (
            <ToolChip key={t.name} name={t.name} />
          ))}
        </div>
      )}

      {server.error && (
        <p style={{ ...MONO, fontSize: 10, color: 'var(--danger)', marginTop: 8, padding: '4px 8px', background: '#fee2e2', borderRadius: 'var(--r-sm)' }}>
          {server.error}
        </p>
      )}
    </div>
  )
}

// ── Agent binding card ────────────────────────────────────────────────────────

function AgentCard({ agent, onToolClick }: { agent: McpAgentBinding; onToolClick: (t: McpToolSchema) => void }) {
  const hasTools = agent.mcp_tools.length > 0

  return (
    <div style={{ ...CARD, borderTop: `3px solid ${agent.color}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        {/* Avatar */}
        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `${agent.color}20`, border: `2px solid ${agent.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: agent.color }}>
          {agent.label.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{agent.label}</span>
            <AccessBadge access={agent.mcp_access} />
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>{agent.mcp_role}</p>
        </div>
      </div>

      {/* Bound tool chips */}
      {hasTools ? (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
          <span style={{ fontSize: 9, color: 'var(--text-dim)', alignSelf: 'center', marginRight: 2 }}>tools →</span>
          {agent.mcp_tools.map((t) => (
            <ToolChip
              key={t}
              name={t}
              onClick={() => {
                const schema = agent.resolved_tools.find((rt) => rt.name === t)
                if (schema) onToolClick(schema)
              }}
            />
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: 4 }}>No MCP tools bound</p>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function McpBindingsTab() {
  const [data, setData] = useState<{ servers: McpServer[]; agents: McpAgentBinding[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedTool, setSelectedTool] = useState<McpToolSchema | null>(null)
  const [activeSection, setActiveSection] = useState<'agents' | 'schemas'>('agents')

  async function load() {
    setLoading(true)
    try { setData(await getMcpBindings()) }
    catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Collect unique tool schemas across all servers
  const allToolSchemas: McpToolSchema[] = data
    ? data.servers.flatMap((s) => s.tools.map((t) => ({ ...t, server: s.id })))
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>MCP Servers & Agent Bindings</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Live connection status, per-agent tool bindings, and full input schemas for each MCP tool.
          </p>
        </div>
        <button onClick={load} disabled={loading}
          style={{ fontSize: 'var(--text-xs)', padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', opacity: loading ? 0.5 : 1 }}>
          {loading ? '…' : '↺ Refresh'}
        </button>
      </div>

      {loading && !data && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Probing MCP servers…</p>}

      {data && (
        <>
          {/* MCP Server status */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>MCP Servers ({data.servers.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.servers.map((s) => <ServerCard key={s.id} server={s} />)}
            </div>
          </div>

          {/* Section toggle */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border)' }}>
            {(['agents', 'schemas'] as const).map((sec) => (
              <button key={sec} onClick={() => setActiveSection(sec)}
                style={{
                  fontSize: 'var(--text-xs)', fontWeight: activeSection === sec ? 700 : 500,
                  padding: '6px 14px', background: 'transparent', border: 'none',
                  color: activeSection === sec ? 'var(--brand)' : 'var(--text-muted)',
                  borderBottom: activeSection === sec ? '2px solid var(--brand)' : '2px solid transparent',
                  marginBottom: -2, cursor: 'pointer',
                }}>
                {sec === 'agents' ? `Agent Bindings (${data.agents.length})` : `Tool Schemas (${allToolSchemas.length})`}
              </button>
            ))}
          </div>

          {/* Agent bindings grid */}
          {activeSection === 'agents' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {data.agents.map((agent) => (
                <AgentCard
                  key={agent.name}
                  agent={agent}
                  onToolClick={(t) => { setSelectedTool(t); setActiveSection('schemas') }}
                />
              ))}
            </div>
          )}

          {/* Tool schemas */}
          {activeSection === 'schemas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allToolSchemas.map((t) => (
                <ToolSchemaCard key={`${t.server}-${t.name}`} tool={t} defaultOpen={selectedTool?.name === t.name} />
              ))}
              {allToolSchemas.length === 0 && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>No tool schemas available — check server connection.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
