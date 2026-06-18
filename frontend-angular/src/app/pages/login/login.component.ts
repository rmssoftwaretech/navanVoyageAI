import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatCardModule } from '@angular/material/card'
import { AuthService } from '../../services/auth.service'

@Component({
  selector: 'nva-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatProgressSpinnerModule, MatCardModule,
  ],
  template: `
    <div class="nva-login-wrap">
      <mat-card class="nva-login-card">
        <mat-card-content>
          <!-- Brand -->
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 40px; margin-bottom: 8px;">✈</div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: var(--nva-navy); font-family: 'IBM Plex Sans', sans-serif;">
              navanVoyageAI
            </h1>
            <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Corporate Travel Assistant · Angular M3</p>
          </div>

          <!-- Error -->
          @if (error) {
            <div style="background: #FEE2E2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; color: #991B1B; font-size: 13px;">
              {{ error }}
            </div>
          }

          <!-- Form -->
          <form (ngSubmit)="handleSubmit()">
            <mat-form-field appearance="outlined" style="width: 100%; margin-bottom: 8px;">
              <mat-label>Username</mat-label>
              <input matInput [(ngModel)]="username" name="username" required autocomplete="username" />
            </mat-form-field>

            <mat-form-field appearance="outlined" style="width: 100%; margin-bottom: 20px;">
              <mat-label>Password</mat-label>
              <input matInput [(ngModel)]="password" name="password" type="password" required autocomplete="current-password" />
            </mat-form-field>

            <button
              mat-flat-button
              type="submit"
              [disabled]="loading"
              style="width: 100%; background: var(--nva-navy); color: #fff; height: 44px; font-size: 15px;"
            >
              @if (loading) {
                <mat-progress-spinner mode="indeterminate" diameter="20" style="display: inline-block; margin-right: 8px;" />
              }
              {{ loading ? 'Signing in…' : 'Sign In' }}
            </button>
          </form>

          <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 20px;">
            Demo: admin / traveller · password from <code>.env</code>
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class LoginComponent {
  username = ''
  password = ''
  error = ''
  loading = false

  constructor(private auth: AuthService, private router: Router) {}

  handleSubmit() {
    this.error = ''
    this.loading = true
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.error = 'Invalid username or password.'
        this.loading = false
      },
    })
  }
}
