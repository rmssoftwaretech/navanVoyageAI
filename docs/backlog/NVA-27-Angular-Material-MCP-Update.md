# NVA-27 — Angular Frontend: Material MCP Integration & Component Refresh

**Epic:** EPIC-NVA
**Points:** 3
**Status:** ✅ Done
**Sprint:** Sprint NVA-F

---

## Goal

Update the Angular frontend (`frontend-angular/`) to use the Angular Material MCP server for component discovery and to modernise the UI to use current Angular Material 3 components and design tokens.

---

## Background

The Angular frontend was scaffolded with basic Material components. The Angular Material team now publishes an MCP server (`https://ui.angular-material.dev/docs/ai/mcp`) that exposes component APIs, examples, and migration guides. Using it allows LLM-assisted code generation to stay in sync with the current Material 3 API.

---

## Target Scope

| # | Task |
|---|---|
| 1 | Configure the Angular Material MCP server URL in the project's Claude/cursor settings so all future AI-assisted edits to `frontend-angular/` use it |
| 2 | Audit existing Angular components against current Material 3 APIs — update deprecated selectors/inputs (e.g., `mat-form-field`, `mat-label`, legacy button variants) |
| 3 | Apply Material 3 theming: replace hard-coded `#1E3A5F` / `#D97706` colours with an `@angular/material` custom theme using `define-theme()` and the navy/gold palette |
| 4 | Replace any plain HTML `<table>` with `<mat-table>` for the bookings and policy list views |
| 5 | Add `MatSnackBarModule` notifications for booking confirmation and error states |

---

## Files to Modify

| File | Change |
|---|---|
| `.cursor/mcp.json` or `.claude/mcp.json` | Add Angular Material MCP server entry |
| `frontend-angular/src/app/theme.scss` | Custom Material 3 theme with navy/gold palette |
| `frontend-angular/src/app/**/*.ts` | Component import updates (standalone imports, M3 APIs) |
| `frontend-angular/src/app/**/*.html` | Material 3 component selectors |

---

## Acceptance Criteria

| # | Check |
|---|---|
| 1 | Angular Material MCP server is reachable from the dev environment |
| 2 | `ng build` exits 0 with no deprecation warnings |
| 3 | App renders with navy/gold Material 3 theme at `http://localhost:4210` |
| 4 | Booking/policy views use `mat-table` |
| 5 | Snackbar confirms booking success |

---

## Out of Scope

- Migrating Angular to a new major version
- Adding Angular animations / CDK drag-drop
