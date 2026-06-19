import { useEffect, useState } from 'react'

interface ContextModalProps {
  isOpen: boolean
  value: string
  onApply: (v: string) => void
  onClose: () => void
}

export default function ContextModal({ isOpen, value, onApply, onClose }: ContextModalProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (isOpen) setDraft(value)
  }, [isOpen, value])

  if (!isOpen) return null

  function handleApply() {
    onApply(draft.trim())
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '10px 16px',
          background: 'var(--brand)',
          gap: 8,
        }}>
          <span style={{ fontSize: 15 }}>🔌</span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'white', flex: 1 }}>
            System Context
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', fontSize: 14, cursor: 'pointer', padding: '0 2px' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
            Prepended to the system prompt for every message in this session.
            Use it to set role, focus area, or travel constraints.
          </p>
          <textarea
            autoFocus
            rows={7}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. I'm planning a team offsite to Tokyo in September. Only consider Business class options. Budget cap is $3,000 per person."
            style={{
              width: '100%',
              resize: 'vertical',
              fontSize: 'var(--text-xs)',
              padding: '8px 10px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              background: 'var(--bg-page)',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-page)',
        }}>
          <button
            onClick={() => setDraft('')}
            style={{
              fontSize: 'var(--text-xs)', padding: '5px 12px',
              border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
              background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            Clear
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                fontSize: 'var(--text-xs)', padding: '5px 12px',
                border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              style={{
                fontSize: 'var(--text-xs)', padding: '5px 14px',
                border: 'none', borderRadius: 'var(--r-md)',
                background: 'var(--brand)', color: 'white',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
