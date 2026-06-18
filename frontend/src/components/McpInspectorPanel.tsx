import ToolCallCard from './Chat/ToolCallCard'
import TurnSummaryBadge from './Chat/TurnSummaryBadge'
import type { AgentEvent } from '@/types/nva'

interface McpInspectorPanelProps {
  events: AgentEvent[]
  isStreaming: boolean
}

export default function McpInspectorPanel({ events, isStreaming }: McpInspectorPanelProps) {
  // Pair mcp_tool_call with its mcp_tool_result by tool name + order
  const toolCalls: Array<{ call: AgentEvent; result?: AgentEvent }> = []
  const resultQueue: AgentEvent[] = []

  for (const e of events) {
    if (e.type === 'mcp_tool_call') {
      toolCalls.push({ call: e })
    } else if (e.type === 'mcp_tool_result') {
      const pending = toolCalls.find(
        (tc) => tc.call.tool === e.tool && !tc.result
      )
      if (pending) {
        pending.result = e
      } else {
        resultQueue.push(e)
      }
    }
  }

  const hasActivity = events.some((e) =>
    ['agent_start', 'mcp_tool_call', 'mcp_tool_result'].includes(e.type)
  )

  if (!hasActivity && !isStreaming) {
    return (
      <div className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Tool calls will appear here during a conversation.
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Turn summary */}
      <TurnSummaryBadge events={events} />

      {/* Streaming indicator */}
      {isStreaming && toolCalls.length === 0 && (
        <div className="px-3 py-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: 'var(--gold)' }}
          />
          Agents running…
        </div>
      )}

      {/* Tool call cards */}
      {toolCalls.map(({ call, result }, i) => (
        <ToolCallCard key={i} callEvent={call} resultEvent={result} />
      ))}

      {/* Agent lifecycle events (non-tool) */}
      {events
        .filter((e) => e.type === 'agent_start' || e.type === 'agent_done')
        .map((e, i) => (
          <div
            key={`agent-${i}`}
            className="px-3 py-1.5 text-xs flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: e.type === 'agent_start' ? 'var(--gold)' : '#10B981' }}
            />
            <span style={{ color: 'var(--navy)' }}>{e.agent}</span>
            <span>{e.type === 'agent_start' ? 'started' : 'done'}</span>
          </div>
        ))}
    </div>
  )
}
