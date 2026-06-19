import { useState } from 'react'
import type { User } from '@/types/nva'
import { BUILTIN_THEMES, applyTheme, loadSavedTheme, saveTheme } from '@/services/themes'
import ModelSelectionTab from './ModelSelectionTab'
import AuditLogTab from './AuditLogTab'
import BillingTab from './BillingTab'
import EvalMetricsTab from './EvalMetricsTab'
import ObservabilityTab from './ObservabilityTab'
import ChatHistoryTab from './ChatHistoryTab'
import AgentPromptsTab from './AgentPromptsTab'
import PolicyTab from './PolicyTab'
import NotificationsTab from './NotificationsTab'
import EmployeeTab from './EmployeeTab'
import MockDataTab from './MockDataTab'
import McpBindingsTab from './McpBindingsTab'

const TABS = [
  { id: 'models',        label: 'Model Selection' },
  { id: 'prompts',       label: 'Agent Prompts' },
  { id: 'mcp_bindings',  label: 'MCP Bindings' },
  { id: 'policy',        label: 'Policy' },
  { id: 'employee',      label: 'Employee Data' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'audit',         label: 'Audit Log' },
  { id: 'billing',       label: 'Billing' },
  { id: 'eval',          label: 'Eval Metrics' },
  { id: 'observe',       label: 'Observability' },
  { id: 'history',       label: 'Chat History' },
  { id: 'mock_data',     label: 'Mock Data' },
] as const

type TabId = typeof TABS[number]['id']

interface AdminPanelProps {
  user: User
  onClose: () => void
}

export default function AdminPanel({ user, onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('models')
  const [promptsDirty, setPromptsDirty] = useState(false)
  const [isDark, setIsDark] = useState(() => loadSavedTheme().dark)

  function toggleDark() {
    const next = isDark
      ? BUILTIN_THEMES.find((t) => !t.dark) ?? BUILTIN_THEMES[0]
      : BUILTIN_THEMES.find((t) => t.dark) ?? BUILTIN_THEMES[2]
    applyTheme(next)
    saveTheme(next.id)
    setIsDark(next.dark)
  }

  const isAdmin = user.role === 'admin'

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '75vw',
          height: '75vh',
          boxShadow: '0 4px 32px rgba(0,0,0,0.22)',
          background: 'var(--bg-surface)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'var(--brand)', color: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚙</span>
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', letterSpacing: '0.03em' }}>Admin Console</span>
            <span style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', background: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '0.04em', marginLeft: 4 }}>
              {user.role.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                borderRadius: 'var(--r-md)',
                padding: '3px 10px',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
              }}
            >
              {isDark ? '☀ Light' : '🌙 Dark'}
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1, opacity: 0.8 }}
              aria-label="Close admin panel"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab row */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', flexShrink: 0, background: 'var(--bg-surface)', overflowX: 'auto' }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id
            const showDot = tab.id === 'prompts' && promptsDirty
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                  whiteSpace: 'nowrap',
                  border: 'none',
                  borderBottom: active ? '2px solid var(--brand)' : '2px solid transparent',
                  marginBottom: -2,
                  color: active ? 'var(--brand)' : 'var(--text-muted)',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                {showDot && <span style={{ color: 'var(--brand)', marginRight: 4 }}>●</span>}
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {!isAdmin ? (
            <AccessRestricted />
          ) : (
            <TabContent tab={activeTab} onPromptsDirty={setPromptsDirty} />
          )}
        </div>
      </div>
    </div>
  )
}

function AccessRestricted() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
      <span style={{ fontSize: 40 }}>🔒</span>
      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Access Restricted</p>
      <p style={{ fontSize: 'var(--text-xs)' }}>This section is available to admin users only.</p>
    </div>
  )
}

function TabContent({ tab, onPromptsDirty }: { tab: TabId; onPromptsDirty: (d: boolean) => void }) {
  switch (tab) {
    case 'models':        return <ModelSelectionTab />
    case 'prompts':       return <AgentPromptsTab onDirty={onPromptsDirty} />
    case 'mcp_bindings':  return <McpBindingsTab />
    case 'policy':        return <PolicyTab />
    case 'employee':      return <EmployeeTab />
    case 'notifications': return <NotificationsTab />
    case 'audit':         return <AuditLogTab />
    case 'billing':       return <BillingTab />
    case 'eval':          return <EvalMetricsTab />
    case 'observe':       return <ObservabilityTab />
    case 'history':       return <ChatHistoryTab />
    case 'mock_data':     return <MockDataTab />
  }
}
