import { Component, Input, AfterViewChecked, ElementRef, ViewChild } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { AgentBadgeComponent } from '../agent-badge/agent-badge.component'
import type { MessageTurn } from '../../services/chat.service'

@Component({
  selector: 'nva-message-list',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, AgentBadgeComponent],
  template: `
    <div class="nva-messages" #scrollContainer>
      @for (turn of turns; track $index) {
        <div style="display: flex; flex-direction: column;" [style.align-items]="turn.role === 'user' ? 'flex-end' : 'flex-start'">
          <div class="msg-bubble" [class.user]="turn.role === 'user'" [class.assistant]="turn.role === 'assistant'">
            {{ turn.content }}
          </div>
          @if (turn.role === 'assistant' && turn.agents && turn.agents.length > 0) {
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
              @for (agent of turn.agents; track agent) {
                <nva-agent-badge [agent]="agent" />
              }
            </div>
          }
          @if (turn.role === 'assistant' && turn.eval_score !== undefined) {
            <div class="msg-meta" [style.color]="turn.eval_passed ? '#065F46' : '#991B1B'">
              {{ turn.eval_passed ? '✓' : '✕' }} Eval: {{ (turn.eval_score! * 100).toFixed(0) }}%
            </div>
          }
          <div class="msg-meta">{{ turn.timestamp | date:'shortTime' }}</div>
        </div>
      }

      @if (streaming && streamContent) {
        <div style="display: flex; flex-direction: column; align-items: flex-start;">
          <div class="msg-bubble assistant">
            {{ streamContent }}<span class="streaming-cursor"></span>
          </div>
        </div>
      }
      @if (streaming && !streamContent) {
        <div style="display: flex; align-items: center; gap: 8px; color: #94a3b8; font-size: 12px;">
          <mat-progress-spinner mode="indeterminate" diameter="18" />
          Agents working…
        </div>
      }
      <div #scrollAnchor></div>
    </div>
  `,
})
export class MessageListComponent implements AfterViewChecked {
  @Input() turns: MessageTurn[] = []
  @Input() streaming = false
  @Input() streamContent = ''
  @ViewChild('scrollAnchor') scrollAnchor!: ElementRef

  ngAfterViewChecked() {
    this.scrollAnchor?.nativeElement?.scrollIntoView({ behavior: 'smooth' })
  }
}
