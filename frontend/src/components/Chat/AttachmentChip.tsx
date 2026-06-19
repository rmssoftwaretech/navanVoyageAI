interface AttachmentChipProps {
  filename: string
  onRemove: () => void
}

export default function AttachmentChip({ filename, onRemove }: AttachmentChipProps) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px',
      background: 'var(--brand-light)',
      border: '1px solid var(--brand-medium, var(--brand))',
      borderRadius: 'var(--r-full)',
      fontSize: 'var(--text-xs)',
      color: 'var(--brand)',
      fontWeight: 500,
      maxWidth: 260,
    }}>
      <span style={{ flexShrink: 0 }}>📎</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {filename}
      </span>
      <button
        onClick={onRemove}
        title="Remove attachment"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11, color: 'var(--brand)', padding: 0, lineHeight: 1, flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  )
}
