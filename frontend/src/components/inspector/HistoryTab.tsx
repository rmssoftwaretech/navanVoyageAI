import { useState } from 'react'
import type { HistoryEntry } from '@/types/mcpInspector'

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString()
}

interface HistoryTabProps {
  entries: HistoryEntry[]
  onClear: () => void
}

export default function HistoryTab({ entries, onClear }: HistoryTabProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  function exportJson() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `mcp-inspector-history-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (entries.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>
        No calls yet. Run a tool, read a resource, or get a prompt.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
          {entries.length} {entries.length === 1 ? 'call' : 'calls'}
        </span>
        <button
          onClick={exportJson}
          style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--brand)', background: 'var(--brand-light)', border: '1px solid var(--brand)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}
        >
          Export JSON
        </button>
        <button
          onClick={onClear}
          style={{ padding: '3px 10px', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--danger)', background: 'transparent', border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-page)', position: 'sticky', top: 0, zIndex: 1 }}>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Time</th>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', width: '100%' }}>Method</th>
              <th style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Duration</th>
              <th style={{ padding: '6px 12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {[...entries].reverse().map((e) => {
              const isOpen = expanded === e.id
              const ok = !e.error
              return (
                <>
                  <tr
                    key={e.id}
                    onClick={() => setExpanded(isOpen ? null : e.id)}
                    style={{
                      cursor: 'pointer',
                      background: isOpen ? 'var(--brand-light)' : 'transparent',
                      borderBottom: '1px solid var(--border)',
                    }}
                    onMouseEnter={(ev) => { if (!isOpen) ev.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={(ev) => { ev.currentTarget.style.background = isOpen ? 'var(--brand-light)' : 'transparent' }}
                  >
                    <td style={{ padding: '6px 12px', color: 'var(--text-dim)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{fmt(e.ts)}</td>
                    <td style={{ padding: '6px 12px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 0 }}>{e.method}</td>
                    <td style={{ padding: '6px 12px', color: 'var(--text-dim)', textAlign: 'right', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                      {e.duration_ms != null ? `${e.duration_ms}ms` : '—'}
                    </td>
                    <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: ok ? '#16a34a' : 'var(--danger)' }}>{ok ? '✓' : '✕'}</span>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${e.id}-detail`} style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                      <td colSpan={4} style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div>
                            <p style={{ margin: '0 0 4px', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Params</p>
                            <pre style={{ margin: 0, padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflowX: 'auto', maxHeight: 160, overflowY: 'auto', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                              {JSON.stringify(e.params, null, 2)}
                            </pre>
                          </div>
                          {e.error && (
                            <div>
                              <p style={{ margin: '0 0 4px', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--danger)' }}>Error</p>
                              <pre style={{ margin: 0, padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, background: 'rgba(239,68,68,0.05)', border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', overflowX: 'auto' }}>
                                {e.error}
                              </pre>
                            </div>
                          )}
                          {e.result !== undefined && (
                            <div>
                              <p style={{ margin: '0 0 4px', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Result</p>
                              <pre style={{ margin: 0, padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflowX: 'auto', maxHeight: 200, overflowY: 'auto', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                                {JSON.stringify(e.result, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
