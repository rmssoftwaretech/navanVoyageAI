import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/services/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded mb-4"
            style={{ background: 'var(--navy)' }}
          >
            <span className="text-white text-xl">✈</span>
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>
            navanVoyageAI
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Corporate Travel Assistant
          </p>
        </div>

        {/* Form */}
        <div
          className="bg-white p-8 border border-gray-200"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                style={{ fontFamily: 'inherit' }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                style={{ fontFamily: 'inherit' }}
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
              style={{ background: 'var(--navy)' }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>


      </div>
    </div>
  )
}
