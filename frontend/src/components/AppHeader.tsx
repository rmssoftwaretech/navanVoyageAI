import { logout } from '@/services/auth'
import ThemePicker from './ThemePicker'

interface AppHeaderProps {
  onAdminOpen: () => void
  username: string
}

export default function AppHeader({ onAdminOpen, username }: AppHeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-4 h-12 flex-shrink-0"
      style={{
        background: 'var(--brand)',
        borderBottom: '1px solid var(--brand-hover)',
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: 'white', fontSize: 16 }}>✈</span>
        <span style={{ color: 'white', fontWeight: 600, fontSize: 'var(--text-md)', letterSpacing: '0.02em' }}>
          navanVoyageAI
        </span>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            marginLeft: 6,
            padding: '2px 8px',
            color: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 'var(--r-sm)',
          }}
        >
          Corporate Travel AI
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.6)' }}>
          {username}
        </span>
        <ThemePicker />
        <button
          onClick={onAdminOpen}
          style={{
            fontSize: 'var(--text-sm)',
            padding: '4px 12px',
            fontWeight: 500,
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            background: 'transparent',
            borderRadius: 'var(--r-md)',
            cursor: 'pointer',
            opacity: 1,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = '0.75')}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = '1')}
        >
          ⚙ Admin
        </button>
        <button
          onClick={logout}
          style={{
            fontSize: 'var(--text-sm)',
            padding: '4px 12px',
            fontWeight: 500,
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.65)',
            background: 'transparent',
            borderRadius: 'var(--r-md)',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = '0.7')}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = '1')}
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
