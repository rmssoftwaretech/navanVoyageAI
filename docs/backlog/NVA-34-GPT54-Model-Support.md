# NVA-34 — GPT-5.4 Model Support in Azure OpenAI & OpenAI Providers

**Epic:** EPIC-OBS  
**Points:** 1  
**Status:** ✅ Done  
**Sprint:** Sprint NVA-G

---

## Goal

Add `gpt-5.4` as the first (default) model option in both the `azure_openai` and `openai` provider dropdowns in the Admin → Model Selection tab.

---

## Problem

The Admin Model Selection tab only offered `gpt-4o` and `gpt-4o-mini` under Azure OpenAI and OpenAI. As Azure OpenAI rolls out GPT-5.4 to enterprise tenants, the demo platform should reflect the latest available model tier.

---

## Solution

Add `'gpt-5.4'` as the first entry in `PROVIDER_MODELS['azure_openai']` and `PROVIDER_MODELS['openai']` in `ModelSelectionTab.tsx`. No backend change is required — the model string flows through `agents.json` into the Azure OpenAI SDK `model=` parameter unchanged.

---

## Files Changed

| File | Action |
|---|---|
| `frontend/src/components/admin/ModelSelectionTab.tsx` | `PROVIDER_MODELS['azure_openai']` and `PROVIDER_MODELS['openai']` — prepend `'gpt-5.4'` |

---

## Acceptance Criteria

| # | Check |
|---|---|
| 1 | Azure OpenAI provider dropdown shows gpt-5.4 as the first option |
| 2 | OpenAI provider dropdown shows gpt-5.4 as the first option |
| 3 | Saving gpt-5.4 writes `"model": "gpt-5.4"` to `agents.json` |
| 4 | No TypeScript errors; `npx tsc --noEmit` exits 0 |

---

## Out of Scope

- API key / endpoint validation for GPT-5.4 availability
- Fallback logic if the model is not provisioned on the tenant
