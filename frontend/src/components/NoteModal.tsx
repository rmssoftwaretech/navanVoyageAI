import { useEffect, useState } from 'react'

export interface Note {
  highlight: string
  note: string
  created_at: string
}

interface NoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (note: Note) => void
  existingNote?: Note
  highlightSuggestion?: string
}

export default function NoteModal({ isOpen, onClose, onSave, existingNote, highlightSuggestion }: NoteModalProps) {
  const [highlight, setHighlight] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (isOpen) {
      setHighlight(existingNote?.highlight ?? highlightSuggestion ?? '')
      setNote(existingNote?.note ?? '')
    }
  }, [isOpen, existingNote, highlightSuggestion])

  if (!isOpen) return null

  function handleSave() {
    if (!note.trim()) return
    onSave({ highlight: highlight.trim(), note: note.trim(), created_at: new Date().toISOString() })
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 2200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
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
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)', gap: 8 }}>
          <span style={{ fontSize: 16 }}>✏</span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
            {existingNote ? 'Edit Annotation' : 'Add Annotation'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--text-muted)', padding: '0 2px' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Highlighted text */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)' }}>Highlighted text</span>
              <span style={{
                fontSize: 10, padding: '1px 7px', border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)', color: 'var(--text-muted)', fontWeight: 500,
              }}>optional</span>
            </div>
            <textarea
              rows={3}
              value={highlight}
              onChange={(e) => setHighlight(e.target.value)}
              placeholder="Paste or type the text you want to annotate..."
              style={{
                width: '100%', resize: 'vertical', fontSize: 'var(--text-xs)',
                padding: '8px 10px', border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)', background: 'var(--bg-page)',
                color: 'var(--text-primary)', fontFamily: 'inherit',
                lineHeight: 1.6, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Note */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)' }}>Note</span>
              <span style={{
                fontSize: 10, padding: '1px 7px', border: '1px solid #ef4444',
                borderRadius: 'var(--r-sm)', color: '#ef4444', fontWeight: 600,
              }}>required</span>
            </div>
            <textarea
              autoFocus
              rows={5}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write your note..."
              style={{
                width: '100%', resize: 'vertical', fontSize: 'var(--text-xs)',
                padding: '8px 10px', border: `1px solid ${note ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 'var(--r-md)', background: 'var(--bg-page)',
                color: 'var(--text-primary)', fontFamily: 'inherit',
                lineHeight: 1.6, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
              onBlur={(e) => (e.target.style.borderColor = note ? 'var(--brand)' : 'var(--border)')}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg-page)' }}>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>⌘↵ to save</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '1px solid var(--border)', background: 'var(--bg-surface)',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>
            <button
              onClick={handleSave}
              disabled={!note.trim()}
              title="Save note"
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: 'none',
                background: note.trim() ? 'var(--brand)' : 'var(--border)',
                color: 'white', cursor: note.trim() ? 'pointer' : 'not-allowed',
                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              💾
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
