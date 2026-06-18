import { useEffect, useMemo, useState } from 'react'
import { getAuditLog } from '@/services/admin'

interface AuditEntry {
  log_id: string
  timestamp: string
  agent: string
  action: string
  latency_ms: number
  conversation_id: string
  user?: string
}

const AGENT_COLORS: Record<string, string> = {
  orchestrator: 'var(--navy)',
  search:       '#1D4ED8',
  policy:       '#92400E',
  destination:  '#065F46',
  booking:      '#5B21B6',
  judge:        'var(--gold)',
}

function agentColor(agent: string): string {
  return AGENT_COLORS[agent] ?? '#6B7280'
}

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`
}

function fmtTs(iso: string): string {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

// Latency buckets
const BUCKETS = [
  { label: '<100ms',    min: 0,    max: 100 },
  { label: '100–500ms', min: 100,  max: 500 },
  { label: '500ms–1s',  min: 500,  max: 1000 },
  { label: '1–3s',      min: 1000, max: 3000 },
  { label: '>3s',       min: 3000, max: Infinity },
]

function bucketize(entries: AuditEntry[]): { label: string; count: number }[] {
  return BUCKETS.map((b) => ({
    label: b.label,
    count: entries.filter((e) => {
      const ms = Number(e.latency_ms ?? 0)
      return ms >= b.min && ms < b.max
    }).length,
  }))
}

// Gantt: pick most recent conversation, reconstruct timeline
interface GanttBar {
  agent: string
  start_offset_ms: number
  duration_ms: number
}

function buildGantt(entries: AuditEntry[]): GanttBar[] {
  if (!entries.length) return []
  // Find the most recent conversation_id
  const sorted = [...entries].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  const convId = sorted[0].conversation_id
  const convEntries = entries
    .filter((e) => e.conversation_id === convId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  if (!convEntries.length) return []

  const t0 = new Date(convEntries[0].timestamp).getTime()
  return convEntries.map((e) => ({
    agent: e.agent,
    start_offset_ms: new Date(e.timestamp).getTime() - t0,
    duration_ms: Number(e.latency_ms ?? 50),
  }))
}

export default function ObservabilityTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getAuditLog(200)
      .then((data) => setEntries(data as AuditEntry[]))
      .catch(() => setError('Failed to load observability data.'))
      .finally(() => setLoading(false))
  }, [])

  const buckets    = useMemo(() => bucketize(entries), [entries])
  const ganttBars  = useMemo(() => buildGantt(entries), [entries])
  const slowest    = useMemo(
    () => [...entries].sort((a, b) => Number(b.latency_ms ?? 0) - Number(a.latency_ms ?? 0)).slice(0, 10),
    [entries],
  )

  const maxBucket  = Math.max(...buckets.map((b) => b.count), 1)
  const ganttTotal = ganttBars.reduce((s, b) => Math.max(s, b.start_offset_ms + b.duration_ms), 1)
  const GANTT_W    = 480 // px — the full timeline width

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--text-muted)' }}>
        Loading observability data…
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
    <div className="flex flex-col gap-6 h-full overflow-auto">

      {/* Latency distribution */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--navy)' }}>
          Latency Distribution ({entries.length} calls)
        </h3>
        {entries.length === 0 ? (
          <EmptyState text="No audit data yet." />
        ) : (
          <div
            className="flex items-end gap-4 px-4 pt-4"
            style={{
              borderLeft: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              height: 160,
            }}
          >
            {buckets.map((b) => {
              const barH = Math.max(4, Math.round((b.count / maxBucket) * 100))
              const isHot = b.label.includes('>3') || b.label.includes('1–3')
              return (
                <div key={b.label} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs font-mono" style={{ color: 'var(--navy)', fontSize: 10 }}>
                    {b.count}
                  </span>
                  <div
                    title={`${b.label}: ${b.count} calls`}
                    style={{
                      width: '70%',
                      height: barH,
                      background: isHot ? '#DC2626' : 'var(--navy)',
                      transition: 'height 0.3s ease',
                      alignSelf: 'flex-end',
                    }}
                  />
                  <span
                    className="text-center"
                    style={{ color: 'var(--text-muted)', fontSize: 10, lineHeight: 1.3 }}
                  >
                    {b.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Gantt trace */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--navy)' }}>
          Agent Trace — Most Recent Conversation
        </h3>
        {ganttBars.length === 0 ? (
          <EmptyState text="No conversation trace available." />
        ) : (
          <div
            className="flex flex-col gap-2 p-4"
            style={{ border: '1px solid var(--border)', overflowX: 'auto' }}
          >
            {/* Timeline header */}
            <div className="flex" style={{ paddingLeft: 120 }}>
              <div style={{ width: GANTT_W, position: 'relative', height: 14 }}>
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
                  <span
                    key={frac}
                    className="absolute text-xs"
                    style={{
                      left: `${frac * 100}%`,
                      color: 'var(--text-muted)',
                      fontSize: 10,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {fmtMs(Math.round(ganttTotal * frac))}
                  </span>
                ))}
              </div>
            </div>

            {/* Bars */}
            {ganttBars.map((bar, i) => {
              const left  = (bar.start_offset_ms / ganttTotal) * GANTT_W
              const width = Math.max(4, (bar.duration_ms / ganttTotal) * GANTT_W)
              return (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="text-xs font-medium flex-shrink-0"
                    style={{ width: 112, textAlign: 'right', color: 'var(--text-muted)' }}
                  >
                    {bar.agent}
                  </span>
                  <div style={{ width: GANTT_W, position: 'relative', height: 20, background: 'var(--surface)', border: '1px solid var(--border)', flexShrink: 0 }}>
                    <div
                      title={`${bar.agent}: ${fmtMs(bar.duration_ms)} (offset ${fmtMs(bar.start_offset_ms)})`}
                      style={{
                        position: 'absolute',
                        left,
                        width,
                        height: '100%',
                        background: agentColor(bar.agent),
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {fmtMs(bar.duration_ms)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Slowest calls table */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--navy)' }}>
          Top 10 Slowest Calls
        </h3>
        {slowest.length === 0 ? (
          <EmptyState text="No calls recorded yet." />
        ) : (
          <div style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: 'var(--navy)', color: '#fff' }}>
                  {['Timestamp', 'Agent', 'Action', 'Latency'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-semibold" style={{ whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slowest.map((e, i) => {
                  const ms = Number(e.latency_ms ?? 0)
                  const isHot = ms >= 3000
                  return (
                    <tr
                      key={e.log_id ?? i}
                      style={{
                        background: i % 2 === 0 ? '#fff' : 'var(--surface)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <td className="px-3 py-1.5" style={{ whiteSpace: 'nowrap' }}>{fmtTs(e.timestamp)}</td>
                      <td className="px-3 py-1.5 font-medium" style={{ color: agentColor(e.agent) }}>
                        {e.agent}
                      </td>
                      <td className="px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>{e.action}</td>
                      <td
                        className="px-3 py-1.5 font-mono font-semibold"
                        style={{ color: isHot ? '#DC2626' : 'var(--navy)' }}
                      >
                        {fmtMs(ms)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      className="flex items-center justify-center py-8 text-xs"
      style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
    >
      {text}
    </div>
  )
}
