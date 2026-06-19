import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { logout } from '@/services/auth'
import ThemePicker from './ThemePicker'
import NotificationPopup from './NotificationPopup'

interface AppHeaderProps {
  onAdminOpen: () => void
  onSupportOpen: () => void
  username: string
  isAdmin?: boolean
  debugMode: boolean
  onDebugToggle: () => void
  panelMode?: boolean
  onPanelModeToggle?: () => void
}

const iconBtn = (active = false): React.CSSProperties => ({
  width: 30, height: 30,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
  border: 'none',
  borderRadius: 'var(--r-md)',
  cursor: 'pointer',
  color: active ? 'white' : 'rgba(255,255,255,0.65)',
  fontSize: 14,
  transition: 'background 0.12s, color 0.12s',
  flexShrink: 0,
})

function IconBtn({ onClick, title, active, children }: {
  onClick?: () => void
  title?: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={iconBtn(active)}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
        e.currentTarget.style.color = 'white'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active ? 'rgba(255,255,255,0.15)' : 'transparent'
        e.currentTarget.style.color = active ? 'white' : 'rgba(255,255,255,0.65)'
      }}
    >
      {children}
    </button>
  )
}

function UserDropdown({
  username, debugMode, onDebugToggle, panelMode, onPanelModeToggle,
}: {
  username: string
  debugMode: boolean
  onDebugToggle: () => void
  panelMode?: boolean
  onPanelModeToggle?: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const onInspector = location.pathname === '/inspector'
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const initials = username.split(/[\s._-]/).map((w) => w[0]?.toUpperCase() ?? '').join('').slice(0, 2) || 'U'

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const menuItemStyle = (danger = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '8px 14px',
    background: 'none', border: 'none',
    textAlign: 'left', cursor: 'pointer',
    fontSize: 13, fontWeight: 500,
    color: danger ? '#ef4444' : '#1f2937',
    borderRadius: 8,
    transition: 'background 0.1s',
  })

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger pill */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: open ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: 'var(--r-md)',
          padding: '3px 10px 3px 4px',
          cursor: 'pointer',
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.14)' }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'rgba(255,255,255,0.22)',
          border: '1.5px solid rgba(255,255,255,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: 'white',
        }}>
          {initials}
        </div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 500, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {username}
        </span>
        <svg width="10" height="10" viewBox="0 0 20 20" fill="rgba(255,255,255,0.6)"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
          minWidth: 220,
          zIndex: 1000,
          overflow: 'hidden',
          padding: '6px 6px',
        }}>
          {/* User label */}
          <div style={{ padding: '8px 14px 10px', borderBottom: '1px solid #f3f4f6', marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Signed in as</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{username}</div>
          </div>

          {/* Panel toggle */}
          {onPanelModeToggle && (
            <button
              onClick={() => { onPanelModeToggle(); setOpen(false) }}
              style={menuItemStyle()}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontSize: 15 }}>{panelMode ? '⬜' : '▣'}</span>
              <span>{panelMode ? 'Exit Panel Mode' : 'Panel Mode'}</span>
              {panelMode && (
                <span style={{ marginLeft: 'auto', fontSize: 10, background: '#ede9fe', color: '#7c3aed', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>ON</span>
              )}
            </button>
          )}

          {/* Theme */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 14px',
          }}>
            <span style={{ fontSize: 15 }}>🎨</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>Theme</span>
            <span style={{ marginLeft: 'auto' }}>
              <ThemePicker compact />
            </span>
          </div>

          {/* Debug */}
          <button
            onClick={() => { onDebugToggle(); setOpen(false) }}
            style={menuItemStyle()}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <span style={{ fontSize: 15 }}>🐛</span>
            <span>Debug Mode</span>
            {debugMode && (
              <span style={{ marginLeft: 'auto', fontSize: 10, background: '#fef9c3', color: '#854d0e', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>ON</span>
            )}
          </button>

          {/* Inspector */}
          <button
            onClick={() => { navigate(onInspector ? '/' : '/inspector'); setOpen(false) }}
            style={menuItemStyle()}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <span style={{ fontSize: 15 }}>🔌</span>
            <span>Inspector</span>
            {onInspector && (
              <span style={{ marginLeft: 'auto', fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>ACTIVE</span>
            )}
          </button>

          <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />

          {/* Sign out */}
          <button
            onClick={() => { logout(); setOpen(false) }}
            style={menuItemStyle(true)}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h7v-2H4V5h6V3H3zm10 10l4-3-4-3v2H9v2h4v2z" clipRule="evenodd" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function AppHeader({
  onAdminOpen, onSupportOpen, username, isAdmin = false,
  debugMode, onDebugToggle, panelMode = false, onPanelModeToggle,
}: AppHeaderProps) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 14px', height: 44, flexShrink: 0,
      background: 'var(--brand)',
      borderBottom: '1px solid rgba(0,0,0,0.12)',
    }}>

      {/* ── Left: Logo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/brand-icon.svg" alt="navanVoyageAI" style={{ width: 28, height: 19, flexShrink: 0 }} />
        <span style={{ color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: '0.02em' }}>
          navanVoyageAI
        </span>
        {!panelMode && (
          <span style={{
            fontSize: 10, padding: '2px 7px',
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 'var(--r-sm)',
            letterSpacing: '0.03em',
          }}>
            Corporate Travel AI
          </span>
        )}
      </div>

      {/* ── Right: Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

        {!panelMode && (
          <>
            {/* Notifications */}
            <NotificationPopup isAdmin={isAdmin} />

            {/* Support */}
            <IconBtn onClick={onSupportOpen} title="Support chat">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </IconBtn>

            {/* Admin */}
            {isAdmin && (
              <button
                onClick={onAdminOpen}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', fontSize: 12, fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.28)',
                  color: 'white',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 'var(--r-md)',
                  cursor: 'pointer',
                  letterSpacing: '0.03em',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              >
                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Admin
              </button>
            )}
          </>
        )}

        {/* User profile dropdown — always at far right */}
        <UserDropdown
          username={username}
          debugMode={debugMode}
          onDebugToggle={onDebugToggle}
          panelMode={panelMode}
          onPanelModeToggle={onPanelModeToggle}
        />
      </div>
    </header>
  )
}
