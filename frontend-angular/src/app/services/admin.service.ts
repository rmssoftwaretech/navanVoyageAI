import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'

export interface AgentConfig {
  model?: string
  temperature?: number
  max_tokens?: number
  use_claude_opus?: boolean
}

export interface AuditEntry {
  log_id?: string
  agent: string
  action: string
  timestamp: string
  latency_ms?: number
  user?: string
}

export interface BillingEntry {
  period_start: string
  period_end?: string
  model?: string
  input_tokens?: number
  output_tokens?: number
  total_cost_usd: number
}

export interface EvalScore {
  eval_id: string
  timestamp: string
  total_score: number
  passed: boolean
  model: string
  scores: Record<string, number>
  reasoning?: string
}

export interface Conversation {
  conversation_id: string
  title?: string
  updated_at: string
  turns_count: number
  user?: string
  has_starred?: boolean
  eval_score?: number
  eval_passed?: boolean
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  getModelConfig(): Observable<Record<string, AgentConfig>> {
    return this.http.get<Record<string, AgentConfig>>('/api/admin/model-config')
  }

  saveModelConfig(config: Record<string, AgentConfig>): Observable<{ status: string }> {
    return this.http.put<{ status: string }>('/api/admin/model-config', config)
  }

  getAuditLog(limit = 100): Observable<AuditEntry[]> {
    return this.http.get<AuditEntry[]>(`/api/admin/audit-log?limit=${limit}`)
  }

  getBilling(): Observable<{ entries: BillingEntry[]; total_cost_usd: number }> {
    return this.http.get<{ entries: BillingEntry[]; total_cost_usd: number }>('/api/admin/billing')
  }

  getEvalScores(limit = 200): Observable<EvalScore[]> {
    return this.http.get<EvalScore[]>(`/api/admin/eval-scores?limit=${limit}`)
  }

  getConversations(limit = 50): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`/api/admin/conversations?limit=${limit}`)
  }
}
