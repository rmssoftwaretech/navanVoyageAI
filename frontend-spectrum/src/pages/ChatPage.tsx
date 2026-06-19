import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionButton, Button, ProgressCircle, ToastQueue } from '@react-spectrum/s2'
import type { AgentEvent, Conversation, MessageTurn, User } from '@/types/nva'
import { getMe, logout } from '@/services/auth'
import {
  createConversation,
  getConversationTurns,
  getConversations,
  sendMessage,
} from '@/services/chat'
import MessageBubble, { StreamingBubble } from '@/components/MessageBubble'
import ChatInput from '@/components/ChatInput'
import AdminModal from '@/components/AdminModal'

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null)
  const [convs, setConvs] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [turns, setTurns] = useState<MessageTurn[]>([])
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getMe().then(setUser).catch(() => {})
    getConversations().then(setConvs).catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeId) { setTurns([]); return }
    getConversationTurns(activeId).then(setTurns).catch(() => setTurns([]))
  }, [activeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, streamContent])

  async function handleNewConversation() {
    try {
      const conv = await createConversation()
      setConvs((prev) => [conv, ...prev])
      setActiveId(conv.conversation_id)
      setTurns([])
    } catch { /* ignore */ }
  }

  const handleSend = useCallback(async (content: string) => {
    if (!activeId || streaming) return
    const userTurn: MessageTurn = { role: 'user', content, timestamp: new Date().toISOString() }
    setTurns((prev) => [...prev, userTurn])
    setStreamContent('')
    setStreaming(true)

    let assembled = ''
    const agents: Set<string> = new Set()

    try {
      await sendMessage(activeId, content, (event: AgentEvent) => {
        if (event.type === 'agent_start' && event.agent) agents.add(event.agent)
        else if (event.type === 'booking_confirmed') {
          ToastQueue.positive(`✈ Booking ${event.data ?? 'confirmed'}`, { timeout: 5000 })
        } else if (event.type === 'token' && event.data) {
          assembled += event.data
          setStreamContent(assembled)
        } else if (event.type === 'done') {
          const aiTurn: MessageTurn = {
            role: 'assistant',
            content: assembled,
            timestamp: new Date().toISOString(),
            agents: [...agents].filter((a) => a !== 'orchestrator' && a !== 'judge') as MessageTurn['agents'],
          }
          setTurns((prev) => [...prev, aiTurn])
          setStreamContent('')
        }
      })
    } catch {
      ToastQueue.negative('Connection error — please try again.', { timeout: 6000 })
      setTurns((prev) => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setStreaming(false)
      setStreamContent('')
    }
  }, [activeId, streaming])

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <ProgressCircle aria-label="Loading…" isIndeterminate />
      </div>
    )
  }

  return (
    <div className="nva-shell">
      {/* Header */}
      <header className="nva-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>✈</span>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.02em' }}>navanVoyageAI</span>
          <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>Spectrum 2</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, opacity: 0.85 }}>{user.display_name || user.username}</span>
          <AdminModal user={user} />
          <Button variant="secondary" onPress={logout}
            UNSAFE_style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', fontSize: 12 }}>
            Sign Out
          </Button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="nva-sidebar">
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #e2e8f0' }}>
          <Button variant="accent" onPress={handleNewConversation} UNSAFE_style={{ width: '100%' }}>
            + New Chat
          </Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {convs.length === 0 ? (
            <p style={{ padding: 12, fontSize: 12, color: '#94a3b8' }}>No conversations yet.</p>
          ) : (
            convs.map((c) => (
              <ActionButton
                key={c.conversation_id}
                onPress={() => setActiveId(c.conversation_id)}
                isQuiet
                UNSAFE_style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: 0,
                  borderLeft: activeId === c.conversation_id ? '3px solid var(--nva-navy)' : '3px solid transparent',
                  borderBottom: '1px solid #e2e8f0',
                  background: activeId === c.conversation_id ? '#EFF6FF' : 'transparent',
                  color: activeId === c.conversation_id ? 'var(--nva-navy)' : '#334155',
                  fontWeight: activeId === c.conversation_id ? 600 : 400,
                  height: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                  {c.title || 'Untitled'}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {c.turns_count} turns
                </span>
              </ActionButton>
            ))
          )}
        </div>
      </aside>

      {/* Chat area */}
      <main className="nva-chat">
        {!activeId ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#94a3b8' }}>
            <span style={{ fontSize: 48 }}>✈</span>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--nva-navy)', margin: 0 }}>How can I help plan your trip?</p>
            <p style={{ fontSize: 12, margin: 0 }}>Select a conversation or start a new one.</p>
            <Button variant="accent" onPress={handleNewConversation}>+ Start New Chat</Button>
          </div>
        ) : (
          <>
            <div className="nva-messages">
              {turns.map((t, i) => <MessageBubble key={i} turn={t} />)}
              {streaming && streamContent && <StreamingBubble content={streamContent} />}
              {streaming && !streamContent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 12 }}>
                  <ProgressCircle size="S" aria-label="Agents working…" isIndeterminate />
                  Agents working…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <ChatInput onSend={handleSend} disabled={streaming} />
          </>
        )}
      </main>

      {/* Inspector panel */}
      <div className="nva-inspector">
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--nva-navy)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
          🔌 MCP Tools
        </p>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
          Tool calls appear here during streaming.<br />Full inspector in primary frontend.
        </p>
      </div>
    </div>
  )
}
