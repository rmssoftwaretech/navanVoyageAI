import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { getToken } from './auth.service'

export interface Conversation {
  conversation_id: string
  title: string
  turns_count: number
  created_at: string
}

export interface MessageTurn {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  agents?: string[]
  eval_score?: number
  eval_passed?: boolean
}

export interface AgentEvent {
  type: string
  agent?: string
  data?: string
  error?: string
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor(private http: HttpClient) {}

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>('/api/chat/conversations')
  }

  createConversation(): Observable<Conversation> {
    return this.http.post<Conversation>('/api/chat/conversations', {})
  }

  getTurns(conversationId: string): Observable<MessageTurn[]> {
    return this.http.get<MessageTurn[]>(`/api/chat/conversations/${conversationId}/turns`)
  }

  async sendMessage(
    conversationId: string,
    content: string,
    onEvent: (e: AgentEvent) => void,
  ): Promise<void> {
    const token = getToken()
    const response = await fetch(`/api/chat/conversations/${conversationId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    if (!response.body) throw new Error('No response body')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            onEvent(JSON.parse(line.slice(6)))
          } catch { /* skip malformed */ }
        }
      }
    }
  }
}
