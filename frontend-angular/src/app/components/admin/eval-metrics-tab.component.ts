import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatTableModule } from '@angular/material/table'
import { AdminService, EvalScore } from '../../services/admin.service'

const CRITERIA = ['relevance', 'accuracy', 'policy_compliance', 'completeness', 'tone'] as const
const CRITERION_LABELS: Record<string, string> = {
  relevance: 'Relevance', accuracy: 'Accuracy', policy_compliance: 'Policy',
  completeness: 'Completeness', tone: 'Tone',
}

@Component({
  selector: 'nva-eval-metrics-tab',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatTableModule],
  template: `
    <div style="padding: 8px 0;">
      <h3 style="margin: 0 0 20px; font-size: 15px; font-weight: 700; color: #1E3A5F;">Eval Metrics</h3>

      <div *ngIf="loading" style="display: flex; justify-content: center; padding: 40px;">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <div *ngIf="!loading && scores.length === 0" style="text-align: center; padding: 40px; color: #94a3b8;">No eval scores yet.</div>

      <ng-container *ngIf="!loading && scores.length > 0">
        <!-- KPIs -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
          <div *ngFor="let kpi of kpis" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px;">
            <p style="margin: 0; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">{{ kpi.label }}</p>
            <p style="margin: 6px 0 0; font-size: 22px; font-weight: 700;" [style.color]="kpi.color">{{ kpi.value }}</p>
          </div>
        </div>

        <!-- Per-criteria bars -->
        <div style="margin-bottom: 24px;">
          <h4 style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #475569;">Avg Score per Criterion</h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div *ngFor="let c of criteriaStats" style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 12px; color: #64748b; width: 110px; flex-shrink: 0;">{{ c.label }}</span>
              <div style="flex: 1; background: #f1f5f9; border-radius: 4px; height: 14px; overflow: hidden;">
                <div [style.width]="(c.avg * 100) + '%'" [style.background]="scoreColor(c.avg)" style="height: 100%; border-radius: 4px;"></div>
              </div>
              <span style="font-size: 12px; font-weight: 700; width: 42px; text-align: right; flex-shrink: 0;" [style.color]="scoreColor(c.avg)">
                {{ (c.avg * 100).toFixed(0) }}%
              </span>
            </div>
          </div>
        </div>

        <!-- mat-table for recent scores -->
        <h4 style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #475569;">Recent Evaluations</h4>
        <div style="overflow-x: auto;">
          <table mat-table [dataSource]="scores.slice(0, 50)" style="width: 100%;">
            <ng-container matColumnDef="timestamp">
              <th mat-header-cell *matHeaderCellDef>Time</th>
              <td mat-cell *matCellDef="let e">{{ fmt(e.timestamp) }}</td>
            </ng-container>
            <ng-container matColumnDef="total_score">
              <th mat-header-cell *matHeaderCellDef>Score</th>
              <td mat-cell *matCellDef="let e">
                <span style="font-weight: 700;" [style.color]="scoreColor(e.total_score)">{{ (e.total_score * 100).toFixed(0) }}%</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="passed">
              <th mat-header-cell *matHeaderCellDef>Pass</th>
              <td mat-cell *matCellDef="let e">
                <span style="font-weight: 700;" [style.color]="e.passed ? '#16a34a' : '#dc2626'">{{ e.passed ? '✓' : '✕' }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="model">
              <th mat-header-cell *matHeaderCellDef>Model</th>
              <td mat-cell *matCellDef="let e" style="font-size: 11px; color: #94a3b8;">{{ e.model }}</td>
            </ng-container>
            <ng-container matColumnDef="reasoning">
              <th mat-header-cell *matHeaderCellDef>Reasoning</th>
              <td mat-cell *matCellDef="let e" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: #64748b;">
                {{ e.reasoning }}
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;" (click)="toggle(row.eval_id)" style="cursor: pointer;"
              [style.background]="expanded === row.eval_id ? '#f0f7ff' : ''"></tr>
          </table>
        </div>

        <!-- Expanded criteria detail -->
        <div *ngIf="expandedScore" style="margin-top: 12px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px;">
          <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 8px;">
            <span *ngFor="let c of criteria">
              <span style="color: #64748b;">{{ criterionLabel(c) }}: </span>
              <span style="font-weight: 700;" [style.color]="scoreColor(expandedScore!.scores[c] || 0)">{{ ((expandedScore!.scores[c] || 0) * 100).toFixed(0) }}%</span>
            </span>
          </div>
          <p *ngIf="expandedScore.reasoning" style="margin: 0; color: #475569; line-height: 1.5;">{{ expandedScore.reasoning }}</p>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    th.mat-header-cell { font-weight: 600; color: #475569; font-size: 12px; }
    td.mat-cell { color: #334155; font-size: 13px; }
  `],
})
export class EvalMetricsTabComponent implements OnInit {
  scores: EvalScore[] = []
  loading = true
  expanded: string | null = null
  criteria = [...CRITERIA]
  columns = ['timestamp', 'total_score', 'passed', 'model', 'reasoning']

  get expandedScore(): EvalScore | undefined {
    return this.scores.find(s => s.eval_id === this.expanded)
  }

  get kpis() {
    if (!this.scores.length) return []
    const avg = this.scores.reduce((s, e) => s + e.total_score, 0) / this.scores.length
    const passRate = this.scores.filter(e => e.passed).length / this.scores.length
    return [
      { label: 'Avg Score', value: `${(avg * 100).toFixed(1)}%`, color: this.scoreColor(avg) },
      { label: 'Pass Rate', value: `${(passRate * 100).toFixed(1)}%`, color: this.scoreColor(passRate) },
      { label: 'Evaluations', value: this.scores.length.toString(), color: '#1E3A5F' },
    ]
  }

  get criteriaStats() {
    return CRITERIA.map(c => {
      const vals = this.scores.map(e => e.scores[c] ?? 0)
      const avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
      return { criterion: c, label: CRITERION_LABELS[c], avg }
    })
  }

  constructor(private adminSvc: AdminService) {}

  ngOnInit(): void {
    this.adminSvc.getEvalScores(200).subscribe({
      next: (data) => { this.scores = data; this.loading = false },
      error: () => { this.loading = false },
    })
  }

  fmt(ts: string): string {
    return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  scoreColor(s: number): string {
    if (s >= 0.75) return '#16a34a'
    if (s >= 0.5) return '#D97706'
    return '#dc2626'
  }

  criterionLabel(c: string): string { return CRITERION_LABELS[c] ?? c }

  toggle(id: string): void {
    this.expanded = this.expanded === id ? null : id
  }
}
