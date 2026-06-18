import { useCallback, useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import ChatWindow from '@/components/Chat/ChatWindow'
import McpInspectorPanel from '@/components/McpInspectorPanel'
import { getMe } from '@/services/auth'
import { createConversation, getConversationTurns, getConversations, sendMessage } from '@/services/chat'
import type { AgentEvent, Conversation, MessageTurn, User } from '@/types/nva'

const INSPECTOR_KEY = 'nva_inspector_open'

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [turns, setTurns] = useState<MessageTurn[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(
    localStorage.getItem(INSPECTOR_KEY) === 'true'
  )
  const [inspectorEvents, setInspectorEvents] = useState<AgentEvent[]>([])
  const [adminOpen, setAdminOpen] = useState(false)

  useEffect(() => {
    getMe().then(setUser).catch(() => {})
    getConversations().then(setConversations).catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeId) { setTurns([]); return }
    getConversationTurns(activeId).then(setTurns).catch(() => setTurns([]))
  }, [activeId])

  function toggleInspector() {
    setInspectorOpen((prev) => {
      localStorage.setItem(INSPECTOR_KEY, String(!prev))
      return !prev
    })
  }

  async function handleNewConversation() {
    try {
      const conv = await createConversation()
      setConversations((prev) => [conv, ...prev])
      setActiveId(conv.conversation_id)
      setTurns([])
      setInspectorEvents([])
    } catch {
      // ignore
    }
  }

  const handleSend = useCallback(async (content: string) => {
    if (!activeId || isStreaming) return

    const userTurn: MessageTurn = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    setTurns((prev) => [...prev, userTurn])
    setStreamingContent('')
    setIsStreaming(true)
    setInspectorEvents([])

    let assembled = ''
    const activeAgents: Set<string> = new Set()

    try {
      await sendMessage(activeId, content, (event) => {
        setInspectorEvents((prev) => [...prev, event])

        if (event.type === 'agent_start' && event.agent) {
          activeAgents.add(event.agent)
        } else if (event.type === 'token' && event.data) {
          assembled += event.data
          setStreamingContent(assembled)
        } else if (event.type === 'done') {
          const aiTurn: MessageTurn = {
            role: 'assistant',
            content: assembled,
            timestamp: new Date().toISOString(),
            agents: [...activeAgents].filter((a) => a !== 'judge') as MessageTurn['agents'],
          }
          setTurns((prev) => [...prev, aiTurn])
          setStreamingContent('')
          // Update conversation turn count
          setConversations((prev) =>
            prev.map((c) =>
              c.conversation_id === activeId
                ? { ...c, turns_count: c.turns_count + 1 }
                : c
            )
          )
        }
      })
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
    }
  }, [activeId, isStreaming])

  const activeConversation = conversations.find((c) => c.conversation_id === activeId)

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
          <McpInspectorPanel events={inspectorEvents} isStreaming={isStreaming} />
        }
      >
        {activeId ? (
          <ChatWindow
            turns={turns}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            onSend={handleSend}
            conversationTitle={activeConversation?.title}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-muted)' }}>
            <span className="text-5xl">✈</span>
            <p className="text-sm font-medium" style={{ color: 'var(--navy)' }}>
              How can I help plan your trip?
            </p>
            <p className="text-xs">Select a conversation or start a new one.</p>
            <button
              onClick={handleNewConversation}
              className="mt-2 px-4 py-2 text-sm font-medium text-white"
              style={{ background: 'var(--navy)' }}
            >
              + Start New Chat
            </button>
          </div>
        )}
      </AppLayout>

      {/* Admin modal placeholder — wired in NVA-04 */}
      {adminOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setAdminOpen(false)}
        >
          <div
            className="bg-white flex flex-col"
            style={{ width: '75vw', height: '75vh', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="font-semibold" style={{ color: 'var(--navy)' }}>⚙ Admin</span>
              <button onClick={() => setAdminOpen(false)} style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              <p className="text-sm">Admin panel — wired in NVA-04</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
