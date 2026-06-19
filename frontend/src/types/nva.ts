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
  has_starred?: boolean
}

export interface TurnPerf {
  latency_ms: number
  input_tokens: number
  output_tokens: number
  model?: string
}

export interface FlightResult {
  id: string
  carrier: string
  flight_number: string
  origin: string
  destination: string
  depart_date: string
  cabin_class: string
  price_usd: number
  duration_minutes: number
  stops: number
  seats_available?: number
  within_policy?: boolean
  policy_limit_usd?: number
}

export interface HotelResult {
  name: string
  rating?: string
  city?: string
  location?: string
  room_type?: string
  nightly_rate_usd: number
  check_in: string
  check_out: string
}

export interface CarResult {
  id?: string
  agency: string
  vehicle_class: string
  city?: string
  location?: string
  pickup_date: string
  return_date: string
  daily_rate_usd: number
}

export interface MessageTurn {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  agents?: AgentType[]
  eval_score?: number
  eval_passed?: boolean
  perf?: TurnPerf
  tool_calls?: { tool: string; input?: unknown; output?: unknown; latency_ms?: number }[]
  agent_calls?: { agent: string; input?: unknown; output?: unknown; latency_ms?: number }[]
  from_cache?: boolean
  cache_key?: string
  flight_results?: FlightResult[]
  hotel_results?: HotelResult[]
  car_results?: CarResult[]
  reactions?: Record<string, number>
  starred?: boolean
}

export type AgentType = 'search' | 'policy' | 'destination' | 'booking' | 'judge'

export interface AgentEvent {
  type: 'agent_start' | 'token' | 'agent_done' | 'mcp_tool_call' | 'mcp_tool_result' | 'done' | 'error'
      | 'tot_start' | 'tot_branch' | 'tot_evaluate' | 'tot_selected' | 'tot_error' | 'eval_result'
      | 'agent_route' | 'cache_hit' | 'flight_results' | 'hotel_results' | 'car_results'
  agent?: AgentType
  data?: string
  tool?: string
  input?: unknown
  output?: unknown
  latency_ms?: number
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
  model?: string
  // ToT fields
  branches?: number
  index?: number
  angle?: string
  content?: string
  score?: number
  rationale?: string
  error?: string
  // Agent routing / handshake fields
  from?: string
  agents?: string[]
  intent?: string
  reasoning?: string
  input_preview?: string
  // Cache fields
  from_cache?: boolean
  cache_key?: string
  // Structured results (flight_results / hotel_results / car_results events)
  results?: FlightResult[] | HotelResult[] | CarResult[]
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
