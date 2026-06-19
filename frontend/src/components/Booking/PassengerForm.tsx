import { useState } from 'react'
import type { BookingPassenger } from '@/services/bookings'

interface Props {
  value: BookingPassenger
  onChange: (p: BookingPassenger) => void
  onNext: () => void
  onCancel: () => void
}

const field: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, flex: 1,
}
const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.04em',
}
const input: React.CSSProperties = {
  fontSize: 'var(--text-sm)', padding: '7px 10px',
  border: '1px solid var(--border)', background: 'var(--bg-surface)',
  color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box',
}
const row: React.CSSProperties = { display: 'flex', gap: 12 }

export default function PassengerForm({ value, onChange, onNext, onCancel }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(key: keyof BookingPassenger, val: string) {
    onChange({ ...value, [key]: val })
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!value.first_name.trim()) e.first_name = 'Required'
    if (!value.last_name.trim()) e.last_name = 'Required'
    if (!value.dob.trim()) e.dob = 'Required'
    if (!value.passport_number.trim()) e.passport_number = 'Required'
    if (!value.email.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) e.email = 'Invalid email'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (validate()) onNext()
  }

  function Field({ id, label: lbl, placeholder, required }: { id: keyof BookingPassenger; label: string; placeholder?: string; required?: boolean }) {
    return (
      <div style={field}>
        <label style={label}>{lbl}{required && ' *'}</label>
        <input
          style={{ ...input, borderColor: errors[id] ? '#dc2626' : undefined }}
          value={value[id] ?? ''}
          placeholder={placeholder}
          onChange={(e) => set(id, e.target.value)}
        />
        {errors[id] && <span style={{ fontSize: 10, color: '#dc2626' }}>{errors[id]}</span>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={row}>
        <Field id="first_name" label="First Name" required />
        <Field id="last_name" label="Last Name" required />
      </div>
      <div style={row}>
        <Field id="dob" label="Date of Birth" placeholder="YYYY-MM-DD" required />
        <Field id="passport_number" label="Passport Number" required />
      </div>
      <div style={row}>
        <Field id="nationality" label="Nationality" placeholder="e.g. US" />
        <Field id="passport_expiry" label="Passport Expiry" placeholder="YYYY-MM-DD" />
      </div>
      <Field id="email" label="Contact Email" placeholder="you@company.com" required />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <button onClick={onCancel} style={btnSecondary}>Cancel</button>
        <button onClick={handleNext} style={btnPrimary}>Next →</button>
      </div>
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  padding: '7px 20px', fontSize: 'var(--text-sm)', fontWeight: 700,
  background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer',
}
const btnSecondary: React.CSSProperties = {
  padding: '7px 16px', fontSize: 'var(--text-sm)', fontWeight: 500,
  background: 'transparent', color: 'var(--text-muted)',
  border: '1px solid var(--border)', cursor: 'pointer',
}
