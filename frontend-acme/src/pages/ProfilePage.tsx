import { getStoredUser } from '@/services/auth'
import { PERSONAS } from '@/data/personas'

export default function ProfilePage() {
  const user = getStoredUser()
  const persona = user ? PERSONAS[user.personaKey] : null

  if (!persona) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Profile not found — please sign in again.
      </div>
    )
  }

  const { policy, trip } = persona

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        {/* Employee card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
              style={{ background: policy.color + '18' }}
            >
              {policy.badge}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{persona.displayName}</h2>
              <p className="text-sm text-gray-500">{persona.title}</p>
              <p className="text-xs text-gray-400">{persona.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Department', value: persona.department },
              { label: 'Base Airport', value: `${persona.baseAirport} — San Francisco` },
              { label: 'Username', value: persona.username },
              { label: 'Travel Policy', value: policy.name },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">{label}</p>
                <p className="font-medium text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Policy detail */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: policy.color + '18' }}
            >
              {policy.badge}
            </div>
            <h3 className="font-semibold text-gray-900">{policy.name}</h3>
          </div>

          <div className="space-y-3">
            {[
              { icon: '✈', label: 'Allowed Flight Classes', value: policy.flightClass },
              { icon: '🏨', label: 'Hotel Tier', value: `${policy.hotelTier} · Cap ${policy.hotelCap}` },
              { icon: '🚗', label: 'Car Rental', value: policy.carClass },
              { icon: '💰', label: 'Per-Trip Limit', value: policy.tripCap },
              {
                icon: policy.approvalRequired ? '⚠️' : '✅',
                label: 'Approval Required',
                value: policy.approvalRequired
                  ? (policy.approvalNote ?? 'Yes')
                  : 'No — auto-approved',
              },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="w-5 text-center flex-shrink-0 mt-0.5">{icon}</span>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current trip */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Upcoming Trip</h3>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">
              ✈
            </div>
            <div>
              <p className="font-bold text-gray-900">{trip.destination}</p>
              <p className="text-sm text-gray-500">{trip.purpose}</p>
              <p className="text-xs text-gray-400 mt-0.5">{trip.depart} → {trip.returnDate}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
