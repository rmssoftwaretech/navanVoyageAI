import { useState } from 'react'
import type { FlightResult } from '@/types/nva'
import type { BookingPassenger, BookingResult } from '@/services/bookings'
import { createBooking } from '@/services/bookings'
import PassengerForm from './PassengerForm'
import SeatPreferenceStep from './SeatPreferenceStep'
import BookingReview from './BookingReview'
import BookingConfirmation from './BookingConfirmation'

interface Props {
  flight: FlightResult
  onClose: () => void
  onBooked: (reference: string) => void
}

type Step = 'passenger' | 'seat' | 'review' | 'confirmed'

const STEP_LABELS: Record<Step, string> = {
  passenger: 'Passenger Details',
  seat: 'Seat Preference',
  review: 'Review & Confirm',
  confirmed: 'Confirmed',
}
const STEPS: Step[] = ['passenger', 'seat', 'review']
const STEP_NUM: Record<Step, number> = { passenger: 1, seat: 2, review: 3, confirmed: 3 }

const emptyPassenger: BookingPassenger = {
  first_name: '', last_name: '', dob: '', passport_number: '',
  nationality: '', passport_expiry: '', email: '',
}

export default function BookingWizard({ flight, onClose, onBooked }: Props) {
  const [step, setStep] = useState<Step>('passenger')
  const [passenger, setPassenger] = useState<BookingPassenger>(emptyPassenger)
  const [seatPrefs, setSeatPrefs] = useState({ seat_preference: 'aisle', meal_preference: 'standard', special_assistance: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [booking, setBooking] = useState<BookingResult | null>(null)

  async function handleConfirm() {
    setSubmitting(true)
    setError('')
    try {
      const result = await createBooking({
        flight_id: flight.id ?? `${flight.flight_number}-${flight.depart_date}`,
        flight_number: flight.flight_number,
        origin: flight.origin,
        destination: flight.destination,
        depart_date: flight.depart_date,
        cabin_class: flight.cabin_class,
        price_usd: flight.price_usd,
        passenger,
        seat_preference: seatPrefs.seat_preference,
        meal_preference: seatPrefs.meal_preference,
        special_assistance: seatPrefs.special_assistance,
      })
      setBooking(result)
      setStep('confirmed')
      onBooked(result.reference)
    } catch {
      setError('Booking failed — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    onClose()
  }

  const currentNum = STEP_NUM[step]

  return (
    /* Backdrop */
    <div
      onClick={step !== 'confirmed' ? handleClose : undefined}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560, maxWidth: '95vw', maxHeight: '90vh',
          background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '16px 20px 12px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-page)', flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {flight.carrier} {flight.flight_number} · {flight.origin} → {flight.destination} · {flight.depart_date} · {flight.cabin_class}
            </p>
            <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              ${flight.price_usd.toLocaleString('en-US', { minimumFractionDigits: 0 })} / pax
            </p>
            {step !== 'confirmed' && (
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--brand)' }}>
                Step {currentNum} of 3: {STEP_LABELS[step]}
              </p>
            )}
          </div>

          {/* Stepper dots */}
          {step !== 'confirmed' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexShrink: 0 }}>
              {STEPS.map((s, i) => {
                const num = i + 1
                const done = num < currentNum
                const active = num === currentNum
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      background: done ? '#D1FAE5' : active ? 'var(--brand)' : 'var(--bg-surface)',
                      color: done ? '#065F46' : active ? '#fff' : 'var(--text-muted)',
                      border: done ? '1px solid #6EE7B7' : active ? 'none' : '1px solid var(--border)',
                    }}>
                      {done ? '✓' : num}
                    </div>
                    {i < STEPS.length - 1 && <div style={{ width: 20, height: 1, background: done ? '#6EE7B7' : 'var(--border)' }} />}
                  </div>
                )
              })}
            </div>
          )}

          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1, padding: 4, marginTop: -2 }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px' }}>
          {error && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#FEE2E2', color: '#991B1B', fontSize: 'var(--text-sm)', border: '1px solid #FCA5A5' }}>
              {error}
            </div>
          )}

          {step === 'passenger' && (
            <PassengerForm
              value={passenger}
              onChange={setPassenger}
              onNext={() => setStep('seat')}
              onCancel={handleClose}
            />
          )}
          {step === 'seat' && (
            <SeatPreferenceStep
              value={seatPrefs}
              onChange={setSeatPrefs}
              onBack={() => setStep('passenger')}
              onNext={() => setStep('review')}
            />
          )}
          {step === 'review' && (
            <BookingReview
              flight={flight}
              passenger={passenger}
              seat_preference={seatPrefs.seat_preference}
              meal_preference={seatPrefs.meal_preference}
              special_assistance={seatPrefs.special_assistance}
              submitting={submitting}
              onBack={() => setStep('seat')}
              onConfirm={handleConfirm}
            />
          )}
          {step === 'confirmed' && booking && (
            <BookingConfirmation
              booking={booking}
              flight={flight}
              passenger={passenger}
              seat_preference={seatPrefs.seat_preference}
              meal_preference={seatPrefs.meal_preference}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}
