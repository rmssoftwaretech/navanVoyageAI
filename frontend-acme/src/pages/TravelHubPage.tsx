import { getStoredUser } from '@/services/auth'
import { PERSONAS } from '@/data/personas'
import TravelAssistantPanel from '@/components/TravelAssistantPanel'

export default function TravelHubPage() {
  const user = getStoredUser()
  const persona = user ? PERSONAS[user.personaKey] : null

  if (!persona) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Profile not found — please sign in again.
      </div>
    )
  }

  const { trip, policy } = persona

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Good morning, {persona.firstName} 👋
          </h1>
          <p className="text-gray-500 text-sm">
            {persona.title} · {persona.department}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl">
          {/* Upcoming trip card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Upcoming Trip</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium text-amber-700 bg-amber-50 border border-amber-200">
                Not booked
              </span>
            </div>

            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: '#EFF6FF' }}
              >
                ✈
              </div>
              <div>
                <p className="font-bold text-gray-900">{trip.destination}</p>
                <p className="text-sm text-gray-500">{trip.purpose}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {trip.depart} → {trip.returnDate}
                </p>
              </div>
            </div>

            {/* Scope chips */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              {trip.scope.map((s) => (
                <span
                  key={s}
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
                >
                  {s === 'Flight' ? '✈ Flight' : s === 'Hotel' ? '🏨 Hotel' : '🚗 Car'}
                </span>
              ))}
            </div>

            <button
              className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#1A56DB' }}
              onClick={() => {
                // Focus the travel assistant iframe via a scroll hint
                document.getElementById('travel-panel')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Book now →
            </button>
          </div>

          {/* Policy card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Travel Policy</h2>

            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ background: policy.color + '18' }}
              >
                {policy.badge}
              </div>
              <div>
                <p className="font-bold text-gray-900">{policy.name}</p>
                {policy.approvalRequired && (
                  <p className="text-xs text-amber-600 font-medium">{policy.approvalNote}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {[
                { icon: '✈', label: 'Flights', value: policy.flightClass },
                { icon: '🏨', label: 'Hotels', value: `${policy.hotelTier} · ${policy.hotelCap}` },
                { icon: '🚗', label: 'Car Rental', value: policy.carClass },
                { icon: '💰', label: 'Per Trip', value: policy.tripCap },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-2 text-sm">
                  <span className="w-5 text-center flex-shrink-0">{icon}</span>
                  <span className="text-gray-500 w-20 flex-shrink-0">{label}</span>
                  <span className="text-gray-800 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="lg:col-span-2 grid grid-cols-3 gap-4">
            {[
              { label: 'Trips this year', value: '4', icon: '✈' },
              { label: 'Total spend', value: '$12,840', icon: '💳' },
              { label: 'Policy compliance', value: '100%', icon: '✅' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Travel assistant panel */}
      <div id="travel-panel" className="flex h-full">
        <TravelAssistantPanel personaKey={persona.key} />
      </div>
    </div>
  )
}
