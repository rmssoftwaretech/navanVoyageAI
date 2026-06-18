import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, TextField, InlineAlert, Heading, Content } from '@react-spectrum/s2'
import { login } from '@/services/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="nva-login-wrap">
      <div className="nva-login-card">
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✈</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--nva-navy)', fontFamily: 'IBM Plex Sans, sans-serif' }}>
            navanVoyageAI
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
            Corporate Travel Assistant · Spectrum 2
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 16 }}>
            <InlineAlert variant="negative">
              <Heading>Sign-in failed</Heading>
              <Content>{error}</Content>
            </InlineAlert>
          </div>
        )}

        <Form onSubmit={handleSubmit} validationBehavior="native">
          <div style={{ marginBottom: 12 }}>
            <TextField
              label="Username"
              value={username}
              onChange={setUsername}
              isRequired
              autoComplete="username"
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <TextField
              label="Password"
              value={password}
              onChange={setPassword}
              isRequired
              autoComplete="current-password"
              type="password"
            />
          </div>
          <Button
            type="submit"
            variant="accent"
            isDisabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </Form>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 20 }}>
          Demo: admin / traveller · password from <code>.env</code>
        </p>
      </div>
    </div>
  )
}
