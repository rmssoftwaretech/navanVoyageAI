import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface SupportMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming: boolean
}

interface SupportPanelProps {
  isOpen: boolean
  onClose: () => void
  isAdmin?: boolean
}

function uid() { return Math.random().toString(36).slice(2) }

const WELCOME = "Hi! I'm your navanVoyageAI travel assistant. Ask me about flight searches, booking policies, how to use the platform, or anything else."
const WELCOME_ADMIN = "Hi! I'm your navanVoyageAI admin assistant. Ask me about the admin panel, agent configuration, eval metrics, notifications, MCP Inspector, or any platform feature."

export default function SupportPanel({ isOpen, onClose, isAdmin = false }: SupportPanelProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (isOpen) {
      setMessages([{ id: uid(), role: 'assistant', content: isAdmin ? WELCOME_ADMIN : WELCOME, streaming: false }])
      setInput('')
      setStreaming(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [isOpen, isAdmin])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    const userId = uid()
    const asstId = uid()
    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', content: text, streaming: false },
      { id: asstId, role: 'assistant', content: '', streaming: true },
    ])
    setStreaming(true)
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('nva_token')}`,
        },
        signal: abortRef.current.signal,
        body: JSON.stringify({ message: text, is_admin: isAdmin }),
      })

      if (!res.ok || !res.body) {
        setMessages((prev) => prev.map((m) => m.id === asstId ? { ...m, content: 'Something went wrong. Please try again.', streaming: false } : m))
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === 'token' && ev.data) {
              setMessages((prev) => prev.map((m) => m.id === asstId ? { ...m, content: m.content + ev.data } : m))
            } else if (ev.type === 'done') {
              setMessages((prev) => prev.map((m) => m.id === asstId ? { ...m, streaming: false } : m))
            } else if (ev.type === 'error') {
              setMessages((prev) => prev.map((m) => m.id === asstId ? { ...m, content: `Error: ${ev.message}`, streaming: false } : m))
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') return
      setMessages((prev) => prev.map((m) => m.id === asstId ? { ...m, content: 'Connection error. Please try again.', streaming: false } : m))
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function handleClear() {
    abortRef.current?.abort()
    setMessages([{ id: uid(), role: 'assistant', content: isAdmin ? WELCOME_ADMIN : WELCOME, streaming: false }])
    setInput('')
    setStreaming(false)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.25)' }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        bottom: 72,
        right: 24,
        zIndex: 1001,
        width: 380,
        height: 520,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          background: 'var(--brand)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 18 }}>✈</span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'white', flex: 1 }}>
            {isAdmin ? 'Admin Support' : 'Travel Support'}
          </span>
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 'var(--r-full)',
            background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)',
            fontWeight: 600,
          }}>
            {isAdmin ? 'Admin' : 'Traveller'}
          </span>
          <button
            onClick={handleClear}
            title="New conversation"
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--r-sm)', padding: '2px 8px', cursor: 'pointer' }}
          >
            New
          </button>
          <button
            onClick={onClose}
            style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 2px' }}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && (
                <span style={{ fontSize: 16, marginRight: 6, flexShrink: 0, alignSelf: 'flex-start', marginTop: 4 }}>✈</span>
              )}
              <div style={{
                maxWidth: '82%',
                padding: '8px 12px',
                borderRadius: msg.role === 'user' ? 'var(--r-lg) var(--r-sm) var(--r-lg) var(--r-lg)' : 'var(--r-sm) var(--r-lg) var(--r-lg) var(--r-lg)',
                background: msg.role === 'user' ? 'var(--brand-light)' : 'var(--bg-page)',
                border: `1px solid ${msg.role === 'user' ? 'var(--brand-medium)' : 'var(--border)'}`,
                fontSize: 'var(--text-xs)',
                lineHeight: 1.6,
                color: 'var(--text-primary)',
              }}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{msg.content || (msg.streaming ? '…' : '')}</ReactMarkdown>
                    {msg.streaming && <span style={{ display: 'inline-block', width: 6, height: 12, background: 'var(--brand)', marginLeft: 2, verticalAlign: 'middle', animation: 'pulse 1s infinite' }} />}
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px', display: 'flex', gap: 8, flexShrink: 0, background: 'var(--bg-surface)' }}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            placeholder={isAdmin ? 'Ask about dashboards, agents, eval metrics…' : 'Ask about flights, policies, bookings…'}
            style={{
              flex: 1, resize: 'none', fontSize: 'var(--text-xs)', padding: '7px 10px',
              border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
              background: 'var(--bg-page)', color: 'var(--text-primary)',
              outline: 'none', fontFamily: 'inherit', minHeight: 34, maxHeight: 100,
            }}
          />
          {streaming ? (
            <button
              onClick={() => abortRef.current?.abort()}
              style={{ padding: '6px 12px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, flexShrink: 0 }}
            >
              ■
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              style={{ padding: '6px 12px', background: 'var(--brand)', color: 'white', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, flexShrink: 0, opacity: input.trim() ? 1 : 0.45 }}
            >
              ↑
            </button>
          )}
        </div>
      </div>
    </>
  )
}
