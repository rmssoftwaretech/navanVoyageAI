import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatSliderModule } from '@angular/material/slider'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { AdminService, AgentConfig } from '../../services/admin.service'

const AGENT_LABELS: Record<string, string> = {
  orchestrator: 'Orchestrator', search: 'Search', policy: 'Policy',
  destination: 'Destination', booking: 'Booking', judge: 'Judge',
}
const AGENT_COLORS: Record<string, string> = {
  orchestrator: '#1E3A5F', search: '#1D4ED8', policy: '#92400E',
  destination: '#065F46', booking: '#5B21B6', judge: '#D97706',
}

@Component({
  selector: 'nva-model-selection-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSliderModule, MatProgressSpinnerModule],
  template: `
    <div style="padding: 8px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #1E3A5F;">Model Configuration</h3>
        <button mat-flat-button (click)="save()" [disabled]="saving || loading"
          style="background: #1E3A5F; color: #fff; font-size: 13px;">
          {{ saving ? 'Saving…' : 'Save All' }}
        </button>
      </div>

      <div *ngIf="loading" style="display: flex; justify-content: center; padding: 40px;">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <div *ngIf="!loading" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        <div *ngFor="let agent of agentKeys" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div [style.background]="agentColor(agent)" style="padding: 8px 12px;">
            <span style="font-weight: 700; font-size: 13px; color: #fff;">{{ agentLabel(agent) }}</span>
          </div>
          <div style="padding: 12px; display: flex; flex-direction: column; gap: 10px;">
            <mat-form-field appearance="outline" style="width: 100%;" subscriptSizing="dynamic">
              <mat-label>Model</mat-label>
              <input matInput [(ngModel)]="configs[agent].model" />
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 100%;" subscriptSizing="dynamic">
              <mat-label>Temperature</mat-label>
              <input matInput type="number" [(ngModel)]="configs[agent].temperature" min="0" max="2" step="0.1" />
            </mat-form-field>
          </div>
        </div>
      </div>

      <div *ngIf="saved" style="margin-top: 12px; padding: 10px 14px; background: rgba(22,163,74,0.1); border: 1px solid #16a34a; border-radius: 6px; font-size: 13px; color: #16a34a;">
        ✓ Configuration saved
      </div>
    </div>
  `,
})
export class ModelSelectionTabComponent implements OnInit {
  configs: Record<string, AgentConfig> = {}
  loading = true
  saving = false
  saved = false

  get agentKeys(): string[] { return Object.keys(this.configs) }

  constructor(private adminSvc: AdminService) {}

  ngOnInit(): void {
    this.adminSvc.getModelConfig().subscribe({
      next: (data) => { this.configs = data; this.loading = false },
      error: () => { this.loading = false },
    })
  }

  agentLabel(agent: string): string { return AGENT_LABELS[agent] ?? agent }
  agentColor(agent: string): string { return AGENT_COLORS[agent] ?? '#374151' }

  save(): void {
    this.saving = true
    this.saved = false
    this.adminSvc.saveModelConfig(this.configs).subscribe({
      next: () => { this.saving = false; this.saved = true; setTimeout(() => this.saved = false, 3000) },
      error: () => { this.saving = false },
    })
  }
}
