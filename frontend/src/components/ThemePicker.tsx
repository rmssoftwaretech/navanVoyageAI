import { useEffect, useRef, useState } from 'react'
import { BUILTIN_THEMES, applyTheme, loadSavedTheme, saveTheme } from '@/services/themes'

export default function ThemePicker() {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState(() => loadSavedTheme().id)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(id: string) {
    const theme = BUILTIN_THEMES.find((t) => t.id === id)!
    applyTheme(theme)
    saveTheme(id)
    setActiveId(id)
    setOpen(false)
  }

  const active = BUILTIN_THEMES.find((t) => t.id === activeId) ?? BUILTIN_THEMES[0]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          fontSize: 'var(--text-sm)',
          border: '1px solid rgba(255,255,255,0.3)',
          background: 'transparent',
          color: 'white',
          cursor: 'pointer',
          borderRadius: 'var(--r-md)',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: active.brand,
            border: '1.5px solid rgba(255,255,255,0.6)',
            flexShrink: 0,
          }}
        />
        🎨 Theme ▾
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            boxShadow: 'var(--shadow-lg)',
            minWidth: 200,
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          {BUILTIN_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => select(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 12px',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
                background: activeId === t.id ? 'var(--brand-light)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (activeId !== t.id) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = activeId === t.id ? 'var(--brand-light)' : 'transparent'
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: t.brand,
                  flexShrink: 0,
                  border: `2px solid ${activeId === t.id ? t.brand : 'transparent'}`,
                  outline: activeId === t.id ? `1.5px solid ${t.brand}` : 'none',
                  outlineOffset: 1,
                }}
              />
              <span style={{ flex: 1, fontWeight: activeId === t.id ? 600 : 400 }}>
                {t.name}
              </span>
              <span style={{ fontSize: 11, opacity: 0.65 }}>{t.dark ? '🌙' : '☀'}</span>
              {activeId === t.id && (
                <span style={{ color: 'var(--brand)', fontSize: 12, fontWeight: 700 }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
