# NVA-37 — Message Feedback Controls

**Epic:** EPIC-OBS  
**Points:** 3  
**Status:** ✅ Done  
**Sprint:** Sprint NVA-G

---

## Goal

Add inline 👍 👎 🚩 feedback controls below each completed assistant message, with an optional comment field, writing all submissions to MongoDB for offline analysis.

---

## Problem

There is no lightweight mechanism for end users to signal response quality. Feedback is the primary input for evaluating real-world system performance beyond the automated JudgeAgent scores.

---

## Solution

### `FeedbackBar` component (`MessageBubble.tsx`)
Rendered in the footer row below each assistant bubble when `!isStreaming && turn.content`.

**Initial state:** "Was this helpful?" label + 👍 👎 🚩 buttons.

**Rating flow:**
1. Click 👍 or 👎 → button highlights; a small comment input + "Send" / "Skip" appear inline
2. Submit (Enter, Send, or Skip) → calls `submitFeedback()` → replaces row with "Thanks for your feedback" (italic, muted)

**Flag flow:**
- 🚩 click immediately calls `submitFeedback(..., 'flag')` and highlights the button; no comment required

### Backend
`POST /api/chat/feedback` endpoint accepts:
```json
{
  "conversation_id": "...",
  "turn_index": 2,
  "rating": "up" | "down" | "flag",
  "comment": "optional string"
}
```
Writes to `nva_feedback` MongoDB collection with `created_at` timestamp.

### Client service
`submitFeedback(conversationId, turnIndex, rating, comment?)` in `frontend/src/services/chat.ts`. All failures are swallowed (`.catch(() => {})`) — the UI never shows an error for a failed feedback write.

### ID threading
`conversationId` and `turnIndex` passed from `ChatWindow` → `MessageBubble` via props.

---

## Files Changed

| File | Action |
|---|---|
| `frontend/src/components/Chat/MessageBubble.tsx` | Add `FeedbackBar` component; render in footer row |
| `frontend/src/components/Chat/ChatWindow.tsx` | Pass `conversationId`, `turnIndex` to `MessageBubble` |
| `frontend/src/services/chat.ts` | Add `submitFeedback()` function |
| `backend/api/routers/chat.py` | Add `FeedbackRequest` model; add `POST /chat/feedback` endpoint |

---

## Acceptance Criteria

| # | Check |
|---|---|
| 1 | "Was this helpful?" + 👍 👎 🚩 visible below each assistant message |
| 2 | Clicking 👍 or 👎 highlights the button and shows comment input |
| 3 | Pressing Enter or clicking Send submits and shows "Thanks for your feedback" |
| 4 | Clicking Skip submits rating without comment and shows confirmation |
| 5 | 🚩 submits immediately (no comment prompt) and highlights the icon |
| 6 | `nva_feedback` document written to MongoDB with conversation_id, turn_index, rating, comment, created_at |
| 7 | Network failure is silent — UI shows confirmation regardless |
| 8 | Controls absent during streaming |
| 9 | `npx tsc --noEmit` exits 0 |

---

## Out of Scope

- Feedback analytics dashboard (planned for Sprint NVA-H)
- Editing or retracting a submitted rating
- Aggregate score display per conversation
