import { useCallback, useEffect, useState } from 'react'

type NotifType = 'flight' | 'policy' | 'downtime' | 'upgrade' | 'alert' | 'feature'
type Severity = 'info' | 'warning' | 'critical'

interface Notification {
  id: string
  type: NotifType
  title: string
  message: string
  severity: Severity
  target: string
  scheduled_at: string | null
  expires_at: string | null
  created_at: string
  created_by: string | null
  is_active: boolean
}

interface NotifStats {
  total: number
  active: number
  by_type: Record<string, number>
  by_severity: Record<string, number>
}

const TYPE_META: Record<NotifType, { label: string; icon: string; color: string }> = {
  flight:   { label: 'Flight Alert', icon: '✈',  color: '#1E3A5F' },
  policy:   { label: 'Policy',       icon: '📋', color: '#7c3aed' },
  downtime: { label: 'Downtime',     icon: '🔧', color: '#92400e' },
  upgrade:  { label: 'Upgrade',      icon: '⬆️', color: '#1d4ed8' },
  alert:    { label: 'Alert',        icon: '🚨', color: '#b91c1c' },
  feature:  { label: 'Feature',      icon: '✨', color: '#047857' },
}

const SEV_META: Record<Severity, { label: string; color: string; bg: string }> = {
  info:     { label: 'Info',     color: '#1d4ed8', bg: '#eff6ff' },
  warning:  { label: 'Warning',  color: '#92400e', bg: '#fffbeb' },
  critical: { label: 'Critical', color: '#b91c1c', bg: '#fef2f2' },
}

const EMPTY_FORM = {
  type: 'flight' as NotifType,
  title: '',
  message: '',
  severity: 'info' as Severity,
  target: 'all',
  scheduled_at: '',
  expires_at: '',
  created_by: '',
}

const token = () => localStorage.getItem('nva_token') ?? ''
const authH = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' })

function fmtTs(ts: string | null) {
  if (!ts) return '—'
  try { return new Date(ts).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) }
  catch { return ts }
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 100, padding: '10px 14px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function NotificationsTab() {
  const [tab, setTab] = useState<'compose' | 'active' | 'history'>('compose')
  const [stats, setStats] = useState<NotifStats | null>(null)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications/stats', { headers: authH() })
      if (r.ok) setStats(await r.json())
    } catch { /* ignore */ }
  }, [])

  const fetchItems = useCallback(async (activeOnly: boolean) => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ active_only: String(activeOnly), include_expired: 'true', limit: '200' })
      const r = await fetch(`/api/notifications?${p}`, { headers: authH() })
      if (r.ok) setItems(await r.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchItems(tab === 'active')
  }, [tab])

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, val: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: val }))
    setFormError(null)
  }

  function resetForm() {
    setForm({ ...EMPTY_FORM })
    setEditId(null)
    setFormError(null)
    setFormSuccess(null)
  }

  function startEdit(n: Notification) {
    setTab('compose')
    setEditId(n.id)
    setForm({ type: n.type, title: n.title, message: n.message, severity: n.severity, target: n.target, scheduled_at: n.scheduled_at ?? '', expires_at: n.expires_at ?? '', created_by: n.created_by ?? '' })
    setFormError(null)
    setFormSuccess(null)
  }

  async function saveForm() {
    if (!form.title.trim()) { setFormError('Title is required.'); return }
    if (!form.message.trim()) { setFormError('Message is required.'); return }
    setSaving(true); setFormError(null); setFormSuccess(null)
    try {
      const body = { type: form.type, title: form.title.trim(), message: form.message.trim(), severity: form.severity, target: form.target.trim() || 'all', scheduled_at: form.scheduled_at || null, expires_at: form.expires_at || null, created_by: form.created_by.trim() || null }
      const url = editId ? `/api/notifications/${editId}` : '/api/notifications'
      const method = editId ? 'PUT' : 'POST'
      const r = await fetch(url, { method, headers: authH(), body: JSON.stringify(body) })
      if (!r.ok) { const e = await r.json(); setFormError(e.detail ?? 'Save failed.'); return }
      setFormSuccess(editId ? 'Notification updated.' : 'Notification sent to users.')
      resetForm()
      await fetchItems(false); await fetchStats()
    } finally { setSaving(false) }
  }

  async function toggleActive(n: Notification) {
    await fetch(`/api/notifications/${n.id}`, { method: 'PUT', headers: authH(), body: JSON.stringify({ is_active: !n.is_active }) })
    await fetchItems(tab === 'active'); await fetchStats()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`/api/notifications/${deleteTarget.id}`, { method: 'DELETE', headers: authH() })
      setDeleteTarget(null)
      await fetchItems(tab === 'active'); await fetchStats()
    } finally { setDeleting(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', fontSize: 'var(--text-xs)', padding: '6px 10px',
    border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
    background: 'var(--bg-page)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
  }

  const chipActive: React.CSSProperties = { padding: '3px 10px', fontSize: 'var(--text-xs)', fontWeight: 700, border: '1px solid var(--brand)', background: 'var(--brand)', color: 'white', borderRadius: 'var(--r-sm)', cursor: 'pointer' }
  const chipIdle: React.CSSProperties = { ...chipActive, background: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatCard label="Active" value={stats?.active ?? '—'} sub={`of ${stats?.total ?? 0} total`} />
        <StatCard label="Critical" value={stats?.by_severity?.critical ?? 0} />
        <StatCard label="Warning" value={stats?.by_severity?.warning ?? 0} />
        <StatCard label="Info" value={stats?.by_severity?.info ?? 0} />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        {(['compose', 'active', 'history'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setDeleteTarget(null) }}
            style={tab === t ? chipActive : chipIdle}>
            {t === 'compose' ? (editId ? '✏️ Edit' : '✉️ Compose') : t === 'active' ? 'Active' : 'History'}
          </button>
        ))}
        <button onClick={() => { fetchStats(); fetchItems(tab === 'active') }}
          style={{ ...chipIdle, marginLeft: 'auto' }}>↺ Refresh</button>
      </div>

      {/* ── Compose ── */}
      {tab === 'compose' && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>

          {/* Form */}
          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)' }}>
              {editId ? 'Edit Notification' : 'New Notification'}
            </p>

            {formError && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', padding: '6px 10px', background: 'var(--danger-bg)', borderRadius: 'var(--r-sm)' }}>{formError}</p>}
            {formSuccess && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--success)', padding: '6px 10px', background: 'var(--success-bg)', borderRadius: 'var(--r-sm)' }}>{formSuccess}</p>}

            {/* Type chips */}
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Type</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(Object.keys(TYPE_META) as NotifType[]).map((t) => (
                  <button key={t} onClick={() => setField('type', t)}
                    style={{ padding: '3px 9px', fontSize: 10, fontWeight: form.type === t ? 700 : 400, borderRadius: 'var(--r-sm)', cursor: 'pointer', border: `1px solid ${form.type === t ? TYPE_META[t].color : 'var(--border)'}`, background: form.type === t ? `${TYPE_META[t].color}18` : 'transparent', color: form.type === t ? TYPE_META[t].color : 'var(--text-secondary)' }}>
                    {TYPE_META[t].icon} {TYPE_META[t].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity chips */}
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Severity</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {(Object.keys(SEV_META) as Severity[]).map((s) => (
                  <button key={s} onClick={() => setField('severity', s)}
                    style={{ padding: '3px 10px', fontSize: 10, fontWeight: form.severity === s ? 700 : 400, borderRadius: 'var(--r-sm)', cursor: 'pointer', border: `1px solid ${form.severity === s ? SEV_META[s].color : 'var(--border)'}`, background: form.severity === s ? SEV_META[s].bg : 'transparent', color: form.severity === s ? SEV_META[s].color : 'var(--text-secondary)' }}>
                    {SEV_META[s].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Title *</label>
              <input style={inputStyle} value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Short, clear headline" />
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Message *</label>
              <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={form.message} onChange={(e) => setField('message', e.target.value)} placeholder="Full notification body" />
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Target</label>
              <input style={inputStyle} value={form.target} onChange={(e) => setField('target', e.target.value)} placeholder="all  or  username@company.com" />
              <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>Use <code>all</code> for everyone, or a specific username.</p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Schedule at</label>
                <input style={inputStyle} type="datetime-local" value={form.scheduled_at} onChange={(e) => setField('scheduled_at', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Expires at</label>
                <input style={inputStyle} type="datetime-local" value={form.expires_at} onChange={(e) => setField('expires_at', e.target.value)} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Created by</label>
              <input style={inputStyle} value={form.created_by} onChange={(e) => setField('created_by', e.target.value)} placeholder="Your name — optional" />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveForm} disabled={saving}
                style={{ flex: 1, padding: '7px 14px', fontSize: 'var(--text-xs)', fontWeight: 700, background: 'var(--brand)', color: 'white', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : '✉️ Send Notification'}
              </button>
              {editId && (
                <button onClick={resetForm}
                  style={{ padding: '7px 14px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Live preview */}
          <div style={{ width: 200, flexShrink: 0 }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Preview</p>
            <div style={{ border: `1px solid ${SEV_META[form.severity]?.color ?? 'var(--border)'}`, borderLeft: `4px solid ${SEV_META[form.severity]?.color ?? 'var(--brand)'}`, borderRadius: 'var(--r-md)', padding: '10px 12px', background: SEV_META[form.severity]?.bg ?? 'var(--bg-page)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{TYPE_META[form.type]?.icon ?? '📢'}</span>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {form.title || 'Notification title'}
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                {form.message || 'Message preview…'}
              </p>
              <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, padding: '1px 5px', background: `${SEV_META[form.severity]?.color}20`, color: SEV_META[form.severity]?.color, borderRadius: 'var(--r-sm)', fontWeight: 700 }}>{SEV_META[form.severity]?.label}</span>
                <span style={{ fontSize: 9, padding: '1px 5px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-dim)' }}>{form.target || 'all'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Active / History ── */}
      {(tab === 'active' || tab === 'history') && (
        <div>
          {deleteTarget && (
            <div style={{ padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: 'var(--r-md)', border: '1px solid var(--danger)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-xs)' }}>
              <span style={{ flex: 1 }}>Delete <strong>{deleteTarget.title}</strong>? This cannot be undone.</span>
              <button onClick={confirmDelete} disabled={deleting} style={{ padding: '3px 10px', fontSize: 'var(--text-xs)', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: '3px 10px', fontSize: 'var(--text-xs)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
            </div>
          )}

          {loading ? (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Loading…</p>
          ) : items.length === 0 ? (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>No notifications found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((n) => {
                const isExp = expanded === n.id
                const sev = SEV_META[n.severity]
                const typ = TYPE_META[n.type]
                return (
                  <div key={n.id} style={{ border: '1px solid var(--border)', borderLeft: `3px solid ${sev?.color ?? 'var(--border)'}`, borderRadius: 'var(--r-md)', overflow: 'hidden', opacity: n.is_active ? 1 : 0.55 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer', background: 'var(--bg-page)' }} onClick={() => setExpanded(isExp ? null : n.id)}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{typ?.icon ?? '📢'}</span>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                      <span style={{ fontSize: 9, padding: '1px 5px', background: `${sev?.color}18`, color: sev?.color, borderRadius: 'var(--r-sm)', fontWeight: 700, flexShrink: 0 }}>{n.severity}</span>
                      <span style={{ fontSize: 9, color: 'var(--text-dim)', flexShrink: 0 }}>{fmtTs(n.created_at)}</span>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: n.is_active ? 'var(--success)' : 'var(--border)', flexShrink: 0 }} />
                      {/* Actions */}
                      <button onClick={(e) => { e.stopPropagation(); startEdit(n) }} title="Edit"
                        style={{ fontSize: 11, padding: '1px 5px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>✏</button>
                      <button onClick={(e) => { e.stopPropagation(); toggleActive(n) }} title={n.is_active ? 'Deactivate' : 'Activate'}
                        style={{ fontSize: 11, padding: '1px 5px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: n.is_active ? 'var(--warning)' : 'var(--success)', flexShrink: 0 }}>
                        {n.is_active ? '⏸' : '▶'}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(n) }} title="Delete"
                        style={{ fontSize: 11, padding: '1px 5px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--danger)', flexShrink: 0 }}>✕</button>
                    </div>
                    {isExp && (
                      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.6 }}>{n.message}</p>
                        <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                          <span>Target: {n.target}</span>
                          {n.created_by && <span>By: {n.created_by}</span>}
                          {n.scheduled_at && <span>Scheduled: {fmtTs(n.scheduled_at)}</span>}
                          {n.expires_at && <span>Expires: {fmtTs(n.expires_at)}</span>}
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{n.id}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
