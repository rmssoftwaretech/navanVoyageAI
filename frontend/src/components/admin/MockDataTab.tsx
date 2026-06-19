import { useState, useEffect } from 'react'
import {
  getMockFlights, getMockHotels, getMockCars, getEmployeeDocuments,
  type FlightResult, type HotelResult, type CarResult,
} from '@/services/admin'

// ── Shared helpers ────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10,
  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em',
  borderBottom: '2px solid var(--border)', background: 'var(--bg-page)',
  whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1,
}

const TD: React.CSSProperties = {
  padding: '5px 10px', borderBottom: '1px solid var(--border-light)',
}

function USD(n: number) { return '$' + n.toFixed(2) }

function fmtDuration(mins: number) {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function SearchField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      {children}
    </label>
  )
}

const INPUT: React.CSSProperties = {
  fontSize: 'var(--text-xs)', padding: '4px 8px',
  border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  background: 'var(--bg-page)', color: 'var(--text-primary)', outline: 'none', width: 90,
}

const SELECT: React.CSSProperties = { ...INPUT, width: 120 }

function SearchBtn({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ fontSize: 'var(--text-xs)', fontWeight: 600, padding: '4px 14px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: 1 }}>
      {loading ? '…' : 'Search'}
    </button>
  )
}

function ResultCount({ n, suffix }: { n: number; suffix?: string }) {
  if (n === 0) return null
  return <span style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{n} results{suffix ? ` · ${suffix}` : ''}</span>
}

function Empty() {
  return <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic', padding: 4 }}>No results — click Search.</p>
}

// ── Flights ───────────────────────────────────────────────────────────────────

const CABIN_COLORS: Record<string, { bg: string; text: string }> = {
  'ECONOMY':      { bg: '#dcfce7', text: '#15803d' },
  'ECONOMY PLUS': { bg: '#d1fae5', text: '#065f46' },
  'BUSINESS':     { bg: '#dbeafe', text: '#1d4ed8' },
  'FIRST':        { bg: '#fef3c7', text: '#b45309' },
}

function CabinBadge({ cabin }: { cabin: string }) {
  const key = cabin.toUpperCase()
  const c = CABIN_COLORS[key] ?? { bg: 'var(--border)', text: 'var(--text-muted)' }
  return (
    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 'var(--r-full)', background: c.bg, color: c.text, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {cabin}
    </span>
  )
}

function StopBadge({ stops }: { stops: number }) {
  const color = stops === 0 ? 'var(--success)' : stops === 1 ? 'var(--warning)' : 'var(--danger)'
  const bg = stops === 0 ? 'var(--success-bg)' : stops === 1 ? 'var(--warning-bg)' : 'var(--danger-bg)'
  return <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 'var(--r-full)', background: bg, color, fontWeight: 600 }}>{stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`}</span>
}

const POPULAR_ROUTES = [
  'SFO → NRT', 'SFO → LHR', 'JFK → CDG', 'LAX → SIN', 'ORD → DXB',
  'DFW → LHR', 'MIA → MAD', 'BOS → NRT', 'ATL → FRA', 'SEA → ICN',
]

function FlightsGrid() {
  const [origin, setOrigin] = useState('SFO')
  const [destination, setDestination] = useState('NRT')
  const [date, setDate] = useState('2026-07-18')
  const [cabin, setCabin] = useState('All')
  const [rows, setRows] = useState<FlightResult[]>([])
  const [loading, setLoading] = useState(false)

  async function search() {
    setLoading(true)
    try { setRows(await getMockFlights({ origin, destination, date, cabin })) }
    catch { /* ignore */ } finally { setLoading(false) }
  }

  function applyRoute(route: string) {
    const [o, d] = route.split(' → ')
    setOrigin(o.trim())
    setDestination(d.trim())
  }

  useEffect(() => { search() }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Quick route chips */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {POPULAR_ROUTES.map((r) => (
          <button key={r} onClick={() => applyRoute(r)}
            style={{ fontSize: 9, padding: '2px 8px', border: '1px solid var(--border)', borderRadius: 'var(--r-full)', background: 'var(--bg-page)', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {r}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', padding: '10px 14px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
        <SearchField label="Origin"><input style={INPUT} value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} maxLength={3} /></SearchField>
        <span style={{ marginBottom: 4, color: 'var(--text-dim)', fontSize: 14 }}>→</span>
        <SearchField label="Destination"><input style={INPUT} value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} maxLength={3} /></SearchField>
        <SearchField label="Date"><input style={{ ...INPUT, width: 120 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></SearchField>
        <SearchField label="Cabin">
          <select style={SELECT} value={cabin} onChange={(e) => setCabin(e.target.value)}>
            {['All', 'Economy', 'Economy Plus', 'Business', 'First'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </SearchField>
        <SearchBtn loading={loading} onClick={search} />
        <ResultCount n={rows.length} />
      </div>

      {rows.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxHeight: 380 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
              <thead>
                <tr>{['#', 'Carrier', 'Flight', 'Route', 'Cabin', 'Price', 'Duration', 'Stops', 'Seats'].map((h) => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((f, i) => (
                  <tr key={`${f.id}-${f.cabin_class}-${i}`} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-page)' }}>
                    <td style={{ ...TD, color: 'var(--text-dim)' }}>{i + 1}</td>
                    <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{f.carrier}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--brand)' }}>{f.flight_number}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600 }}>{f.origin}</span>
                      <span style={{ margin: '0 4px', color: 'var(--text-dim)' }}>→</span>
                      <span style={{ fontWeight: 600 }}>{f.destination}</span>
                    </td>
                    <td style={TD}><CabinBadge cabin={f.cabin_class} /></td>
                    <td style={{ ...TD, fontWeight: 700, color: 'var(--brand)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{USD(f.price_usd)}</td>
                    <td style={{ ...TD, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtDuration(f.duration_minutes)}</td>
                    <td style={TD}><StopBadge stops={f.stops} /></td>
                    <td style={{ ...TD, color: f.seats_available <= 3 ? 'var(--danger)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{f.seats_available}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!loading && rows.length === 0 && <Empty />}
    </div>
  )
}

// ── Hotels ────────────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: string }) {
  const n = parseInt(rating[0]) || 0
  return <span style={{ color: '#D97706', fontSize: 12 }}>{'★'.repeat(n)}<span style={{ opacity: 0.2 }}>{'★'.repeat(5 - n)}</span></span>
}

const ROOM_COLORS: Record<string, { bg: string; text: string }> = {
  'Standard Room':   { bg: '#f3f4f6', text: '#4b5563' },
  'Double Bed':      { bg: '#ede9fe', text: '#6d28d9' },
  'Executive Suite': { bg: '#fef3c7', text: '#b45309' },
}

function RoomBadge({ room }: { room: string }) {
  const c = ROOM_COLORS[room] ?? { bg: 'var(--border)', text: 'var(--text-muted)' }
  return <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 'var(--r-full)', background: c.bg, color: c.text, fontWeight: 700, whiteSpace: 'nowrap' }}>{room}</span>
}

const POPULAR_CITIES_HOTEL = ['NRT', 'LHR', 'CDG', 'SIN', 'DXB', 'SFO', 'JFK', 'LAX', 'ORD', 'MIA']

function HotelsGrid() {
  const [city, setCity] = useState('NRT')
  const [checkIn, setCheckIn] = useState('2026-07-18')
  const [checkOut, setCheckOut] = useState('2026-07-22')
  const [rows, setRows] = useState<HotelResult[]>([])
  const [loading, setLoading] = useState(false)

  async function search() {
    setLoading(true)
    try { setRows(await getMockHotels({ city, check_in: checkIn, check_out: checkOut })) }
    catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { search() }, [])

  const nights = checkIn && checkOut
    ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* City quick-select chips */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {POPULAR_CITIES_HOTEL.map((c) => (
          <button key={c} onClick={() => setCity(c)}
            style={{ fontSize: 9, padding: '2px 8px', border: '1px solid var(--border)', borderRadius: 'var(--r-full)', background: city === c ? 'var(--brand)' : 'var(--bg-page)', color: city === c ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', padding: '10px 14px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
        <SearchField label="City (IATA)"><input style={INPUT} value={city} onChange={(e) => setCity(e.target.value.toUpperCase())} maxLength={3} /></SearchField>
        <SearchField label="Check-in"><input style={{ ...INPUT, width: 120 }} type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></SearchField>
        <SearchField label="Check-out"><input style={{ ...INPUT, width: 120 }} type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></SearchField>
        <SearchBtn loading={loading} onClick={search} />
        <ResultCount n={rows.length} suffix={`${nights} night${nights > 1 ? 's' : ''}`} />
      </div>

      {rows.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxHeight: 380 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
              <thead>
                <tr>{['#', 'Hotel', 'Room Type', 'City', 'Location', 'Rating', 'Nightly', 'Total', 'Status'].map((h) => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((h, i) => (
                  <tr key={`${h.id}-${h.room_type}-${i}`} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-page)' }}>
                    <td style={{ ...TD, color: 'var(--text-dim)' }}>{i + 1}</td>
                    <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{h.name}</td>
                    <td style={TD}><RoomBadge room={h.room_type ?? 'Standard Room'} /></td>
                    <td style={{ ...TD, color: 'var(--brand)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{h.city}</td>
                    <td style={{ ...TD, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{h.location ?? h.city}</td>
                    <td style={TD}><StarRating rating={h.rating} /></td>
                    <td style={{ ...TD, fontWeight: 700, color: 'var(--brand)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{USD(h.nightly_rate_usd)}</td>
                    <td style={{ ...TD, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{USD(h.total_usd ?? h.nightly_rate_usd * nights)}</td>
                    <td style={TD}>
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 'var(--r-full)', background: 'var(--success-bg)', color: 'var(--success)', fontWeight: 600 }}>Available</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!loading && rows.length === 0 && <Empty />}
    </div>
  )
}

// ── Cars ──────────────────────────────────────────────────────────────────────

const CLASS_COLORS: Record<string, string> = {
  Economy:    '#6b7280',
  Compact:    '#0e7490',
  'Mid-size': '#15803d',
  'Full-size':'#1d4ed8',
  SUV:        '#7c3aed',
  Luxury:     '#be185d',
  Limousine:  '#92400e',
}

const POPULAR_CITIES_CAR = ['SFO', 'LAX', 'JFK', 'ORD', 'DFW', 'LHR', 'CDG', 'NRT', 'SIN', 'DXB']

function CarsGrid() {
  const [city, setCity] = useState('SFO')
  const [pickupDate, setPickupDate] = useState('2026-07-18')
  const [returnDate, setReturnDate] = useState('2026-07-22')
  const [rows, setRows] = useState<CarResult[]>([])
  const [loading, setLoading] = useState(false)

  async function search() {
    setLoading(true)
    try { setRows(await getMockCars({ city, pickup_date: pickupDate, return_date: returnDate })) }
    catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { search() }, [])

  const days = pickupDate && returnDate
    ? Math.max(1, Math.round((new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / 86400000))
    : 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* City quick-select chips */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {POPULAR_CITIES_CAR.map((c) => (
          <button key={c} onClick={() => setCity(c)}
            style={{ fontSize: 9, padding: '2px 8px', border: '1px solid var(--border)', borderRadius: 'var(--r-full)', background: city === c ? 'var(--brand)' : 'var(--bg-page)', color: city === c ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', padding: '10px 14px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
        <SearchField label="City (IATA)"><input style={INPUT} value={city} onChange={(e) => setCity(e.target.value.toUpperCase())} maxLength={3} /></SearchField>
        <SearchField label="Pickup"><input style={{ ...INPUT, width: 120 }} type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} /></SearchField>
        <SearchField label="Return"><input style={{ ...INPUT, width: 120 }} type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} /></SearchField>
        <SearchBtn loading={loading} onClick={search} />
        <ResultCount n={rows.length} suffix={`${days} day${days > 1 ? 's' : ''}`} />
      </div>

      {rows.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxHeight: 380 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
              <thead>
                <tr>{['#', 'Agency', 'Class', 'City', 'Pickup Location', 'Pickup', 'Return', 'Daily Rate', 'Total', 'Status'].map((h) => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((c, i) => {
                  const clr = CLASS_COLORS[c.vehicle_class] ?? 'var(--text-muted)'
                  return (
                    <tr key={`${c.id}-${i}`} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-page)' }}>
                      <td style={{ ...TD, color: 'var(--text-dim)' }}>{i + 1}</td>
                      <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{c.agency}</td>
                      <td style={TD}>
                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 'var(--r-full)', background: `${clr}18`, color: clr, fontWeight: 700 }}>{c.vehicle_class}</span>
                      </td>
                      <td style={{ ...TD, color: 'var(--brand)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{c.city}</td>
                      <td style={{ ...TD, color: 'var(--text-secondary)', whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.location ?? `${c.city} Airport`}</td>
                      <td style={{ ...TD, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{c.pickup_date}</td>
                      <td style={{ ...TD, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{c.return_date}</td>
                      <td style={{ ...TD, fontWeight: 700, color: 'var(--brand)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{USD(c.daily_rate_usd)}</td>
                      <td style={{ ...TD, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{USD(c.total_usd ?? c.daily_rate_usd * days)}</td>
                      <td style={TD}>
                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 'var(--r-full)', background: 'var(--success-bg)', color: 'var(--success)', fontWeight: 600 }}>Available</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!loading && rows.length === 0 && <Empty />}
    </div>
  )
}

// ── Employees ─────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  company_executive:    '#be185d',
  executive:            '#b45309',
  sales_executive:      '#15803d',
  conference_traveller: '#0e7490',
  international:        '#6d28d9',
  all:                  '#6b7280',
}

function EmployeesGrid() {
  const [docs, setDocs] = useState<Record<string, unknown>[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try { setDocs((await getEmployeeDocuments()) as Record<string, unknown>[]) }
    catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const employees = docs.filter((d) => d.employee_id)
  const filtered = filter
    ? employees.filter((d) => JSON.stringify(d).toLowerCase().includes(filter.toLowerCase()))
    : employees

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text" value={filter} onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, dept, tier, location…"
          style={{ flex: 1, fontSize: 'var(--text-xs)', padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg-page)', color: 'var(--text-primary)', outline: 'none' }}
        />
        <span style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{filtered.length} / {employees.length}</span>
        <button onClick={load} style={{ fontSize: 'var(--text-xs)', padding: '4px 9px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--text-muted)' }}>↺</button>
      </div>

      {loading && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Loading…</p>}

      {!loading && employees.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 28, marginBottom: 6 }}>👥</p>
          <p style={{ fontSize: 'var(--text-xs)', fontStyle: 'italic' }}>
            No employee data. Upload <strong>data/employees.json</strong> via the Employee Data tab.
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxHeight: 440, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
              <thead>
                <tr>{['EMP ID', 'Name', 'Department', 'Title', 'Travel Tier', 'Location', 'Pref. Airline', 'Pref. Hotel', 'Active'].map((h) => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((doc, i) => {
                  const tier = String(doc.travel_tier ?? '')
                  const clr = TIER_COLORS[tier] ?? '#6b7280'
                  return (
                    <tr key={String(doc.employee_id ?? i)} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-page)' }}>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{String(doc.employee_id ?? '—')}</td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: `${clr}20`, border: `1.5px solid ${clr}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: clr }}>
                            {String(doc.first_name ?? '?')[0]}{String(doc.last_name ?? '?')[0]}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{String(doc.full_name ?? '')}</span>
                        </div>
                      </td>
                      <td style={{ ...TD, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{String(doc.department ?? '—')}</td>
                      <td style={{ ...TD, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{String(doc.job_title ?? '—')}</td>
                      <td style={TD}>
                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 'var(--r-full)', background: `${clr}18`, color: clr, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {tier.replace(/_/g, ' ') || '—'}
                        </span>
                      </td>
                      <td style={{ ...TD, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{String(doc.office_location ?? '—')}</td>
                      <td style={{ ...TD, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{String(doc.preferred_airline ?? '—')}</td>
                      <td style={{ ...TD, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{String(doc.preferred_hotel ?? '—')}</td>
                      <td style={TD}>
                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 'var(--r-full)', background: doc.active ? 'var(--success-bg)' : 'var(--border)', color: doc.active ? 'var(--success)' : 'var(--text-dim)', fontWeight: 600 }}>
                          {doc.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const SUB_TABS = [
  { id: 'flights',   label: '✈ Flights' },
  { id: 'hotels',    label: '🏨 Hotels' },
  { id: 'cars',      label: '🚗 Car Rentals' },
  { id: 'employees', label: '👥 Employees' },
] as const

type SubTab = typeof SUB_TABS[number]['id']

export default function MockDataTab() {
  const [active, setActive] = useState<SubTab>('flights')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Mock Travel Data</p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Live data from MCP sidecars and employee RAG store. Flights and hotels are deterministic per route/city and date.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border)' }}>
        {SUB_TABS.map((t) => (
          <button key={t.id} onClick={() => setActive(t.id)}
            style={{
              fontSize: 'var(--text-xs)', fontWeight: active === t.id ? 700 : 500,
              padding: '6px 14px', color: active === t.id ? 'var(--brand)' : 'var(--text-muted)',
              background: 'transparent', border: 'none',
              borderBottom: active === t.id ? '2px solid var(--brand)' : '2px solid transparent',
              marginBottom: -2, cursor: 'pointer',
            }}>{t.label}</button>
        ))}
      </div>

      {active === 'flights'   && <FlightsGrid />}
      {active === 'hotels'    && <HotelsGrid />}
      {active === 'cars'      && <CarsGrid />}
      {active === 'employees' && <EmployeesGrid />}
    </div>
  )
}
