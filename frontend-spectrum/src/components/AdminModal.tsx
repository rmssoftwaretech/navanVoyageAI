import { useState, useEffect, useRef } from 'react'
import { Button, Tabs, TabList, TabPanel, Tab } from '@react-spectrum/s2'
import type { User } from '@/types/nva'
import ModelSelectionTab from './admin/ModelSelectionTab'
import AuditLogTab from './admin/AuditLogTab'
import BillingTab from './admin/BillingTab'
import EvalMetricsTab from './admin/EvalMetricsTab'
import ObservabilityTab from './admin/ObservabilityTab'
import ChatHistoryTab from './admin/ChatHistoryTab'

interface AdminModalProps {
  user: User
}

export default function AdminModal({ user }: AdminModalProps) {
  const [open, setOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (user.role !== 'admin') return null

  return (
    <>
      <Button
        variant="secondary"
        onPress={() => setOpen(true)}
        UNSAFE_style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }}
      >
        ⚙ Admin
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.52)',
              zIndex: 9998,
            }}
          />

          {/* Modal */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '82vw',
              maxWidth: 1200,
              maxHeight: '85vh',
              background: '#ffffff',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 24px 16px',
              borderBottom: '1px solid #e5e7eb',
              flexShrink: 0,
            }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                ⚙ Admin Console
              </h2>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none',
                  borderRadius: 8, cursor: 'pointer',
                  fontSize: 18, color: '#6b7280',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                ✕
              </button>
            </div>

            {/* Scrollable content */}
            <div ref={contentRef} style={{ flex: 1, overflow: 'auto' }}>
              <Tabs aria-label="Admin tabs">
                <TabList>
                  <Tab id="models">Model Selection</Tab>
                  <Tab id="audit">Audit Log</Tab>
                  <Tab id="billing">Billing</Tab>
                  <Tab id="eval">Eval Metrics</Tab>
                  <Tab id="observability">Observability</Tab>
                  <Tab id="history">Chat History</Tab>
                </TabList>
                <TabPanel id="models">
                  <div style={{ padding: '16px 0' }}><ModelSelectionTab /></div>
                </TabPanel>
                <TabPanel id="audit">
                  <div style={{ padding: '16px 0' }}><AuditLogTab /></div>
                </TabPanel>
                <TabPanel id="billing">
                  <div style={{ padding: '16px 0' }}><BillingTab /></div>
                </TabPanel>
                <TabPanel id="eval">
                  <div style={{ padding: '16px 0' }}><EvalMetricsTab /></div>
                </TabPanel>
                <TabPanel id="observability">
                  <div style={{ padding: '16px 0' }}><ObservabilityTab /></div>
                </TabPanel>
                <TabPanel id="history">
                  <div style={{ padding: '16px 0' }}><ChatHistoryTab /></div>
                </TabPanel>
              </Tabs>
            </div>
          </div>
        </>
      )}
    </>
  )
}
