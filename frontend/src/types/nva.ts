export interface User {
  username: string
  role: 'admin' | 'traveller'
  display_name: string
  email: string
}

export interface Conversation {
  conversation_id: string
  title: string
  user: string
  created_at: string
  updated_at: string
  turns_count: number
}

export interface MessageTurn {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  agents?: AgentType[]
  eval_score?: number
  eval_passed?: boolean
}

export type AgentType = 'search' | 'policy' | 'destination' | 'booking' | 'judge'

export interface AgentEvent {
  type: 'agent_start' | 'token' | 'agent_done' | 'mcp_tool_call' | 'mcp_tool_result' | 'done' | 'error'
  agent?: AgentType
  data?: string
  tool?: string
  input?: unknown
  output?: unknown
  latency_ms?: number
}

export interface LoginResponse {
  token: string
  user: User
}

export interface SendMessageRequest {
  conversation_id: string
  content: string
}
