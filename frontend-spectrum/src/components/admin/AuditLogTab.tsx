import { useEffect, useState } from 'react'
import { ProgressCircle, SearchField, TableView, TableHeader, Column, TableBody, Row, Cell } from '@react-spectrum/s2'
import { getAuditLog } from '@/services/admin'
import type { AuditEntry } from '@/services/admin'

const AGENT_COLORS: Record<string, string> = {
  orchestrator: '#1E3A5F', search: '#1D4ED8', policy: '#92400E',
  destination: '#065F46', booking: '#5B21B6', judge: '#D97706',
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AuditLogTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getAuditLog(100).then(setEntries).finally(() => setLoading(false))
  }, [])

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase()
    return !q || e.agent.includes(q) || e.action.toLowerCase().includes(q) || (e.user ?? '').toLowerCase().includes(q)
  })

  if (loading) return <div style={center}><ProgressCircle isIndeterminate aria-label="Loading" /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={heading}>Audit Log <span style={{ fontWeight: 400, color: '#64748b', fontSize: 13 }}>({entries.length} entries)</span></h3>
        <SearchField label="" aria-label="Search" value={search} onChange={setSearch} placeholder="Filter agent, action…" UNSAFE_style={{ width: 200 }} />
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          {entries.length === 0 ? 'No audit entries yet.' : 'No entries match the filter.'}
        </div>
      ) : (
        <TableView aria-label="Audit log" density="compact" UNSAFE_style={{ width: '100%' }}>
          <TableHeader>
            <Column isRowHeader>Time</Column>
            <Column>Agent</Column>
            <Column>Action</Column>
            <Column>Latency</Column>
            <Column>User</Column>
          </TableHeader>
          <TableBody items={filtered.map((e, i) => ({ ...e, _key: e.log_id ?? String(i) }))}>
            {(e) => (
              <Row id={e._key}>
                <Cell>{fmt(e.timestamp)}</Cell>
                <Cell>
                  <span style={{ ...badge, background: AGENT_COLORS[e.agent] ?? '#374151' }}>
                    {e.agent}
                  </span>
                </Cell>
                <Cell>{e.action}</Cell>
                <Cell>{e.latency_ms != null ? `${e.latency_ms}ms` : '—'}</Cell>
                <Cell>{e.user ?? '—'}</Cell>
              </Row>
            )}
          </TableBody>
        </TableView>
      )}
    </div>
  )
}

const center: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 40 }
const heading: React.CSSProperties = { margin: 0, fontSize: 15, fontWeight: 700, color: '#1E3A5F' }
const badge: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'capitalize' }
