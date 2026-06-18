import { useState } from 'react'
import type { AgentEvent } from '@/types/nva'

interface ToolCallCardProps {
  callEvent: AgentEvent
  resultEvent?: AgentEvent
}

export default function ToolCallCard({ callEvent, resultEvent }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)
  const latency = resultEvent?.latency_ms

  return (
    <div
      className="border-b text-xs"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Header row */}
      <button
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: resultEvent ? '#10B981' : '#F59E0B' }}
          />
          <span className="font-medium truncate" style={{ color: 'var(--navy)' }}>
            {callEvent.tool ?? 'tool_call'}
          </span>
          {callEvent.agent && (
            <span className="px-1.5 py-0.5 text-xs" style={{ background: '#EDE9FE', color: '#5B21B6' }}>
              {callEvent.agent}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {latency !== undefined && (
            <span style={{ color: latency > 1000 ? '#D97706' : '#6B7280' }}>
              {latency}ms
            </span>
          )}
          <span style={{ color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded JSON */}
      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {callEvent.input !== undefined && (
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>INPUT</div>
              <pre
                className="p-2 overflow-x-auto text-xs"
                style={{ background: '#F8FAFC', border: '1px solid var(--border)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
              >
                {JSON.stringify(callEvent.input, null, 2)}
              </pre>
            </div>
          )}
          {resultEvent?.output !== undefined && (
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>OUTPUT</div>
              <pre
                className="p-2 overflow-x-auto text-xs"
                style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
              >
                {JSON.stringify(resultEvent.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
