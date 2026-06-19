import { useState } from 'react'

interface TravelSearchFormProps {
  onSearch: (query: string) => void
  disabled?: boolean
}

const AIRPORTS = [
  { code: 'ATL', city: 'Atlanta', name: 'Hartsfield-Jackson' },
  { code: 'BOS', city: 'Boston', name: 'Logan International' },
  { code: 'CDG', city: 'Paris', name: 'Charles de Gaulle' },
  { code: 'DFW', city: 'Dallas', name: 'Dallas Fort Worth' },
  { code: 'DXB', city: 'Dubai', name: 'Dubai International' },
  { code: 'JFK', city: 'New York', name: 'JFK International' },
  { code: 'LAX', city: 'Los Angeles', name: 'Los Angeles Intl' },
  { code: 'LHR', city: 'London', name: 'Heathrow' },
  { code: 'NRT', city: 'Tokyo', name: 'Narita International' },
  { code: 'ORD', city: 'Chicago', name: "O'Hare International" },
  { code: 'SFO', city: 'San Francisco', name: 'SFO International' },
  { code: 'SIN', city: 'Singapore', name: 'Changi Airport' },
]

const HOTEL_CAR_CITIES = AIRPORTS.filter((a) =>
  ['SFO', 'LAX', 'JFK', 'ORD', 'DFW', 'LHR', 'CDG', 'NRT', 'SIN', 'DXB'].includes(a.code)
)

const CABINS = ['Economy', 'Premium Economy', 'Business', 'First']
const ROOM_TYPES = ['Any Room Type', 'Standard Room', 'Double Bed', 'Executive Suite']
const CAR_CLASSES = ['Any Class', 'Economy', 'Compact', 'Mid-size', 'Full-size', 'SUV', 'Luxury', 'Limousine']

const FIELD: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 'var(--text-sm)',
  fontFamily: 'var(--font-sans)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
  appearance: 'none' as const,
}

const LABEL: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 4,
  display: 'block',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}

const SECTION_HEADER: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  background: 'var(--bg-base)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
  cursor: 'pointer',
  userSelect: 'none' as const,
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(base: string, n: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function AirportSelect({
  value, onChange, exclude, style,
}: { value: string; onChange: (v: string) => void; exclude?: string; style?: React.CSSProperties }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...FIELD, ...style }}
      onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
    >
      <option value="">Select airport…</option>
      {AIRPORTS.filter((a) => a.code !== exclude).map((a) => (
        <option key={a.code} value={a.code}>
          {a.code} — {a.city} ({a.name})
        </option>
      ))}
    </select>
  )
}

function CitySelect({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={FIELD}
      onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
    >
      <option value="">Select city…</option>
      {HOTEL_CAR_CITIES.map((a) => (
        <option key={a.code} value={a.code}>
          {a.code} — {a.city}
        </option>
      ))}
    </select>
  )
}

export default function TravelSearchForm({ onSearch, disabled }: TravelSearchFormProps) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [depart, setDepart] = useState(addDays(today(), 7))
  const [returnDate, setReturnDate] = useState(addDays(today(), 14))
  const [oneWay, setOneWay] = useState(false)
  const [travelers, setTravelers] = useState(1)
  const [cabin, setCabin] = useState('Economy')
  const [error, setError] = useState('')

  const [searchHotels, setSearchHotels] = useState(false)
  const [hotelCity, setHotelCity] = useState('')
  const [hotelCheckIn, setHotelCheckIn] = useState('')
  const [hotelCheckOut, setHotelCheckOut] = useState('')
  const [hotelRoom, setHotelRoom] = useState('Any Room Type')

  const [searchCars, setSearchCars] = useState(false)
  const [carCity, setCarCity] = useState('')
  const [carPickup, setCarPickup] = useState('')
  const [carReturn, setCarReturn] = useState('')
  const [carClass, setCarClass] = useState('Any Class')

  function onToggleHotels(checked: boolean) {
    setSearchHotels(checked)
    if (checked) {
      setHotelCity(to || '')
      setHotelCheckIn(depart)
      setHotelCheckOut(oneWay ? addDays(depart, 3) : returnDate)
    }
  }

  function onToggleCars(checked: boolean) {
    setSearchCars(checked)
    if (checked) {
      setCarCity(to || '')
      setCarPickup(depart)
      setCarReturn(oneWay ? addDays(depart, 3) : returnDate)
    }
  }

  function handleDepartChange(val: string) {
    setDepart(val)
    if (!oneWay && val > returnDate) {
      const newReturn = addDays(val, 7)
      setReturnDate(newReturn)
      if (searchHotels && hotelCheckIn === depart) { setHotelCheckIn(val); setHotelCheckOut(newReturn) }
      if (searchCars && carPickup === depart) { setCarPickup(val); setCarReturn(newReturn) }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!from || !to) { setError('Please select both origin and destination airports.'); return }
    if (!oneWay && returnDate < depart) { setError('Return date must be on or after departure.'); return }
    if (searchHotels && !hotelCity) { setError('Please select a city for hotel search.'); return }
    if (searchCars && !carCity) { setError('Please select a city for car rental.'); return }
    setError('')

    const travelerStr = travelers === 1 ? '1 traveler' : `${travelers} travelers`
    const tripType = oneWay ? 'one-way' : `round trip, returning ${returnDate}`
    const parts: string[] = [
      `Search flights from ${from} to ${to}, departing ${depart}, ${tripType}, ${travelerStr}, ${cabin} class.`,
    ]

    if (searchHotels && hotelCity && hotelCheckIn) {
      const roomStr = hotelRoom !== 'Any Room Type' ? `, room type ${hotelRoom}` : ''
      parts.push(`Also search hotels in ${hotelCity} checking in ${hotelCheckIn} and checking out ${hotelCheckOut}${roomStr}.`)
    }

    if (searchCars && carCity && carPickup) {
      const classStr = carClass !== 'Any Class' ? `${carClass} ` : ''
      parts.push(`Also search for a ${classStr}car rental in ${carCity} from ${carPickup} to ${carReturn}.`)
    }

    onSearch(parts.join(' '))
  }

  const canSubmit = !!from && !!to && !disabled

  return (
    <div style={{
      width: '100%', maxWidth: 560,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      padding: '24px 28px 20px',
    }}>
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>✈</div>
        <p style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Where are you flying?
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
          Fill in your trip details and I'll search flights, check policy, and assist with booking.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* From / To */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LABEL}>From</label>
            <AirportSelect value={from} onChange={setFrom} exclude={to} />
          </div>
          <div>
            <label style={LABEL}>To</label>
            <AirportSelect value={to} onChange={(v) => { setTo(v); if (searchHotels) setHotelCity(v); if (searchCars) setCarCity(v) }} exclude={from} />
          </div>
        </div>

        {/* Depart / Return */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={LABEL}>Depart</label>
            <input type="date" value={depart} min={today()} onChange={(e) => handleDepartChange(e.target.value)}
              style={FIELD}
              onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={LABEL}>Return</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={oneWay} onChange={(e) => setOneWay(e.target.checked)}
                  style={{ accentColor: 'var(--brand)', width: 12, height: 12 }} />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>One-way</span>
              </label>
            </div>
            <input type="date" value={returnDate} min={depart} disabled={oneWay}
              onChange={(e) => setReturnDate(e.target.value)}
              style={{ ...FIELD, opacity: oneWay ? 0.4 : 1, cursor: oneWay ? 'not-allowed' : 'text' }}
              onFocus={(e) => !oneWay && (e.target.style.borderColor = 'var(--brand)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>

        {/* Travelers / Cabin */}
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12 }}>
          <div>
            <label style={LABEL}>Travelers</label>
            <input type="number" min={1} max={9} value={travelers}
              onChange={(e) => setTravelers(Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))}
              style={{ ...FIELD, textAlign: 'center' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
          <div>
            <label style={LABEL}>Cabin Class</label>
            <select value={cabin} onChange={(e) => setCabin(e.target.value)} style={{ ...FIELD, cursor: 'pointer' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            >
              {CABINS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Hotel section */}
        <div>
          <div style={SECTION_HEADER} onClick={() => onToggleHotels(!searchHotels)}>
            <input type="checkbox" checked={searchHotels} onChange={(e) => onToggleHotels(e.target.checked)}
              style={{ accentColor: 'var(--brand)', width: 14, height: 14, cursor: 'pointer' }}
              onClick={(e) => e.stopPropagation()}
            />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>🏨 Search Hotels</span>
          </div>
          {searchHotels && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0 0', animation: 'fadeIn 0.15s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LABEL}>City</label>
                  <CitySelect value={hotelCity} onChange={setHotelCity} />
                </div>
                <div>
                  <label style={LABEL}>Check-in</label>
                  <input type="date" value={hotelCheckIn} min={today()}
                    onChange={(e) => setHotelCheckIn(e.target.value)}
                    style={FIELD}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
                <div>
                  <label style={LABEL}>Check-out</label>
                  <input type="date" value={hotelCheckOut} min={hotelCheckIn || today()}
                    onChange={(e) => setHotelCheckOut(e.target.value)}
                    style={FIELD}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              </div>
              <div>
                <label style={LABEL}>Room Type</label>
                <select value={hotelRoom} onChange={(e) => setHotelRoom(e.target.value)}
                  style={{ ...FIELD, cursor: 'pointer' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                >
                  {ROOM_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Car rental section */}
        <div>
          <div style={SECTION_HEADER} onClick={() => onToggleCars(!searchCars)}>
            <input type="checkbox" checked={searchCars} onChange={(e) => onToggleCars(e.target.checked)}
              style={{ accentColor: 'var(--brand)', width: 14, height: 14, cursor: 'pointer' }}
              onClick={(e) => e.stopPropagation()}
            />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>🚗 Rent a Car</span>
          </div>
          {searchCars && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0 0', animation: 'fadeIn 0.15s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LABEL}>City</label>
                  <CitySelect value={carCity} onChange={setCarCity} />
                </div>
                <div>
                  <label style={LABEL}>Pick-up</label>
                  <input type="date" value={carPickup} min={today()}
                    onChange={(e) => setCarPickup(e.target.value)}
                    style={FIELD}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
                <div>
                  <label style={LABEL}>Return</label>
                  <input type="date" value={carReturn} min={carPickup || today()}
                    onChange={(e) => setCarReturn(e.target.value)}
                    style={FIELD}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              </div>
              <div>
                <label style={LABEL}>Vehicle Class</label>
                <select value={carClass} onChange={(e) => setCarClass(e.target.value)}
                  style={{ ...FIELD, cursor: 'pointer' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                >
                  {CAR_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', margin: 0 }}>{error}</p>
        )}

        <button type="submit" disabled={!canSubmit} style={{
          marginTop: 4, padding: '10px 0',
          fontSize: 'var(--text-sm)', fontWeight: 700,
          color: canSubmit ? '#fff' : 'var(--text-dim)',
          background: canSubmit ? 'var(--brand)' : 'var(--border)',
          border: 'none', borderRadius: 'var(--r-md)',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          transition: 'background 0.15s', width: '100%', letterSpacing: '0.02em',
        }}>
          Search →
        </button>
      </form>
    </div>
  )
}
