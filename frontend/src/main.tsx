import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { applyTheme, loadSavedTheme } from './services/themes'

// Apply saved theme synchronously before first render
applyTheme(loadSavedTheme())

// Accept auth handshake from Acme Corp parent frame (cross-origin dev support)
window.addEventListener('message', (e: MessageEvent) => {
  if (e.data?.type !== 'nva_acme_init') return
  try {
    if (e.data.token) localStorage.setItem('nva_token', e.data.token)
    if (e.data.persona) localStorage.setItem('nva_acme_persona', e.data.persona)
    if (e.data.token) window.location.replace('/')
  } catch { /* ignore */ }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
