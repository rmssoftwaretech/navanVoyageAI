import AgentBadge from './AgentBadge'
import type { AgentEvent, AgentType } from '@/types/nva'

interface TurnSummaryBadgeProps {
  events: AgentEvent[]
}

export default function TurnSummaryBadge({ events }: TurnSummaryBadgeProps) {
  const agents = [
    ...new Set(
      events
        .filter((e) => e.type === 'agent_start' && e.agent && e.agent !== 'judge')
        .map((e) => e.agent as AgentType)
    ),
  ]

  const toolCalls = events.filter((e) => e.type === 'mcp_tool_call').length

  const totalLatency = events
    .filter((e) => e.type === 'mcp_tool_result' && e.latency_ms !== undefined)
    .reduce((sum, e) => sum + (e.latency_ms ?? 0), 0)

  if (agents.length === 0 && toolCalls === 0) return null

  return (
    <div
      className="px-3 py-2 flex flex-col gap-1.5"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      <div className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        Turn summary
      </div>
      {agents.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {agents.map((a) => <AgentBadge key={a} agent={a} />)}
        </div>
      )}
      <div className="flex gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        {toolCalls > 0 && <span>{toolCalls} tool {toolCalls === 1 ? 'call' : 'calls'}</span>}
        {totalLatency > 0 && <span>{totalLatency}ms total</span>}
      </div>
    </div>
  )
}
