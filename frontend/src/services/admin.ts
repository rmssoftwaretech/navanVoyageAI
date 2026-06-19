import { apiClient } from './auth'

export interface AgentConfig {
  provider?: string
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

export async function getAgentPrompts(): Promise<Record<string, string>> {
  const { data } = await apiClient.get<Record<string, string>>('/admin/agent-prompts')
  return data
}

export async function updateAgentPrompt(agent: string, prompt: string): Promise<void> {
  await apiClient.put(`/admin/agent-prompts/${agent}`, { prompt })
}

export async function resetAgentPrompt(agent: string): Promise<string> {
  const { data } = await apiClient.delete<{ prompt: string }>(`/admin/agent-prompts/${agent}`)
  return data.prompt
}

export async function getAdminConversations(limit = 50): Promise<unknown[]> {
  const { data } = await apiClient.get<unknown[]>(`/admin/conversations?limit=${limit}`)
  return data
}

export async function deleteAdminConversation(conversationId: string): Promise<void> {
  await apiClient.delete(`/admin/conversations/${conversationId}`)
}

// ── Structured policies ──────────────────────────────────────────────────────

export interface StructuredPolicy {
  policy_id: string
  name: string
  description?: string
  applies_to: string
  flight?: {
    allowed_classes?: string[]
    max_advance_booking_days?: number
    min_advance_booking_days?: number
    max_one_way_usd?: number
    max_roundtrip_usd?: number
    business_eligible_hours?: number
    preferred_airlines?: string[]
  }
  hotel?: {
    max_nightly_rate_usd?: number
    allowed_tiers?: string[]
    preferred_chains?: string[]
  }
  car_rental?: {
    allowed_classes?: string[]
    max_daily_rate_usd?: number
  }
  meal_per_diem_usd?: number
  [key: string]: unknown
}

export async function getStructuredPolicies(): Promise<StructuredPolicy[]> {
  const { data } = await apiClient.get<StructuredPolicy[]>('/admin/policies')
  return data
}

export async function updateStructuredPolicy(policy_id: string, policy: StructuredPolicy): Promise<StructuredPolicy> {
  const { data } = await apiClient.put<StructuredPolicy>(`/admin/policies/${policy_id}`, policy)
  return data
}

export async function createStructuredPolicy(policy: Omit<StructuredPolicy, 'policy_id'>): Promise<StructuredPolicy> {
  const { data } = await apiClient.post<StructuredPolicy>('/admin/policies', policy)
  return data
}

export async function deleteStructuredPolicy(policy_id: string): Promise<void> {
  await apiClient.delete(`/admin/policies/${policy_id}`)
}

// ── Embedding models ──────────────────────────────────────────────────────────

export interface EmbeddingModel {
  id: string
  provider: string
  dimension: number
  label: string
}

export interface EmbeddingConfig {
  selected_model: string
  provider: string
  dimension: number
}

export async function getEmbeddingModels(): Promise<{ selected: EmbeddingConfig; available: EmbeddingModel[] }> {
  const { data } = await apiClient.get('/admin/embedding-models')
  return data
}

export async function setEmbeddingModel(cfg: EmbeddingConfig): Promise<{ selected: EmbeddingConfig; available: EmbeddingModel[] }> {
  const { data } = await apiClient.put('/admin/embedding-models', cfg)
  return data
}

// ── Employee documents ────────────────────────────────────────────────────────

export async function getEmployeeDocuments(): Promise<unknown[]> {
  const { data } = await apiClient.get<unknown[]>('/admin/employee-documents')
  return data
}

export async function clearEmployeeDocuments(): Promise<{ deleted_count: number }> {
  const { data } = await apiClient.delete<{ deleted_count: number }>('/admin/employee-documents')
  return data
}

export async function deleteEmployeeDocument(doc_id: string): Promise<void> {
  await apiClient.delete(`/admin/employee-documents/${doc_id}`)
}

// ── Mock data grids ───────────────────────────────────────────────────────────

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
  seats_available: number
}

export interface HotelResult {
  id: string
  name: string
  city: string
  location?: string
  check_in: string
  check_out: string
  nights?: number
  nightly_rate_usd: number
  total_usd?: number
  rating: string
  room_type?: string
  available: boolean
}

export interface CarResult {
  id: string
  agency: string
  vehicle_class: string
  city: string
  location?: string
  pickup_date: string
  return_date: string
  days?: number
  daily_rate_usd: number
  total_usd?: number
  available: boolean
}

export async function getMockFlights(p: { origin: string; destination: string; date: string; cabin?: string }): Promise<FlightResult[]> {
  const q = new URLSearchParams({ origin: p.origin, destination: p.destination, date: p.date, cabin: p.cabin ?? 'All' })
  const { data } = await apiClient.get<FlightResult[]>(`/admin/mock-data/flights?${q}`)
  return data
}

export async function getMockHotels(p: { city: string; check_in: string; check_out: string }): Promise<HotelResult[]> {
  const q = new URLSearchParams(p)
  const { data } = await apiClient.get<HotelResult[]>(`/admin/mock-data/hotels?${q}`)
  return data
}

export async function getMockCars(p: { city: string; pickup_date: string; return_date: string }): Promise<CarResult[]> {
  const q = new URLSearchParams(p)
  const { data } = await apiClient.get<CarResult[]>(`/admin/mock-data/cars?${q}`)
  return data
}

// ── MCP Bindings ──────────────────────────────────────────────────────────────

export interface McpToolSchema {
  name: string
  description?: string
  server: string
  inputSchema?: {
    type: string
    required?: string[]
    properties?: Record<string, { type: string; description?: string; enum?: string[] }>
  }
}

export interface McpServer {
  id: string
  label: string
  url: string
  transport: string
  description: string
  status: 'connected' | 'error' | 'unknown'
  version?: string
  latency_ms?: number
  amadeus_live?: boolean
  static_data?: Record<string, boolean>
  tools: McpToolSchema[]
  error?: string
}

export interface McpAgentBinding {
  name: string
  label: string
  color: string
  mcp_servers: string[]
  mcp_tools: string[]
  mcp_access: 'caller' | 'reader' | 'supervisor' | 'none'
  mcp_role: string
  resolved_tools: McpToolSchema[]
}

export interface McpBindings {
  servers: McpServer[]
  agents: McpAgentBinding[]
}

export async function getMcpBindings(): Promise<McpBindings> {
  const { data } = await apiClient.get<McpBindings>('/admin/mcp-bindings')
  return data
}
