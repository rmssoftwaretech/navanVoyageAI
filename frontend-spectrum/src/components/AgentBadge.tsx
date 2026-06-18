import { Badge } from '@react-spectrum/s2'
import type { AgentType } from '@/types/nva'

type BadgeVariant = 'informative' | 'positive' | 'notice' | 'negative' | 'neutral'

const VARIANT_MAP: Record<AgentType, BadgeVariant> = {
  search:      'informative',
  policy:      'notice',
  destination: 'positive',
  booking:     'neutral',
  judge:       'negative',
}

const LABEL_MAP: Record<AgentType, string> = {
  search:      '✈ Search',
  policy:      '📋 Policy',
  destination: '🌍 Destination',
  booking:     '📅 Booking',
  judge:       '⚖ Judge',
}

interface AgentBadgeProps {
  agent: AgentType
}

export default function AgentBadge({ agent }: AgentBadgeProps) {
  return (
    <Badge variant={VARIANT_MAP[agent] ?? 'neutral'} size="S">
      {LABEL_MAP[agent] ?? agent}
    </Badge>
  )
}
