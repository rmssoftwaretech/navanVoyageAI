import { useState } from 'react'
import FlightCard from './FlightCard'
import type { FlightResult } from '@/types/nva'

interface FlightResultsPanelProps {
  results: FlightResult[]
  onSelect: (flight: FlightResult) => void
  onModifySearch?: () => void
}

type SortKey = 'price' | 'duration'

export default function FlightResultsPanel({ results, onSelect, onModifySearch }: FlightResultsPanelProps) {
  const [sort, setSort] = useState<SortKey>('price')

  const sorted = [...results].sort((a, b) =>
    sort === 'price' ? a.price_usd - b.price_usd : a.duration_minutes - b.duration_minutes
  )

  if (results.length === 0) {
    return (
      <div style={{
        border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
        padding: '20px 16px', background: 'var(--bg-surface)', textAlign: 'center', marginBottom: 12,
      }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: '0 0 12px' }}>
          No flights found matching your criteria.
        </p>
        {onModifySearch && (
          <button onClick={onModifySearch} style={{
            padding: '6px 16px', fontSize: 'var(--text-xs)', fontWeight: 600,
            background: 'transparent', color: 'var(--brand)',
            border: '1px solid var(--brand)', borderRadius: 'var(--r-md)', cursor: 'pointer',
          }}>Modify Search</button>
        )}
      </div>
    )
  }

  const display = sorted.slice(0, 6)

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{
          fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          ✈ {results.length} Flight{results.length !== 1 ? 's' : ''} Found
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Sort:</span>
          {(['price', 'duration'] as SortKey[]).map((key) => (
            <button key={key} onClick={() => setSort(key)} style={{
              padding: '2px 10px', fontSize: 'var(--text-xs)', fontWeight: 600,
              background: sort === key ? 'var(--brand)' : 'transparent',
              color: sort === key ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${sort === key ? 'var(--brand)' : 'var(--border)'}`,
              borderRadius: 'var(--r-full)', cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {key === 'price' ? 'Price' : 'Duration'}
            </button>
          ))}
        </div>
      </div>

      {/* 2-column grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10,
      }}>
        {display.map((flight, i) => (
          <FlightCard key={flight.id ?? i} flight={flight} onSelect={onSelect} />
        ))}
      </div>

      {results.length > 6 && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
          Showing top 6 of {results.length} results
        </p>
      )}
    </div>
  )
}
