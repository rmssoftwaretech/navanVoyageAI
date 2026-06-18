import { useRef, useState } from 'react'

interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const content = value.trim()
    if (!content || disabled) return
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    onSend(content)
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <div
      className="flex items-end gap-2 px-4 py-3 flex-shrink-0"
      style={{ borderTop: '1px solid var(--border)', background: 'white' }}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Type your travel query here… (Enter to send, Shift+Enter for newline)"
        className="flex-1 resize-none text-sm px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-400 disabled:opacity-50"
        style={{ fontFamily: 'inherit', minHeight: 38, maxHeight: 160 }}
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="flex-shrink-0 px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
        style={{ background: 'var(--navy)', height: 38 }}
      >
        {disabled ? '…' : '→ Send'}
      </button>
    </div>
  )
}
