import { useCallback, useEffect, useRef, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import AdminPanel from '@/components/admin/AdminPanel'
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
  const abortRef = useRef<AbortController | null>(null)

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

  function handleStop() {
    abortRef.current?.abort()
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

    const ctrl = new AbortController()
    abortRef.current = ctrl

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
          setConversations((prev) =>
            prev.map((c) =>
              c.conversation_id === activeId
                ? { ...c, turns_count: c.turns_count + 1 }
                : c
            )
          )
        }
      }, ctrl.signal)
    } catch (err) {
      if (!ctrl.signal.aborted) {
        setTurns((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
            timestamp: new Date().toISOString(),
          },
        ])
      }
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
      abortRef.current = null
    }
  }, [activeId, isStreaming])

  const activeConversation = conversations.find((c) => c.conversation_id === activeId)

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
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
            onStop={handleStop}
            conversationTitle={activeConversation?.title}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 48 }}>✈</span>
            <p style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-secondary)' }}>
              How can I help plan your trip?
            </p>
            <p style={{ fontSize: 'var(--text-sm)' }}>Select a conversation or start a new one.</p>
            <button
              onClick={handleNewConversation}
              style={{
                marginTop: 8,
                padding: '8px 20px',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'white',
                background: 'var(--brand)',
                border: 'none',
                borderRadius: 'var(--r-md)',
                cursor: 'pointer',
              }}
            >
              + Start New Chat
            </button>
          </div>
        )}
      </AppLayout>

      {adminOpen && (
        <AdminPanel user={user} onClose={() => setAdminOpen(false)} />
      )}
    </>
  )
}
