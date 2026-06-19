import { useEffect, useState } from 'react'
import { ProgressCircle, SearchField } from '@react-spectrum/s2'
import { getConversations } from '@/services/admin'
import type { Conversation } from '@/services/admin'

function scoreColor(s?: number): string {
  if (s == null) return '#94a3b8'
  if (s >= 0.75) return '#16a34a'
  if (s >= 0.5) return '#D97706'
  return '#dc2626'
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ChatHistoryTab() {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getConversations(50).then(setConvs).finally(() => setLoading(false))
  }, [])

  const filtered = convs.filter((c) => {
    const q = search.toLowerCase()
    return !q || (c.title ?? '').toLowerCase().includes(q) || (c.user ?? '').toLowerCase().includes(q)
  })

  if (loading) return <div style={center}><ProgressCircle isIndeterminate aria-label="Loading" /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={heading}>Chat History <span style={{ fontWeight: 400, color: '#64748b', fontSize: 13 }}>({convs.length} conversations)</span></h3>
        <SearchField label="" aria-label="Search" value={search} onChange={setSearch} placeholder="Filter title, user…" UNSAFE_style={{ width: 200 }} />
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          {convs.length === 0 ? 'No conversations yet.' : 'No conversations match the filter.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((c) => (
            <div key={c.conversation_id} style={convCard}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {c.has_starred && <span style={{ fontSize: 12, color: '#D97706' }}>⭐</span>}
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.title || 'Untitled conversation'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{fmt(c.updated_at)}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{c.turns_count} turn{c.turns_count !== 1 ? 's' : ''}</span>
                  {c.user && <span style={{ fontSize: 11, color: '#94a3b8' }}>by {c.user}</span>}
                </div>
              </div>
              {c.eval_score != null && (
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                    color: scoreColor(c.eval_score),
                    background: c.eval_passed ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                    border: `1px solid ${scoreColor(c.eval_score)}30`,
                  }}>
                    {c.eval_passed ? '✓' : '✕'} {(c.eval_score * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const center: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 40 }
const heading: React.CSSProperties = { margin: 0, fontSize: 15, fontWeight: 700, color: '#1E3A5F' }
const convCard: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
}
