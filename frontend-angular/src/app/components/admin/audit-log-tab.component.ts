import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatTableModule } from '@angular/material/table'
import { AdminService, AuditEntry } from '../../services/admin.service'

const AGENT_COLORS: Record<string, string> = {
  orchestrator: '#1E3A5F', search: '#1D4ED8', policy: '#92400E',
  destination: '#065F46', booking: '#5B21B6', judge: '#D97706',
}

@Component({
  selector: 'nva-audit-log-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatTableModule],
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
        <table mat-table [dataSource]="filtered" style="width: 100%;">
          <ng-container matColumnDef="timestamp">
            <th mat-header-cell *matHeaderCellDef>Time</th>
            <td mat-cell *matCellDef="let e">{{ fmt(e.timestamp) }}</td>
          </ng-container>

          <ng-container matColumnDef="agent">
            <th mat-header-cell *matHeaderCellDef>Agent</th>
            <td mat-cell *matCellDef="let e">
              <span [style.background]="agentColor(e.agent)"
                style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #fff; text-transform: capitalize;">
                {{ e.agent }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="action">
            <th mat-header-cell *matHeaderCellDef>Action</th>
            <td mat-cell *matCellDef="let e" style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ e.action }}</td>
          </ng-container>

          <ng-container matColumnDef="latency_ms">
            <th mat-header-cell *matHeaderCellDef>Latency</th>
            <td mat-cell *matCellDef="let e">{{ e.latency_ms != null ? e.latency_ms + 'ms' : '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="user">
            <th mat-header-cell *matHeaderCellDef>User</th>
            <td mat-cell *matCellDef="let e" style="color: #94a3b8;">{{ e.user ?? '—' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;" style="font-size: 13px;"></tr>
        </table>
      </div>
    </div>
  `,
  styles: [`
    th.mat-header-cell { font-weight: 600; color: #475569; font-size: 12px; }
    td.mat-cell { color: #334155; font-size: 13px; }
  `],
})
export class AuditLogTabComponent implements OnInit {
  entries: AuditEntry[] = []
  loading = true
  search = ''
  columns = ['timestamp', 'agent', 'action', 'latency_ms', 'user']

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
