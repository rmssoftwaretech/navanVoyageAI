import { useCallback, useEffect, useRef, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import AdminPanel from '@/components/admin/AdminPanel'
import ChatWindow from '@/components/Chat/ChatWindow'
import McpInspectorPanel from '@/components/McpInspectorPanel'
import ContextModal from '@/components/ContextModal'
import { getMe } from '@/services/auth'
import { createConversation, getConversationEval, getConversationTurns, getConversations, getMcpInfo, renameConversation, sendMessage } from '@/services/chat'
import type { AgentEvent, CarResult, Conversation, FlightResult, HotelResult, MessageTurn, User } from '@/types/nva'

const INSPECTOR_KEY = 'nva_inspector_open'
const DEBUG_KEY = 'nva_debug_mode'

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
  const [debugMode, setDebugMode] = useState(
    localStorage.getItem(DEBUG_KEY) === 'true'
  )
  const sendTimeRef = useRef<number>(0)
  const [inspectorEvents, setInspectorEvents] = useState<AgentEvent[]>([])
  const [adminOpen, setAdminOpen] = useState(false)
  const [contextModalOpen, setContextModalOpen] = useState(false)
  const [customContext, setCustomContext] = useState('')
  const [attachmentContext, setAttachmentContext] = useState<string | null>(null)

  function handleAttachmentChange(_filename: string | null, context: string | null) {
    setAttachmentContext(context)
  }

  async function handleRenameConversation(id: string, title: string) {
    try {
      await renameConversation(id, title)
      setConversations((prev) => prev.map((c) => c.conversation_id === id ? { ...c, title } : c))
    } catch { /* ignore */ }
  }

  function handleStarChange(conversationId: string, hasStarred: boolean) {
    if (hasStarred) {
      setConversations((prev) => prev.map((c) => c.conversation_id === conversationId ? { ...c, has_starred: true } : c))
    }
  }
  const [panelMode, setPanelMode] = useState(
    () => localStorage.getItem('nva_panel_mode') === 'true'
  )

  function togglePanelMode() {
    setPanelMode((v) => {
      const next = !v
      localStorage.setItem('nva_panel_mode', String(next))
      return next
    })
  }
  const [evalData, setEvalData] = useState<Record<string, unknown> | null>(null)
  const [mcpInfo, setMcpInfo] = useState<Record<string, unknown> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const wasStreaming = useRef(false)

  useEffect(() => {
    getMe().then(setUser).catch(() => {})
    getConversations().then(setConversations).catch(() => {})
    getMcpInfo().then(setMcpInfo).catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeId) { setTurns([]); return }
    getConversationTurns(activeId).then(setTurns).catch(() => setTurns([]))
  }, [activeId])

  // Fetch eval data ~3s after streaming ends; push synthetic eval_result to console
  useEffect(() => {
    if (!isStreaming && wasStreaming.current && activeId) {
      const timer = setTimeout(async () => {
        try {
          const data = await getConversationEval(activeId)
          if (data && data.scores) {
            setEvalData(data)
            setInspectorEvents((prev) => [
              ...prev,
              {
                type: 'eval_result' as const,
                score: typeof data.total_score === 'number' ? data.total_score : undefined,
                content: typeof data.reasoning === 'string' ? data.reasoning : (data.passed ? 'Passed' : 'Failed'),
                model: typeof data.model === 'string' ? data.model : undefined,
                ts: Date.now(),
              },
            ])
          }
        } catch { /* ignore */ }
      }, 3000)
      return () => clearTimeout(timer)
    }
    wasStreaming.current = isStreaming
  }, [isStreaming, activeId])

  function toggleInspector() {
    setInspectorOpen((prev) => {
      localStorage.setItem(INSPECTOR_KEY, String(!prev))
      return !prev
    })
  }

  function toggleDebug() {
    setDebugMode((prev) => {
      localStorage.setItem(DEBUG_KEY, String(!prev))
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
      setEvalData(null)
    } catch { /* ignore */ }
  }

  const handleSend = useCallback(async (content: string) => {
    if (!activeId || isStreaming) return

    const ctrl = new AbortController()
    abortRef.current = ctrl
    sendTimeRef.current = Date.now()

    const userTurn: MessageTurn = { role: 'user', content, timestamp: new Date().toISOString() }
    setTurns((prev) => [...prev, userTurn])
    setStreamingContent('')
    setIsStreaming(true)
    setInspectorEvents([])
    setEvalData(null)

    let assembled = ''
    let pendingCacheKey: string | undefined
    let pendingFromCache = false
    let pendingFlightResults: FlightResult[] = []
    let pendingHotelResults: HotelResult[] = []
    let pendingCarResults: CarResult[] = []
    const activeAgents: Set<string> = new Set()
    const toolCallLog: { tool: string; input?: unknown; output?: unknown; latency_ms?: number }[] = []
    const agentCallLog: { agent: string; input?: unknown; output?: unknown; latency_ms?: number; _startTs?: number }[] = []

    try {
      await sendMessage(activeId, content, (event) => {
        setInspectorEvents((prev) => [...prev, event])
        if (event.type === 'cache_hit') {
          pendingCacheKey = event.cache_key
          pendingFromCache = true
        } else if (event.type === 'flight_results' && event.results) {
          pendingFlightResults = event.results as FlightResult[]
        } else if (event.type === 'hotel_results' && event.results) {
          pendingHotelResults = event.results as HotelResult[]
        } else if (event.type === 'car_results' && event.results) {
          pendingCarResults = event.results as CarResult[]
        } else if (event.type === 'agent_start' && event.agent) {
          activeAgents.add(event.agent)
          agentCallLog.push({ agent: event.agent as string, input: event.input, _startTs: Date.now() })
        } else if (event.type === 'agent_done' && event.agent) {
          const entry = agentCallLog.slice().reverse().find((a) => a.agent === (event.agent as string) && !a.output)
          if (entry) {
            entry.output = event.output
            entry.latency_ms = event.latency_ms ?? (entry._startTs ? Date.now() - entry._startTs : undefined)
          }
        } else if (event.type === 'mcp_tool_call') toolCallLog.push({ tool: event.tool ?? '', input: event.input, latency_ms: undefined })
        else if (event.type === 'mcp_tool_result') {
          const last = toolCallLog[toolCallLog.length - 1]
          if (last && !last.output) { last.output = event.output; last.latency_ms = event.latency_ms }
        }
        else if (event.type === 'token' && event.data) {
          assembled += event.data
          setStreamingContent(assembled)
        } else if (event.type === 'done') {
          const latency_ms = Date.now() - sendTimeRef.current
          const cleanAgentCalls = agentCallLog.map(({ _startTs: _, ...rest }) => rest)
          const aiTurn: MessageTurn = {
            role: 'assistant',
            content: assembled,
            timestamp: new Date().toISOString(),
            agents: [...activeAgents].filter((a) => a !== 'judge') as MessageTurn['agents'],
            perf: {
              latency_ms,
              input_tokens: event.input_tokens ?? 0,
              output_tokens: event.output_tokens ?? 0,
              model: event.model,
            },
            tool_calls: toolCallLog.length > 0 ? [...toolCallLog] : undefined,
            agent_calls: cleanAgentCalls.length > 0 ? cleanAgentCalls : undefined,
            from_cache: event.from_cache ?? pendingFromCache,
            cache_key: event.cache_key ?? pendingCacheKey,
            flight_results: pendingFlightResults.length > 0 ? [...pendingFlightResults] : undefined,
            hotel_results: pendingHotelResults.length > 0 ? [...pendingHotelResults] : undefined,
            car_results: pendingCarResults.length > 0 ? [...pendingCarResults] : undefined,
          }
          setTurns((prev) => [...prev, aiTurn])
          setStreamingContent('')
          setConversations((prev) =>
            prev.map((c) => c.conversation_id === activeId ? { ...c, turns_count: c.turns_count + 1 } : c)
          )
        }
      }, ctrl.signal, [customContext, attachmentContext].filter(Boolean).join('\n\n') || undefined)
    } catch (err) {
      if (!ctrl.signal.aborted) {
        setTurns((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: new Date().toISOString() }])
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
        onSelectConversation={(id) => { setActiveId(id); setEvalData(null) }}
        onNewConversation={handleNewConversation}
        onAdminOpen={() => setAdminOpen(true)}
        inspectorOpen={inspectorOpen}
        onInspectorToggle={toggleInspector}
        onSetContext={() => setContextModalOpen(true)}
        hasContext={!!customContext}
        panelMode={panelMode}
        onPanelModeToggle={togglePanelMode}
        debugMode={debugMode}
        onDebugToggle={toggleDebug}
        onRenameConversation={handleRenameConversation}
        inspector={
          <McpInspectorPanel
            events={inspectorEvents}
            isStreaming={isStreaming}
            evalData={evalData}
            mcpInfo={mcpInfo}
          />
        }
      >
        {activeId ? (
          <ChatWindow
            turns={turns}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            onSend={handleSend}
            onStop={handleStop}
            onRetry={handleSend}
            conversationTitle={activeConversation?.title}
            debugMode={debugMode}
            conversationId={activeId ?? undefined}
            onAttachmentChange={handleAttachmentChange}
            onStarChange={handleStarChange}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 48 }}>✈</span>
            <p style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-secondary)' }}>How can I help plan your trip?</p>
            <p style={{ fontSize: 'var(--text-sm)' }}>Select a conversation or start a new one.</p>
            <button
              onClick={handleNewConversation}
              style={{ marginTop: 8, padding: '8px 20px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'white', background: 'var(--brand)', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer' }}
            >
              + Start New Chat
            </button>
          </div>
        )}
      </AppLayout>

      {adminOpen && <AdminPanel user={user} onClose={() => setAdminOpen(false)} />}

      <ContextModal
        isOpen={contextModalOpen}
        value={customContext}
        onApply={setCustomContext}
        onClose={() => setContextModalOpen(false)}
      />
    </>
  )
}
