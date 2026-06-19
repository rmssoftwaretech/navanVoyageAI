import { useState } from 'react'
import type { McpPrompt, HistoryEntry } from '@/types/mcpInspector'
import { getPrompt } from '@/services/mcpInspector'

interface PromptCardProps {
  prompt: McpPrompt
  serverUrl: string
  onHistoryEntry: (e: HistoryEntry) => void
}

function PromptCard({ prompt, serverUrl, onHistoryEntry }: PromptCardProps) {
  const [open, setOpen] = useState(false)
  const [args, setArgs] = useState<Record<string, string>>(() =>
    Object.fromEntries(prompt.arguments.map((a) => [a.name, '']))
  )
  const [messages, setMessages] = useState<unknown[] | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function get() {
    setLoading(true); setError(null); setMessages(null)
    const entry: HistoryEntry = { id: crypto.randomUUID(), ts: Date.now(), method: `prompts/get — ${prompt.name}`, params: args }
    try {
      const res = await getPrompt(serverUrl, prompt.name, args)
      entry.result = res.messages; entry.duration_ms = res.duration_ms
      setMessages(res.messages); setDuration(res.duration_ms)
    } catch (err) {
      entry.error = err instanceof Error ? err.message : String(err)
      setError(entry.error)
    } finally {
      onHistoryEntry(entry); setLoading(false)
    }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--bg-surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{prompt.name}</span>
          {prompt.description && <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{prompt.description}</p>}
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {prompt.arguments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {prompt.arguments.map((a) => (
                <div key={a.name}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>
                    {a.name}{a.required && <span style={{ color: 'var(--danger)' }}> *</span>}
                    {a.description && <span style={{ fontWeight: 400, color: 'var(--text-dim)', marginLeft: 4 }}>— {a.description}</span>}
                  </label>
                  <input
                    type="text"
                    value={args[a.name] ?? ''}
                    onChange={(e) => setArgs((prev) => ({ ...prev, [a.name]: e.target.value }))}
                    style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg-page)', color: 'var(--text-primary)', outline: 'none' }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={get}
            disabled={loading}
            style={{ alignSelf: 'flex-start', padding: '5px 14px', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'white', background: loading ? 'var(--border)' : 'var(--brand)', border: 'none', borderRadius: 'var(--r-sm)', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Getting…' : 'Get Prompt'}
          </button>

          {error && <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>{error}</p>}

          {messages !== null && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Messages</span>
                {duration !== null && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{duration}ms</span>}
              </div>
              <pre style={{ margin: 0, padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflowX: 'auto', maxHeight: 240, overflowY: 'auto', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                {JSON.stringify(messages, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface PromptsTabProps {
  prompts: McpPrompt[]
  serverUrl: string
  onHistoryEntry: (e: HistoryEntry) => void
}

export default function PromptsTab({ prompts, serverUrl, onHistoryEntry }: PromptsTabProps) {
  if (prompts.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>
        {serverUrl ? 'No prompts on this server.' : 'Connect to a server to see prompts.'}
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: '0 0 4px', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Prompts ({prompts.length})
      </p>
      {prompts.map((p) => (
        <PromptCard key={p.name} prompt={p} serverUrl={serverUrl} onHistoryEntry={onHistoryEntry} />
      ))}
    </div>
  )
}
