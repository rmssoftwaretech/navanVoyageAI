import { useState } from 'react'
import type { MessageTurn } from '@/types/nva'
import { getToken } from '@/services/auth'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  conversationId: string
  conversationTitle?: string
  turns: MessageTurn[]
}

export default function ShareModal({ isOpen, onClose, conversationId, conversationTitle, turns }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const preview = turns.slice(-4)

  async function generateLink() {
    setLoading(true)
    try {
      const r = await fetch(`/api/chat/conversations/${conversationId}/share`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!r.ok) throw new Error('Failed')
      const data = await r.json()
      setShareUrl(`${window.location.origin}${data.url}`)
    } catch {
      setShareUrl(null)
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleClose() {
    setShareUrl(null)
    setCopied(false)
    onClose()
  }

  return (
    <div
      onClick={handleClose}
      style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 16, marginRight: 8 }}>🔗</span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
            Share conversation
          </span>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--text-muted)', padding: '0 2px' }}>✕</button>
        </div>

        {/* Conversation preview */}
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
          {conversationTitle && (
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              {conversationTitle}
            </p>
          )}
          {preview.map((turn, i) => (
            <div key={i}>
              <div style={{ fontSize: 10, fontWeight: 700, color: turn.role === 'user' ? 'var(--brand)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                {turn.role === 'user' ? 'YOU' : 'AGENT'}
              </div>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                background: 'var(--bg-page)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                padding: '7px 10px',
                lineHeight: 1.5,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}>
                {turn.content}
              </div>
            </div>
          ))}
          {preview.length === 0 && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No messages yet</p>
          )}
        </div>

        {/* Link display */}
        {shareUrl && (
          <div style={{ margin: '0 18px', display: 'flex', gap: 6 }}>
            <input
              readOnly
              value={shareUrl}
              style={{
                flex: 1, fontSize: 'var(--text-xs)', padding: '7px 10px',
                border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                background: 'var(--bg-page)', color: 'var(--brand)',
                fontFamily: 'monospace', outline: 'none',
              }}
            />
            <button
              onClick={copyLink}
              style={{
                padding: '7px 12px', fontSize: 'var(--text-xs)', fontWeight: 600,
                border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                background: copied ? 'var(--success-bg)' : 'var(--bg-page)',
                color: copied ? 'var(--success)' : 'var(--text-secondary)',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {copied ? '✓ Copied' : '⎘ Copy'}
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!shareUrl ? (
            <button
              onClick={generateLink}
              disabled={loading || preview.length === 0}
              style={{
                width: '100%', padding: '11px', fontSize: 'var(--text-sm)', fontWeight: 700,
                background: loading ? 'var(--text-dim)' : 'var(--text-primary)',
                color: 'white', border: 'none', borderRadius: 'var(--r-md)',
                cursor: loading || preview.length === 0 ? 'not-allowed' : 'pointer',
                opacity: preview.length === 0 ? 0.4 : 1,
              }}
            >
              {loading ? 'Generating…' : 'Generate link'}
            </button>
          ) : (
            <button
              onClick={generateLink}
              disabled={loading}
              style={{
                width: '100%', padding: '11px', fontSize: 'var(--text-sm)', fontWeight: 600,
                background: 'transparent', color: 'var(--brand)',
                border: '1px solid var(--brand)', borderRadius: 'var(--r-md)',
                cursor: 'pointer',
              }}
            >
              ↺ Regenerate link
            </button>
          )}
          <button
            onClick={handleClose}
            style={{
              width: '100%', padding: '9px', fontSize: 'var(--text-sm)',
              background: 'transparent', color: 'var(--text-secondary)',
              border: 'none', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <p style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
            Anyone with this link can view the full conversation. Make sure it doesn't contain sensitive information.
          </p>
        </div>
      </div>
    </div>
  )
}
