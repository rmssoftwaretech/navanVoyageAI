import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatChipsModule } from '@angular/material/chips'

const AGENT_META: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  search:      { label: 'Search',      bg: '#DBEAFE', color: '#1E40AF', icon: '🔍' },
  policy:      { label: 'Policy',      bg: '#FEF3C7', color: '#92400E', icon: '📋' },
  destination: { label: 'Destination', bg: '#D1FAE5', color: '#065F46', icon: '🌍' },
  booking:     { label: 'Booking',     bg: '#EDE9FE', color: '#5B21B6', icon: '🎫' },
  judge:       { label: 'Eval',        bg: '#FEE2E2', color: '#991B1B', icon: '⚖' },
}
const FALLBACK = { label: 'Agent', bg: '#F1F5F9', color: '#475569', icon: '🤖' }

@Component({
  selector: 'nva-agent-badge',
  standalone: true,
  imports: [CommonModule, MatChipsModule],
  template: `
    <mat-chip class="nva-chip"
      [style.background]="meta.bg"
      [style.color]="meta.color"
      [style.border-color]="meta.color + '30'">
      {{ meta.icon }} {{ meta.label }}
    </mat-chip>
  `,
})
export class AgentBadgeComponent {
  @Input() agent = ''
  get meta() {
    return AGENT_META[this.agent] ?? { ...FALLBACK, label: this.agent || 'Agent' }
  }
}
