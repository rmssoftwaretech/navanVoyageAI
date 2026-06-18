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
  eval_score?: number
  eval_passed?: boolean
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
      | 'tot_start' | 'tot_branch' | 'tot_evaluate' | 'tot_selected' | 'tot_error' | 'eval_result'
  agent?: AgentType
  data?: string
  tool?: string
  input?: unknown
  output?: unknown
  latency_ms?: number
  // ToT fields
  branches?: number
  index?: number
  angle?: string
  content?: string
  score?: number
  rationale?: string
  error?: string
  // Added by ChatPage for timing
  ts?: number
}

export interface ConsoleEntry {
  ts: number
  type: string
  label: string
  payload: unknown
}

export interface NetworkEntry {
  ts: number
  method: string
  url: string
  status: number
  duration_ms: number
}

export interface PerformanceEntry {
  agent: string
  start_ts: number
  end_ts: number
  latency_ms: number
}

export interface LoginResponse {
  token: string
  user: User
}

export interface SendMessageRequest {
  conversation_id: string
  content: string
}
