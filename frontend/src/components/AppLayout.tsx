import { useRef, useState } from 'react'
import AppHeader from './AppHeader'
import ConversationSidebar from './ConversationSidebar'
import type { Conversation, User } from '@/types/nva'

const MIN_WIDTH = 300
const MAX_WIDTH = 720
const DEFAULT_WIDTH = 400

interface AppLayoutProps {
  user: User
  conversations: Conversation[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onAdminOpen: () => void
  inspectorOpen: boolean
  onInspectorToggle: () => void
  children: React.ReactNode
  inspector: React.ReactNode
}

export default function AppLayout({
  user,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onAdminOpen,
  inspectorOpen,
  onInspectorToggle,
  children,
  inspector,
}: AppLayoutProps) {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const dragging = useRef(false)

  function startResize(e: React.MouseEvent) {
    e.preventDefault()
    dragging.current = true
    const startX = e.clientX
    const startW = panelWidth

    function onMove(mv: MouseEvent) {
      if (!dragging.current) return
      const delta = startX - mv.clientX // drag left = wider
      setPanelWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + delta)))
    }
    function onUp() {
      dragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'ew-resize'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-page)' }}>
      <AppHeader onAdminOpen={onAdminOpen} username={user.display_name || user.username} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar */}
        <ConversationSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={onSelectConversation}
          onNew={onNewConversation}
        />

        {/* Main chat area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-surface)' }}>
          {children}
        </main>

        {/* Right inspector panel — resizable from left edge */}
        {inspectorOpen && (
          <aside
            style={{
              width: panelWidth,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderLeft: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              position: 'relative',
            }}
          >
            {/* Drag handle — left edge */}
            <div
              onMouseDown={startResize}
              title="Drag to resize"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 5,
                cursor: 'ew-resize',
                zIndex: 10,
                background: 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--brand)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            />

            {/* Inspector header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px 8px 14px',
                flexShrink: 0,
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-page)',
              }}
            >
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                🔌 MCP Inspector
              </span>
              <button
                onClick={onInspectorToggle}
                style={{ fontSize: 12, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {inspector}
            </div>
          </aside>
        )}

        {/* Inspector toggle tab (when closed) */}
        {!inspectorOpen && (
          <button
            onClick={onInspectorToggle}
            title="Show MCP Inspector"
            style={{
              flexShrink: 0,
              width: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              writingMode: 'vertical-rl',
              letterSpacing: '0.05em',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            🔌 MCP
          </button>
        )}
      </div>
    </div>
  )
}
