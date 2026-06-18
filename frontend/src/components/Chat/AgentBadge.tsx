import type { AgentType } from '@/types/nva'

const AGENT_CONFIG: Record<AgentType, { label: string; color: string; bg: string }> = {
  search:      { label: 'Search',      color: '#1D4ED8', bg: '#DBEAFE' },
  policy:      { label: 'Policy',      color: '#92400E', bg: '#FEF3C7' },
  destination: { label: 'Destination', color: '#065F46', bg: '#D1FAE5' },
  booking:     { label: 'Booking',     color: '#5B21B6', bg: '#EDE9FE' },
  judge:       { label: 'Judge',       color: '#6B7280', bg: '#F3F4F6' },
}

interface AgentBadgeProps {
  agent: AgentType
}

export default function AgentBadge({ agent }: AgentBadgeProps) {
  const cfg = AGENT_CONFIG[agent] ?? { label: agent, color: '#374151', bg: '#F3F4F6' }
  return (
    <span
      className="inline-flex items-center text-xs font-medium px-2 py-0.5"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}22` }}
    >
      {cfg.label}
    </span>
  )
}
