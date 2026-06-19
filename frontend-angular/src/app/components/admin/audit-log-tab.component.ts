import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { AdminService, AuditEntry } from '../../services/admin.service'

const AGENT_COLORS: Record<string, string> = {
  orchestrator: '#1E3A5F', search: '#1D4ED8', policy: '#92400E',
  destination: '#065F46', booking: '#5B21B6', judge: '#D97706',
}

@Component({
  selector: 'nva-audit-log-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  template: `
    <div style="padding: 8px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #1E3A5F;">
          Audit Log <span style="font-weight: 400; color: #64748b; font-size: 13px;">({{ entries.length }} entries)</span>
        </h3>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" style="width: 220px;">
          <mat-label>Filter</mat-label>
          <input matInput [(ngModel)]="search" placeholder="agent, action…" />
        </mat-form-field>
      </div>

      <div *ngIf="loading" style="display: flex; justify-content: center; padding: 40px;">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <div *ngIf="!loading && filtered.length === 0" style="text-align: center; padding: 40px; color: #94a3b8;">
        {{ entries.length === 0 ? 'No audit entries yet.' : 'No entries match the filter.' }}
      </div>

      <div *ngIf="!loading && filtered.length > 0" style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f8fafc;">
              <th *ngFor="let h of ['Time','Agent','Action','Latency','User']" style="padding: 8px 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">{{ h }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let e of filtered" style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 7px 12px; color: #334155;">{{ fmt(e.timestamp) }}</td>
              <td style="padding: 7px 12px;">
                <span [style.background]="agentColor(e.agent)" style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #fff; text-transform: capitalize;">{{ e.agent }}</span>
              </td>
              <td style="padding: 7px 12px; color: #334155; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ e.action }}</td>
              <td style="padding: 7px 12px; color: #334155;">{{ e.latency_ms != null ? e.latency_ms + 'ms' : '—' }}</td>
              <td style="padding: 7px 12px; color: #94a3b8;">{{ e.user ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class AuditLogTabComponent implements OnInit {
  entries: AuditEntry[] = []
  loading = true
  search = ''

  get filtered(): AuditEntry[] {
    const q = this.search.toLowerCase()
    if (!q) return this.entries
    return this.entries.filter(e =>
      e.agent.includes(q) || e.action.toLowerCase().includes(q) || (e.user ?? '').toLowerCase().includes(q)
    )
  }

  constructor(private adminSvc: AdminService) {}

  ngOnInit(): void {
    this.adminSvc.getAuditLog(100).subscribe({
      next: (data) => { this.entries = data; this.loading = false },
      error: () => { this.loading = false },
    })
  }

  fmt(ts: string): string {
    return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  agentColor(agent: string): string { return AGENT_COLORS[agent] ?? '#374151' }
}
