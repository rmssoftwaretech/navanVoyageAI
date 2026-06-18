import axios from 'axios'
import type { AgentEvent, Conversation, MessageTurn } from '@/types/nva'
import { getToken } from './auth'

export async function getConversations(): Promise<Conversation[]> {
  const { data } = await axios.get<Conversation[]>('/api/chat/conversations')
  return data
}

export async function createConversation(): Promise<Conversation> {
  const { data } = await axios.post<Conversation>('/api/chat/conversations')
  return data
}

export async function getConversationTurns(id: string): Promise<MessageTurn[]> {
  const { data } = await axios.get<MessageTurn[]>(`/api/chat/conversations/${id}/turns`)
  return data
}

export async function sendMessage(
  conversationId: string,
  content: string,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  const response = await fetch('/api/chat/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ conversation_id: conversationId, content }),
  })

  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)

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
        } catch { /* ignore malformed */ }
      }
    }
  }
}
