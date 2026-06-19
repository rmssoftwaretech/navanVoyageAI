import { useState } from 'react'
import type { McpTool, McpResource, McpResourceTemplate, McpPrompt } from '@/types/mcpInspector'
import { PRESET_SERVERS } from '@/types/mcpInspector'
import { connectMcp } from '@/services/mcpInspector'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface ConnPanelProps {
  status: ConnectionStatus
  url: string
  onConnect: (url: string, data: { tools: McpTool[]; resources: McpResource[]; resource_templates: McpResourceTemplate[]; prompts: McpPrompt[] }) => void
  onDisconnect: () => void
  onError: (msg: string) => void
}

const statusColors: Record<ConnectionStatus, string> = {
  disconnected: 'var(--text-dim)',
  connecting: '#D97706',
  connected: '#16a34a',
  error: 'var(--danger)',
}
const statusLabels: Record<ConnectionStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  connected: 'Connected',
  error: 'Error',
}

const label: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
  display: 'block',
}
const input: React.CSSProperties = {
  width: '100%',
  padding: '5px 8px',
  fontSize: 'var(--text-xs)',
  fontFamily: 'var(--font-mono)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  background: 'var(--bg-page)',
  color: 'var(--text-primary)',
  outline: 'none',
}
const select: React.CSSProperties = {
  ...input,
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
}

export default function ConnPanel({ status, url, onConnect, onDisconnect, onError }: ConnPanelProps) {
  const [customUrl, setCustomUrl] = useState(url)
  const [preset, setPreset] = useState<string>(PRESET_SERVERS[0].key)

  function handlePresetChange(key: string) {
    setPreset(key)
    const found = PRESET_SERVERS.find((s) => s.key === key)
    if (found) setCustomUrl(found.url)
  }

  async function handleConnect() {
    const target = customUrl.trim()
    if (!target) return
    onConnect(target, { tools: [], resources: [], resource_templates: [], prompts: [] })
    try {
      const data = await connectMcp(target)
      onConnect(target, data)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Connection failed')
    }
  }

  const connected = status === 'connected'

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      padding: '16px 12px',
      borderRight: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      overflowY: 'auto',
    }}>
      {/* Server */}
      <div>
        <span style={label}>Server</span>
        <select
          value={preset}
          onChange={(e) => handlePresetChange(e.target.value)}
          style={select}
        >
          {PRESET_SERVERS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
          <option value="_custom">Custom URL…</option>
        </select>
      </div>

      {/* URL */}
      <div>
        <span style={label}>URL</span>
        <input
          type="text"
          value={customUrl}
          onChange={(e) => { setCustomUrl(e.target.value); setPreset('_custom') }}
          style={input}
          spellCheck={false}
          onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* Transport badge */}
      <div>
        <span style={label}>Transport</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', fontSize: 'var(--text-xs)', fontWeight: 600,
          color: 'var(--brand)', background: 'var(--brand-light)',
          border: '1px solid var(--brand)', borderRadius: 'var(--r-sm)',
        }}>
          HTTP ●
        </span>
      </div>

      {/* Connect / Disconnect */}
      {connected ? (
        <button
          onClick={onDisconnect}
          style={{
            padding: '6px 0', fontSize: 'var(--text-xs)', fontWeight: 600,
            color: 'var(--danger)', background: 'transparent',
            border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', cursor: 'pointer',
          }}
        >
          Disconnect
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={status === 'connecting'}
          style={{
            padding: '6px 0', fontSize: 'var(--text-xs)', fontWeight: 600,
            color: 'white', background: status === 'connecting' ? 'var(--border)' : 'var(--brand)',
            border: 'none', borderRadius: 'var(--r-sm)',
            cursor: status === 'connecting' ? 'not-allowed' : 'pointer',
          }}
        >
          {status === 'connecting' ? 'Connecting…' : 'Connect'}
        </button>
      )}

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: statusColors[status], flexShrink: 0,
          boxShadow: connected ? '0 0 0 3px rgba(22,163,74,0.18)' : undefined,
        }} />
        <span style={{ fontSize: 'var(--text-xs)', color: statusColors[status], fontWeight: 600 }}>
          {statusLabels[status]}
        </span>
      </div>
    </aside>
  )
}
