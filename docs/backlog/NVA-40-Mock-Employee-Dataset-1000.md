# NVA-40 — Mock Employee Dataset: 1000 Employees Across All Travel Tiers

**Epic:** EPIC-NVA
**Points:** 3
**Status:** ✅ Done
**Sprint:** NVA-H
**Depends on:** NVA-08 (MongoDB schema), seed.py

---

## Goal

Replace the 100-record `data/employees.json` seed file with a production-realistic **1000-employee dataset** covering all six travel tiers defined in the policy engine (POL-001–006). The larger dataset provides meaningful demo variety: executives with premium travel, sales reps with sales-executive allowances, conference travellers with per-event budgets, and a large base of standard domestic employees. The file is stored under `config/` (alongside `policies.json` and `users.json`) and loaded idempotently by `seed.py` on startup.

---

## Problem

| Area | Problem |
|---|---|
| Dataset size | 100 employees is too small for realistic admin tab demos (Audit Log, Billing, Chat History) |
| Tier coverage | Existing data has only 1 `international` employee — unrepresentative for policy demos |
| Demo variety | Too few executive and VP-level personas for policy compliance scenarios |
| File location | `data/employees.json` is outside the config dir — inconsistent with policies.json / users.json |

---

## Travel Tier Distribution (1000 employees)

| Tier | Policy | Count | Representative Roles |
|---|---|---|---|
| `all` | POL-001 Standard Domestic | 420 | Analysts, Coordinators, Specialists, Associates, Managers |
| `international` | POL-002 International | 80 | Global Managers, Regional Directors (EMEA/APAC/LATAM), International Account Managers |
| `executive` | POL-003 Executive | 220 | VPs, SVPs, Directors across all functions |
| `company_executive` | POL-004 Company Executive | 30 | C-suite (CEO/COO/CFO/CTO/CMO/CRO/CHRO/CLO), EVPs, President |
| `sales_executive` | POL-005 Sales Executive | 100 | Sales Directors, Regional Sales Directors, Enterprise Sales, Key Account Managers |
| `conference_traveller` | POL-006 Conference Traveller | 150 | Senior Engineers, Research Scientists, Principal PMs, Senior Data Scientists |
| **Total** | | **1000** | |

---

## Data Schema

Each record mirrors the existing `employees.json` schema with one additional field (`home_airport`):

```json
{
  "employee_id": "EMP-0101",
  "first_name": "Sarah",
  "last_name": "Chen",
  "full_name": "Sarah Chen",
  "email": "sarah.chen@navanvoyage.com",
  "department": "Engineering",
  "job_title": "Principal Software Engineer",
  "travel_tier": "conference_traveller",
  "office_location": "San Francisco, CA",
  "home_airport": "SFO",
  "hire_date": "2019-03-15",
  "manager": "James Wilson",
  "cost_center": "CC-4821",
  "preferred_airline": "United Airlines",
  "preferred_hotel": "Marriott",
  "frequent_flyer": {
    "United Airlines": "FF3829104"
  },
  "active": true,
  "notes": null
}
```

---

## Implementation

1. **Generate** `config/employees_1000.json` — Python generator producing 1000 deterministic, realistic records
2. **Update `backend/db/seed.py`** — add `_seed_employees()` reading from `config/employees_1000.json` → upserts into `nva_employee_data` by `employee_id`
3. **Update `backend/db/indexes.py`** — add indexes on `nva_employee_data`: `employee_id` (unique), `department`, `travel_tier`, `active`
4. **Load** — `asyncio.run()` seed script or auto-runs on next container restart

---

## Acceptance Criteria

| # | Check | Status |
|---|---|---|
| 1 | `config/employees_1000.json` exists with exactly 1000 records | ✅ |
| 2 | All 6 travel tiers represented with counts matching distribution table | ✅ |
| 3 | `nva_employee_data` collection has 1000 documents on the geminirag cluster | ✅ |
| 4 | `nva_employee_data` has indexes on `employee_id` (unique), `department`, `travel_tier` | ✅ |
| 5 | No duplicate `employee_id` values | ✅ |
| 6 | All emails unique and follow `firstname.lastname@navanvoyage.com` pattern | ✅ |
