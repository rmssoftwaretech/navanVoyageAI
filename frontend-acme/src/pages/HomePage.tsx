import { Link } from 'react-router-dom'
import { getStoredUser } from '@/services/auth'
import { PERSONAS } from '@/data/personas'

export default function HomePage() {
  const user = getStoredUser()
  const persona = user ? PERSONAS[user.personaKey] : null

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div
          className="rounded-2xl p-8 mb-8 text-white"
          style={{ background: 'linear-gradient(135deg, #1A56DB 0%, #1D4ED8 60%, #1E40AF 100%)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium mb-2">Welcome to</p>
              <h1 className="text-3xl font-bold mb-2">Acme Corp Portal</h1>
              {persona && (
                <p className="text-blue-100 text-sm">
                  {persona.displayName} · {persona.title} · {persona.department}
                </p>
              )}
            </div>
            <span className="text-5xl opacity-20">⬡</span>
          </div>
        </div>

        {/* Quick actions */}
        <h2 className="text-base font-semibold text-gray-700 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link
            to="/acme/travel"
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3"
              style={{ background: '#EFF6FF' }}
            >
              ✈
            </div>
            <p className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-blue-700">Book Travel</p>
            <p className="text-xs text-gray-500">Search flights, hotels, and car rentals within your policy</p>
          </Link>

          <Link
            to="/acme/profile"
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3"
              style={{ background: '#F0FDF4' }}
            >
              👤
            </div>
            <p className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-blue-700">My Profile</p>
            <p className="text-xs text-gray-500">View your travel policy, department, and preferences</p>
          </Link>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 opacity-50 cursor-not-allowed">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3"
              style={{ background: '#FFFBEB' }}
            >
              📊
            </div>
            <p className="font-semibold text-gray-900 text-sm mb-1">Expenses</p>
            <p className="text-xs text-gray-500">Coming soon — expense report submission</p>
          </div>
        </div>

        {/* Upcoming trip reminder */}
        {persona && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-4">
            <div className="text-2xl">✈</div>
            <div className="flex-1">
              <p className="font-semibold text-blue-900 text-sm">
                Upcoming: {persona.trip.destination}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                {persona.trip.purpose} · {persona.trip.depart} → {persona.trip.returnDate}
              </p>
            </div>
            <Link
              to="/acme/travel"
              className="text-xs font-semibold text-blue-700 border border-blue-300 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors flex-shrink-0"
            >
              Book now →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
