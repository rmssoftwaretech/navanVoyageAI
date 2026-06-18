import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { AuthService } from '../../services/auth.service'
import { ChatService, Conversation, MessageTurn, AgentEvent } from '../../services/chat.service'
import { MessageListComponent } from '../../components/message-list/message-list.component'
import { ChatInputComponent } from '../../components/chat-input/chat-input.component'
import { AdminDialogComponent } from '../../components/admin-dialog/admin-dialog.component'

@Component({
  selector: 'nva-chat',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule, MatIconModule, MatDialogModule,
    MessageListComponent, ChatInputComponent,
  ],
  template: `
    <div class="nva-shell">
      <!-- Header -->
      <header class="nva-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">✈</span>
          <span style="font-weight: 700; font-size: 16px; letter-spacing: 0.02em;">navanVoyageAI</span>
          <span style="font-size: 11px; opacity: 0.7; margin-left: 4px;">Angular M3</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 13px; opacity: 0.85;">{{ user?.display_name || user?.username }}</span>
          @if (user?.role === 'admin') {
            <button mat-stroked-button (click)="openAdmin()" style="color: #fff; border-color: rgba(255,255,255,0.4); font-size: 12px;">
              ⚙ Admin
            </button>
          }
          <button mat-stroked-button (click)="logout()" style="color: #fff; border-color: rgba(255,255,255,0.4); font-size: 12px;">
            Sign Out
          </button>
        </div>
      </header>

      <!-- Sidebar -->
      <aside class="nva-sidebar">
        <div style="padding: 12px; border-bottom: 1px solid var(--nva-border);">
          <button mat-flat-button (click)="newConversation()" style="width: 100%; background: var(--nva-navy); color: #fff;">
            + New Chat
          </button>
        </div>
        <div style="display: flex; flex-direction: column;">
          @if (conversations.length === 0) {
            <p style="padding: 12px; font-size: 12px; color: #94a3b8;">No conversations yet.</p>
          }
          @for (conv of conversations; track conv.conversation_id) {
            <div
              class="conv-item"
              [class.active]="activeId === conv.conversation_id"
              (click)="selectConversation(conv.conversation_id)"
            >
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                {{ conv.title || 'Untitled' }}
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">{{ conv.turns_count }} turns</div>
            </div>
          }
        </div>
      </aside>

      <!-- Chat area -->
      <main class="nva-chat">
        @if (!activeId) {
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; color: #94a3b8;">
            <span style="font-size: 56px;">✈</span>
            <p style="font-size: 15px; font-weight: 600; color: var(--nva-navy); margin: 0;">How can I help plan your trip?</p>
            <p style="font-size: 12px; margin: 0;">Select a conversation or start a new one.</p>
            <button mat-flat-button (click)="newConversation()" style="background: var(--nva-navy); color: #fff;">
              + Start New Chat
            </button>
          </div>
        } @else {
          <nva-message-list [turns]="turns" [streaming]="streaming" [streamContent]="streamContent" />
          <nva-chat-input [disabled]="streaming" (send)="handleSend($event)" />
        }
      </main>

      <!-- Inspector -->
      <div class="nva-inspector">
        <p style="font-size: 11px; font-weight: 600; color: var(--nva-navy); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 8px;">
          🔌 MCP Tools
        </p>
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          Tool calls appear here during streaming.<br />
          Full inspector in primary frontend.
        </p>
      </div>
    </div>
  `,
})
export class ChatComponent implements OnInit {
  user: { username: string; display_name: string; role: string } | null = null
  conversations: Conversation[] = []
  activeId: string | null = null
  turns: MessageTurn[] = []
  streaming = false
  streamContent = ''

  constructor(
    private auth: AuthService,
    private chat: ChatService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.auth.getMe().subscribe({ next: (u) => (this.user = u), error: () => {} })
    this.chat.getConversations().subscribe({ next: (c) => (this.conversations = c), error: () => {} })
  }

  selectConversation(id: string) {
    this.activeId = id
    this.chat.getTurns(id).subscribe({ next: (t) => (this.turns = t), error: () => (this.turns = []) })
  }

  newConversation() {
    this.chat.createConversation().subscribe({
      next: (conv) => {
        this.conversations = [conv, ...this.conversations]
        this.activeId = conv.conversation_id
        this.turns = []
      },
      error: () => {},
    })
  }

  async handleSend(content: string) {
    if (!this.activeId || this.streaming) return
    this.turns = [...this.turns, { role: 'user', content, timestamp: new Date().toISOString() }]
    this.streamContent = ''
    this.streaming = true

    let assembled = ''
    const agents = new Set<string>()

    try {
      await this.chat.sendMessage(this.activeId, content, (event: AgentEvent) => {
        if (event.type === 'agent_start' && event.agent) agents.add(event.agent)
        else if (event.type === 'token' && event.data) {
          assembled += event.data
          this.streamContent = assembled
        } else if (event.type === 'done') {
          this.turns = [...this.turns, {
            role: 'assistant',
            content: assembled,
            timestamp: new Date().toISOString(),
            agents: [...agents].filter((a) => a !== 'orchestrator' && a !== 'judge'),
          }]
          this.streamContent = ''
        }
      })
    } catch {
      this.turns = [...this.turns, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      }]
    } finally {
      this.streaming = false
      this.streamContent = ''
    }
  }

  openAdmin() {
    this.dialog.open(AdminDialogComponent, {
      width: '75vw',
      maxWidth: '1200px',
      data: { username: this.user?.username },
    })
  }

  logout() {
    this.auth.logout()
  }
}
