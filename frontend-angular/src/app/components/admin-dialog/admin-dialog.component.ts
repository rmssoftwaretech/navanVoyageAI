import { Component, Inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { MatTabsModule } from '@angular/material/tabs'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
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
    MatIconModule,
    MatTooltipModule,
    ModelSelectionTabComponent,
    AuditLogTabComponent,
    BillingTabComponent,
    EvalMetricsTabComponent,
    ObservabilityTabComponent,
    ChatHistoryTabComponent,
  ],
  template: `
    <div class="nva-admin-header">
      <span class="nva-admin-title">
        <mat-icon class="nva-admin-icon">settings</mat-icon>
        Admin Console
      </span>
      <button mat-icon-button mat-dialog-close class="nva-admin-close" matTooltip="Close">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="nva-admin-content">
      <mat-tab-group dynamicHeight>
        <mat-tab label="Model Selection">
          <ng-template matTabContent><nva-model-selection-tab /></ng-template>
        </mat-tab>
        <mat-tab label="Audit Log">
          <ng-template matTabContent><nva-audit-log-tab /></ng-template>
        </mat-tab>
        <mat-tab label="Billing">
          <ng-template matTabContent><nva-billing-tab /></ng-template>
        </mat-tab>
        <mat-tab label="Eval Metrics">
          <ng-template matTabContent><nva-eval-metrics-tab /></ng-template>
        </mat-tab>
        <mat-tab label="Observability">
          <ng-template matTabContent><nva-observability-tab /></ng-template>
        </mat-tab>
        <mat-tab label="Chat History">
          <ng-template matTabContent><nva-chat-history-tab /></ng-template>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>
  `,
  styles: [`
    .nva-admin-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 0;
      border-bottom: 1px solid var(--nva-border);
      padding-bottom: 16px;
    }
    .nva-admin-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
      font-weight: 700;
      color: var(--nva-purple);
      font-family: 'Inter', sans-serif;
    }
    .nva-admin-icon {
      font-size: 20px;
      height: 20px;
      width: 20px;
      color: var(--nva-purple);
    }
    .nva-admin-close {
      color: var(--nva-muted) !important;
    }
    .nva-admin-content {
      flex: 1;
      overflow-y: auto;
      padding: 0 !important;
    }
  `],
})
export class AdminDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AdminDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { username: string },
  ) {}
}
