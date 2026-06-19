# NVA-28 — React Spectrum Frontend: Adobe Design System Refresh

**Epic:** EPIC-NVA
**Points:** 3
**Status:** ✅ Done
**Sprint:** Sprint NVA-F

---

## Goal

Update the React Spectrum frontend (`frontend-spectrum/`) to use current [Adobe React Spectrum](https://react-spectrum.adobe.com/) components and design patterns, replacing any ad-hoc styles or outdated component APIs with the Spectrum v3 equivalent.

---

## Background

The Spectrum frontend was created as an alternate UI variant using Adobe's React Spectrum component library. As the design system has evolved, some components and API patterns in the current code may be stale. This story aligns it with the published React Spectrum documentation and design guidelines.

---

## Target Scope

| # | Task |
|---|---|
| 1 | Audit all component imports — replace any deprecated `@adobe/react-spectrum` v2 APIs with v3 equivalents |
| 2 | Apply Spectrum theming: wrap app in `<Provider theme={defaultTheme}>` and set `colorScheme` based on user's OS preference |
| 3 | Replace all custom `<input>` and `<button>` elements with `TextField`, `Button`, `ActionButton` Spectrum components |
| 4 | Use `TableView` / `TableBody` / `Column` for the bookings list instead of a plain HTML table |
| 5 | Add `ToastQueue` notifications for save/error feedback (replaces custom toast divs) |
| 6 | Replace the custom modal with `DialogTrigger` + `Dialog` from `@react-spectrum/dialog` |

---

## Files to Modify

| File | Change |
|---|---|
| `frontend-spectrum/src/App.tsx` | Wrap in `<Provider theme={defaultTheme}>` |
| `frontend-spectrum/src/components/**/*.tsx` | Swap native elements for Spectrum equivalents |
| `frontend-spectrum/package.json` | Ensure `@adobe/react-spectrum@^3` and peer deps are up-to-date |

---

## Acceptance Criteria

| # | Check |
|---|---|
| 1 | `npm run build` exits 0 with no peer-dep warnings |
| 2 | App renders at `http://localhost:5211` using Spectrum light theme by default |
| 3 | All form inputs are Spectrum `TextField` / `Button` |
| 4 | Bookings table uses `TableView` |
| 5 | Toast notifications use `ToastQueue` |

---

## Out of Scope

- Spectrum dark-mode manual toggle (OS preference is sufficient)
- Custom Spectrum theme overrides (use `defaultTheme` only)
- Animation or Spectrum Charts integration
