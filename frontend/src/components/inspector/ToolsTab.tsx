import { useState } from 'react'
import type { McpTool } from '@/types/mcpInspector'
import type { HistoryEntry } from '@/types/mcpInspector'
import { callTool } from '@/services/mcpInspector'

function scaffoldArgs(tool: McpTool): string {
  const props = tool.inputSchema?.properties ?? {}
  const obj: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    obj[k] = v.default ?? (v.type === 'number' ? 0 : v.type === 'boolean' ? false : '')
  }
  return JSON.stringify(obj, null, 2)
}

interface ToolCardProps {
  tool: McpTool
  serverUrl: string
  onHistoryEntry: (e: HistoryEntry) => void
}

function ToolCard({ tool, serverUrl, onHistoryEntry }: ToolCardProps) {
  const [open, setOpen] = useState(false)
  const [argsJson, setArgsJson] = useState(() => scaffoldArgs(tool))
  const [result, setResult] = useState<unknown>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setRunning(true)
    setError(null)
    setResult(null)
    let parsedArgs: Record<string, unknown> = {}
    try {
      parsedArgs = JSON.parse(argsJson || '{}')
    } catch {
      setError('Invalid JSON in arguments')
      setRunning(false)
      return
    }
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      method: `tools/call — ${tool.name}`,
      params: parsedArgs,
    }
    try {
      const res = await callTool(serverUrl, tool.name, parsedArgs)
      entry.result = res.result
      entry.duration_ms = res.duration_ms
      setResult(res.result)
      setDuration(res.duration_ms)
    } catch (err) {
      entry.error = err instanceof Error ? err.message : String(err)
      setError(entry.error)
    } finally {
      onHistoryEntry(entry)
      setRunning(false)
    }
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
      background: 'var(--bg-surface)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left', gap: 8,
        }}
      >
        <div>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {tool.name}
          </span>
          {tool.description && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '2px 0 0', fontFamily: 'var(--font-sans)' }}>
              {tool.description}
            </p>
          )}
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Arguments (JSON)
            </label>
            <textarea
              value={argsJson}
              onChange={(e) => setArgsJson(e.target.value)}
              rows={Math.min(10, argsJson.split('\n').length + 1)}
              spellCheck={false}
              style={{
                width: '100%', resize: 'vertical',
                fontFamily: 'var(--font-mono)', fontSize: 12,
                padding: '6px 8px', background: 'var(--bg-page)',
                border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                color: 'var(--text-primary)', outline: 'none', lineHeight: 1.5,
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <button
            onClick={run}
            disabled={running}
            style={{
              alignSelf: 'flex-start', padding: '5px 14px',
              fontSize: 'var(--text-xs)', fontWeight: 600,
              color: 'white', background: running ? 'var(--border)' : 'var(--brand)',
              border: 'none', borderRadius: 'var(--r-sm)',
              cursor: running ? 'not-allowed' : 'pointer',
            }}
          >
            {running ? 'Running…' : '▶ Run Tool'}
          </button>

          {error && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', margin: 0, fontFamily: 'var(--font-mono)' }}>
              {error}
            </p>
          )}

          {result !== null && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Result</span>
                {duration !== null && (
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{duration}ms</span>
                )}
              </div>
              <pre style={{
                margin: 0, padding: '8px 10px',
                fontFamily: 'var(--font-mono)', fontSize: 11,
                background: 'var(--bg-page)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)', overflowX: 'auto',
                color: 'var(--text-primary)', maxHeight: 280, overflowY: 'auto',
                lineHeight: 1.5,
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ToolsTabProps {
  tools: McpTool[]
  serverUrl: string
  onHistoryEntry: (e: HistoryEntry) => void
}

export default function ToolsTab({ tools, serverUrl, onHistoryEntry }: ToolsTabProps) {
  const [search, setSearch] = useState('')
  const filtered = tools.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
  )

  if (tools.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>
        Connect to a server to see available tools.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
            Tools ({tools.length})
          </span>
          <input
            type="text"
            placeholder="Filter tools…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              marginLeft: 'auto', padding: '3px 8px', fontSize: 'var(--text-xs)',
              border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
              background: 'var(--bg-page)', color: 'var(--text-primary)', outline: 'none', width: 160,
            }}
          />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((t) => (
          <ToolCard key={t.name} tool={t} serverUrl={serverUrl} onHistoryEntry={onHistoryEntry} />
        ))}
      </div>
    </div>
  )
}
