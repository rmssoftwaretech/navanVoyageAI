import { logout } from '@/services/auth'

interface AppHeaderProps {
  onAdminOpen: () => void
  username: string
}

export default function AppHeader({ onAdminOpen, username }: AppHeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-4 h-12 flex-shrink-0"
      style={{ background: 'var(--navy)', borderBottom: '1px solid var(--navy-dark)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-white text-base">✈</span>
        <span className="text-white font-semibold text-sm tracking-wide">navanVoyageAI</span>
        <span className="text-xs ml-2 px-2 py-0.5" style={{ color: 'var(--gold)', border: '1px solid var(--gold)' }}>
          Corporate Travel AI
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {username}
        </span>
        <button
          onClick={onAdminOpen}
          className="text-xs px-3 py-1 font-medium transition-opacity hover:opacity-80"
          style={{ border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}
        >
          ⚙ Admin
        </button>
        <button
          onClick={logout}
          className="text-xs px-3 py-1 font-medium transition-opacity hover:opacity-80"
          style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
