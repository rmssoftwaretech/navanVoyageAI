interface AcmePersonaChipsProps {
  persona: string
  onSend: (text: string) => void
  disabled?: boolean
}

const PERSONA_CHIPS: Record<string, { label: string; chips: { icon: string; text: string }[] }> = {
  steve: {
    label: 'Steve M — Executive President · Bengaluru Office Visit',
    chips: [
      { icon: '📊', text: 'Book the complete trip to Bengaluru — business class flight, 5-star hotel, and luxury car for July 14–21' },
      { icon: '✈', text: 'Search business class flights from San Francisco SFO to Bengaluru BLR, departing July 14, returning July 21' },
      { icon: '🏨', text: 'Find a 5-star hotel in Bengaluru for July 14–21, budget up to $600 per night' },
      { icon: '🚗', text: 'Reserve a luxury car rental in Bengaluru from July 14 to July 21' },
      { icon: '📋', text: 'What does my Executive travel policy cover for international trips?' },
      { icon: '💰', text: 'What is the estimated total cost of my Bengaluru office visit — flight, hotel, and car?' },
    ],
  },
  rick: {
    label: 'Rick M — Sales Executive · Zava Corp, New York',
    chips: [
      { icon: '🤝', text: 'Book the complete Zava Corp visit — flight, hotel, and car for New York August 4–7' },
      { icon: '✈', text: 'Find flights from San Francisco SFO to New York JFK, departing August 4, returning August 7' },
      { icon: '🏨', text: 'Book a 4-star hotel near Midtown Manhattan for August 4–7, under $350 per night' },
      { icon: '🚗', text: 'Reserve a full-size rental car at JFK airport from August 4 to August 7' },
      { icon: '📋', text: 'What does my Sales travel policy cover for domestic customer visits?' },
      { icon: '💰', text: 'What is the estimated total cost of my New York trip for the Zava Corp visit?' },
    ],
  },
  nicholas: {
    label: 'Nicholas J — Engineer · AWS Summit Chicago',
    chips: [
      { icon: '🎟', text: 'Book my AWS Summit Chicago trip — economy flight and hotel for September 9–12' },
      { icon: '✈', text: 'Find economy flights from San Francisco SFO to Chicago ORD, departing September 9, returning September 12' },
      { icon: '🏨', text: 'Book the AWS Summit conference hotel in Chicago for September 9–12, under $220 per night' },
      { icon: '📋', text: 'What does my Conference travel policy cover for AWS Summit attendance?' },
      { icon: '📝', text: 'What approvals do I need for conference travel to AWS Summit?' },
      { icon: '🔎', text: 'Show me economy flight options from SFO to ORD for September 9' },
    ],
  },
}

export default function AcmePersonaChips({ persona, onSend, disabled }: AcmePersonaChipsProps) {
  const data = PERSONA_CHIPS[persona]
  if (!data) return null

  return (
    <div style={{
      width: '100%',
      maxWidth: 560,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 20,
          marginBottom: 12,
        }}>
          <span style={{ fontSize: 14 }}>⬡</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8', letterSpacing: '0.02em' }}>
            ACME CORP TRAVEL
          </span>
        </div>
        <p style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          Welcome back
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
          {data.label}
        </p>
      </div>

      {/* Prompt chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.chips.map((chip) => (
          <button
            key={chip.text}
            disabled={disabled}
            onClick={() => onSend(chip.text)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'border-color 0.15s, background 0.15s',
              opacity: disabled ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#1A56DB'
                ;(e.currentTarget as HTMLButtonElement).style.background = '#F0F7FF'
              }
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)'
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{chip.icon}</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {chip.text}
            </span>
          </button>
        ))}
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textAlign: 'center', margin: 0 }}>
        Click a prompt above or type your own message below
      </p>
    </div>
  )
}
