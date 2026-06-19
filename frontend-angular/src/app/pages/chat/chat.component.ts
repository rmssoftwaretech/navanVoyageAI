import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatListModule } from '@angular/material/list'
import { MatDividerModule } from '@angular/material/divider'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatBadgeModule } from '@angular/material/badge'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { AuthService } from '../../services/auth.service'
import { ChatService, Conversation, MessageTurn, AgentEvent } from '../../services/chat.service'
import { MessageListComponent } from '../../components/message-list/message-list.component'
import { ChatInputComponent } from '../../components/chat-input/chat-input.component'
import { AdminDialogComponent } from '../../components/admin-dialog/admin-dialog.component'

interface ToolEntry { agent: string; tool: string }

@Component({
  selector: 'nva-chat',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule, MatIconModule, MatToolbarModule,
    MatSidenavModule, MatListModule, MatDividerModule,
    MatTooltipModule, MatBadgeModule, MatDialogModule,
    MessageListComponent, ChatInputComponent,
  ],
  template: `
    <div class="nva-app">

      <!-- ── Top toolbar ─────────────────────────────────────── -->
      <mat-toolbar class="nva-toolbar">
        <div class="nva-brand">
          <span class="nva-brand-icon">✈</span>
          navanVoyageAI
          <span class="nva-brand-tag">Angular M3</span>
        </div>
        <span class="nva-spacer"></span>

        <span class="nva-user-name">{{ user?.display_name || user?.username }}</span>

        @if (user?.role === 'admin') {
          <button mat-stroked-button (click)="openAdmin()" matTooltip="Admin Console">
            <mat-icon>settings</mat-icon>
            Admin
          </button>
        }

        <button mat-icon-button (click)="logout()" matTooltip="Sign out">
          <mat-icon>logout</mat-icon>
        </button>
      </mat-toolbar>

      <!-- ── Body: sidenav + content ────────────────────────── -->
      <mat-sidenav-container>

        <!-- Left nav -->
        <mat-sidenav class="nva-sidenav" mode="side" opened>

          <div class="nva-sidenav-header">
            <button mat-flat-button (click)="newConversation()">
              <mat-icon>add</mat-icon>
              New Chat
            </button>
          </div>

          <p class="nva-sidenav-section-label">Conversations</p>

          <mat-nav-list class="nva-conv-list">
            @if (conversations.length === 0) {
              <p class="nva-conv-empty">No conversations yet.<br>Start a new chat above.</p>
            }
            @for (conv of conversations; track conv.conversation_id) {
              <mat-list-item class="nva-conv-item"
                [class.active]="activeId === conv.conversation_id"
                (click)="selectConversation(conv.conversation_id)">
                <span class="nva-conv-title">{{ conv.title || 'Untitled' }}</span>
                <span class="nva-conv-meta">{{ conv.turns_count }} turn{{ conv.turns_count !== 1 ? 's' : '' }}</span>
              </mat-list-item>
            }
          </mat-nav-list>
        </mat-sidenav>

        <!-- Main content -->
        <mat-sidenav-content class="nva-content">
          <div class="nva-chat-area">

            @if (!activeId) {
              <!-- Empty state -->
              <div class="nva-empty-state">
                <span class="nva-empty-icon">✈</span>
                <h2>Plan your next trip</h2>
                <p>Search flights, check travel policy, get destination briefings, and book — all in one conversation.</p>
                <button mat-flat-button (click)="newConversation()">
                  <mat-icon>add</mat-icon>
                  Start New Chat
                </button>
              </div>

            } @else {
              <!-- Messages + inspector side by side -->
              <div style="display: flex; flex: 1; overflow: hidden;">
                <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                  <nva-message-list [turns]="turns" [streaming]="streaming" [streamContent]="streamContent" />
                  <nva-chat-input [disabled]="streaming" (send)="handleSend($event)" />
                </div>

                <!-- Inspector panel -->
                <div class="nva-inspector-panel">
                  <div class="nva-inspector-header">
                    <mat-icon style="font-size: 14px; height: 14px; width: 14px; color: var(--nva-gold);">cable</mat-icon>
                    MCP Tools
                  </div>
                  <div class="nva-inspector-body">
                    @if (toolCalls.length === 0) {
                      <p class="nva-inspector-empty">Tool calls appear here during streaming.</p>
                    }
                    @for (t of toolCalls; track $index) {
                      <div class="nva-tool-entry">
                        <div class="nva-tool-agent">{{ t.agent }}</div>
                        <div class="nva-tool-name">{{ t.tool }}</div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

          </div>
        </mat-sidenav-content>

      </mat-sidenav-container>
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
  toolCalls: ToolEntry[] = []

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
    this.toolCalls = []
    this.chat.getTurns(id).subscribe({ next: (t) => (this.turns = t), error: () => (this.turns = []) })
  }

  newConversation() {
    this.chat.createConversation().subscribe({
      next: (conv) => {
        this.conversations = [conv, ...this.conversations]
        this.activeId = conv.conversation_id
        this.turns = []
        this.toolCalls = []
      },
      error: () => {},
    })
  }

  async handleSend(content: string) {
    if (!this.activeId || this.streaming) return
    this.turns = [...this.turns, { role: 'user', content, timestamp: new Date().toISOString() }]
    this.streamContent = ''
    this.streaming = true
    this.toolCalls = []

    let assembled = ''
    const agents = new Set<string>()

    try {
      await this.chat.sendMessage(this.activeId, content, (event: AgentEvent) => {
        if (event.type === 'agent_start' && event.agent) {
          agents.add(event.agent)
        } else if (event.type === 'mcp_tool_call' && event.agent && event.data) {
          this.toolCalls = [...this.toolCalls, { agent: event.agent, tool: event.data }]
        } else if (event.type === 'token' && event.data) {
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
      width: '80vw',
      maxWidth: '1200px',
      maxHeight: '85vh',
      panelClass: 'nva-admin-dialog',
      data: { username: this.user?.username },
    })
  }

  logout() { this.auth.logout() }
}
