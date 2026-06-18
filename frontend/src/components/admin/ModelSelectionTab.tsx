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

const AGENT_ICONS: Record<string, string> = {
  orchestrator: '🎯',
  search: '✈',
  policy: '📋',
  destination: '🌍',
  booking: '📅',
  judge: '⚖',
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

  function update(agent: string, field: keyof AgentConfig, value: unknown) {
    setConfig((prev) => ({
      ...prev,
      [agent]: { ...prev[agent], [field]: value },
    }))
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
      <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--text-muted)' }}>
        Loading config…
      </div>
    )
  }

  const agents = AGENT_ORDER.filter((a) => a in config)

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Cards grid */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {agents.map((agent) => {
          const cfg = config[agent] ?? {}
          const isJudge = agent === 'judge'
          return (
            <div
              key={agent}
              className="flex flex-col gap-3 p-4"
              style={{ border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
            >
              {/* Card header */}
              <div className="flex items-center gap-2">
                <span className="text-base">{AGENT_ICONS[agent] ?? '🤖'}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
                  {AGENT_LABELS[agent] ?? agent}
                </span>
                <span
                  className="ml-auto text-xs px-2 py-0.5"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                  }}
                >
                  {cfg.deployment ?? cfg.model ?? 'gpt-4o'}
                </span>
              </div>

              {/* Deployment */}
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Deployment</span>
                <input
                  type="text"
                  value={String(cfg.deployment ?? '')}
                  onChange={(e) => update(agent, 'deployment', e.target.value)}
                  className="text-xs px-2 py-1"
                  style={{ border: '1px solid var(--border)', outline: 'none', fontFamily: 'monospace' }}
                />
              </label>

              {/* Temperature */}
              <label className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Temperature</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--navy)' }}>
                    {Number(cfg.temperature ?? 0).toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0} max={1} step={0.1}
                  value={Number(cfg.temperature ?? 0)}
                  onChange={(e) => update(agent, 'temperature', parseFloat(e.target.value))}
                  className="w-full"
                  style={{ accentColor: 'var(--navy)' }}
                />
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>0.0</span><span>1.0</span>
                </div>
              </label>

              {/* Max tokens */}
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Max Tokens</span>
                <input
                  type="number"
                  min={64} max={8192} step={64}
                  value={Number(cfg.max_tokens ?? 1024)}
                  onChange={(e) => update(agent, 'max_tokens', parseInt(e.target.value, 10))}
                  className="text-xs px-2 py-1 w-full"
                  style={{ border: '1px solid var(--border)', outline: 'none', fontFamily: 'monospace' }}
                />
              </label>

              {/* Judge-only: Claude Opus toggle */}
              {isJudge && (
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={Boolean(cfg.use_claude_opus)}
                    onChange={(e) => update(agent, 'use_claude_opus', e.target.checked)}
                    style={{ accentColor: 'var(--gold)', width: 14, height: 14 }}
                  />
                  <span className="text-xs" style={{ color: 'var(--navy)' }}>
                    Use Claude Opus for Eval <span style={{ color: 'var(--text-muted)' }}>(premium)</span>
                  </span>
                </label>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between mt-auto pt-4 flex-shrink-0"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {toast ? (
          <span
            className="text-xs px-3 py-1"
            style={{
              background: toast.type === 'success' ? '#D1FAE5' : '#FEE2E2',
              color: toast.type === 'success' ? '#065F46' : '#991B1B',
              border: `1px solid ${toast.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`,
            }}
          >
            {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
          </span>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Changes are applied immediately via hot-reload.
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--navy)' }}
        >
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
      </div>
    </div>
  )
}
