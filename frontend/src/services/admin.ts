import { apiClient } from './auth'

export interface AgentConfig {
  model?: string
  deployment?: string
  temperature?: number
  max_tokens?: number
  streaming?: boolean
  use_claude_opus?: boolean
  eval_threshold?: number
  [key: string]: unknown
}

export type ModelConfig = Record<string, AgentConfig>

export async function getModelConfig(): Promise<ModelConfig> {
  const { data } = await apiClient.get<ModelConfig>('/admin/model-config')
  return data
}

export async function updateModelConfig(config: ModelConfig): Promise<ModelConfig> {
  const { data } = await apiClient.put<ModelConfig>('/admin/model-config', config)
  return data
}

export async function getAuditLog(limit = 100): Promise<unknown[]> {
  const { data } = await apiClient.get<unknown[]>(`/admin/audit-log?limit=${limit}`)
  return data
}

export async function getBillingStats(): Promise<unknown> {
  const { data } = await apiClient.get('/admin/billing')
  return data
}

export async function getEvalScores(limit = 200): Promise<unknown[]> {
  const { data } = await apiClient.get<unknown[]>(`/admin/eval-scores?limit=${limit}`)
  return data
}
