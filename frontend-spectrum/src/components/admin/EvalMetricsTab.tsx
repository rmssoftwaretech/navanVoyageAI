import { useEffect, useMemo, useState } from 'react'
import { ProgressCircle } from '@react-spectrum/s2'
import { getEvalScores } from '@/services/admin'
import type { EvalScore } from '@/services/admin'

const CRITERIA = ['relevance', 'accuracy', 'policy_compliance', 'completeness', 'tone'] as const
type Criterion = typeof CRITERIA[number]

const CRITERION_LABELS: Record<Criterion, string> = {
  relevance: 'Relevance', accuracy: 'Accuracy', policy_compliance: 'Policy',
  completeness: 'Completeness', tone: 'Tone',
}

function scoreColor(s: number): string {
  if (s >= 0.75) return '#16a34a'
  if (s >= 0.5) return '#D97706'
  return '#dc2626'
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function EvalMetricsTab() {
  const [scores, setScores] = useState<EvalScore[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    getEvalScores(200).then(setScores).finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    if (!scores.length) return null
    const avg = scores.reduce((s, e) => s + e.total_score, 0) / scores.length
    const passRate = scores.filter((e) => e.passed).length / scores.length
    const perCriteria = CRITERIA.map((c) => {
      const vals = scores.map((e) => e.scores[c] ?? 0)
      return { criterion: c, avg: vals.reduce((a, b) => a + b, 0) / vals.length }
    })
    return { avg, passRate, perCriteria }
  }, [scores])

  if (loading) return <div style={center}><ProgressCircle isIndeterminate aria-label="Loading" /></div>

  if (!scores.length) return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No eval scores yet.</div>

  return (
    <div>
      <h3 style={heading}>Eval Metrics</h3>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Avg Score', value: `${(stats!.avg * 100).toFixed(1)}%`, color: scoreColor(stats!.avg) },
          { label: 'Pass Rate', value: `${(stats!.passRate * 100).toFixed(1)}%`, color: scoreColor(stats!.passRate) },
          { label: 'Evaluations', value: scores.length.toString(), color: '#1E3A5F' },
        ].map(({ label, value, color }) => (
          <div key={label} style={kpiCard}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Per-criteria bars */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#475569' }}>Avg Score per Criterion</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stats!.perCriteria.map(({ criterion, avg }) => (
            <div key={criterion} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#64748b', width: 110, flexShrink: 0 }}>{CRITERION_LABELS[criterion]}</span>
              <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 4, height: 14, overflow: 'hidden' }}>
                <div style={{ width: `${avg * 100}%`, height: '100%', background: scoreColor(avg), borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(avg), width: 42, textAlign: 'right', flexShrink: 0 }}>
                {(avg * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent scores */}
      <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#475569' }}>Recent Evaluations</h4>
      <div style={{ overflowX: 'auto' }}>
        <table style={tbl}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={th}>Time</th>
              <th style={th}>Score</th>
              <th style={th}>Pass</th>
              <th style={th}>Model</th>
              <th style={th}>Reasoning</th>
            </tr>
          </thead>
          <tbody>
            {scores.slice(0, 50).map((e) => {
              const isOpen = expanded === e.eval_id
              return (
                <>
                  <tr
                    key={e.eval_id}
                    onClick={() => setExpanded(isOpen ? null : e.eval_id)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isOpen ? '#f0f7ff' : undefined }}
                  >
                    <td style={td}>{fmt(e.timestamp)}</td>
                    <td style={td}><span style={{ fontWeight: 700, color: scoreColor(e.total_score) }}>{(e.total_score * 100).toFixed(0)}%</span></td>
                    <td style={td}><span style={{ fontWeight: 700, color: e.passed ? '#16a34a' : '#dc2626' }}>{e.passed ? '✓' : '✕'}</span></td>
                    <td style={{ ...td, fontSize: 11, color: '#94a3b8' }}>{e.model}</td>
                    <td style={{ ...td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: '#64748b' }}>
                      {e.reasoning}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${e.eval_id}-d`} style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <td colSpan={5} style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {CRITERIA.map((c) => (
                            <span key={c} style={{ fontSize: 12 }}>
                              <span style={{ color: '#64748b' }}>{CRITERION_LABELS[c]}: </span>
                              <span style={{ fontWeight: 700, color: scoreColor(e.scores[c] ?? 0) }}>{((e.scores[c] ?? 0) * 100).toFixed(0)}%</span>
                            </span>
                          ))}
                        </div>
                        {e.reasoning && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{e.reasoning}</p>}
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

const center: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 40 }
const heading: React.CSSProperties = { margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#1E3A5F' }
const kpiCard: React.CSSProperties = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px' }
const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const th: React.CSSProperties = { padding: '7px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '7px 12px', color: '#334155', verticalAlign: 'middle' }
