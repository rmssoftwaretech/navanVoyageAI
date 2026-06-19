import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatTableModule } from '@angular/material/table'
import { AdminService, BillingEntry } from '../../services/admin.service'

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'claude-opus-4-7': { input: 15.0, output: 75.0 },
}

@Component({
  selector: 'nva-billing-tab',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatTableModule],
  template: `
    <div style="padding: 8px 0;">
      <h3 style="margin: 0 0 20px; font-size: 15px; font-weight: 700; color: #1E3A5F;">Token Usage & Cost</h3>

      <div *ngIf="loading" style="display: flex; justify-content: center; padding: 40px;">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <ng-container *ngIf="!loading">
        <!-- KPI row -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
          <div *ngFor="let kpi of kpis" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px;">
            <p style="margin: 0; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">{{ kpi.label }}</p>
            <p style="margin: 6px 0 0; font-size: 22px; font-weight: 700;" [style.color]="kpi.color">{{ kpi.value }}</p>
          </div>
        </div>

        <div *ngIf="entries.length === 0" style="text-align: center; padding: 40px; color: #94a3b8;">No billing data yet.</div>

        <ng-container *ngIf="entries.length > 0">
          <h4 style="margin: 0 0 12px; font-size: 13px; font-weight: 600; color: #475569;">Usage by Period</h4>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
            <div *ngFor="let e of entries" style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 12px; color: #64748b; width: 70px; flex-shrink: 0;">{{ fmtDate(e.period_start) }}</span>
              <span style="font-size: 11px; color: #94a3b8; width: 100px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ e.model ?? '—' }}</span>
              <div style="flex: 1; background: #f1f5f9; border-radius: 4px; height: 16px; overflow: hidden;">
                <div [style.width]="barPct(e) + '%'" style="height: 100%; background: #1E3A5F; border-radius: 4px; transition: width 0.4s;"></div>
              </div>
              <span style="font-size: 12px; font-weight: 600; width: 70px; text-align: right; flex-shrink: 0;" [style.color]="costColor(e.total_cost_usd)">
                \${{ e.total_cost_usd.toFixed(4) }}
              </span>
            </div>
          </div>

          <details>
            <summary style="font-size: 12px; color: #64748b; cursor: pointer; font-weight: 600;">List pricing reference (per 1M tokens)</summary>
            <table mat-table [dataSource]="modelCostEntries" style="width: 100%; margin-top: 10px;">
              <ng-container matColumnDef="model">
                <th mat-header-cell *matHeaderCellDef>Model</th>
                <td mat-cell *matCellDef="let m">{{ m.model }}</td>
              </ng-container>
              <ng-container matColumnDef="input">
                <th mat-header-cell *matHeaderCellDef>Input / 1M</th>
                <td mat-cell *matCellDef="let m">\${{ m.input }}</td>
              </ng-container>
              <ng-container matColumnDef="output">
                <th mat-header-cell *matHeaderCellDef>Output / 1M</th>
                <td mat-cell *matCellDef="let m">\${{ m.output }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['model','input','output']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['model','input','output']"></tr>
            </table>
          </details>
        </ng-container>
      </ng-container>
    </div>
  `,
})
export class BillingTabComponent implements OnInit {
  entries: BillingEntry[] = []
  loading = true
  totalCost = 0
  private maxCost = 0.001

  get kpis() {
    const totalInput = this.entries.reduce((s, e) => s + (e.input_tokens ?? 0), 0)
    const totalOutput = this.entries.reduce((s, e) => s + (e.output_tokens ?? 0), 0)
    return [
      { label: 'Total Cost', value: `$${this.totalCost.toFixed(4)}`, color: this.costColor(this.totalCost) },
      { label: 'Input Tokens', value: totalInput.toLocaleString(), color: '#1E3A5F' },
      { label: 'Output Tokens', value: totalOutput.toLocaleString(), color: '#1E3A5F' },
    ]
  }

  get modelCostEntries() {
    return Object.entries(MODEL_COSTS).map(([model, c]) => ({ model, input: c.input, output: c.output }))
  }

  constructor(private adminSvc: AdminService) {}

  ngOnInit(): void {
    this.adminSvc.getBilling().subscribe({
      next: (data) => {
        this.entries = data.entries
        this.totalCost = data.total_cost_usd
        this.maxCost = Math.max(...this.entries.map(e => e.total_cost_usd), 0.001)
        this.loading = false
      },
      error: () => { this.loading = false },
    })
  }

  fmtDate(ts: string): string {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  barPct(e: BillingEntry): number {
    return this.maxCost > 0 ? (e.total_cost_usd / this.maxCost) * 100 : 0
  }

  costColor(cost: number): string {
    if (cost < 0.01) return '#16a34a'
    if (cost < 0.1) return '#D97706'
    return '#dc2626'
  }
}
