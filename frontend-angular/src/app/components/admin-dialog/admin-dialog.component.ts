import { Component, Inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { MatTabsModule } from '@angular/material/tabs'
import { MatButtonModule } from '@angular/material/button'
import { ModelSelectionTabComponent } from '../admin/model-selection-tab.component'
import { AuditLogTabComponent } from '../admin/audit-log-tab.component'
import { BillingTabComponent } from '../admin/billing-tab.component'
import { EvalMetricsTabComponent } from '../admin/eval-metrics-tab.component'
import { ObservabilityTabComponent } from '../admin/observability-tab.component'
import { ChatHistoryTabComponent } from '../admin/chat-history-tab.component'

@Component({
  selector: 'nva-admin-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTabsModule,
    MatButtonModule,
    ModelSelectionTabComponent,
    AuditLogTabComponent,
    BillingTabComponent,
    EvalMetricsTabComponent,
    ObservabilityTabComponent,
    ChatHistoryTabComponent,
  ],
  template: `
    <h2 mat-dialog-title style="color: var(--nva-navy); font-family: 'IBM Plex Sans', sans-serif;">
      ⚙ Admin Console
    </h2>
    <mat-dialog-content style="width: 75vw; max-width: 1000px; min-height: 500px; overflow-y: auto;">
      <mat-tab-group dynamicHeight>
        <mat-tab label="Model Selection">
          <ng-template matTabContent>
            <nva-model-selection-tab />
          </ng-template>
        </mat-tab>
        <mat-tab label="Audit Log">
          <ng-template matTabContent>
            <nva-audit-log-tab />
          </ng-template>
        </mat-tab>
        <mat-tab label="Billing">
          <ng-template matTabContent>
            <nva-billing-tab />
          </ng-template>
        </mat-tab>
        <mat-tab label="Eval Metrics">
          <ng-template matTabContent>
            <nva-eval-metrics-tab />
          </ng-template>
        </mat-tab>
        <mat-tab label="Observability">
          <ng-template matTabContent>
            <nva-observability-tab />
          </ng-template>
        </mat-tab>
        <mat-tab label="Chat History">
          <ng-template matTabContent>
            <nva-chat-history-tab />
          </ng-template>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button mat-dialog-close style="background: var(--nva-navy); color: #fff;">Close</button>
    </mat-dialog-actions>
  `,
})
export class AdminDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AdminDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { username: string },
  ) {}
}
