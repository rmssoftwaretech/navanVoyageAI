import { useEffect, useRef, useState } from 'react'
import { getToken } from '@/services/auth'

interface TravelAssistantPanelProps {
  personaKey: string
}

export default function TravelAssistantPanel({ personaKey }: TravelAssistantPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)

  // Send auth handshake after iframe loads (supports cross-origin dev mode)
  function sendHandshake() {
    const token = getToken()
    if (!token || !iframeRef.current?.contentWindow) return
    iframeRef.current.contentWindow.postMessage(
      { type: 'nva_acme_init', token, persona: personaKey },
      '*',
    )
  }

  useEffect(() => {
    if (loaded) sendHandshake()
  }, [loaded, personaKey])

  // Derive iframe URL — same origin in Docker (port 3010), fallback for dev
  const nvaOrigin =
    window.location.port === '5212'
      ? 'http://localhost:5210'
      : window.location.origin
  const iframeSrc = `${nvaOrigin}/`

  if (collapsed) {
    return (
      <div className="flex-shrink-0 flex flex-col items-center justify-start pt-4">
        <button
          onClick={() => setCollapsed(false)}
          className="writing-mode-vertical flex items-center gap-2 px-2 py-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          title="Open Travel Assistant"
        >
          ✈ Travel Assistant
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex-shrink-0 flex flex-col border-l border-gray-200 bg-white"
      style={{ width: 440 }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 flex-shrink-0"
        style={{ background: '#1A56DB' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-white text-base">✈</span>
          <span className="text-white font-semibold text-sm">Travel Assistant</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            powered by navanVoyageAI
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-white/70 hover:text-white text-lg leading-none transition-colors"
          title="Collapse panel"
        >
          ×
        </button>
      </div>

      {/* iframe */}
      <div className="flex-1 relative">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-8 h-8 rounded border-2 border-blue-200 border-t-blue-600 animate-spin"
              />
              <span className="text-xs text-gray-400">Loading Travel Assistant…</span>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title="navanVoyageAI Travel Assistant"
          onLoad={() => setLoaded(true)}
          className="w-full h-full border-0"
          style={{ display: loaded ? 'block' : 'none' }}
          allow="same-origin"
        />
      </div>
    </div>
  )
}
