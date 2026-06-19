interface SeatPrefs {
  seat_preference: string
  meal_preference: string
  special_assistance: string
}

interface Props {
  value: SeatPrefs
  onChange: (v: SeatPrefs) => void
  onBack: () => void
  onNext: () => void
}

const SEATS = [
  { id: 'window', label: 'Window' },
  { id: 'aisle', label: 'Aisle' },
  { id: 'no_preference', label: 'No preference' },
]

const MEALS = [
  { id: 'standard', label: 'Standard' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'halal', label: 'Halal' },
  { id: 'kosher', label: 'Kosher' },
]

export default function SeatPreferenceStep({ value, onChange, onBack, onNext }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div style={{ display: 'flex', gap: 40 }}>
        {/* Seat */}
        <div style={{ flex: 1 }}>
          <p style={groupLabel}>Seat Location</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SEATS.map((s) => (
              <label key={s.id} style={radioRow}>
                <input
                  type="radio"
                  name="seat"
                  value={s.id}
                  checked={value.seat_preference === s.id}
                  onChange={() => onChange({ ...value, seat_preference: s.id })}
                  style={{ accentColor: 'var(--brand)' }}
                />
                <span style={radioLabel}>{s.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Meal */}
        <div style={{ flex: 1 }}>
          <p style={groupLabel}>Meal Preference</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MEALS.map((m) => (
              <label key={m.id} style={radioRow}>
                <input
                  type="radio"
                  name="meal"
                  value={m.id}
                  checked={value.meal_preference === m.id}
                  onChange={() => onChange({ ...value, meal_preference: m.id })}
                  style={{ accentColor: 'var(--brand)' }}
                />
                <span style={radioLabel}>{m.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Special assistance */}
      <div>
        <p style={groupLabel}>Special Assistance <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></p>
        <textarea
          value={value.special_assistance}
          onChange={(e) => onChange({ ...value, special_assistance: e.target.value })}
          placeholder="e.g. wheelchair assistance, extra legroom required…"
          rows={2}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '7px 10px', fontSize: 'var(--text-sm)',
            border: '1px solid var(--border)', background: 'var(--bg-surface)',
            color: 'var(--text-primary)', outline: 'none', resize: 'vertical',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <button onClick={onBack} style={btnSecondary}>← Back</button>
        <button onClick={onNext} style={btnPrimary}>Review →</button>
      </div>
    </div>
  )
}

const groupLabel: React.CSSProperties = {
  margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.04em',
}
const radioRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }
const radioLabel: React.CSSProperties = { fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }
const btnPrimary: React.CSSProperties = {
  padding: '7px 20px', fontSize: 'var(--text-sm)', fontWeight: 700,
  background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer',
}
const btnSecondary: React.CSSProperties = {
  padding: '7px 16px', fontSize: 'var(--text-sm)', fontWeight: 500,
  background: 'transparent', color: 'var(--text-muted)',
  border: '1px solid var(--border)', cursor: 'pointer',
}
