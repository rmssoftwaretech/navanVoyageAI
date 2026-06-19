import { useEffect, useRef, useState } from 'react'
import { getEmbeddingModels, setEmbeddingModel, getEmployeeDocuments, clearEmployeeDocuments, type EmbeddingModel, type EmbeddingConfig } from '@/services/admin'

// ── Embedding model picker (shared UI) ───────────────────────────────────────

const PROVIDER_COLORS: Record<string, { bg: string; text: string }> = {
  'azure-openai': { bg: '#dbeafe', text: '#1d4ed8' },
  'openai':       { bg: '#e0e7ff', text: '#4338ca' },
  'local':        { bg: '#dcfce7', text: '#15803d' },
}

export function EmbeddingModelPicker() {
  const [cfg, setCfg] = useState<EmbeddingConfig | null>(null)
  const [available, setAvailable] = useState<EmbeddingModel[]>([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getEmbeddingModels().then(({ selected, available: av }) => {
      setCfg(selected)
      setAvailable(av)
    }).catch(() => {})
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function select(model: EmbeddingModel) {
    const next: EmbeddingConfig = { selected_model: model.id, provider: model.provider, dimension: model.dimension }
    setSaving(true)
    try {
      const res = await setEmbeddingModel(next)
      setCfg(res.selected)
    } catch { /* ignore */ }
    finally { setSaving(false); setOpen(false) }
  }

  const provColor = cfg ? (PROVIDER_COLORS[cfg.provider] ?? { bg: '#f3f4f6', text: '#6b7280' }) : { bg: '#f3f4f6', text: '#6b7280' }
  const active = cfg ? available.find((m) => m.id === cfg.selected_model && m.provider === cfg.provider) : null

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '5px 10px', fontSize: 'var(--text-xs)',
          background: 'var(--bg-page)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)', cursor: 'pointer',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="var(--brand)" strokeWidth="1.5"/>
          <circle cx="10" cy="10" r="4" fill="var(--brand)"/>
          <circle cx="10" cy="2"  r="1.5" fill="var(--brand)"/>
          <circle cx="10" cy="18" r="1.5" fill="var(--brand)"/>
          <circle cx="2"  cy="10" r="1.5" fill="var(--brand)"/>
          <circle cx="18" cy="10" r="1.5" fill="var(--brand)"/>
        </svg>
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Embedding:</span>
        {cfg ? (
          <>
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 'var(--r-sm)', background: provColor.bg, color: provColor.text, fontWeight: 700, textTransform: 'uppercase' }}>
              {cfg.provider}
            </span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{active?.label ?? cfg.selected_model}</span>
            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{cfg.dimension}d</span>
          </>
        ) : (
          <span style={{ color: 'var(--text-dim)' }}>Loading…</span>
        )}
        <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{saving ? '…' : '▾'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
          background: 'var(--bg-raised)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)',
          minWidth: 280, overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Select Embedding Model
          </div>
          {available.map((m) => {
            const isActive = cfg?.selected_model === m.id && cfg?.provider === m.provider
            const pc = PROVIDER_COLORS[m.provider] ?? { bg: '#f3f4f6', text: '#6b7280' }
            return (
              <button
                key={`${m.provider}/${m.id}`}
                onClick={() => select(m)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '7px 10px', background: isActive ? 'var(--brand-light)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderBottom: '1px solid var(--border-light)',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? 'var(--brand)' : 'var(--border)', flexShrink: 0 }} />
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 'var(--r-sm)', background: pc.bg, color: pc.text, fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>
                  {m.provider}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: isActive ? 'var(--brand)' : 'var(--text-primary)', fontWeight: isActive ? 700 : 400, flex: 1 }}>
                  {m.label}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{m.dimension}d</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  company_executive:    '#be185d',
  executive:            '#b45309',
  sales_executive:      '#15803d',
  conference_traveller: '#0e7490',
  international:        '#6d28d9',
  all:                  '#6b7280',
}

function StatsBar({ docs }: { docs: Record<string, unknown>[] }) {
  const employees = docs.filter((d) => d.employee_id)
  if (employees.length === 0) return null

  const byDept: Record<string, number> = {}
  const byTier: Record<string, number> = {}
  for (const e of employees) {
    const dept = (e.department as string) ?? 'Other'
    const tier = (e.travel_tier as string) ?? 'all'
    byDept[dept] = (byDept[dept] ?? 0) + 1
    byTier[tier] = (byTier[tier] ?? 0) + 1
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      {/* Summary row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px', background: 'var(--bg-page)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>{employees.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employees</div>
        </div>
        <div style={{ width: 1, height: 32, background: 'var(--border)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{Object.keys(byDept).length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Departments</div>
        </div>
        <div style={{ width: 1, height: 32, background: 'var(--border)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{docs.filter((d) => !d.employee_id).length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Doc Files</div>
        </div>
        <div style={{ flex: 1 }} />
        {/* Tier pills */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {Object.entries(byTier).sort((a, b) => b[1] - a[1]).map(([tier, count]) => (
            <span key={tier} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 'var(--r-full)', background: `${TIER_COLORS[tier] ?? '#6b7280'}18`, color: TIER_COLORS[tier] ?? '#6b7280', fontWeight: 600 }}>
              {tier.replace('_', ' ')}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* Dept breakdown */}
      <div style={{ padding: '8px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {Object.entries(byDept).sort((a, b) => b[1] - a[1]).map(([dept, count]) => (
          <div key={dept} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
            <div style={{ height: 5, width: Math.max(14, count * 4), background: 'var(--brand)', borderRadius: 3, opacity: 0.6 }} />
            <span>{dept} <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{count}</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Employee grid (table) ─────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10,
  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em',
  borderBottom: '2px solid var(--border)', background: 'var(--bg-page)',
  whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1,
}

function EmployeeGridRow({ doc, onDelete }: { doc: Record<string, unknown>; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const tier = (doc.travel_tier as string) ?? ''
  const tierColor = TIER_COLORS[tier] ?? '#6b7280'
  const isEmployee = !!doc.employee_id

  if (!isEmployee) return null

  return (
    <>
      <tr
        onClick={() => setExpanded((x) => !x)}
        style={{ cursor: 'pointer', background: expanded ? 'var(--bg-hover)' : undefined }}
      >
        <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border-light)', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
          {String(doc.employee_id)}
        </td>
        <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: `${tierColor}20`, border: `1.5px solid ${tierColor}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 700, color: tierColor,
            }}>
              {String(doc.first_name ?? '?')[0]}{String(doc.last_name ?? '?')[0]}
            </div>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>{String(doc.full_name ?? '')}</span>
          </div>
        </td>
        <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{String(doc.department ?? '—')}</td>
        <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{String(doc.job_title ?? '—')}</td>
        <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 'var(--r-full)', background: `${tierColor}18`, color: tierColor, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {tier.replace(/_/g, ' ') || '—'}
          </span>
        </td>
        <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{String(doc.office_location ?? '—')}</td>
        <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-xs)', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{String(doc.preferred_airline ?? '—')}</td>
        <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 'var(--r-full)', background: doc.active ? 'var(--success-bg)' : 'var(--border)', color: doc.active ? 'var(--success)' : 'var(--text-dim)', fontWeight: 600 }}>
            {doc.active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{expanded ? '▲' : '▼'}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              style={{ fontSize: 9, padding: '1px 5px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--danger)' }}
            >✕</button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9} style={{ padding: 0, borderBottom: '1px solid var(--border)' }}>
            <pre style={{ margin: 0, padding: '8px 14px', fontSize: 10, fontFamily: 'var(--font-mono)', background: '#0f172a', color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.5 }}>
              {JSON.stringify(doc, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  )
}

function DocFileRow({ doc, onDelete }: { doc: Record<string, unknown>; onDelete: () => void }) {
  return (
    <tr>
      <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border-light)' }}>
        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 'var(--r-sm)', background: '#3b82f620', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase' }}>
          {String(doc.format ?? 'doc')}
        </span>
      </td>
      <td colSpan={6} style={{ padding: '5px 10px', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: 600 }}>
        {String(doc.source_file ?? doc.doc_id ?? 'document')}
      </td>
      <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border-light)', fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
        {doc.uploaded_at ? new Date(String(doc.uploaded_at)).toLocaleDateString() : ''}
      </td>
      <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border-light)' }}>
        <button
          onClick={onDelete}
          style={{ fontSize: 9, padding: '1px 5px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--danger)' }}
        >✕</button>
      </td>
    </tr>
  )
}

// ── Main EmployeeTab ──────────────────────────────────────────────────────────

const EMPLOYEE_API = '/api/admin/employee-documents'

async function uploadEmployeeFile(file: File): Promise<unknown> {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch(EMPLOYEE_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('nva_token')}` },
    body: fd,
  })
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? 'Upload failed')
  }
  return r.json()
}

export default function EmployeeTab() {
  const [docs, setDocs] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [filter, setFilter] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try { setDocs((await getEmployeeDocuments()) as Record<string, unknown>[]) }
    catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleUpload(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['json', 'md', 'csv'].includes(ext)) {
      setUploadError('Only .json, .md, and .csv files are supported')
      return
    }
    setUploading(true)
    setUploadError(null)
    try { await uploadEmployeeFile(file); await load() }
    catch (e) { setUploadError(e instanceof Error ? e.message : 'Upload failed') }
    finally { setUploading(false) }
  }

  async function handleDelete(doc: Record<string, unknown>) {
    const id = String(doc.doc_id ?? doc.employee_id ?? '')
    try {
      await fetch(`${EMPLOYEE_API}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('nva_token')}` },
      })
      setDocs((prev) => prev.filter((d) => d.doc_id !== doc.doc_id && d.employee_id !== doc.employee_id))
    } catch { /* ignore */ }
  }

  async function handleClearAll() {
    if (!confirm('Clear all employee data? This cannot be undone.')) return
    setClearing(true)
    try { await clearEmployeeDocuments(); setDocs([]) }
    catch { /* ignore */ }
    finally { setClearing(false) }
  }

  const filtered = filter
    ? docs.filter((d) => JSON.stringify(d).toLowerCase().includes(filter.toLowerCase()))
    : docs

  const employees = docs.filter((d) => d.employee_id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            Employee Data (RAG)
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Upload employee records for travel policy enforcement and personalization. Stored as vector context for the OrchestratorAgent.
          </p>
        </div>
        <EmbeddingModelPicker />
      </div>

      {/* Stats */}
      {employees.length > 0 && <StatsBar docs={docs} />}

      {/* Upload zone */}
      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f) }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--border)'}`,
          borderRadius: 'var(--r-md)', padding: '20px 16px', textAlign: 'center',
          cursor: 'pointer', background: dragOver ? 'var(--brand-light)' : 'var(--bg-page)', transition: 'all 0.15s',
        }}
      >
        <input ref={fileRef} type="file" accept=".json,.md,.csv" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }} />
        {uploading ? (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--brand)' }}>Ingesting…</p>
        ) : (
          <>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 4 }}>
              Drop employee file here, or click to browse
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
              <strong>.json</strong> array (one object per employee) · <strong>.csv</strong> (headers = field names) · <strong>.md</strong> (narrative)
            </p>
          </>
        )}
      </div>

      {uploadError && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', padding: '6px 10px', background: 'var(--danger-bg)', borderRadius: 'var(--r-sm)' }}>
          {uploadError}
        </p>
      )}

      {/* Controls row */}
      {docs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter employees…"
            style={{ flex: 1, fontSize: 'var(--text-xs)', padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg-page)', color: 'var(--text-primary)', outline: 'none' }}
          />
          <span style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{filtered.length} / {docs.length}</span>
          <button onClick={load} style={{ fontSize: 'var(--text-xs)', padding: '4px 9px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--text-muted)' }}>↺</button>
          <button
            onClick={handleClearAll}
            disabled={clearing}
            style={{ fontSize: 'var(--text-xs)', padding: '4px 10px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', cursor: clearing ? 'not-allowed' : 'pointer', color: 'var(--danger)', opacity: clearing ? 0.6 : 1 }}
          >
            {clearing ? 'Clearing…' : '✕ Clear All'}
          </button>
        </div>
      )}

      {/* Schema guide */}
      <details style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>JSON schema guide</summary>
        <pre style={{ fontSize: 10, background: '#0f172a', color: '#e2e8f0', padding: '8px 10px', borderRadius: 'var(--r-md)', marginTop: 6, overflow: 'auto' }}>{`[{
  "employee_id": "EMP-001",
  "full_name": "Maria Garcia",
  "email": "maria.garcia@company.com",
  "department": "Sales",
  "job_title": "Account Executive",
  "travel_tier": "sales_executive",
  "office_location": "San Francisco, CA",
  "preferred_airline": "United Airlines",
  "preferred_hotel": "Marriott",
  "frequent_flyer": { "United Airlines": "FF1234567" }
}]`}</pre>
        <p style={{ marginTop: 6 }}>
          <strong>travel_tier</strong> values: <code>all</code> · <code>sales_executive</code> · <code>executive</code> · <code>company_executive</code> · <code>conference_traveller</code> · <code>international</code>
        </p>
      </details>

      {/* Document list */}
      {loading && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Loading…</p>}

      {!loading && docs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>👥</p>
          <p style={{ fontSize: 'var(--text-xs)', fontStyle: 'italic' }}>
            No employee data ingested yet. Upload <strong>data/employees.json</strong> to get started.
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxHeight: 440, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
              <thead>
                <tr>
                  {['EMP ID', 'Name', 'Department', 'Title', 'Travel Tier', 'Location', 'Airline', 'Status', ''].map((h) => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc, i) =>
                  doc.employee_id
                    ? <EmployeeGridRow key={String(doc.doc_id ?? doc.employee_id ?? i)} doc={doc} onDelete={() => handleDelete(doc)} />
                    : <DocFileRow key={String(doc.doc_id ?? i)} doc={doc} onDelete={() => handleDelete(doc)} />
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && filter && filtered.length === 0 && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>No matches for "{filter}"</p>
      )}
    </div>
  )
}
