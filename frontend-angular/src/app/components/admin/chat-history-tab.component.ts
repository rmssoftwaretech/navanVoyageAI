import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { AdminService, Conversation } from '../../services/admin.service'

@Component({
  selector: 'nva-chat-history-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  template: `
    <div style="padding: 8px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #1E3A5F;">
          Chat History <span style="font-weight: 400; color: #64748b; font-size: 13px;">({{ convs.length }} conversations)</span>
        </h3>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" style="width: 220px;">
          <mat-label>Filter</mat-label>
          <input matInput [(ngModel)]="search" placeholder="title, user…" />
        </mat-form-field>
      </div>

      <div *ngIf="loading" style="display: flex; justify-content: center; padding: 40px;">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <div *ngIf="!loading && filtered.length === 0" style="text-align: center; padding: 40px; color: #94a3b8;">
        {{ convs.length === 0 ? 'No conversations yet.' : 'No conversations match the filter.' }}
      </div>

      <div *ngIf="!loading && filtered.length > 0" style="display: flex; flex-direction: column; gap: 8px;">
        <div *ngFor="let c of filtered"
          style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span *ngIf="c.has_starred" style="font-size: 12px; color: #D97706;">⭐</span>
              <span style="font-size: 13px; font-weight: 600; color: #1E3A5F; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                {{ c.title || 'Untitled conversation' }}
              </span>
            </div>
            <div style="display: flex; gap: 12px; margin-top: 4px;">
              <span style="font-size: 11px; color: #94a3b8;">{{ fmt(c.updated_at) }}</span>
              <span style="font-size: 11px; color: #94a3b8;">{{ c.turns_count }} turn{{ c.turns_count !== 1 ? 's' : '' }}</span>
              <span *ngIf="c.user" style="font-size: 11px; color: #94a3b8;">by {{ c.user }}</span>
            </div>
          </div>
          <div *ngIf="c.eval_score != null" style="flex-shrink: 0; text-align: right;">
            <span style="font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 6px;"
              [style.color]="scoreColor(c.eval_score)"
              [style.background]="c.eval_passed ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)'"
              [style.border]="'1px solid ' + scoreColor(c.eval_score) + '30'">
              {{ c.eval_passed ? '✓' : '✕' }} {{ (c.eval_score! * 100).toFixed(0) }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ChatHistoryTabComponent implements OnInit {
  convs: Conversation[] = []
  loading = true
  search = ''

  get filtered(): Conversation[] {
    const q = this.search.toLowerCase()
    if (!q) return this.convs
    return this.convs.filter(c =>
      (c.title ?? '').toLowerCase().includes(q) || (c.user ?? '').toLowerCase().includes(q)
    )
  }

  constructor(private adminSvc: AdminService) {}

  ngOnInit(): void {
    this.adminSvc.getConversations(50).subscribe({
      next: (data) => { this.convs = data; this.loading = false },
      error: () => { this.loading = false },
    })
  }

  fmt(ts: string): string {
    return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  scoreColor(s?: number): string {
    if (s == null) return '#94a3b8'
    if (s >= 0.75) return '#16a34a'
    if (s >= 0.5) return '#D97706'
    return '#dc2626'
  }
}
