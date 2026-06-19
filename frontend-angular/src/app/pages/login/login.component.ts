import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { AuthService } from '../../services/auth.service'

@Component({
  selector: 'nva-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatProgressSpinnerModule, MatCardModule, MatIconModule,
  ],
  template: `
    <div class="nva-login-wrap">
      <mat-card class="nva-login-card">
        <mat-card-content style="padding: 36px 40px;">

          <div class="nva-login-brand">
            <div class="nva-login-logo">✈</div>
            <h1>navanVoyageAI</h1>
            <p>Corporate Travel Assistant &middot; Angular M3</p>
          </div>

          @if (error) {
            <div class="nva-login-error">
              <mat-icon style="font-size: 16px; height: 16px; width: 16px;">error_outline</mat-icon>
              {{ error }}
            </div>
          }

          <form (ngSubmit)="handleSubmit()" style="display: flex; flex-direction: column; gap: 16px;">
            <mat-form-field appearance="outline" style="width: 100%;" subscriptSizing="dynamic">
              <mat-label>Username</mat-label>
              <mat-icon matPrefix style="color: #94a3b8; margin-right: 4px;">person_outline</mat-icon>
              <input matInput [(ngModel)]="username" name="username" required autocomplete="username" />
            </mat-form-field>

            <mat-form-field appearance="outline" style="width: 100%;" subscriptSizing="dynamic">
              <mat-label>Password</mat-label>
              <mat-icon matPrefix style="color: #94a3b8; margin-right: 4px;">lock_outline</mat-icon>
              <input matInput [(ngModel)]="password" name="password"
                [type]="showPw ? 'text' : 'password'"
                required autocomplete="current-password" />
              <button mat-icon-button matSuffix type="button" (click)="showPw = !showPw"
                style="color: #94a3b8;" [attr.aria-label]="showPw ? 'Hide password' : 'Show password'">
                <mat-icon>{{ showPw ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <button mat-flat-button type="submit" class="nva-login-submit" [disabled]="loading">
              @if (loading) {
                <mat-progress-spinner mode="indeterminate" diameter="18"
                  style="display: inline-block; margin-right: 8px; --mdc-circular-progress-active-indicator-color: #fff;" />
              }
              {{ loading ? 'Signing in…' : 'Sign In' }}
            </button>
          </form>

          <p class="nva-login-hint">
            Demo credentials: <code>admin</code> or <code>traveller</code><br>
            Password from <code>.env</code>
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
  showPw = false

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
