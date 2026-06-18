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
      <Dialog isDismissible>
        <Heading slot="title">Admin Console</Heading>
        <Content>
          <Tabs aria-label="Admin tabs">
            <TabList>
              <Tab id="models">Model Selection</Tab>
              <Tab id="audit">Audit Log</Tab>
              <Tab id="billing">Billing</Tab>
              <Tab id="eval">Eval Metrics</Tab>
            </TabList>
            <TabPanel id="models">
              <AdminTabPlaceholder label="Model Selection" />
            </TabPanel>
            <TabPanel id="audit">
              <AdminTabPlaceholder label="Audit Log" />
            </TabPanel>
            <TabPanel id="billing">
              <AdminTabPlaceholder label="Billing" />
            </TabPanel>
            <TabPanel id="eval">
              <AdminTabPlaceholder label="Eval Metrics" />
            </TabPanel>
          </Tabs>
        </Content>
      </Dialog>
    </DialogTrigger>
  )
}

function AdminTabPlaceholder({ label }: { label: string }) {
  return (
    <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
      <p style={{ fontWeight: 600, color: '#1E3A5F' }}>{label}</p>
      <p style={{ fontSize: 12, marginTop: 4 }}>
        Full implementation in the primary Tailwind frontend at{' '}
        <a href="http://localhost:5210" target="_blank" rel="noopener noreferrer">
          localhost:5210
        </a>
      </p>
    </div>
  )
}
