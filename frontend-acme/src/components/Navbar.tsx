import { Link, useNavigate } from 'react-router-dom'
import { logout, getStoredUser } from '@/services/auth'

export default function Navbar() {
  const navigate = useNavigate()
  const user = getStoredUser()

  function handleLogout() {
    logout()
    navigate('/acme/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <span className="text-xl" style={{ color: '#1A56DB' }}>⬡</span>
        <div>
          <span className="font-bold text-gray-900 text-sm tracking-tight">Acme Corp</span>
          <span className="text-gray-400 text-xs ml-2 hidden sm:inline">Powering the future of business</span>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        <Link
          to="/acme"
          className="px-3 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          Home
        </Link>
        <Link
          to="/acme/travel"
          className="px-3 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          ✈ Travel
        </Link>
        <Link
          to="/acme/profile"
          className="px-3 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          Profile
        </Link>
      </div>

      {/* User + logout */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: '#1A56DB' }}
            >
              {user.displayName[0]}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.displayName}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
