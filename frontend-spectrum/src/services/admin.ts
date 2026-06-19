import axios from 'axios'

export interface AgentConfig {
  model: string
  temperature: number
  max_tokens?: number
  streaming?: boolean
}

export interface AuditEntry {
  log_id: string
  timestamp: string
  agent: string
  action: string
  input_summary?: string
  output_summary?: string
  latency_ms?: number
  conversation_id?: string
  user?: string
}

export interface BillingEntry {
  period_start: string
  model: string
  input_tokens: number
  output_tokens: number
  total_cost_usd: number
  agent?: string
}

export interface EvalScore {
  eval_id: string
  conversation_id: string
  scores: Record<string, number>
  total_score: number
  passed: boolean
  reasoning: string
  model: string
  timestamp: string
}

export interface Conversation {
  conversation_id: string
  title: string
  turns_count: number
  updated_at: string
  eval_score?: number
  eval_passed?: boolean
  has_starred?: boolean
  user?: string
}

export async function getModelConfig(): Promise<Record<string, AgentConfig>> {
  const { data } = await axios.get('/api/admin/model-config')
  return data
}

export async function updateModelConfig(config: Record<string, Partial<AgentConfig>>): Promise<void> {
  await axios.put('/api/admin/model-config', config)
}

export async function getAuditLog(limit = 100): Promise<AuditEntry[]> {
  const { data } = await axios.get('/api/admin/audit-log', { params: { limit } })
  return data
}

export async function getBilling(): Promise<{ entries: BillingEntry[]; total_cost_usd: number }> {
  const { data } = await axios.get('/api/admin/billing')
  return data
}

export async function getEvalScores(limit = 200): Promise<EvalScore[]> {
  const { data } = await axios.get('/api/admin/eval-scores', { params: { limit } })
  return data
}

export async function getConversations(limit = 50): Promise<Conversation[]> {
  const { data } = await axios.get('/api/admin/conversations', { params: { limit } })
  return data
}
