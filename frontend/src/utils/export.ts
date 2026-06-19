function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => JSON.stringify(String(v ?? ''))
  const csv = [headers.map(escape).join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
  downloadBlob(new Blob([csv], { type: 'text/csv' }), filename)
}

export function downloadJson(filename: string, data: unknown): void {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename)
}
