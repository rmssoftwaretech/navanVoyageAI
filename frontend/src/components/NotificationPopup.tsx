import { useEffect, useRef, useState } from 'react'

type NotifType = 'feature' | 'downtime' | 'upgrade' | 'policy' | 'alert' | 'flight'
type Severity = 'info' | 'warning' | 'critical'

interface Notification {
  id: string
  type: NotifType
  title: string
  message: string
  severity: Severity
  target: string
  created_at: string
  is_active: boolean
}

const TYPE_ICON: Record<string, string> = {
  feature: '✨', downtime: '🔧', upgrade: '⬆️',
  policy: '📋', alert: '🚨', flight: '✈',
}

const SEV_COLOR: Record<string, string> = {
  info: 'var(--info)',
  warning: 'var(--warning)',
  critical: 'var(--danger)',
}

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

interface NotificationPopupProps {
  isAdmin?: boolean
}

export default function NotificationPopup({ isAdmin: _isAdmin = false }: NotificationPopupProps) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('nva_dismissed_notifs') ?? '[]')) }
    catch { return new Set() }
  })
  const ref = useRef<HTMLDivElement>(null)

  async function fetchNotifications() {
    try {
      const token = localStorage.getItem('nva_token')
      const r = await fetch('/api/notifications?active_only=true&limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) setNotifications(await r.json())
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchNotifications() }, [])
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function dismiss(id: string) {
    const next = new Set([...dismissed, id])
    setDismissed(next)
    localStorage.setItem('nva_dismissed_notifs', JSON.stringify([...next]))
  }

  function dismissAll() {
    const next = new Set([...dismissed, ...notifications.map((n) => n.id)])
    setDismissed(next)
    localStorage.setItem('nva_dismissed_notifs', JSON.stringify([...next]))
  }

  const visible = notifications.filter((n) => !dismissed.has(n.id))
  const unread = visible.length

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        style={{
          position: 'relative',
          background: open ? 'rgba(255,255,255,0.15)' : 'transparent',
          border: `1px solid ${open ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)'}`,
          borderRadius: 'var(--r-md)',
          padding: '4px 8px',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.8)',
          fontSize: 15,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16,
            background: 'var(--danger)',
            color: 'white',
            fontSize: 9,
            fontWeight: 700,
            borderRadius: 'var(--r-full)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
            lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          zIndex: 9999,
          width: 340,
          maxHeight: 440,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
              Notifications {unread > 0 && <span style={{ fontSize: 10, color: 'var(--brand)', fontWeight: 600 }}>({unread})</span>}
            </span>
            {unread > 0 && (
              <button
                onClick={dismissAll}
                style={{ fontSize: 10, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
              >
                Dismiss all
              </button>
            )}
            <button
              onClick={fetchNotifications}
              style={{ fontSize: 10, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
              title="Refresh"
            >
              ↺
            </button>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {visible.length === 0 ? (
              <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>🔔</div>
                No new notifications
              </div>
            ) : (
              visible.map((n) => {
                const sevColor = SEV_COLOR[n.severity] ?? 'var(--text-muted)'
                return (
                  <div key={n.id} style={{
                    display: 'flex', gap: 10, padding: '10px 14px',
                    borderBottom: '1px solid var(--border-light)',
                    borderLeft: `3px solid ${sevColor}`,
                    background: 'var(--bg-surface)',
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0, alignSelf: 'flex-start', marginTop: 1 }}>
                      {TYPE_ICON[n.type] ?? '📢'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.title}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0, marginLeft: 'auto' }}>
                          {timeSince(n.created_at)}
                        </span>
                      </div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {n.message}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                        <span style={{ fontSize: 10, padding: '1px 5px', background: `${sevColor}18`, color: sevColor, borderRadius: 'var(--r-sm)', fontWeight: 600 }}>
                          {n.severity}
                        </span>
                        <button
                          onClick={() => dismiss(n.id)}
                          style={{ fontSize: 10, color: 'var(--text-dim)', background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 'auto', padding: '1px 4px' }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
