# NVA-30 — Chat Enhancements: Reactions, Attachments, Rename, Pin

**Epic:** EPIC-NVA
**Points:** 5
**Status:** ✅ Done
**Sprint:** Sprint NVA-G

---

## Goal

Improve the conversational UX with four incremental enhancements: emoji reactions on messages, file/itinerary attachment support, inline conversation rename, and pin/star for important turns.

---

## Current State

| Gap | Detail |
|---|---|
| No reactions | Users can only copy or retry; no lightweight acknowledgement of AI responses |
| No attachments | Users cannot share travel itineraries, PDFs, or booking confirmations to discuss |
| Rename requires backend | Conversation titles are auto-generated; no in-place rename in sidebar |
| No starring | No way to bookmark an important trip result for quick reference |

---

## Features

### 1 — Emoji Reactions on Assistant Messages

A small reaction bar (👍 👎 ✈ ⭐ ❓) appears on hover below each assistant message bubble. Clicking a reaction:
- Sends `POST /api/chat/conversations/{id}/turns/{turn_idx}/react` with `{emoji}`.
- Persists to `nva_conversations.turns[n].reactions`.
- Renders inline below the message (e.g. `👍 2  ⭐ 1`).

### 2 — File Attachment

A **📎** button next to the InputBar opens a native file picker. Accepts `.pdf`, `.txt`, `.csv`, `.json` up to 4 MB. The file content is:
- Extracted as text on the backend (`POST /api/chat/upload-context`).
- Injected as a system context block before the user's next message.
- Shown as an attachment chip in the InputBar before sending.

### 3 — Inline Conversation Rename

Double-clicking a conversation title in the sidebar makes it an `<input>` in-place. On Enter or blur:
- `PATCH /api/chat/conversations/{id}` with `{title}`.
- Sidebar updates immediately.

### 4 — Pin / Star Turns

A ⭐ icon appears on hover for each assistant message. Clicking it:
- Toggles `turn.starred` via `PATCH /api/chat/conversations/{id}/turns/{turn_idx}/star`.
- Starred turns show a gold left-border highlight.
- A **Starred** filter in the sidebar collapses all non-starred conversations.

---

## Files to Create / Modify

| File | Action |
|---|---|
| `frontend/src/components/Chat/MessageBubble.tsx` | Add reaction bar + star button on hover |
| `frontend/src/components/Chat/ReactionBar.tsx` | New — emoji picker strip + count display |
| `frontend/src/components/Chat/AttachmentChip.tsx` | New — shows attached filename + remove button |
| `frontend/src/components/InputBar.tsx` | Add 📎 attachment button + chip area above textarea |
| `frontend/src/components/ConversationSidebar.tsx` | Double-click to rename; Starred filter toggle |
| `frontend/src/services/chat.ts` | `reactToTurn()`, `starTurn()`, `renameConversation()`, `uploadContext()` |
| `backend/api/routers/chat.py` | Reaction, star, rename, upload-context endpoints |

---

## Acceptance Criteria

| # | Check |
|---|---|
| 1 | Hovering an assistant message reveals reaction bar; click increments count |
| 2 | Clicking 📎 opens file picker; selected file appears as chip; chip is removed on ✕ |
| 3 | Attached file content is injected as context in the next turn |
| 4 | Double-clicking a sidebar conversation name opens editable input; Enter saves |
| 5 | Starring a message adds gold left border; unstarring removes it |
| 6 | Sidebar Starred toggle shows only conversations with at least one starred turn |

---

## Out of Scope

- Image file analysis (vision model integration)
- Multi-file attachments per message
- Reaction animations / notification sounds
