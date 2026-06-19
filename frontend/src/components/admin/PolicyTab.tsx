import { useEffect, useRef, useState } from 'react'
import { downloadJson } from '@/utils/export'
import {
  getStructuredPolicies,
  updateStructuredPolicy,
  createStructuredPolicy,
  deleteStructuredPolicy,
  type StructuredPolicy,
} from '@/services/admin'
import { EmbeddingModelPicker } from './EmployeeTab'

// ── Role badge colours ────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  all:                  { bg: '#e0f2fe', text: '#0369a1', label: 'All Employees' },
  international:        { bg: '#ede9fe', text: '#6d28d9', label: 'International' },
  executive:            { bg: '#fef3c7', text: '#b45309', label: 'VP / Director' },
  company_executive:    { bg: '#fff1f2', text: '#be185d', label: 'Company Executive' },
  sales_executive:      { bg: '#dcfce7', text: '#15803d', label: 'Sales Executive' },
  conference_traveller: { bg: '#e0f7fa', text: '#0e7490', label: 'Conference Traveller' },
}

function RoleBadge({ applies_to }: { applies_to: string }) {
  const cfg = ROLE_COLORS[applies_to] ?? { bg: '#f3f4f6', text: '#6b7280', label: applies_to }
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 'var(--r-full)',
      background: cfg.bg, color: cfg.text,
      fontWeight: 700, letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

// ── Policy limits summary ─────────────────────────────────────────────────────

function PolicySummary({ policy }: { policy: StructuredPolicy }) {
  const f = policy.flight
  const h = policy.hotel
  const c = policy.car_rental
  const chips: { label: string; value: string; color?: string }[] = []

  if (f?.allowed_classes?.length) chips.push({ label: 'Cabin', value: f.allowed_classes.join(' · ') })
  if (f?.max_roundtrip_usd) chips.push({ label: 'Max R/T', value: `$${f.max_roundtrip_usd.toLocaleString()}` })
  if (h?.max_nightly_rate_usd) chips.push({ label: 'Hotel/night', value: `$${h.max_nightly_rate_usd}` })
  if (policy.meal_per_diem_usd) chips.push({ label: 'Meal/day', value: `$${policy.meal_per_diem_usd}` })
  if (c?.max_daily_rate_usd) chips.push({ label: 'Car/day', value: `$${c.max_daily_rate_usd}` })
  if (f?.min_advance_booking_days != null) chips.push({ label: 'Min advance', value: `${f.min_advance_booking_days}d` })

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
      {chips.map((ch) => (
        <span key={ch.label} style={{
          fontSize: 10, padding: '2px 7px',
          background: 'var(--bg-page)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)',
        }}>
          <span style={{ color: 'var(--text-dim)', marginRight: 3 }}>{ch.label}:</span>
          <span style={{ fontWeight: 600 }}>{ch.value}</span>
        </span>
      ))}
    </div>
  )
}

// ── Policy card with inline JSON editor ───────────────────────────────────────

const NEW_POLICY_TEMPLATE: Omit<StructuredPolicy, 'policy_id'> = {
  name: 'New Policy',
  description: 'Custom travel policy',
  applies_to: 'all',
  flight: {
    allowed_classes: ['Economy'],
    min_advance_booking_days: 7,
    max_one_way_usd: 500,
    max_roundtrip_usd: 900,
    preferred_airlines: [],
  },
  hotel: { max_nightly_rate_usd: 200, allowed_tiers: ['3-star'], preferred_chains: [] },
  car_rental: { allowed_classes: ['Economy', 'Compact'], max_daily_rate_usd: 75 },
  meal_per_diem_usd: 60,
}

interface PolicyCardProps {
  policy: StructuredPolicy
  onSaved: (updated: StructuredPolicy) => void
  onDeleted: (policy_id: string) => void
  isNew?: boolean
  onCancelNew?: () => void
}

function PolicyCard({ policy, onSaved, onDeleted, isNew, onCancelNew }: PolicyCardProps) {
  const [expanded, setExpanded] = useState(isNew ?? false)
  const [editing, setEditing] = useState(isNew ?? false)
  const [draft, setDraft] = useState(JSON.stringify(policy, null, 2))
  const [parseError, setParseError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleDraftChange(val: string) {
    setDraft(val)
    setParseError(null)
    try { JSON.parse(val) } catch (e) { setParseError((e as Error).message) }
  }

  async function handleSave() {
    let parsed: StructuredPolicy
    try {
      parsed = JSON.parse(draft)
    } catch (e) {
      setParseError((e as Error).message)
      return
    }
    setSaving(true)
    setParseError(null)
    try {
      let result: StructuredPolicy
      if (isNew) {
        result = await createStructuredPolicy(parsed)
      } else {
        result = await updateStructuredPolicy(policy.policy_id, parsed)
      }
      onSaved(result)
      setEditing(false)
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(null), 2000)
    } catch {
      setParseError('Save failed — check network or server logs')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit() {
    setDraft(JSON.stringify(policy, null, 2))
    setParseError(null)
    setEditing(true)
    setExpanded(true)
  }

  function handleCancel() {
    setDraft(JSON.stringify(policy, null, 2))
    setParseError(null)
    setEditing(false)
    if (isNew && onCancelNew) onCancelNew()
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    try {
      await deleteStructuredPolicy(policy.policy_id)
      onDeleted(policy.policy_id)
    } catch {
      setParseError('Delete failed')
      setConfirmDelete(false)
    }
  }

  const borderColor = ROLE_COLORS[policy.applies_to]?.text ?? 'var(--border)'

  return (
    <div style={{
      border: `1px solid ${expanded ? borderColor + '60' : 'var(--border)'}`,
      borderRadius: 'var(--r-md)', overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      {/* Card header */}
      <div
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 12px',
          background: expanded ? `${borderColor}08` : 'var(--bg-page)',
          cursor: 'pointer',
          transition: 'background 0.12s',
        }}
        onClick={() => { if (!editing) setExpanded((x) => !x) }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <RoleBadge applies_to={policy.applies_to} />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {policy.name}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              {policy.policy_id}
            </span>
          </div>
          {policy.description && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{policy.description}</p>
          )}
          {!expanded && <PolicySummary policy={policy} />}
        </div>

        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          {saveMsg && (
            <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600, alignSelf: 'center' }}>✓ {saveMsg}</span>
          )}
          {!isNew && !editing && (
            <>
              <button
                onClick={handleEdit}
                style={{ fontSize: 10, padding: '3px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✎ Edit
              </button>
              <button
                onClick={() => downloadJson(`${policy.policy_id}.json`, policy)}
                style={{ fontSize: 10, padding: '3px 7px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ↓
              </button>
              <button
                onClick={handleDelete}
                style={{ fontSize: 10, padding: '3px 8px', background: confirmDelete ? 'var(--danger-bg)' : 'transparent', border: `1px solid ${confirmDelete ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 'var(--r-sm)', cursor: 'pointer', color: confirmDelete ? 'var(--danger)' : 'var(--text-dim)' }}
                onBlur={() => setConfirmDelete(false)}
              >
                {confirmDelete ? 'Confirm?' : '✕'}
              </button>
            </>
          )}
          {!editing && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)', alignSelf: 'center', cursor: 'pointer' }} onClick={() => setExpanded((x) => !x)}>
              {expanded ? '▲' : '▼'}
            </span>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${borderColor}30`, padding: '10px 12px' }}>
          {!editing && <PolicySummary policy={policy} />}

          {/* JSON editor */}
          <div style={{ marginTop: editing ? 0 : 10 }}>
            {editing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>Edit Policy JSON</span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>— changes saved to DB and config file</span>
              </div>
            )}
            <textarea
              readOnly={!editing}
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              spellCheck={false}
              rows={editing ? 28 : 18}
              style={{
                width: '100%', resize: 'vertical',
                fontSize: 11, fontFamily: 'var(--font-mono)',
                background: editing ? '#0f172a' : '#1a2332',
                color: parseError ? '#fca5a5' : '#e2e8f0',
                padding: '10px 12px',
                border: `1px solid ${parseError ? 'var(--danger)' : editing ? 'var(--brand)' : 'transparent'}`,
                borderRadius: 'var(--r-md)',
                outline: 'none',
                lineHeight: 1.5,
                boxSizing: 'border-box',
                cursor: editing ? 'text' : 'default',
              }}
            />
            {parseError && (
              <p style={{ fontSize: 10, color: 'var(--danger)', marginTop: 4 }}>⚠ {parseError}</p>
            )}
          </div>

          {/* Edit action bar */}
          {editing && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <button
                onClick={handleSave}
                disabled={saving || !!parseError}
                style={{
                  padding: '5px 16px', fontSize: 'var(--text-xs)', fontWeight: 600,
                  background: saving || parseError ? 'var(--border)' : 'var(--brand)',
                  color: saving || parseError ? 'var(--text-dim)' : 'white',
                  border: 'none', borderRadius: 'var(--r-sm)', cursor: saving || parseError ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : isNew ? 'Create Policy' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                style={{ padding: '5px 12px', fontSize: 'var(--text-xs)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Policy document (RAG) section ─────────────────────────────────────────────

interface PolicyDoc {
  doc_id: string
  name: string
  format: 'json' | 'md' | 'csv' | string
  uploaded_at: string
  applies_to?: string
  content?: string
  [key: string]: unknown
}

const DOC_API = '/api/admin/policy-documents'

async function fetchDocs(): Promise<PolicyDoc[]> {
  const r = await fetch(DOC_API, { headers: { Authorization: `Bearer ${localStorage.getItem('nva_token')}` } })
  if (!r.ok) throw new Error('Failed to load')
  return r.json()
}
async function deletePolicyDoc(doc_id: string): Promise<void> {
  const r = await fetch(`${DOC_API}/${doc_id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${localStorage.getItem('nva_token')}` },
  })
  if (!r.ok) throw new Error('Delete failed')
}
async function uploadFile(file: File): Promise<unknown> {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch(DOC_API, {
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

function formatBadge(fmt: string) {
  const colors: Record<string, string> = { json: '#3b82f6', md: '#10b981', csv: '#f59e0b' }
  const c = colors[fmt] ?? 'var(--text-muted)'
  return (
    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 'var(--r-sm)', background: `${c}20`, color: c, fontWeight: 700, textTransform: 'uppercase' }}>
      {fmt}
    </span>
  )
}

// ── Main PolicyTab ─────────────────────────────────────────────────────────────

export default function PolicyTab() {
  const [policies, setPolicies] = useState<StructuredPolicy[]>([])
  const [loadingPolicies, setLoadingPolicies] = useState(false)
  const [showNewCard, setShowNewCard] = useState(false)
  const [docs, setDocs] = useState<PolicyDoc[]>([])
  const [docExpanded, setDocExpanded] = useState(false)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadPolicies() {
    setLoadingPolicies(true)
    try {
      setPolicies(await getStructuredPolicies())
    } catch { /* ignore */ }
    finally { setLoadingPolicies(false) }
  }

  async function loadDocs() {
    setLoadingDocs(true)
    setDocError(null)
    try { setDocs(await fetchDocs()) }
    catch { setDocError('Failed to load policy documents') }
    finally { setLoadingDocs(false) }
  }

  useEffect(() => { loadPolicies() }, [])
  useEffect(() => { if (docExpanded) loadDocs() }, [docExpanded])

  async function handleUpload(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['json', 'md', 'csv'].includes(ext)) {
      setUploadError('Only .json, .md, and .csv files are supported')
      return
    }
    setUploading(true)
    setUploadError(null)
    try { await uploadFile(file); await loadDocs() }
    catch (e: unknown) { setUploadError(e instanceof Error ? e.message : 'Upload failed') }
    finally { setUploading(false) }
  }

  function handlePolicySaved(updated: StructuredPolicy) {
    setPolicies((prev) => {
      const idx = prev.findIndex((p) => p.policy_id === updated.policy_id)
      if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next }
      return [...prev, updated]
    })
    setShowNewCard(false)
  }

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Section: Role-Based Policies ─────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
              Role-Based Travel Policies
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Structured policies enforced deterministically by PolicyAgent. Click a card to view or edit inline.
            </p>
            <div style={{ marginTop: 6 }}>
              <EmbeddingModelPicker />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={loadPolicies}
              style={{ fontSize: 'var(--text-xs)', padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ↺
            </button>
            <button
              onClick={() => setShowNewCard(true)}
              disabled={showNewCard}
              style={{ fontSize: 'var(--text-xs)', padding: '4px 10px', background: 'var(--brand)', color: 'white', border: 'none', borderRadius: 'var(--r-sm)', cursor: showNewCard ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: showNewCard ? 0.5 : 1 }}
            >
              + Add Policy
            </button>
          </div>
        </div>

        {/* Role legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {Object.entries(ROLE_COLORS).map(([key, cfg]) => (
            <span key={key} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 'var(--r-full)', background: cfg.bg, color: cfg.text, fontWeight: 600 }}>
              {cfg.label}
            </span>
          ))}
        </div>

        {loadingPolicies && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Loading…</p>}

        {/* New policy card */}
        {showNewCard && (
          <div style={{ marginBottom: 8 }}>
            <PolicyCard
              policy={{ ...NEW_POLICY_TEMPLATE, policy_id: 'NEW' } as StructuredPolicy}
              onSaved={handlePolicySaved}
              onDeleted={() => setShowNewCard(false)}
              isNew
              onCancelNew={() => setShowNewCard(false)}
            />
          </div>
        )}

        {/* Existing policy cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {policies.map((p) => (
            <PolicyCard
              key={p.policy_id}
              policy={p}
              onSaved={handlePolicySaved}
              onDeleted={(id) => setPolicies((prev) => prev.filter((x) => x.policy_id !== id))}
            />
          ))}
        </div>
      </div>

      {/* ── Section: Policy Documents (RAG) — collapsible ────────── */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
        <button
          onClick={() => setDocExpanded((x) => !x)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', background: 'var(--bg-page)',
            border: 'none', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)' }}>
              Policy Documents (RAG Context)
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>
              Upload JSON · Markdown · CSV for LLM context
            </span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{docExpanded ? '▲' : '▼'}</span>
        </button>

        {docExpanded && (
          <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Drop zone */}
            <div
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f) }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 'var(--r-md)', padding: '16px 12px', textAlign: 'center',
                cursor: 'pointer', background: dragOver ? 'var(--brand-light)' : 'var(--bg-page)', transition: 'all 0.15s',
              }}
            >
              <input ref={fileRef} type="file" accept=".json,.md,.csv" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }} />
              {uploading
                ? <p style={{ fontSize: 'var(--text-xs)', color: 'var(--brand)' }}>Uploading…</p>
                : <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Drop policy file or click to browse &nbsp;·&nbsp; <strong>.json</strong> · <strong>.md</strong> · <strong>.csv</strong></p>
              }
            </div>

            {uploadError && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>{uploadError}</p>}
            {docError && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>{docError}</p>}
            {loadingDocs && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Loading…</p>}
            {!loadingDocs && docs.length === 0 && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>No documents uploaded yet.</p>}

            {docs.map((doc) => (
              <div key={doc.doc_id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', cursor: 'pointer', background: 'var(--bg-page)' }}
                  onClick={() => setExpandedDocId(expandedDocId === doc.doc_id ? null : doc.doc_id)}
                >
                  {formatBadge(doc.format)}
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                  {doc.applies_to && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{doc.applies_to}</span>}
                  <button onClick={(e) => { e.stopPropagation(); downloadJson(`${doc.name}.json`, doc) }} style={{ fontSize: 10, padding: '2px 6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--text-muted)' }}>↓</button>
                  <button onClick={async (e) => { e.stopPropagation(); await deletePolicyDoc(doc.doc_id); setDocs((p) => p.filter((d) => d.doc_id !== doc.doc_id)) }} style={{ fontSize: 10, padding: '2px 6px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--danger)' }}>✕</button>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{expandedDocId === doc.doc_id ? '▲' : '▼'}</span>
                </div>
                {expandedDocId === doc.doc_id && (
                  <pre style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: '#0f172a', color: '#e2e8f0', padding: '8px 10px', borderRadius: 0, overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.4, margin: 0, borderTop: '1px solid var(--border)' }}>
                    {doc.content ?? JSON.stringify(doc, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
