import type { FlightResult } from '@/types/nva'

interface FlightCardProps {
  flight: FlightResult
  onSelect: (flight: FlightResult) => void
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m > 0 ? `${m}m` : ''}`.trim()
}

export default function FlightCard({ flight, onSelect }: FlightCardProps) {
  const withinPolicy = flight.within_policy !== false
  const overPolicy = flight.within_policy === false && (flight.policy_limit_usd ?? 0) > 0

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
      background: 'var(--bg-surface)',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Row 1: airline + flight number + cabin */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>✈</span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {flight.carrier}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {flight.flight_number}
          </span>
        </div>
        <span style={{
          fontSize: 'var(--text-xs)', fontWeight: 600,
          padding: '2px 8px',
          background: 'var(--bg-base)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-full)',
          color: 'var(--text-secondary)',
        }}>
          {flight.cabin_class}
        </span>
      </div>

      {/* Row 2: route + date + duration */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {flight.origin}
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>→</span>
          <span style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {flight.destination}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            {flight.depart_date}
          </span>
        </div>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {formatDuration(flight.duration_minutes)}
        </span>
      </div>

      {/* Row 3: stops + policy badge + price + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
          </span>
          {flight.within_policy !== undefined && (
            <span style={{
              fontSize: 'var(--text-xs)', fontWeight: 600,
              padding: '1px 7px',
              borderRadius: 'var(--r-full)',
              background: withinPolicy ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.12)',
              color: withinPolicy ? '#059669' : '#d97706',
              border: `1px solid ${withinPolicy ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.3)'}`,
            }}>
              {withinPolicy ? '✓ Within policy' : overPolicy ? '⚠ Over policy limit' : ''}
            </span>
          )}
          {(flight.seats_available ?? 0) > 0 && (flight.seats_available ?? 0) <= 4 && (
            <span style={{ fontSize: 'var(--text-xs)', color: '#dc2626', fontWeight: 500 }}>
              {flight.seats_available} seats left
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
            ${flight.price_usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 400, color: 'var(--text-muted)' }}> / pax</span>
          </span>
          <button
            onClick={() => onSelect(flight)}
            style={{
              padding: '4px 12px',
              fontSize: 'var(--text-xs)', fontWeight: 700,
              background: 'var(--brand)', color: '#fff',
              border: 'none', borderRadius: 'var(--r-md)',
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Select →
          </button>
        </div>
      </div>
    </div>
  )
}
