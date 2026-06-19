import { useEffect, useMemo, useState } from 'react'
import { ProgressCircle } from '@react-spectrum/s2'
import { getAuditLog } from '@/services/admin'
import type { AuditEntry } from '@/services/admin'

const AGENTS = ['orchestrator', 'search', 'policy', 'destination', 'booking', 'judge']
const AGENT_COLORS: Record<string, string> = {
  orchestrator: '#1E3A5F', search: '#1D4ED8', policy: '#92400E',
  destination: '#065F46', booking: '#5B21B6', judge: '#D97706',
}

export default function ObservabilityTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAuditLog(500).then(setEntries).finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    return AGENTS.map((agent) => {
      const agentEntries = entries.filter((e) => e.agent === agent && e.latency_ms != null)
      if (!agentEntries.length) return { agent, count: 0, avgMs: 0, p95Ms: 0, maxMs: 0 }
      const latencies = agentEntries.map((e) => e.latency_ms!).sort((a, b) => a - b)
      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length
      const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? latencies[latencies.length - 1]
      const max = latencies[latencies.length - 1]
      return { agent, count: agentEntries.length, avgMs: Math.round(avg), p95Ms: p95, maxMs: max }
    })
  }, [entries])

  const totalCalls = entries.length
  const recentActivity = entries.slice(0, 20)
  const maxAvg = Math.max(...stats.map((s) => s.avgMs), 1)

  if (loading) return <div style={center}><ProgressCircle isIndeterminate aria-label="Loading" /></div>

  return (
    <div>
      <h3 style={heading}>Agent Observability</h3>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Agent Calls', value: totalCalls.toString() },
          { label: 'Active Agents', value: stats.filter((s) => s.count > 0).length.toString() },
          { label: 'Avg Latency (all)', value: totalCalls ? `${Math.round(entries.filter((e) => e.latency_ms).reduce((s, e) => s + (e.latency_ms ?? 0), 0) / totalCalls)}ms` : '—' },
        ].map(({ label, value }) => (
          <div key={label} style={kpiCard}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700, color: '#1E3A5F' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Latency per agent */}
      <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#475569' }}>Avg Latency per Agent</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {stats.map((s) => (
          <div key={s.agent} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#64748b', width: 100, flexShrink: 0, textTransform: 'capitalize' }}>{s.agent}</span>
            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 4, height: 18, overflow: 'hidden' }}>
              <div style={{
                width: s.count ? `${(s.avgMs / maxAvg) * 100}%` : '0%',
                height: '100%', background: AGENT_COLORS[s.agent] ?? '#374151', borderRadius: 4,
                display: 'flex', alignItems: 'center', paddingLeft: 6,
                transition: 'width 0.4s',
              }}>
                {s.count > 0 && s.avgMs / maxAvg > 0.15 && (
                  <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{s.avgMs}ms</span>
                )}
              </div>
            </div>
            <div style={{ width: 140, flexShrink: 0, display: 'flex', gap: 8, fontSize: 11, color: '#94a3b8' }}>
              {s.count ? (
                <>
                  <span>{s.count} calls</span>
                  <span>p95 {s.p95Ms}ms</span>
                </>
              ) : <span>no data</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity timeline */}
      {recentActivity.length > 0 && (
        <>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#475569' }}>Recent Activity</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentActivity.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: '#f8fafc', borderRadius: 6, fontSize: 12 }}>
                <span style={{ ...agentBadge, background: AGENT_COLORS[e.agent] ?? '#374151' }}>{e.agent}</span>
                <span style={{ flex: 1, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.action}</span>
                {e.latency_ms != null && <span style={{ color: '#94a3b8', flexShrink: 0 }}>{e.latency_ms}ms</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {!totalCalls && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No agent calls recorded yet.</div>}
    </div>
  )
}

const center: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 40 }
const heading: React.CSSProperties = { margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#1E3A5F' }
const kpiCard: React.CSSProperties = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px' }
const agentBadge: React.CSSProperties = { padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'capitalize', flexShrink: 0 }
