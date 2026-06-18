import { Component, Inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { MatTabsModule } from '@angular/material/tabs'
import { MatButtonModule } from '@angular/material/button'

@Component({
  selector: 'nva-admin-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatTabsModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title style="color: var(--nva-navy); font-family: 'IBM Plex Sans', sans-serif;">
      ⚙ Admin Console
    </h2>
    <mat-dialog-content style="width: 75vw; max-width: 1000px; min-height: 400px;">
      <mat-tab-group dynamicHeight>
        <mat-tab label="Model Selection">
          <ng-template matTabContent>
            <div class="admin-tab-placeholder">
              <p style="font-weight: 600; color: var(--nva-navy);">Model Selection</p>
              <p>Full implementation in the primary Tailwind frontend at
                <a href="http://localhost:5210" target="_blank">localhost:5210</a>
              </p>
            </div>
          </ng-template>
        </mat-tab>
        <mat-tab label="Audit Log">
          <ng-template matTabContent>
            <div class="admin-tab-placeholder">
              <p style="font-weight: 600; color: var(--nva-navy);">Audit Log</p>
              <p>Full audit log with JSON export at
                <a href="http://localhost:5210" target="_blank">localhost:5210</a>
              </p>
            </div>
          </ng-template>
        </mat-tab>
        <mat-tab label="Billing">
          <ng-template matTabContent>
            <div class="admin-tab-placeholder">
              <p style="font-weight: 600; color: var(--nva-navy);">Billing</p>
              <p>Token costs and CSS bar chart at
                <a href="http://localhost:5210" target="_blank">localhost:5210</a>
              </p>
            </div>
          </ng-template>
        </mat-tab>
        <mat-tab label="Eval Metrics">
          <ng-template matTabContent>
            <div class="admin-tab-placeholder">
              <p style="font-weight: 600; color: var(--nva-navy);">Eval Metrics</p>
              <p>5-criteria JudgeAgent scores at
                <a href="http://localhost:5210" target="_blank">localhost:5210</a>
              </p>
            </div>
          </ng-template>
        </mat-tab>
        <mat-tab label="Observability">
          <ng-template matTabContent>
            <div class="admin-tab-placeholder">
              <p style="font-weight: 600; color: var(--nva-navy);">Observability</p>
              <p>Latency Gantt charts at
                <a href="http://localhost:5210" target="_blank">localhost:5210</a>
              </p>
            </div>
          </ng-template>
        </mat-tab>
        <mat-tab label="Chat History">
          <ng-template matTabContent>
            <div class="admin-tab-placeholder">
              <p style="font-weight: 600; color: var(--nva-navy);">Chat History</p>
              <p>Conversation browser with eval badges at
                <a href="http://localhost:5210" target="_blank">localhost:5210</a>
              </p>
            </div>
          </ng-template>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button mat-dialog-close style="background: var(--nva-navy); color: #fff;">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .admin-tab-placeholder {
      padding: 24px;
      text-align: center;
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
    }
  `],
})
export class AdminDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AdminDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { username: string },
  ) {}
}
