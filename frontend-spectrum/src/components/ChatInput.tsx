import { useState } from 'react'
import { Button, TextArea } from '@react-spectrum/s2'

interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '12px 16px',
        borderTop: '1px solid var(--spectrum-gray-200, #e2e8f0)',
        background: '#fff',
        alignItems: 'flex-end',
      }}
    >
      <div style={{ flex: 1 }} onKeyDown={handleKeyDown}>
        <TextArea
          label="Message"
          labelPosition="side"
          value={value}
          onChange={setValue}
          isDisabled={disabled}
          placeholder="Ask about flights, hotels, or travel policy…"
          aria-label="Chat message"
        />
      </div>
      <Button
        variant="accent"
        onPress={handleSend}
        isDisabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        Send
      </Button>
    </div>
  )
}
