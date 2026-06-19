import { useState } from 'react'
import type { FlightResult } from '@/types/nva'
import type { BookingPassenger } from '@/services/bookings'

interface Props {
  flight: FlightResult
  passenger: BookingPassenger
  seat_preference: string
  meal_preference: string
  special_assistance: string
  submitting: boolean
  onBack: () => void
  onConfirm: () => void
}

const SEAT_LABELS: Record<string, string> = {
  window: 'Window', aisle: 'Aisle', no_preference: 'No preference',
}
const MEAL_LABELS: Record<string, string> = {
  standard: 'Standard', vegetarian: 'Vegetarian', halal: 'Halal', kosher: 'Kosher',
}

export default function BookingReview({
  flight, passenger, seat_preference, meal_preference, special_assistance, submitting, onBack, onConfirm,
}: Props) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary card */}
      <div style={{ border: '1px solid var(--border)', padding: '14px 16px', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Row label="Flight" value={`${flight.flight_number}  ${flight.origin} → ${flight.destination}  ${flight.depart_date}  ${flight.cabin_class}`} />
        <Row label="Passenger" value={`${passenger.first_name} ${passenger.last_name}  (Passport: ${passenger.passport_number})`} />
        <Row label="Contact" value={passenger.email} />
        <Row label="Seat" value={`${SEAT_LABELS[seat_preference] ?? seat_preference}  |  Meal: ${MEAL_LABELS[meal_preference] ?? meal_preference}`} />
        {special_assistance && <Row label="Assistance" value={special_assistance} />}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 2 }}>
          <Row
            label="Total"
            value={`$${flight.price_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`}
            bold
          />
        </div>
      </div>

      {/* Policy checkbox */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          style={{ marginTop: 2, accentColor: 'var(--brand)', width: 14, height: 14, flexShrink: 0 }}
        />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          I confirm this booking complies with company travel policy and the details above are correct.
        </span>
      </label>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <button onClick={onBack} disabled={submitting} style={btnSecondary}>← Back</button>
        <button
          onClick={onConfirm}
          disabled={!confirmed || submitting}
          style={{ ...btnPrimary, opacity: !confirmed || submitting ? 0.5 : 1, cursor: !confirmed || submitting ? 'not-allowed' : 'pointer' }}
        >
          {submitting ? 'Confirming…' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 'var(--text-sm)' }}>
      <span style={{ width: 90, flexShrink: 0, color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, paddingTop: 2 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  padding: '7px 20px', fontSize: 'var(--text-sm)', fontWeight: 700,
  background: 'var(--brand)', color: '#fff', border: 'none',
}
const btnSecondary: React.CSSProperties = {
  padding: '7px 16px', fontSize: 'var(--text-sm)', fontWeight: 500,
  background: 'transparent', color: 'var(--text-muted)',
  border: '1px solid var(--border)', cursor: 'pointer',
}
