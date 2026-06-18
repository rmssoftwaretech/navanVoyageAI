import axios from 'axios'
import { getToken } from './auth'
import type { AgentEvent, Conversation, MessageTurn } from '@/types/nva'

export async function getConversationEval(conversationId: string): Promise<Record<string, unknown>> {
  const { data } = await axios.get<Record<string, unknown>>(`/api/chat/conversations/${conversationId}/eval`)
  return data
}

export async function getMcpInfo(): Promise<Record<string, unknown>> {
  const { data } = await axios.get<Record<string, unknown>>('/api/chat/mcp/info')
  return data
}

export async function getConversations(): Promise<Conversation[]> {
  const { data } = await axios.get<Conversation[]>('/api/chat/conversations')
  return data
}

export async function createConversation(): Promise<Conversation> {
  const { data } = await axios.post<Conversation>('/api/chat/conversations')
  return data
}

export async function getConversationTurns(conversationId: string): Promise<MessageTurn[]> {
  const { data } = await axios.get<MessageTurn[]>(`/api/chat/conversations/${conversationId}/turns`)
  return data
}

export async function sendMessage(
  conversationId: string,
  content: string,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch('/api/chat/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ conversation_id: conversationId, content }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Chat send failed: ${response.status}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw || raw === '[DONE]') continue
        try {
          const event: AgentEvent = JSON.parse(raw)
          onEvent({ ...event, ts: Date.now() })
        } catch {
          // malformed line — skip
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) return
    throw err
  }
}
