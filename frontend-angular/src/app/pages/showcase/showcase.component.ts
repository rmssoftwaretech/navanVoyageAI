import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatChipsModule } from '@angular/material/chips'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatTabsModule } from '@angular/material/tabs'
import { MatIconModule } from '@angular/material/icon'
import { RouterLink } from '@angular/router'
import { AgentBadgeComponent } from '../../components/agent-badge/agent-badge.component'

@Component({
  selector: 'nva-showcase',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatCardModule, MatChipsModule,
    MatFormFieldModule, MatInputModule, MatSlideToggleModule,
    MatTabsModule, MatIconModule,
    AgentBadgeComponent,
  ],
  template: `
    <div style="max-width: 900px; margin: 40px auto; padding: 0 24px; font-family: 'IBM Plex Sans', sans-serif;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px;">
        <div>
          <h1 style="margin: 0; color: var(--nva-navy); font-size: 24px;">✈ navanVoyageAI</h1>
          <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Angular Material 3 · Component Showcase</p>
        </div>
        <a mat-flat-button routerLink="/" style="background: var(--nva-navy); color: #fff;">← Go to Chat</a>
      </div>

      <!-- Agent Badges -->
      <mat-card style="margin-bottom: 24px;">
        <mat-card-header>
          <mat-card-title style="color: var(--nva-navy);">Agent Badges</mat-card-title>
        </mat-card-header>
        <mat-card-content style="padding-top: 16px;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <nva-agent-badge agent="search" />
            <nva-agent-badge agent="policy" />
            <nva-agent-badge agent="destination" />
            <nva-agent-badge agent="booking" />
            <nva-agent-badge agent="judge" />
          </div>
        </mat-card-content>
      </mat-card>

      <!-- M3 Buttons -->
      <mat-card style="margin-bottom: 24px;">
        <mat-card-header>
          <mat-card-title style="color: var(--nva-navy);">M3 Buttons</mat-card-title>
        </mat-card-header>
        <mat-card-content style="padding-top: 16px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
          <button mat-flat-button style="background: var(--nva-navy); color: #fff;">Flat (Navy)</button>
          <button mat-flat-button style="background: var(--nva-gold); color: #fff;">Flat (Gold)</button>
          <button mat-stroked-button style="border-color: var(--nva-navy); color: var(--nva-navy);">Stroked</button>
          <button mat-button style="color: var(--nva-navy);">Text</button>
          <button mat-icon-button style="color: var(--nva-navy);"><mat-icon>send</mat-icon></button>
          <button mat-fab style="background: var(--nva-navy); color: #fff;"><mat-icon>add</mat-icon></button>
        </mat-card-content>
      </mat-card>

      <!-- M3 Tabs -->
      <mat-card style="margin-bottom: 24px;">
        <mat-card-header>
          <mat-card-title style="color: var(--nva-navy);">M3 Tabs</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-tab-group>
            <mat-tab label="Flights">
              <div style="padding: 16px; color: #64748b; font-size: 13px;">Flight search results will appear here.</div>
            </mat-tab>
            <mat-tab label="Hotels">
              <div style="padding: 16px; color: #64748b; font-size: 13px;">Hotel options will appear here.</div>
            </mat-tab>
            <mat-tab label="Policy">
              <div style="padding: 16px; color: #64748b; font-size: 13px;">Travel policy compliance details.</div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>

      <!-- M3 Form fields -->
      <mat-card style="margin-bottom: 24px;">
        <mat-card-header>
          <mat-card-title style="color: var(--nva-navy);">M3 Form Fields</mat-card-title>
        </mat-card-header>
        <mat-card-content style="padding-top: 16px; display: flex; gap: 16px; flex-wrap: wrap;">
          <mat-form-field appearance="outlined">
            <mat-label>Destination</mat-label>
            <input matInput placeholder="e.g. Tokyo, Japan" />
          </mat-form-field>
          <mat-form-field appearance="outlined">
            <mat-label>Travel Date</mat-label>
            <input matInput type="date" />
          </mat-form-field>
          <mat-form-field appearance="outlined">
            <mat-label>Max Budget (USD)</mat-label>
            <input matInput type="number" placeholder="800" />
            <span matTextPrefix>$&nbsp;</span>
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      <!-- Toggles -->
      <mat-card>
        <mat-card-header>
          <mat-card-title style="color: var(--nva-navy);">M3 Toggles</mat-card-title>
        </mat-card-header>
        <mat-card-content style="padding-top: 16px; display: flex; flex-direction: column; gap: 12px;">
          <mat-slide-toggle color="primary">Enable Tree of Thought reasoning</mat-slide-toggle>
          <mat-slide-toggle color="accent">Use Claude Opus for Eval (premium)</mat-slide-toggle>
          <mat-slide-toggle color="warn" checked>Enforce travel policy</mat-slide-toggle>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class ShowcaseComponent {}
