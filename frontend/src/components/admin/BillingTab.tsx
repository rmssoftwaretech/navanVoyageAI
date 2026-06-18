import { useEffect, useMemo, useState } from 'react'
import { getAuditLog } from '@/services/admin'

// GPT-4o pricing (per token)
const COST_IN  = 0.000005   // $5 / 1M input tokens
const COST_OUT = 0.000015   // $15 / 1M output tokens

interface AuditEntry {
  agent: string
  token_in?: number
  token_out?: number
  timestamp: string
  conversation_id?: string
}

interface AgentStats {
  agent: string
  token_in: number
  token_out: number
  cost_usd: number
  calls: number
}

function computeStats(entries: AuditEntry[]): AgentStats[] {
  const map: Record<string, AgentStats> = {}
  for (const e of entries) {
    const a = e.agent ?? 'unknown'
    if (!map[a]) map[a] = { agent: a, token_in: 0, token_out: 0, cost_usd: 0, calls: 0 }
    const tin  = Number(e.token_in  ?? 0)
    const tout = Number(e.token_out ?? 0)
    map[a].token_in  += tin
    map[a].token_out += tout
    map[a].cost_usd  += tin * COST_IN + tout * COST_OUT
    map[a].calls     += 1
  }
  return Object.values(map).sort((a, b) => b.cost_usd - a.cost_usd)
}

function thisMonthEntries(entries: AuditEntry[]): AuditEntry[] {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  return entries.filter((e) => {
    try {
      const d = new Date(e.timestamp)
      return d.getFullYear() === y && d.getMonth() === m
    } catch { return false }
  })
}

function uniqueConversations(entries: AuditEntry[]): number {
  return new Set(entries.map((e) => e.conversation_id).filter(Boolean)).size
}

function fmtUsd(n: number): string {
  return n < 0.01 ? `$${n.toFixed(6)}` : `$${n.toFixed(4)}`
}

function fmtNum(n: number): string {
  return n.toLocaleString()
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

export default function BillingTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getAuditLog(500)
      .then((data) => setEntries(data as AuditEntry[]))
      .catch(() => setError('Failed to load billing data.'))
      .finally(() => setLoading(false))
  }, [])

  const monthEntries  = useMemo(() => thisMonthEntries(entries), [entries])
  const agentStats    = useMemo(() => computeStats(entries), [entries])
  const monthStats    = useMemo(() => computeStats(monthEntries), [monthEntries])

  const totalTokenIn  = agentStats.reduce((s, a) => s + a.token_in, 0)
  const totalTokenOut = agentStats.reduce((s, a) => s + a.token_out, 0)
  const totalCost     = agentStats.reduce((s, a) => s + a.cost_usd, 0)
  const monthCost     = monthStats.reduce((s, a) => s + a.cost_usd, 0)
  const convCount     = uniqueConversations(entries)
  const costPerConv   = convCount > 0 ? totalCost / convCount : 0

  const maxCost = Math.max(...agentStats.map((a) => a.cost_usd), 0.000001)
  const BAR_MAX_H = 120 // px

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--text-muted)' }}>
        Loading billing data…
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

      {/* KPI row */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <KpiCard label="Spend This Month" value={fmtUsd(monthCost)} sub="based on audit log tokens" />
        <KpiCard
          label="Total Tokens"
          value={`${fmtNum(totalTokenIn + totalTokenOut)}`}
          sub={`↑ ${fmtNum(totalTokenIn)} in  ·  ↓ ${fmtNum(totalTokenOut)} out`}
        />
        <KpiCard
          label="Avg Cost / Conversation"
          value={fmtUsd(costPerConv)}
          sub={`across ${fmtNum(convCount)} conversation${convCount !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Bar chart */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--navy)' }}>
          Cost by Agent (all time)
        </h3>
        {agentStats.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-xs" style={{ color: 'var(--text-muted)' }}>
            No token usage recorded yet.
          </div>
        ) : (
          <div
            className="flex items-end gap-4 px-4 pt-4"
            style={{
              borderLeft: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              minHeight: BAR_MAX_H + 60,
              overflowX: 'auto',
            }}
          >
            {agentStats.map((s) => {
              const barH = Math.max(4, Math.round((s.cost_usd / maxCost) * BAR_MAX_H))
              return (
                <div key={s.agent} className="flex flex-col items-center gap-1" style={{ minWidth: 64 }}>
                  {/* Cost label above bar */}
                  <span className="text-xs font-mono" style={{ color: 'var(--navy)', fontSize: 10 }}>
                    {fmtUsd(s.cost_usd)}
                  </span>
                  {/* Bar */}
                  <div
                    title={`${s.agent}: ${fmtUsd(s.cost_usd)} (${fmtNum(s.calls)} calls)`}
                    style={{
                      width: 40,
                      height: barH,
                      background: agentColor(s.agent),
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                      transition: 'height 0.3s ease',
                    }}
                  />
                  {/* Agent label */}
                  <span
                    className="text-xs text-center"
                    style={{ color: 'var(--text-muted)', fontSize: 10, lineHeight: 1.2 }}
                  >
                    {s.agent}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                    {fmtNum(s.calls)} calls
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Pricing: ${(COST_IN * 1_000_000).toFixed(2)}/M input · ${(COST_OUT * 1_000_000).toFixed(2)}/M output (GPT-4o)
        </p>
      </div>

      {/* Per-agent detail table */}
      {agentStats.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--navy)' }}>
            Breakdown
          </h3>
          <div style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: 'var(--navy)', color: '#fff' }}>
                  {['Agent', 'Calls', 'Tokens In', 'Tokens Out', 'Est. Cost'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-semibold" style={{ whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentStats.map((s, i) => (
                  <tr
                    key={s.agent}
                    style={{
                      background: i % 2 === 0 ? '#fff' : 'var(--surface)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <td className="px-3 py-1.5 font-medium" style={{ color: agentColor(s.agent) }}>
                      {s.agent}
                    </td>
                    <td className="px-3 py-1.5 font-mono">{fmtNum(s.calls)}</td>
                    <td className="px-3 py-1.5 font-mono">{fmtNum(s.token_in)}</td>
                    <td className="px-3 py-1.5 font-mono">{fmtNum(s.token_out)}</td>
                    <td className="px-3 py-1.5 font-mono font-semibold" style={{ color: 'var(--navy)' }}>
                      {fmtUsd(s.cost_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div
      className="flex flex-col gap-1 p-4"
      style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
    >
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="text-2xl font-bold font-mono" style={{ color: 'var(--navy)' }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {sub}
      </span>
    </div>
  )
}
