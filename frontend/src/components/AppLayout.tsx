import AppHeader from './AppHeader'
import ConversationSidebar from './ConversationSidebar'
import type { Conversation, User } from '@/types/nva'

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
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader onAdminOpen={onAdminOpen} username={user.display_name || user.username} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <ConversationSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={onSelectConversation}
          onNew={onNewConversation}
        />

        {/* Main chat area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {children}
        </main>

        {/* Right inspector panel */}
        {inspectorOpen && (
          <aside
            className="flex flex-col flex-shrink-0 overflow-hidden"
            style={{
              width: 320,
              borderLeft: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            <div
              className="flex items-center justify-between px-3 py-2 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--navy)' }}>
                🔌 MCP Tools
              </span>
              <button
                onClick={onInspectorToggle}
                className="text-xs hover:opacity-60"
                style={{ color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{inspector}</div>
          </aside>
        )}

        {/* Inspector toggle tab (when closed) */}
        {!inspectorOpen && (
          <button
            onClick={onInspectorToggle}
            className="flex-shrink-0 flex items-center justify-center w-6 text-xs font-medium writing-vertical"
            style={{
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
              color: 'var(--text-muted)',
              writingMode: 'vertical-rl',
              letterSpacing: '0.05em',
            }}
            title="Show MCP Inspector"
          >
            🔌 MCP
          </button>
        )}
      </div>
    </div>
  )
}
