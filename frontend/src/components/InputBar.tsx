import { useEffect, useRef, useState } from 'react'
import AttachmentChip from './Chat/AttachmentChip'

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
  onAttachmentChange?: (filename: string | null, context: string | null) => void
}

export default function InputBar({ onSend, onStop, isStreaming, disabled, onAttachmentChange }: InputBarProps) {
  const [value, setValue] = useState('')
  const [thinkMode, setThinkMode] = useState('none')
  const [thinkOpen, setThinkOpen] = useState(false)
  const [attachment, setAttachment] = useState<{ filename: string; context: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const thinkRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) { alert('File too large (max 4 MB)'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const ctx = `[Attached file: ${file.name}]\n${text}`
      setAttachment({ filename: file.name, context: ctx })
      onAttachmentChange?.(file.name, ctx)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function removeAttachment() {
    setAttachment(null)
    onAttachmentChange?.(null, null)
  }

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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.csv,.json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Attachment chip */}
      {attachment && (
        <div style={{ marginBottom: 8 }}>
          <AttachmentChip filename={attachment.filename} onRemove={removeAttachment} />
        </div>
      )}

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

          {/* Attach file button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach a file (.txt, .csv, .json, .md — max 4 MB)"
            disabled={isStreaming}
            style={{
              padding: '4px 10px', fontSize: 'var(--text-sm)',
              color: attachment ? 'var(--brand)' : 'var(--text-muted)',
              background: attachment ? 'var(--brand-light)' : 'transparent',
              border: `1px solid ${attachment ? 'var(--brand)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)', cursor: isStreaming ? 'not-allowed' : 'pointer',
              opacity: isStreaming ? 0.4 : 1,
            }}
          >
            📎
          </button>

          {/* Stop button — blinks while streaming */}
          {isStreaming && (
            <button
              onClick={onStop}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 12px',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                border: '1.5px solid var(--danger)',
                borderRadius: 'var(--r-md)',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                cursor: 'pointer',
                animation: 'stopBlink 1.1s ease-in-out infinite',
              }}
            >
              <span style={{ display: 'inline-block', width: 9, height: 9, background: 'var(--danger)', borderRadius: 2 }} />
              Stop
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
