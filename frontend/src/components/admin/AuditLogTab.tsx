import { useEffect, useMemo, useState } from 'react'
import { getAuditLog } from '@/services/admin'

interface AuditEntry {
  log_id: string
  timestamp: string
  user: string
  agent: string
  action: string
  input_summary: string
  output_summary: string
  model: string
  latency_ms: number
  token_in?: number
  token_out?: number
  conversation_id?: string
}

const COLS: { key: keyof AuditEntry; label: string; mono?: boolean }[] = [
  { key: 'timestamp',      label: 'Timestamp' },
  { key: 'user',           label: 'User' },
  { key: 'agent',          label: 'Agent' },
  { key: 'action',         label: 'Action' },
  { key: 'model',          label: 'Model',      mono: true },
  { key: 'latency_ms',     label: 'Latency' },
  { key: 'input_summary',  label: 'Input' },
  { key: 'output_summary', label: 'Output' },
]

function fmtTs(iso: string): string {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

function fmtLatency(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

function cellValue(entry: AuditEntry, key: keyof AuditEntry): string {
  const v = entry[key]
  if (key === 'timestamp') return fmtTs(String(v ?? ''))
  if (key === 'latency_ms') return fmtLatency(Number(v ?? 0))
  return String(v ?? '—')
}

export default function AuditLogTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    getAuditLog(100)
      .then((data) => setEntries(data as AuditEntry[]))
      .catch(() => setError('Failed to load audit log.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!filter.trim()) return entries
    const q = filter.toLowerCase()
    return entries.filter((e) =>
      Object.values(e).some((v) => String(v).toLowerCase().includes(q))
    )
  }, [entries, filter])

  function handleExport() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nva-audit-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--text-muted)' }}>
        Loading audit log…
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
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <input
          type="text"
          placeholder="Filter entries…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 text-xs px-3 py-1.5"
          style={{ border: '1px solid var(--border)', outline: 'none' }}
        />
        <span className="text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} / {entries.length} entries
        </span>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          style={{
            border: '1px solid var(--navy)',
            color: 'var(--navy)',
            background: 'transparent',
          }}
        >
          ↓ Export JSON
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {entries.length === 0 ? 'No audit entries yet.' : 'No entries match the filter.'}
        </div>
      ) : (
        <div className="flex-1 overflow-auto" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-xs border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr style={{ background: 'var(--navy)', color: '#fff', position: 'sticky', top: 0 }}>
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    className="text-left px-3 py-2 font-semibold"
                    style={{ whiteSpace: 'nowrap', letterSpacing: '0.03em' }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <tr
                  key={entry.log_id ?? i}
                  style={{
                    background: i % 2 === 0 ? '#fff' : 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {COLS.map((c) => (
                    <td
                      key={c.key}
                      className="px-3 py-1.5"
                      style={{
                        fontFamily: c.mono ? 'monospace' : undefined,
                        maxWidth: ['input_summary', 'output_summary'].includes(c.key) ? 200 : undefined,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'var(--text)',
                      }}
                      title={cellValue(entry, c.key)}
                    >
                      {cellValue(entry, c.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
