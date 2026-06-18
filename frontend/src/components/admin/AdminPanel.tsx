import { useState } from 'react'
import type { User } from '@/types/nva'
import ModelSelectionTab from './ModelSelectionTab'

const TABS = [
  { id: 'models',       label: 'Model Selection' },
  { id: 'audit',        label: 'Audit Log' },
  { id: 'billing',      label: 'Billing' },
  { id: 'eval',         label: 'Eval Metrics' },
  { id: 'observe',      label: 'Observability' },
  { id: 'history',      label: 'Chat History' },
] as const

type TabId = typeof TABS[number]['id']

interface AdminPanelProps {
  user: User
  onClose: () => void
}

export default function AdminPanel({ user, onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('models')

  const isAdmin = user.role === 'admin'

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className="flex flex-col bg-white"
        style={{
          width: '75vw',
          height: '75vh',
          boxShadow: '0 4px 32px rgba(0,0,0,0.22)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-3 flex-shrink-0"
          style={{ background: 'var(--navy)', color: '#fff' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">⚙</span>
            <span className="font-semibold text-sm tracking-wide">Admin Console</span>
            <span
              className="text-xs px-2 py-0.5 ml-2"
              style={{
                background: 'var(--gold)',
                color: '#fff',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              {user.role.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-lg leading-none hover:opacity-70"
            style={{ color: '#fff' }}
            aria-label="Close admin panel"
          >
            ✕
          </button>
        </div>

        {/* Tab row */}
        <div
          className="flex flex-shrink-0"
          style={{ borderBottom: '2px solid var(--border)' }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-5 py-2 text-xs font-semibold tracking-wide transition-colors"
                style={{
                  borderBottom: active ? '2px solid var(--navy)' : '2px solid transparent',
                  marginBottom: -2,
                  color: active ? 'var(--navy)' : 'var(--text-muted)',
                  background: 'transparent',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab body */}
        <div className="flex-1 overflow-auto p-6">
          {!isAdmin ? (
            <AccessRestricted />
          ) : (
            <TabContent tab={activeTab} />
          )}
        </div>
      </div>
    </div>
  )
}

function AccessRestricted() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-muted)' }}>
      <span className="text-4xl">🔒</span>
      <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>Access Restricted</p>
      <p className="text-xs">This section is available to admin users only.</p>
    </div>
  )
}

function TabContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'models':   return <ModelSelectionTab />
    case 'audit':    return <AuditLogTab />
    case 'billing':  return <BillingTab />
    case 'eval':     return <EvalMetricsTab />
    case 'observe':  return <ObservabilityTab />
    case 'history':  return <ChatHistoryTab />
  }
}

/* ── Stub tab bodies — replaced in NVA-06 through NVA-20 ── */

function AuditLogTab() {
  return <StubTab label="Audit Log" icon="📋" story="NVA-06" />
}

function BillingTab() {
  return <StubTab label="Billing" icon="💳" story="NVA-07" />
}

function EvalMetricsTab() {
  return <StubTab label="Eval Metrics" icon="📊" story="NVA-15" />
}

function ObservabilityTab() {
  return <StubTab label="Observability" icon="🔭" story="NVA-16" />
}

function ChatHistoryTab() {
  return <StubTab label="Chat History" icon="💬" story="NVA-20" />
}

function StubTab({ label, icon, story }: { label: string; icon: string; story: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-muted)' }}>
      <span className="text-4xl">{icon}</span>
      <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>{label}</p>
      <p className="text-xs">Coming soon — implemented in {story}</p>
    </div>
  )
}
