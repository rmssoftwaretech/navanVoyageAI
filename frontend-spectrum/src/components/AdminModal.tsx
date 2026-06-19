import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Content,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from '@react-spectrum/s2'
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
  if (user.role !== 'admin') return null

  return (
    <DialogTrigger>
      <Button variant="secondary" UNSAFE_style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }}>
        ⚙ Admin
      </Button>
      <Dialog isDismissible UNSAFE_style={{ width: '75vw', maxWidth: '75vw' }}>
        <Heading slot="title">Admin Console</Heading>
        <Content>
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
        </Content>
      </Dialog>
    </DialogTrigger>
  )
}
