import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAs } from '@/services/auth'
import { PERSONA_LIST, type Persona } from '@/data/personas'

export default function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleSelect(persona: Persona) {
    setError('')
    setLoading(persona.key)
    try {
      await loginAs(persona.username, persona.password, persona.key, persona.displayName)
      navigate('/acme/travel')
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-4xl" style={{ color: '#1A56DB' }}>⬡</span>
          <span className="text-3xl font-bold text-gray-900">Acme Corp</span>
        </div>
        <p className="text-gray-500 text-sm">Powering the future of business</p>
      </div>

      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-gray-900 text-center mb-1">Select your profile</h2>
          <p className="text-sm text-gray-500 text-center mb-8">Choose an employee profile to access the travel portal</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PERSONA_LIST.map((persona) => (
              <button
                key={persona.key}
                onClick={() => handleSelect(persona)}
                disabled={!!loading}
                className="flex flex-col items-center text-center p-6 rounded-xl border-2 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  borderColor: loading === persona.key ? '#1A56DB' : '#E5E7EB',
                  background: loading === persona.key ? '#EFF6FF' : 'white',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#1A56DB'
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#F0F7FF'
                  }
                }}
                onMouseLeave={(e) => {
                  if (loading !== persona.key) {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'white'
                  }
                }}
              >
                {/* Avatar */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-3"
                  style={{ background: persona.policy.color + '18' }}
                >
                  {persona.policy.badge}
                </div>

                {/* Name & title */}
                <p className="font-bold text-gray-900 text-base mb-0.5">{persona.displayName}</p>
                <p className="text-xs text-gray-500 mb-4">{persona.title}</p>

                {/* Trip info */}
                <div
                  className="w-full rounded-lg px-3 py-2.5 mb-4"
                  style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs">✈</span>
                    <span className="text-xs font-semibold text-gray-700">{persona.trip.destination}</span>
                  </div>
                  <p className="text-xs text-gray-500 text-left">{persona.trip.purpose}</p>
                  <p className="text-xs text-gray-400 text-left mt-0.5">
                    {persona.trip.depart.replace(', 2026', '')} → {persona.trip.returnDate.replace(', 2026', '')}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {persona.trip.scope.map((s) => (
                      <span
                        key={s}
                        className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: persona.policy.color + '15', color: persona.policy.color }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div
                  className="w-full py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
                  style={{ background: loading === persona.key ? '#1A56DB' : '#1A56DB' }}
                >
                  {loading === persona.key ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>Select →</>
                  )}
                </div>
              </button>
            ))}
          </div>

          {error && (
            <p className="text-center text-sm text-red-600 mt-4">{error}</p>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Acme Corp Internal Portal · Travel powered by navanVoyageAI
        </p>
      </div>
    </div>
  )
}
