import { useState } from 'react'
import type { McpResource, McpResourceTemplate, HistoryEntry } from '@/types/mcpInspector'
import { readResource } from '@/services/mcpInspector'

interface ResourceRowProps {
  uri: string
  name: string
  description: string
  mimeType?: string
  serverUrl: string
  onHistoryEntry: (e: HistoryEntry) => void
}

function ResourceRow({ uri, name, description, mimeType, serverUrl, onHistoryEntry }: ResourceRowProps) {
  const [result, setResult] = useState<unknown>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function read() {
    setLoading(true); setError(null); setResult(null)
    const entry: HistoryEntry = { id: crypto.randomUUID(), ts: Date.now(), method: `resources/read — ${uri}`, params: { uri } }
    try {
      const res = await readResource(serverUrl, uri)
      entry.result = res.content; entry.duration_ms = res.duration_ms
      setResult(res.content); setDuration(res.duration_ms); setOpen(true)
    } catch (err) {
      entry.error = err instanceof Error ? err.message : String(err)
      setError(entry.error)
    } finally {
      onHistoryEntry(entry); setLoading(false)
    }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--bg-surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 14px', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {uri}
          </p>
          {description && <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>{description}</p>}
          {mimeType && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{mimeType}</span>}
        </div>
        <button
          onClick={result ? () => setOpen((o) => !o) : read}
          disabled={loading}
          style={{
            flexShrink: 0, padding: '4px 10px', fontSize: 'var(--text-xs)', fontWeight: 600,
            color: 'var(--brand)', background: 'var(--brand-light)',
            border: '1px solid var(--brand)', borderRadius: 'var(--r-sm)',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '…' : result ? (open ? 'Hide' : 'Show') : 'Read'}
        </button>
      </div>
      {error && <p style={{ margin: '0 14px 10px', fontSize: 'var(--text-xs)', color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>{error}</p>}
      {open && result !== null && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Content</span>
            {duration !== null && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{duration}ms</span>}
          </div>
          <pre style={{ margin: 0, padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflowX: 'auto', maxHeight: 240, overflowY: 'auto', lineHeight: 1.5, color: 'var(--text-primary)' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

interface ResourcesTabProps {
  resources: McpResource[]
  resourceTemplates: McpResourceTemplate[]
  serverUrl: string
  onHistoryEntry: (e: HistoryEntry) => void
}

export default function ResourcesTab({ resources, resourceTemplates, serverUrl, onHistoryEntry }: ResourcesTabProps) {
  if (resources.length === 0 && resourceTemplates.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>
        {serverUrl ? 'No resources on this server.' : 'Connect to a server to see resources.'}
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {resources.length > 0 && (
        <>
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Resources ({resources.length})
          </p>
          {resources.map((r) => (
            <ResourceRow key={r.uri} {...r} serverUrl={serverUrl} onHistoryEntry={onHistoryEntry} />
          ))}
        </>
      )}
      {resourceTemplates.length > 0 && (
        <>
          <p style={{ margin: '8px 0 0', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Templates ({resourceTemplates.length})
          </p>
          {resourceTemplates.map((t) => (
            <div key={t.uriTemplate} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 14px', background: 'var(--bg-surface)' }}>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{t.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{t.uriTemplate}</p>
              {t.description && <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>{t.description}</p>}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
