import { useEffect, useState } from 'react'
import { Button, TextField, NumberField, ProgressCircle, ToastQueue } from '@react-spectrum/s2'
import { getModelConfig, updateModelConfig } from '@/services/admin'
import type { AgentConfig } from '@/services/admin'

const AGENT_LABELS: Record<string, string> = {
  orchestrator: 'Orchestrator',
  search: 'Search',
  policy: 'Policy',
  destination: 'Destination',
  booking: 'Booking',
  judge: 'Judge',
}

export default function ModelSelectionTab() {
  const [config, setConfig] = useState<Record<string, AgentConfig>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getModelConfig()
      .then(setConfig)
      .catch(() => ToastQueue.negative('Failed to load config', { timeout: 5000 }))
      .finally(() => setLoading(false))
  }, [])

  function setField(agent: string, field: keyof AgentConfig, value: string | number) {
    setConfig((prev) => ({ ...prev, [agent]: { ...prev[agent], [field]: value } }))
  }

  async function save() {
    setSaving(true)
    try {
      await updateModelConfig(config)
      ToastQueue.positive('Configuration saved', { timeout: 3000 })
    } catch {
      ToastQueue.negative('Save failed — check console', { timeout: 5000 })
    } finally { setSaving(false) }
  }

  if (loading) return <div style={center}><ProgressCircle isIndeterminate aria-label="Loading" /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={heading}>Per-Agent LLM Configuration</h3>
        <Button variant="accent" onPress={save} isPending={saving}>Save All</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {Object.entries(config).map(([agent, cfg]) => (
          <div key={agent} style={card}>
            <div style={{ ...agentHeader, background: agentColor(agent) }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>
                {AGENT_LABELS[agent] ?? agent}
              </span>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <TextField
                label="Model"
                value={cfg.model ?? ''}
                onChange={(v) => setField(agent, 'model', v)}
                UNSAFE_style={{ width: '100%' }}
              />
              <NumberField
                label="Temperature"
                value={typeof cfg.temperature === 'number' ? cfg.temperature : 0}
                onChange={(v) => setField(agent, 'temperature', v)}
                minValue={0} maxValue={2} step={0.1}
                formatOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                UNSAFE_style={{ width: '100%' }}
              />
              {cfg.max_tokens != null && (
                <NumberField
                  label="Max Tokens"
                  value={cfg.max_tokens}
                  onChange={(v) => setField(agent, 'max_tokens', v)}
                  minValue={64} maxValue={8192} step={64}
                  UNSAFE_style={{ width: '100%' }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function agentColor(agent: string): string {
  const map: Record<string, string> = {
    orchestrator: '#1E3A5F', search: '#1D4ED8', policy: '#92400E',
    destination: '#065F46', booking: '#5B21B6', judge: '#D97706',
  }
  return map[agent] ?? '#374151'
}

const center: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 40 }
const heading: React.CSSProperties = { margin: 0, fontSize: 15, fontWeight: 700, color: '#1E3A5F' }
const card: React.CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
const agentHeader: React.CSSProperties = { padding: '8px 14px' }
