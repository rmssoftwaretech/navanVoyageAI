import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatChipsModule } from '@angular/material/chips'

type AgentName = 'search' | 'policy' | 'destination' | 'booking' | 'judge'

const AGENT_META: Record<AgentName, { label: string; bg: string; color: string }> = {
  search:      { label: '🔍 Search',      bg: '#DBEAFE', color: '#1E40AF' },
  policy:      { label: '📋 Policy',      bg: '#FEF3C7', color: '#92400E' },
  destination: { label: '🌍 Destination', bg: '#D1FAE5', color: '#065F46' },
  booking:     { label: '🎫 Booking',     bg: '#EDE9FE', color: '#5B21B6' },
  judge:       { label: '⚖ Eval',        bg: '#FEE2E2', color: '#991B1B' },
}

const FALLBACK = { label: '🤖 Agent', bg: '#F1F5F9', color: '#475569' }

@Component({
  selector: 'nva-agent-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="agent-badge" [style.background]="meta.bg" [style.color]="meta.color">
      {{ meta.label }}
    </span>
  `,
})
export class AgentBadgeComponent {
  @Input() agent: string = ''

  get meta() {
    return AGENT_META[this.agent as AgentName] ?? { ...FALLBACK, label: `🤖 ${this.agent}` }
  }
}
