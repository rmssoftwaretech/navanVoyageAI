import type { Conversation } from '@/types/nva'

interface ConversationSidebarProps {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

export default function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
}: ConversationSidebarProps) {
  return (
    <aside
      className="flex flex-col h-full flex-shrink-0"
      style={{
        width: 240,
        background: 'var(--navy)',
        borderRight: '1px solid var(--navy-dark)',
      }}
    >
      {/* New chat */}
      <div className="p-3 flex-shrink-0">
        <button
          onClick={onNew}
          className="w-full text-sm py-2 px-3 font-medium text-white transition-opacity hover:opacity-80 flex items-center gap-2"
          style={{ border: '1px solid rgba(255,255,255,0.25)' }}
        >
          <span>+</span> New Chat
        </button>
      </div>

      <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* Section label */}
      <div className="px-3 pt-3 pb-1">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Conversations
        </span>
      </div>

      {/* List */}
      <nav className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="px-3 py-4 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            No conversations yet.
          </p>
        )}
        {conversations.map((c) => (
          <button
            key={c.conversation_id}
            onClick={() => onSelect(c.conversation_id)}
            className="w-full text-left px-3 py-2 text-sm transition-colors"
            style={{
              color: activeId === c.conversation_id ? 'white' : 'rgba(255,255,255,0.65)',
              background:
                activeId === c.conversation_id ? 'rgba(255,255,255,0.12)' : 'transparent',
              borderLeft:
                activeId === c.conversation_id
                  ? '3px solid var(--gold)'
                  : '3px solid transparent',
            }}
          >
            <span className="block truncate">{c.title || 'New conversation'}</span>
            <span className="block text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {c.turns_count} {c.turns_count === 1 ? 'turn' : 'turns'}
            </span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
