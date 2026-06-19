import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { AdminService, AuditEntry } from '../../services/admin.service'

const AGENTS = ['orchestrator', 'search', 'policy', 'destination', 'booking', 'judge']
const AGENT_COLORS: Record<string, string> = {
  orchestrator: '#1E3A5F', search: '#1D4ED8', policy: '#92400E',
  destination: '#065F46', booking: '#5B21B6', judge: '#D97706',
}

interface AgentStat {
  agent: string; count: number; avgMs: number; p95Ms: number; maxMs: number
}

@Component({
  selector: 'nva-observability-tab',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div style="padding: 8px 0;">
      <h3 style="margin: 0 0 20px; font-size: 15px; font-weight: 700; color: #1E3A5F;">Agent Observability</h3>

      <div *ngIf="loading" style="display: flex; justify-content: center; padding: 40px;">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <ng-container *ngIf="!loading">
        <!-- KPIs -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
          <div *ngFor="let kpi of kpis" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px;">
            <p style="margin: 0; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">{{ kpi.label }}</p>
            <p style="margin: 6px 0 0; font-size: 22px; font-weight: 700; color: #1E3A5F;">{{ kpi.value }}</p>
          </div>
        </div>

        <!-- Latency bars -->
        <h4 style="margin: 0 0 12px; font-size: 13px; font-weight: 600; color: #475569;">Avg Latency per Agent</h4>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
          <div *ngFor="let s of stats" style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 12px; color: #64748b; width: 100px; flex-shrink: 0; text-transform: capitalize;">{{ s.agent }}</span>
            <div style="flex: 1; background: #f1f5f9; border-radius: 4px; height: 18px; overflow: hidden;">
              <div [style.width]="barPct(s) + '%'" [style.background]="agentColor(s.agent)"
                style="height: 100%; border-radius: 4px; display: flex; align-items: center; padding-left: 6px; transition: width 0.4s;">
                <span *ngIf="s.count > 0 && barPct(s) > 15" style="font-size: 10px; color: #fff; font-weight: 600;">{{ s.avgMs }}ms</span>
              </div>
            </div>
            <div style="width: 140px; flex-shrink: 0; display: flex; gap: 8px; font-size: 11px; color: #94a3b8;">
              <ng-container *ngIf="s.count; else noData">
                <span>{{ s.count }} calls</span>
                <span>p95 {{ s.p95Ms }}ms</span>
              </ng-container>
              <ng-template #noData><span>no data</span></ng-template>
            </div>
          </div>
        </div>

        <!-- Recent activity -->
        <ng-container *ngIf="recentActivity.length > 0">
          <h4 style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #475569;">Recent Activity</h4>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div *ngFor="let e of recentActivity" style="display: flex; align-items: center; gap: 10px; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
              <span [style.background]="agentColor(e.agent)" style="padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #fff; text-transform: capitalize; flex-shrink: 0;">{{ e.agent }}</span>
              <span style="flex: 1; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ e.action }}</span>
              <span *ngIf="e.latency_ms != null" style="color: #94a3b8; flex-shrink: 0;">{{ e.latency_ms }}ms</span>
            </div>
          </div>
        </ng-container>

        <div *ngIf="totalCalls === 0" style="text-align: center; padding: 40px; color: #94a3b8;">No agent calls recorded yet.</div>
      </ng-container>
    </div>
  `,
})
export class ObservabilityTabComponent implements OnInit {
  entries: AuditEntry[] = []
  loading = true
  stats: AgentStat[] = []
  private maxAvg = 1

  get totalCalls(): number { return this.entries.length }
  get recentActivity(): AuditEntry[] { return this.entries.slice(0, 20) }

  get kpis() {
    const active = this.stats.filter(s => s.count > 0).length
    const allWithLatency = this.entries.filter(e => e.latency_ms != null)
    const avgAll = allWithLatency.length
      ? Math.round(allWithLatency.reduce((s, e) => s + (e.latency_ms ?? 0), 0) / allWithLatency.length)
      : 0
    return [
      { label: 'Total Agent Calls', value: this.totalCalls.toString() },
      { label: 'Active Agents', value: active.toString() },
      { label: 'Avg Latency (all)', value: this.totalCalls ? `${avgAll}ms` : '—' },
    ]
  }

  constructor(private adminSvc: AdminService) {}

  ngOnInit(): void {
    this.adminSvc.getAuditLog(500).subscribe({
      next: (data) => {
        this.entries = data
        this.computeStats()
        this.loading = false
      },
      error: () => { this.loading = false },
    })
  }

  private computeStats(): void {
    this.stats = AGENTS.map(agent => {
      const ae = this.entries.filter(e => e.agent === agent && e.latency_ms != null)
      if (!ae.length) return { agent, count: 0, avgMs: 0, p95Ms: 0, maxMs: 0 }
      const lat = ae.map(e => e.latency_ms!).sort((a, b) => a - b)
      const avg = lat.reduce((a, b) => a + b, 0) / lat.length
      const p95 = lat[Math.floor(lat.length * 0.95)] ?? lat[lat.length - 1]
      return { agent, count: ae.length, avgMs: Math.round(avg), p95Ms: p95, maxMs: lat[lat.length - 1] }
    })
    this.maxAvg = Math.max(...this.stats.map(s => s.avgMs), 1)
  }

  barPct(s: AgentStat): number {
    return s.count ? (s.avgMs / this.maxAvg) * 100 : 0
  }

  agentColor(agent: string): string { return AGENT_COLORS[agent] ?? '#374151' }
}
