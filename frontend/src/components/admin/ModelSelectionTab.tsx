import { useEffect, useState } from 'react'
import { getModelConfig, updateModelConfig } from '@/services/admin'
import type { AgentConfig, ModelConfig } from '@/services/admin'

const AGENT_ORDER = ['orchestrator', 'search', 'policy', 'destination', 'booking', 'judge']

const AGENT_LABELS: Record<string, string> = {
  orchestrator: 'Orchestrator',
  search: 'Search',
  policy: 'Policy',
  destination: 'Destination',
  booking: 'Booking',
  judge: 'Judge / Eval',
}

const PROVIDERS = [
  { id: 'azure_openai', label: 'Azure OpenAI' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'ollama', label: 'Ollama (local)' },
]

const PROVIDER_MODELS: Record<string, string[]> = {
  azure_openai: ['gpt-5.4', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  openai: ['gpt-5.4', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini'],
  anthropic: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  ollama: ['llama3', 'mistral', 'qwen2.5', 'deepseek-r1'],
}

function inferProvider(cfg: AgentConfig): string {
  if (cfg.provider) return cfg.provider
  const m = (cfg.model ?? '').toLowerCase()
  if (m.includes('anthropic') || m.includes('claude')) return 'anthropic'
  if (m.includes('ollama') || m.includes('llama') || m.includes('mistral')) return 'ollama'
  if (m.includes('openai') && !m.includes('azure')) return 'openai'
  return 'azure_openai'
}

function inferModel(cfg: AgentConfig, provider: string): string {
  const available = PROVIDER_MODELS[provider] ?? []
  if (cfg.model && available.includes(cfg.model)) return cfg.model
  if (cfg.deployment && available.includes(cfg.deployment)) return cfg.deployment
  return available[0] ?? ''
}

const SEL_STYLE: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  padding: '5px 8px',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  outline: 'none',
  cursor: 'pointer',
  width: '100%',
}

const INPUT_STYLE: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  padding: '5px 8px',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  outline: 'none',
  width: '72px',
  textAlign: 'center',
  fontFamily: 'monospace',
}

export default function ModelSelectionTab() {
  const [config, setConfig] = useState<ModelConfig>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    getModelConfig()
      .then(setConfig)
      .catch(() => setToast({ type: 'error', msg: 'Failed to load config' }))
      .finally(() => setLoading(false))
  }, [])

  function updateAgent(agent: string, patch: Partial<AgentConfig>) {
    setConfig((prev) => ({
      ...prev,
      [agent]: { ...prev[agent], ...patch },
    }))
  }

  function handleProviderChange(agent: string, provider: string) {
    const firstModel = PROVIDER_MODELS[provider]?.[0] ?? ''
    updateAgent(agent, { provider, model: firstModel, deployment: firstModel })
  }

  function handleModelChange(agent: string, model: string) {
    updateAgent(agent, { model, deployment: model })
  }

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      const saved = await updateModelConfig(config)
      setConfig(saved)
      setToast({ type: 'success', msg: 'Configuration saved and reloaded.' })
    } catch {
      setToast({ type: 'error', msg: 'Save failed — check backend logs.' })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        Loading config…
      </div>
    )
  }

  const agents = AGENT_ORDER.filter((a) => a in config)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-page)' }}>
              {['Agent', 'Provider', 'Model', 'Temp', ''].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '8px 10px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, idx) => {
              const cfg = config[agent] ?? {}
              const provider = inferProvider(cfg)
              const model = inferModel(cfg, provider)
              const isJudge = agent === 'judge'
              const showOpusToggle = isJudge && provider === 'anthropic'

              return (
                <tr
                  key={agent}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-page)',
                  }}
                >
                  {/* Agent */}
                  <td style={{ padding: '10px 10px', whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {AGENT_LABELS[agent] ?? agent}
                  </td>

                  {/* Provider dropdown */}
                  <td style={{ padding: '8px 10px', minWidth: 160 }}>
                    <select
                      value={provider}
                      onChange={(e) => handleProviderChange(agent, e.target.value)}
                      style={SEL_STYLE}
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </td>

                  {/* Model dropdown */}
                  <td style={{ padding: '8px 10px', minWidth: 200 }}>
                    <select
                      value={model}
                      onChange={(e) => handleModelChange(agent, e.target.value)}
                      style={SEL_STYLE}
                    >
                      {(PROVIDER_MODELS[provider] ?? []).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </td>

                  {/* Temperature */}
                  <td style={{ padding: '8px 10px' }}>
                    <input
                      type="number"
                      min={0} max={1} step={0.1}
                      value={Number(cfg.temperature ?? 0).toFixed(1)}
                      onChange={(e) => updateAgent(agent, { temperature: parseFloat(e.target.value) })}
                      style={INPUT_STYLE}
                    />
                  </td>

                  {/* Judge extras */}
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                    {showOpusToggle && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(cfg.use_claude_opus)}
                          onChange={(e) => updateAgent(agent, { use_claude_opus: e.target.checked })}
                          style={{ accentColor: 'var(--brand)', width: 13, height: 13 }}
                        />
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                          Use Opus (premium)
                        </span>
                      </label>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 4px 0',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        {toast ? (
          <span
            style={{
              fontSize: 'var(--text-xs)',
              padding: '4px 10px',
              background: toast.type === 'success' ? '#D1FAE5' : '#FEE2E2',
              color: toast.type === 'success' ? '#065F46' : '#991B1B',
              border: `1px solid ${toast.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`,
            }}
          >
            {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
          </span>
        ) : (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Changes are applied immediately via hot-reload.
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '7px 20px',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: '#fff',
            background: 'var(--brand)',
            border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save All'}
        </button>
      </div>
    </div>
  )
}
