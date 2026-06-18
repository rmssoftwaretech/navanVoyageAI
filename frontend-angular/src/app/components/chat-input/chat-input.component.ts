import { Component, EventEmitter, Input, Output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'nva-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="chat-input-area">
      <mat-form-field appearance="outline" style="flex: 1;">
        <mat-label>Message</mat-label>
        <textarea
          matInput
          [(ngModel)]="value"
          (keydown)="onKeyDown($event)"
          [disabled]="disabled"
          placeholder="Ask about flights, hotels, or travel policy…"
          rows="2"
          style="resize: none;"
        ></textarea>
      </mat-form-field>
      <button
        mat-flat-button
        [disabled]="disabled || !value.trim()"
        (click)="handleSend()"
        style="background: var(--nva-navy); color: #fff; margin-bottom: 22px;"
      >
        <mat-icon>send</mat-icon>
        Send
      </button>
    </div>
  `,
})
export class ChatInputComponent {
  @Input() disabled = false
  @Output() send = new EventEmitter<string>()
  value = ''

  handleSend() {
    const trimmed = this.value.trim()
    if (!trimmed || this.disabled) return
    this.send.emit(trimmed)
    this.value = ''
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      this.handleSend()
    }
  }
}
