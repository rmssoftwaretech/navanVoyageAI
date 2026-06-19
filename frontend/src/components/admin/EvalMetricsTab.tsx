import { useEffect, useMemo, useRef, useState } from 'react'
import { getEvalScores } from '@/services/admin'
import { usePolling } from '@/hooks/usePolling'
import { downloadJson } from '@/utils/export'

interface EvalScore {
  eval_id: string
  conversation_id: string
  scores: Record<string, number>
  total_score: number
  passed: boolean
  reasoning: string
  model: string
  timestamp: string
}

const CRITERIA = ['relevance', 'accuracy', 'policy_compliance', 'completeness', 'tone'] as const
type Criterion = typeof CRITERIA[number]

const CRITERION_LABELS: Record<Criterion, string> = {
  relevance:         'Relevance',
  accuracy:          'Accuracy',
  policy_compliance: 'Policy Compliance',
  completeness:      'Completeness',
  tone:              'Tone',
}

function avg(evals: EvalScore[], key: Criterion): number {
  if (!evals.length) return 0
  return evals.reduce((s, e) => s + (e.scores[key] ?? 0), 0) / evals.length
}

function fmtScore(n: number): string {
  return (n * 100).toFixed(1) + '%'
}

function fmtTs(iso: string): string {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

function scoreColor(n: number): string {
  if (n >= 0.85) return '#065F46'
  if (n >= 0.70) return '#92400E'
  return '#991B1B'
}

function scoreBg(n: number): string {
  if (n >= 0.85) return '#D1FAE5'
  if (n >= 0.70) return '#FEF3C7'
  return '#FEE2E2'
}

export default function EvalMetricsTab() {
  const [evals, setEvals] = useState<EvalScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const knownIds = useRef<Set<string>>(new Set())

  function fetchData() {
    getEvalScores(200).then((data) => {
      const incoming = data as EvalScore[]
      const fresh = incoming.filter((e) => !knownIds.current.has(e.eval_id))
      if (fresh.length) {
        const freshSet = new Set(fresh.map((e) => e.eval_id))
        setNewIds(freshSet)
        setTimeout(() => setNewIds(new Set()), 1500)
        fresh.forEach((e) => knownIds.current.add(e.eval_id))
      }
      incoming.forEach((e) => knownIds.current.add(e.eval_id))
      setEvals(incoming)
    }).catch(() => setError('Failed to load eval scores.'))
  }

  useEffect(() => {
    fetchData()
    setLoading(false)
  }, [])
  usePolling(fetchData, 15_000)

  function handleExport() {
    downloadJson(`nva-eval-${new Date().toISOString().slice(0, 10)}.json`, evals)
  }

  const totalEvals   = evals.length
  const passed       = evals.filter((e) => e.passed).length
  const failed       = totalEvals - passed
  const passRate     = totalEvals ? passed / totalEvals : 0
  const avgTotal     = totalEvals ? evals.reduce((s, e) => s + e.total_score, 0) / totalEvals : 0
  const criteriaAvgs = useMemo(
    () => CRITERIA.map((c) => ({ criterion: c, value: avg(evals, c) })),
    [evals],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--text-muted)' }}>
        Loading eval metrics…
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
    <div className="flex flex-col gap-5 h-full overflow-auto">

      {/* KPI row */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiCard label="Avg Score" value={fmtScore(avgTotal)} color={scoreColor(avgTotal)} />
        <KpiCard label="Pass Rate" value={fmtScore(passRate)} color={scoreColor(passRate)} />
        <KpiCard label="Total Evals" value={String(totalEvals)} color="var(--navy)" />
        <KpiCard label="Below Threshold" value={String(failed)} color={failed > 0 ? '#991B1B' : '#065F46'} />
      </div>

      {/* Criteria breakdown */}
      {totalEvals > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--navy)' }}>
            Avg Score by Criterion
          </h3>
          <div
            className="flex flex-col gap-2 p-4"
            style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            {criteriaAvgs.map(({ criterion, value }) => (
              <div key={criterion} className="flex items-center gap-3">
                <span
                  className="text-xs font-medium"
                  style={{ width: 140, flexShrink: 0, color: 'var(--text-muted)' }}
                >
                  {CRITERION_LABELS[criterion]}
                </span>
                <div
                  className="flex-1 relative"
                  style={{ height: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${value * 100}%`,
                      background: scoreColor(value),
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                <span
                  className="text-xs font-mono font-semibold"
                  style={{ width: 44, textAlign: 'right', color: scoreColor(value) }}
                >
                  {fmtScore(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent eval list */}
      <div className="flex flex-col gap-2 flex-1">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--navy)' }}>
            Recent Evaluations
          </h3>
          {evals.length > 0 && (
            <button
              onClick={handleExport}
              style={{
                padding: '4px 10px',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                border: '1px solid var(--brand)',
                background: 'transparent',
                color: 'var(--brand)',
                cursor: 'pointer',
              }}
            >
              ↓ Export JSON
            </button>
          )}
        </div>
        {evals.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-xs" style={{ color: 'var(--text-muted)' }}>
            No evaluations yet — JudgeAgent runs after each completed conversation turn.
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', overflowY: 'auto', maxHeight: 320 }}>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: 'var(--navy)', color: '#fff', position: 'sticky', top: 0 }}>
                  {['Timestamp', 'Conversation', 'Score', 'Status', 'Model', ''].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-semibold" style={{ whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evals.map((e, i) => {
                  const open = expanded === e.eval_id
                  const isNew = newIds.has(e.eval_id)
                  return (
                    <>
                      <tr
                        key={e.eval_id}
                        style={{
                          background: isNew ? '#FEF9C3' : i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-page)',
                          borderBottom: open ? 'none' : '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'background 1s ease',
                        }}
                        onClick={() => setExpanded(open ? null : e.eval_id)}
                      >
                        <td className="px-3 py-1.5" style={{ whiteSpace: 'nowrap' }}>{fmtTs(e.timestamp)}</td>
                        <td
                          className="px-3 py-1.5 font-mono"
                          style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={e.conversation_id}
                        >
                          {e.conversation_id.slice(0, 8)}…
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className="px-2 py-0.5 font-mono font-semibold"
                            style={{
                              background: scoreBg(e.total_score),
                              color: scoreColor(e.total_score),
                            }}
                          >
                            {fmtScore(e.total_score)}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className="px-2 py-0.5 text-xs font-semibold"
                            style={{
                              background: e.passed ? '#D1FAE5' : '#FEE2E2',
                              color: e.passed ? '#065F46' : '#991B1B',
                            }}
                          >
                            {e.passed ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                          {e.model ?? '—'}
                        </td>
                        <td className="px-3 py-1.5 text-center" style={{ color: 'var(--text-muted)' }}>
                          {open ? '▲' : '▼'}
                        </td>
                      </tr>

                      {/* Expandable drawer */}
                      {open && (
                        <tr
                          key={`${e.eval_id}-drawer`}
                          style={{
                            background: i % 2 === 0 ? '#fff' : 'var(--surface)',
                            borderBottom: '1px solid var(--border)',
                          }}
                        >
                          <td colSpan={6} className="px-4 py-3">
                            <div className="flex flex-col gap-2">
                              {/* Per-criteria scores */}
                              <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                                {CRITERIA.map((c) => {
                                  const v = e.scores[c] ?? 0
                                  return (
                                    <div key={c} className="flex flex-col items-center gap-1 p-2"
                                      style={{ background: scoreBg(v), border: `1px solid ${scoreColor(v)}22` }}
                                    >
                                      <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                                        {CRITERION_LABELS[c]}
                                      </span>
                                      <span className="text-sm font-bold font-mono" style={{ color: scoreColor(v) }}>
                                        {fmtScore(v)}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                              {/* Reasoning */}
                              {e.reasoning && (
                                <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                                  "{e.reasoning}"
                                </p>
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
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="flex flex-col gap-1 p-4"
      style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
    >
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="text-2xl font-bold font-mono" style={{ color }}>
        {value}
      </span>
    </div>
  )
}
