import { useState } from 'react'
import type { AgentEvent } from '@/types/nva'

interface ToTReasoningCardProps {
  events: AgentEvent[]
}

interface Branch {
  index: number
  angle: string
  content: string
  score?: number
  rationale?: string
  selected: boolean
}

export default function ToTReasoningCard({ events }: ToTReasoningCardProps) {
  const [expanded, setExpanded] = useState(false)

  const totStart    = events.find((e) => e.type === 'tot_start')
  const totSelected = events.find((e) => e.type === 'tot_selected')

  if (!totStart) return null

  // Build branch data from events
  const branchMap: Record<number, Branch> = {}
  for (const e of events) {
    if (e.type === 'tot_branch' && e.index !== undefined) {
      branchMap[e.index] = {
        index: e.index,
        angle: e.angle ?? '',
        content: e.content ?? '',
        score: undefined,
        rationale: undefined,
        selected: false,
      }
    }
    if (e.type === 'tot_evaluate' && e.index !== undefined && branchMap[e.index]) {
      branchMap[e.index].score    = e.score
      branchMap[e.index].rationale = e.rationale
    }
    if (e.type === 'tot_selected' && e.index !== undefined && branchMap[e.index]) {
      branchMap[e.index].selected = true
    }
  }
  const branches = Object.values(branchMap).sort((a, b) => a.index - b.index)
  const selectedIdx = totSelected?.index ?? -1

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left"
        style={{ background: 'transparent' }}
      >
        <span className="text-sm">🌳</span>
        <span className="font-semibold" style={{ color: 'var(--navy)' }}>
          Tree of Thought
        </span>
        <span
          className="ml-auto px-1.5 py-0.5 text-xs font-mono"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          {branches.length} branches
        </span>
        {selectedIdx >= 0 && (
          <span
            className="px-1.5 py-0.5 text-xs font-semibold"
            style={{ background: '#D1FAE5', color: '#065F46' }}
          >
            #{selectedIdx + 1} selected
          </span>
        )}
        <span style={{ color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Branch list */}
      {expanded && (
        <div className="flex flex-col gap-0">
          {branches.map((b) => (
            <BranchRow key={b.index} branch={b} />
          ))}
          {branches.length === 0 && (
            <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              Branches generating…
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function BranchRow({ branch }: { branch: Branch }) {
  const [open, setOpen] = useState(false)

  const scoreColor = branch.score !== undefined
    ? branch.score >= 7 ? '#065F46' : branch.score >= 5 ? '#92400E' : '#991B1B'
    : 'var(--text-muted)'

  const scoreBg = branch.score !== undefined
    ? branch.score >= 7 ? '#D1FAE5' : branch.score >= 5 ? '#FEF3C7' : '#FEE2E2'
    : 'var(--surface)'

  return (
    <div
      style={{
        borderTop: '1px solid var(--border)',
        background: branch.selected ? '#F0F7FF' : undefined,
        borderLeft: branch.selected ? '3px solid var(--navy)' : '3px solid transparent',
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left"
        style={{ background: 'transparent' }}
      >
        <span
          className="font-mono font-semibold flex-shrink-0"
          style={{ color: 'var(--navy)', width: 18 }}
        >
          #{branch.index + 1}
        </span>
        <span
          className="flex-1 truncate"
          style={{ color: branch.selected ? 'var(--navy)' : 'var(--text-muted)' }}
        >
          {branch.angle}
        </span>
        {branch.score !== undefined && (
          <span
            className="px-1.5 py-0.5 font-mono font-semibold flex-shrink-0"
            style={{ background: scoreBg, color: scoreColor, fontSize: 10 }}
          >
            {branch.score.toFixed(1)}
          </span>
        )}
        {branch.selected && (
          <span className="text-xs flex-shrink-0" style={{ color: '#065F46' }}>✓</span>
        )}
        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
            {branch.content}
          </p>
          {branch.rationale && (
            <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
              Eval: "{branch.rationale}"
            </p>
          )}
        </div>
      )}
    </div>
  )
}
