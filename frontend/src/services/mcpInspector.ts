import type { ConnectResult } from '@/types/mcpInspector'
import { getToken } from '@/services/auth'

async function post<T>(path: string, body: unknown): Promise<T> {
  const token = getToken()
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error((err as { detail?: string }).detail ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export function connectMcp(url: string): Promise<ConnectResult> {
  return post('/api/mcp/connect', { url })
}

export function callTool(url: string, tool: string, args: Record<string, unknown>): Promise<{ result: unknown; duration_ms: number }> {
  return post('/api/mcp/call-tool', { url, tool, arguments: args })
}

export function readResource(url: string, uri: string): Promise<{ content: unknown; duration_ms: number }> {
  return post('/api/mcp/read-resource', { url, uri })
}

export function getPrompt(url: string, prompt: string, args: Record<string, unknown>): Promise<{ messages: unknown[]; duration_ms: number }> {
  return post('/api/mcp/get-prompt', { url, prompt, arguments: args })
}
