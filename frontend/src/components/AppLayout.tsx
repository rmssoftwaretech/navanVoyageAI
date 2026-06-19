import { useRef, useState } from 'react'
import AppHeader from './AppHeader'
import ConversationSidebar from './ConversationSidebar'
import SupportPanel from './SupportPanel'
import type { Conversation, User } from '@/types/nva'

const MIN_HEIGHT = 180
const MAX_HEIGHT = 600
const DEFAULT_HEIGHT = 280
const PANEL_MODE_WIDTH = 420

interface AppLayoutProps {
  user: User
  conversations: Conversation[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onAdminOpen: () => void
  inspectorOpen: boolean
  onInspectorToggle: () => void
  onSetContext?: () => void
  hasContext?: boolean
  onRenameConversation?: (id: string, title: string) => void
  onDeleteConversation?: (id: string) => void
  panelMode?: boolean
  onPanelModeToggle?: () => void
  debugMode: boolean
  onDebugToggle: () => void
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
  onSetContext,
  hasContext,
  onRenameConversation,
  onDeleteConversation,
  panelMode = false,
  onPanelModeToggle,
  debugMode,
  onDebugToggle,
  children,
  inspector,
}: AppLayoutProps) {
  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT)
  const [supportOpen, setSupportOpen] = useState(false)
  const dragging = useRef(false)

  function startResize(e: React.MouseEvent) {
    e.preventDefault()
    dragging.current = true
    const startY = e.clientY
    const startH = panelHeight

    function onMove(mv: MouseEvent) {
      if (!dragging.current) return
      const delta = startY - mv.clientY
      setPanelHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startH + delta)))
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
    document.body.style.cursor = 'ns-resize'
  }

  const header = (
    <AppHeader
      onAdminOpen={onAdminOpen}
      onSupportOpen={() => setSupportOpen(true)}
      username={user.display_name || user.username}
      isAdmin={user.role === 'admin'}
      debugMode={debugMode}
      onDebugToggle={onDebugToggle}
      panelMode={panelMode}
      onPanelModeToggle={onPanelModeToggle}
    />
  )

  const support = (
    <SupportPanel
      isOpen={supportOpen}
      onClose={() => setSupportOpen(false)}
      isAdmin={user.role === 'admin'}
    />
  )

  // ── Side panel mode ────────────────────────────────────────────────────────
  if (panelMode) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: PANEL_MODE_WIDTH,
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.18)',
        borderLeft: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        {header}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </main>
        {support}
      </div>
    )
  }

  // ── Full layout ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-page)' }}>
      {header}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar */}
        <ConversationSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={onSelectConversation}
          onNew={onNewConversation}
          onSetContext={onSetContext}
          hasContext={hasContext}
          onRename={onRenameConversation}
          onDelete={onDeleteConversation}
        />

        {/* Main column: chat area + bottom inspector */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Chat area */}
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-surface)' }}>
            {children}
          </main>

          {/* Bottom inspector panel — open */}
          {inspectorOpen && (
            <div
              style={{
                height: panelHeight,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderTop: '2px solid var(--border)',
                background: 'var(--bg-surface)',
                position: 'relative',
              }}
            >
              {/* Top-edge resize handle */}
              <div
                onMouseDown={startResize}
                title="Drag to resize"
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 5,
                  cursor: 'ns-resize', zIndex: 10, background: 'transparent', transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--brand)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              />

              {/* Inspector header bar */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 12px 6px 14px', flexShrink: 0,
                borderBottom: '1px solid var(--border)', background: 'var(--bg-page)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    🔌 MCP Inspector
                  </span>
                </div>
                <button
                  onClick={onInspectorToggle}
                  style={{ fontSize: 12, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                  title="Close MCP Inspector"
                >
                  ✕
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {inspector}
              </div>
            </div>
          )}

          {/* Inspector toggle tab (when closed) — horizontal bar at bottom */}
          {!inspectorOpen && (
            <button
              onClick={onInspectorToggle}
              title="Show MCP Inspector"
              style={{
                flexShrink: 0,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: 'var(--bg-page)',
                borderTop: '1px solid var(--border)',
                color: 'var(--text-muted)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                letterSpacing: '0.05em',
                cursor: 'pointer',
              }}
            >
              🔌 MCP Inspector
            </button>
          )}
        </div>
      </div>
      {support}
    </div>
  )
}
