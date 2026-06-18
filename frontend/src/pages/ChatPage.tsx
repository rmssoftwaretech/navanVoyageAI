import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { getMe } from '@/services/auth'
import type { Conversation, User } from '@/types/nva'

const INSPECTOR_KEY = 'nva_inspector_open'

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null)
  const [conversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [inspectorOpen, setInspectorOpen] = useState(
    localStorage.getItem(INSPECTOR_KEY) === 'true'
  )
  const [adminOpen, setAdminOpen] = useState(false)

  useEffect(() => {
    getMe().then(setUser).catch(() => {})
  }, [])

  function toggleInspector() {
    setInspectorOpen((prev) => {
      localStorage.setItem(INSPECTOR_KEY, String(!prev))
      return !prev
    })
  }

  function handleNewConversation() {
    setActiveId(null)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ color: 'var(--text-muted)' }}>
        Loading…
      </div>
    )
  }

  return (
    <>
      <AppLayout
        user={user}
        conversations={conversations}
        activeConversationId={activeId}
        onSelectConversation={setActiveId}
        onNewConversation={handleNewConversation}
        onAdminOpen={() => setAdminOpen(true)}
        inspectorOpen={inspectorOpen}
        onInspectorToggle={toggleInspector}
        inspector={
          <div className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            Tool calls will appear here during a conversation.
          </div>
        }
      >
        {/* Chat area placeholder — wired in NVA-02 */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: 'var(--text-muted)' }}>
          <span className="text-4xl">✈</span>
          <p className="text-sm font-medium" style={{ color: 'var(--navy)' }}>
            How can I help plan your trip?
          </p>
          <p className="text-xs">Select a conversation or start a new one.</p>
        </div>
      </AppLayout>

      {/* Admin modal placeholder — wired in NVA-04 */}
      {adminOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setAdminOpen(false)}
        >
          <div
            className="bg-white p-8 flex flex-col items-center gap-2"
            style={{ width: '75vw', height: '75vh', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>⚙ Admin</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Admin panel — wired in NVA-04</p>
            <button onClick={() => setAdminOpen(false)} className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}
