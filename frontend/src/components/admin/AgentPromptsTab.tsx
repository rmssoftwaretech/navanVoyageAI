import { useEffect, useRef, useState } from 'react'
import { getAgentPrompts, resetAgentPrompt, updateAgentPrompt } from '@/services/admin'

const AGENTS = ['orchestrator', 'search', 'policy', 'destination', 'booking', 'judge'] as const
type Agent = typeof AGENTS[number]

export default function AgentPromptsTab({ onDirty }: { onDirty?: (dirty: boolean) => void }) {
  const [prompts, setPrompts] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Agent>('orchestrator')
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    getAgentPrompts()
      .then((data) => {
        setPrompts(data)
        const initial = data[selected] ?? ''
        setDraft(initial)
        setSaved(initial)
      })
      .catch(() => showToast('error', 'Failed to load prompts.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const p = prompts[selected] ?? ''
    setDraft(p)
    setSaved(p)
  }, [selected, prompts])

  const isDirty = draft !== saved

  useEffect(() => {
    onDirty?.(isDirty)
  }, [isDirty, onDirty])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 400)}px`
  }

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateAgentPrompt(selected, draft)
      setSaved(draft)
      setPrompts((p) => ({ ...p, [selected]: draft }))
      showToast('success', `${selected} prompt saved and will hot-reload on the next request.`)
    } catch {
      showToast('error', 'Save failed — check backend logs.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    try {
      const defaultPrompt = await resetAgentPrompt(selected)
      setDraft(defaultPrompt)
      setSaved(defaultPrompt)
      setPrompts((p) => ({ ...p, [selected]: defaultPrompt }))
      showToast('success', `${selected} prompt reset to default.`)
    } catch {
      showToast('error', 'Reset failed.')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        Loading prompts…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Agent selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Agent
        </label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value as Agent)}
          style={{
            fontSize: 'var(--text-sm)',
            padding: '5px 10px',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {AGENTS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        {isDirty && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--brand)', fontWeight: 600 }}>
            ● Unsaved changes
          </span>
        )}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => { setDraft(e.target.value); autoResize() }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        spellCheck={false}
        style={{
          width: '100%',
          minHeight: 160,
          maxHeight: 400,
          resize: 'vertical',
          fontFamily: 'monospace',
          fontSize: 'var(--text-sm)',
          lineHeight: 1.6,
          padding: '10px 12px',
          border: '1px solid var(--border)',
          background: 'var(--bg-page)',
          color: 'var(--text-primary)',
          outline: 'none',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      />

      {/* Help text */}
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, flexShrink: 0 }}>
        Changes are written to <code>config/prompts.json</code> and take effect on the next request — no container restart needed.
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        {toast ? (
          <span style={{
            fontSize: 'var(--text-xs)',
            padding: '4px 10px',
            background: toast.type === 'success' ? '#D1FAE5' : '#FEE2E2',
            color: toast.type === 'success' ? '#065F46' : '#991B1B',
            border: `1px solid ${toast.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`,
          }}>
            {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
          </span>
        ) : (
          <span />
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleReset}
            style={{
              padding: '6px 14px',
              fontSize: 'var(--text-sm)',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            style={{
              padding: '6px 16px',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              border: 'none',
              background: isDirty && !saving ? 'var(--brand)' : 'var(--border)',
              color: isDirty && !saving ? '#fff' : 'var(--text-dim)',
              cursor: isDirty && !saving ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Saving…' : 'Save & Reload'}
          </button>
        </div>
      </div>
    </div>
  )
}
