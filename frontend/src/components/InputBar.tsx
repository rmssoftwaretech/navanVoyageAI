import { useEffect, useRef, useState } from 'react'

const THINK_MODES = [
  { id: 'none', label: '💡 Think', suffix: '' },
  { id: 'shorter', label: 'Shorter', suffix: ' [respond briefly]' },
  { id: 'longer', label: 'Longer', suffix: ' [respond in detail]' },
  { id: 'deeper', label: 'Deeper', suffix: ' [think step by step, then answer]' },
  { id: 'smart', label: 'Smart', suffix: ' [use your best judgment]' },
  { id: 'study', label: 'Study', suffix: ' [explain all concepts in depth]' },
  { id: 'search', label: 'Search', suffix: ' [search thoroughly before answering]' },
]

const MAX_CHARS = 2000

interface InputBarProps {
  onSend: (content: string) => void
  onStop?: () => void
  isStreaming: boolean
  disabled?: boolean
}

export default function InputBar({ onSend, onStop, isStreaming, disabled }: InputBarProps) {
  const [value, setValue] = useState('')
  const [thinkMode, setThinkMode] = useState('none')
  const [thinkOpen, setThinkOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const thinkRef = useRef<HTMLDivElement>(null)

  // Close think dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (thinkRef.current && !thinkRef.current.contains(e.target as Node)) setThinkOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value.slice(0, MAX_CHARS)
    setValue(next)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const text = value.trim()
    if (!text || disabled || isStreaming) return
    const suffix = THINK_MODES.find((m) => m.id === thinkMode)?.suffix ?? ''
    const content = suffix ? `${text}${suffix}` : text
    setValue('')
    setThinkMode('none')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    onSend(content)
  }

  const activeMode = THINK_MODES.find((m) => m.id === thinkMode) ?? THINK_MODES[0]
  const charCount = value.length
  const isOverLimit = charCount >= MAX_CHARS

  return (
    <div
      style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        padding: '10px 16px 12px',
        flexShrink: 0,
      }}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled && !isStreaming}
        placeholder="Ask about flights, hotels, or travel policy… (Enter to send)"
        style={{
          width: '100%',
          resize: 'none',
          fontSize: 'var(--text-base)',
          fontFamily: 'var(--font-sans)',
          padding: '8px 12px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          color: 'var(--text-primary)',
          background: 'var(--bg-surface)',
          minHeight: 38,
          maxHeight: 240,
          outline: 'none',
          lineHeight: 1.5,
          display: 'block',
          overflowY: 'auto',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />

      {/* Bottom bar: char count + controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 6,
        }}
      >
        {/* Char count */}
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: isOverLimit ? 'var(--danger)' : 'var(--text-dim)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {charCount}/{MAX_CHARS}
        </span>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Think Mode dropdown */}
          <div ref={thinkRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setThinkOpen((o) => !o)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                fontSize: 'var(--text-sm)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                background: thinkMode !== 'none' ? 'var(--brand-light)' : 'transparent',
                color: thinkMode !== 'none' ? 'var(--brand)' : 'var(--text-muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {activeMode.id === 'none' ? '💡 Think ▾' : `💡 ${activeMode.label} ▾`}
            </button>

            {thinkOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 6px)',
                  right: 0,
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  minWidth: 180,
                  zIndex: 9999,
                  overflow: 'hidden',
                }}
              >
                {THINK_MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setThinkMode(m.id); setThinkOpen(false) }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '7px 12px',
                      fontSize: 'var(--text-sm)',
                      color: thinkMode === m.id ? 'var(--brand)' : 'var(--text-primary)',
                      background: thinkMode === m.id ? 'var(--brand-light)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: thinkMode === m.id ? 600 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (thinkMode !== m.id) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = thinkMode === m.id ? 'var(--brand-light)' : 'transparent'
                    }}
                  >
                    {m.id === 'none' ? 'No mode (default)' : m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stop button (streaming only) */}
          {isStreaming && (
            <button
              onClick={onStop}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 12px',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                border: '1px solid var(--danger)',
                borderRadius: 'var(--r-md)',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                cursor: 'pointer',
              }}
            >
              ⏹ Stop
            </button>
          )}

          {/* Send button */}
          <button
            onClick={submit}
            disabled={!value.trim() || isStreaming}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 14px',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              border: 'none',
              borderRadius: 'var(--r-md)',
              background: !value.trim() || isStreaming ? 'var(--border)' : 'var(--brand)',
              color: !value.trim() || isStreaming ? 'var(--text-dim)' : 'white',
              cursor: !value.trim() || isStreaming ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            ➤ Send
          </button>
        </div>
      </div>
    </div>
  )
}
