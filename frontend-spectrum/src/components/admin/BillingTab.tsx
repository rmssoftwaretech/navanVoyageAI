import { useEffect, useState } from 'react'
import { ProgressCircle, TableView, TableHeader, Column, TableBody, Row, Cell } from '@react-spectrum/s2'
import { getBilling } from '@/services/admin'
import type { BillingEntry } from '@/services/admin'

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'claude-opus-4-7': { input: 15.0, output: 75.0 },
}

function costColor(cost: number): string {
  if (cost < 0.01) return '#16a34a'
  if (cost < 0.1) return '#D97706'
  return '#dc2626'
}

function fmt(ts: string) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function BillingTab() {
  const [data, setData] = useState<{ entries: BillingEntry[]; total_cost_usd: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBilling().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={center}><ProgressCircle isIndeterminate aria-label="Loading" /></div>

  const entries = data?.entries ?? []
  const totalInput = entries.reduce((s, e) => s + (e.input_tokens ?? 0), 0)
  const totalOutput = entries.reduce((s, e) => s + (e.output_tokens ?? 0), 0)
  const totalCost = data?.total_cost_usd ?? 0

  const maxCost = Math.max(...entries.map((e) => e.total_cost_usd), 0.001)

  return (
    <div>
      <h3 style={heading}>Token Usage & Cost</h3>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Cost', value: `$${totalCost.toFixed(4)}`, color: costColor(totalCost) },
          { label: 'Input Tokens', value: totalInput.toLocaleString(), color: '#1E3A5F' },
          { label: 'Output Tokens', value: totalOutput.toLocaleString(), color: '#1E3A5F' },
        ].map(({ label, value, color }) => (
          <div key={label} style={kpiCard}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No billing data yet.</div>
      ) : (
        <>
          <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#475569' }}>Usage by Period</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map((e, i) => {
              const pct = maxCost > 0 ? (e.total_cost_usd / maxCost) * 100 : 0
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#64748b', width: 70, flexShrink: 0 }}>{fmt(e.period_start)}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', width: 100, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.model ?? '—'}</span>
                  <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 4, height: 16, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#1E3A5F', borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: costColor(e.total_cost_usd), width: 70, textAlign: 'right', flexShrink: 0 }}>
                    ${e.total_cost_usd.toFixed(4)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Pricing reference */}
          <details style={{ marginTop: 24 }}>
            <summary style={{ fontSize: 12, color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>List pricing reference (per 1M tokens)</summary>
            <div style={{ marginTop: 10 }}>
              <TableView aria-label="Model pricing" density="compact" UNSAFE_style={{ width: '100%' }}>
                <TableHeader>
                  <Column isRowHeader>Model</Column>
                  <Column>Input / 1M</Column>
                  <Column>Output / 1M</Column>
                </TableHeader>
                <TableBody items={Object.entries(MODEL_COSTS).map(([model, c]) => ({ model, ...c }))}>
                  {(item) => (
                    <Row id={item.model}>
                      <Cell>{item.model}</Cell>
                      <Cell>${item.input}</Cell>
                      <Cell>${item.output}</Cell>
                    </Row>
                  )}
                </TableBody>
              </TableView>
            </div>
          </details>
        </>
      )}
    </div>
  )
}

const center: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 40 }
const heading: React.CSSProperties = { margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#1E3A5F' }
const kpiCard: React.CSSProperties = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px' }
