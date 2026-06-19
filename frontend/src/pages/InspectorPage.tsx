import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConnPanel from '@/components/inspector/ConnPanel'
import ToolsTab from '@/components/inspector/ToolsTab'
import ResourcesTab from '@/components/inspector/ResourcesTab'
import PromptsTab from '@/components/inspector/PromptsTab'
import HistoryTab from '@/components/inspector/HistoryTab'
import type { McpTool, McpResource, McpResourceTemplate, McpPrompt, HistoryEntry } from '@/types/mcpInspector'
import type { ConnectionStatus } from '@/components/inspector/ConnPanel'
import { PRESET_SERVERS } from '@/types/mcpInspector'

type Tab = 'tools' | 'resources' | 'prompts' | 'history'

const TABS: { id: Tab; label: string }[] = [
  { id: 'tools', label: 'Tools' },
  { id: 'resources', label: 'Resources' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'history', label: 'History' },
]

export default function InspectorPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [serverUrl, setServerUrl] = useState<string>(PRESET_SERVERS[0].url)
  const [tools, setTools] = useState<McpTool[]>([])
  const [resources, setResources] = useState<McpResource[]>([])
  const [resourceTemplates, setResourceTemplates] = useState<McpResourceTemplate[]>([])
  const [prompts, setPrompts] = useState<McpPrompt[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('tools')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleConnect(url: string, data: { tools: McpTool[]; resources: McpResource[]; resource_templates: McpResourceTemplate[]; prompts: McpPrompt[] }) {
    setServerUrl(url)
    setErrorMsg(null)
    if (data.tools.length === 0 && data.resources.length === 0 && data.prompts.length === 0) {
      setStatus('connecting')
    } else {
      setStatus('connected')
      setTools(data.tools)
      setResources(data.resources)
      setResourceTemplates(data.resource_templates)
      setPrompts(data.prompts)
    }
  }

  function handleDisconnect() {
    setStatus('disconnected')
    setTools([]); setResources([]); setResourceTemplates([]); setPrompts([])
    setErrorMsg(null)
  }

  function handleError(msg: string) {
    setStatus('error')
    setErrorMsg(msg)
  }

  function addHistory(e: HistoryEntry) {
    setHistory((prev) => [...prev, e])
  }

  const tabCount: Partial<Record<Tab, number>> = {
    tools: tools.length,
    resources: resources.length + resourceTemplates.length,
    prompts: prompts.length,
    history: history.length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Page header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', height: 44, flexShrink: 0,
        background: 'var(--brand)',
        borderBottom: '1px solid rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/brand-icon.svg" alt="navanVoyageAI" style={{ width: 28, height: 19, flexShrink: 0 }} />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: '0.02em' }}>navanVoyageAI</span>
          <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
          <span style={{ color: '#D97706', fontWeight: 700, fontSize: 13, letterSpacing: '0.02em' }}>🔌 MCP Inspector</span>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', fontSize: 12, fontWeight: 600,
            color: 'rgba(255,255,255,0.75)', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.25)', borderRadius: 'var(--r-md)',
            cursor: 'pointer', letterSpacing: '0.03em', transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.55)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
        >
          ← Back to Chat
        </button>
      </header>

    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: 'var(--bg-page)' }}>
      <ConnPanel
        status={status}
        url={serverUrl}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onError={handleError}
      />

      {/* Main panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0, padding: '0 8px' }}>
          {TABS.map((t) => {
            const active = t.id === activeTab
            const count = tabCount[t.id]
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '10px 14px', fontSize: 'var(--text-sm)', fontWeight: active ? 600 : 400,
                  color: active ? '#D97706' : 'var(--text-muted)',
                  background: 'transparent', border: 'none',
                  borderBottom: active ? '2px solid #D97706' : '2px solid transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'color 0.12s, border-color 0.12s',
                  marginBottom: -1,
                }}
              >
                {t.label}
                {count != null && count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 5px',
                    borderRadius: 'var(--r-full)',
                    background: active ? 'rgba(217,119,6,0.12)' : 'var(--bg-page)',
                    color: active ? '#D97706' : 'var(--text-dim)',
                    border: `1px solid ${active ? 'rgba(217,119,6,0.3)' : 'var(--border)'}`,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}

          {/* Error banner */}
          {errorMsg && (
            <div style={{ marginLeft: 'auto', marginRight: 8, fontSize: 'var(--text-xs)', color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', padding: '3px 10px', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {errorMsg}
            </div>
          )}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)' }}>
          {activeTab === 'tools' && (
            <ToolsTab tools={tools} serverUrl={serverUrl} onHistoryEntry={addHistory} />
          )}
          {activeTab === 'resources' && (
            <ResourcesTab resources={resources} resourceTemplates={resourceTemplates} serverUrl={serverUrl} onHistoryEntry={addHistory} />
          )}
          {activeTab === 'prompts' && (
            <PromptsTab prompts={prompts} serverUrl={serverUrl} onHistoryEntry={addHistory} />
          )}
          {activeTab === 'history' && (
            <HistoryTab entries={history} onClear={() => setHistory([])} />
          )}
        </div>
      </div>
    </div>
    </div>
  )
}
