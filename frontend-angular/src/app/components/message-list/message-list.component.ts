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
        <div class="nva-msg-row" [class.user]="turn.role === 'user'" [class.assistant]="turn.role === 'assistant'">
          <div class="nva-bubble">{{ turn.content }}</div>

          <div class="nva-msg-footer">
            <span class="nva-msg-time">{{ turn.timestamp | date:'shortTime' }}</span>

            @if (turn.role === 'assistant' && turn.eval_score !== undefined) {
              <span class="nva-eval-badge" [class.pass]="turn.eval_passed" [class.fail]="!turn.eval_passed">
                {{ turn.eval_passed ? '✓' : '✕' }} {{ (turn.eval_score! * 100).toFixed(0) }}%
              </span>
            }
          </div>

          @if (turn.role === 'assistant' && turn.agents && turn.agents.length > 0) {
            <div class="nva-agent-chips">
              @for (agent of turn.agents; track agent) {
                <nva-agent-badge [agent]="agent" />
              }
            </div>
          }
        </div>
      }

      @if (streaming && streamContent) {
        <div class="nva-msg-row assistant">
          <div class="nva-bubble">{{ streamContent }}<span class="nva-streaming-cursor"></span></div>
        </div>
      }

      @if (streaming && !streamContent) {
        <div class="nva-typing-indicator">
          <mat-progress-spinner mode="indeterminate" diameter="16"
            style="--mdc-circular-progress-active-indicator-color: #64748b;" />
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
