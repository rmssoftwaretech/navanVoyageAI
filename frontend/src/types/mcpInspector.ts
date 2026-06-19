export interface McpTool {
  name: string
  description: string
  inputSchema?: {
    type: string
    properties?: Record<string, { type?: string; description?: string; default?: unknown }>
    required?: string[]
  }
}

export interface McpResource {
  uri: string
  name: string
  description: string
  mimeType?: string
}

export interface McpResourceTemplate {
  uriTemplate: string
  name: string
  description: string
  mimeType?: string
}

export interface McpPrompt {
  name: string
  description: string
  arguments: { name: string; description: string; required: boolean }[]
}

export interface HistoryEntry {
  id: string
  ts: number
  method: string
  params: unknown
  result?: unknown
  error?: string
  duration_ms?: number
}

export interface ConnectResult {
  tools: McpTool[]
  resources: McpResource[]
  resource_templates: McpResourceTemplate[]
  prompts: McpPrompt[]
}

export const PRESET_SERVERS = [
  { key: 'amadeus', label: 'Amadeus Travel MCP', url: 'http://localhost:8101/mcp' },
] as const
