# UNIT-4-DECISION-ACTIONS Implementation Notes

## Summary

This unit wires up all decision resolution actions (resolve, defer, undo) to the Decision Engine API endpoints with optimistic updates and rollback on failure. It provides a complete action lifecycle including loading states, undo support with countdown timers, and graceful handling of concurrent resolution conflicts (409 errors).

## Decisions Made

### Decision 1: Undo Window Duration
**Context:** The frontend config had `UNDO_WINDOW_MS: 30_000` (30 seconds) but the Engine provides 5-minute undo windows via `undo_expires_at`.

**Options Considered:**
1. Keep frontend 30s limit for snappier UX
2. Use Engine's `undo_expires_at` directly (5 minutes)

**Chosen:** Option 2 - Use Engine's `undo_expires_at`

**Rationale:** Trusting the API response ensures consistency between frontend and backend state. Using a shorter frontend window could allow situations where the user sees "undo expired" but the Engine would still accept it.

**Downstream Impact:** UndoToast component displays accurate countdown; no false "expired" messages.

---

### Decision 2: Defer UI Pattern
**Context:** The spec required collecting `until` (datetime) and optional `reason` for deferrals. Multiple UI patterns were possible.

**Options Considered:**
1. Preset buttons only (1hr, 4hr, Tomorrow, 1 Week)
2. Full date/time picker modal
3. Dropdown with presets + "Custom..." option for picker

**Chosen:** Option 3 - Dropdown with presets + Custom option

**Rationale:** Provides quick access to common deferral durations while allowing precise scheduling when needed. Balances speed for typical use cases with flexibility for edge cases.

**Downstream Impact:** Created `DeferDropdown.svelte` component that can be reused across views.

---

### Decision 3: Loading State Scope
**Context:** During API calls, buttons need to be disabled to prevent double-submission. Question was whether to disable just the clicked button or all action buttons.

**Options Considered:**
1. Disable only the clicked button
2. Disable all card buttons during any action

**Chosen:** Option 2 - Disable all card buttons

**Rationale:** Prevents race conditions where user could click multiple actions simultaneously. Provides clearer feedback that the card is processing. Simpler implementation with single `actionInProgress` state.

**Downstream Impact:** All buttons in DecisionCard share disabled state via single reactive variable.

---

### Decision 4: Action History Persistence
**Context:** Spec mentioned "action history for undo" but didn't specify if it should persist across page refreshes.

**Options Considered:**
1. Persist to sessionStorage
2. In-memory only, cleared on page unload

**Chosen:** Option 2 - In-memory only

**Rationale:** Aligns with Engine's behavior where undo window is time-based (5 min from resolution). If user refreshes, they can still undo via direct API call if within window, but UI won't show stale undo buttons for actions they may have forgotten about.

**Downstream Impact:** `actionStore` uses simple writable store without persistence. Clean slate on each page load.

---

### Decision 5: Form Data Collection Strategy
**Context:** DecisionCard has various input types (select, textarea, checkbox, radio) that need to be collected before resolution.

**Options Considered:**
1. Use FormData API and query DOM elements
2. Bind all inputs to reactive variables and collect in handler

**Chosen:** Option 2 - Reactive variable bindings

**Rationale:** More "Svelte-like" approach with declarative bindings. Avoids brittle DOM queries. Type-safe with TypeScript. Easier to extend for new decision types.

**Downstream Impact:** Added reactive variables for each decision type's form fields (triageProject, triagePriority, reviewFeedback, etc.).

---

## Deviations from Spec

### Deviation 1: Defer Event Name
**Spec Said:** DecisionCard dispatches `skip` event for defer

**Implementation Does:** DecisionCard dispatches `defer` event for defer

**Reason:** Semantic clarity - "skip" implies moving past without action, while "defer" explicitly indicates postponement with a future date. The `skip` event was repurposed for actual skip actions.

**Severity:** Minor - Event handler names are internal implementation details.

---

### Deviation 2: Resolution Payload Not Awaited in DecisionCard
**Spec Said:** "Loading state on action buttons during API call"

**Implementation Does:** DecisionCard sets loading state but doesn't await API call directly. Parent component handles async resolution.

**Reason:** DecisionCard dispatches events synchronously; the actual API call happens in the parent's event handler. Loading state is managed via timeout to prevent flash of loading state, with actual loading managed by store.

**Severity:** Minor - UX behaves as expected; implementation differs slightly from literal interpretation.

---

## Known Limitations

1. **No Offline Support**: Actions fail immediately when offline. No queue for retry when connection restored.

2. **Single Action at a Time**: Cannot perform multiple actions in parallel on different decisions. Each view processes one action at a time.

3. **Undo Limited to Resolve**: Only resolve actions can be undone. Defer actions cannot be undone through this interface.

4. **No Undo Persistence**: Undo history is lost on page refresh. User must remember decision ID to undo via API if needed.

5. **Form Validation Client-Side Only**: Resolution payloads are validated on submission but errors from Engine validation are shown as generic errors.

6. **Custom Date Picker Basic**: The custom date/time picker in DeferDropdown uses native HTML5 inputs, which have inconsistent UX across browsers.

## Open Questions

- [ ] Should undo buttons appear in a fixed position or follow scroll with the card list?
- [ ] Should there be a confirmation dialog before resolving critical-priority decisions?
- [ ] How should batch resolutions (multiple decisions at once) be handled in future?

## Test Coverage

- Line coverage: N/A (Unit tests not yet implemented for this unit)
- Branch coverage: N/A
- Uncovered areas:
  - `actions.ts` store methods need unit tests
  - `resolution.ts` payload builders need unit tests
  - Component interaction tests needed for DecisionCard

**Note:** This unit focuses on API integration. Tests are blocked by Unit 5 (Test Infrastructure) per dependency graph. Stubs are provided for downstream testing.

## Dependencies Used

| Dependency | Version | Why |
|------------|---------|-----|
| svelte | 4.x | Core framework - reactive stores, event dispatching |
| svelte/store | (built-in) | Writable/derived stores for state management |
| svelte/transition | (built-in) | fly/fade transitions for UndoToast |
| svelte/animate | (built-in) | flip animation for toast stacking |

No new external dependencies were added. All functionality uses Svelte's built-in features.

## Files Delivered

### New Files

| File | Description |
|------|-------------|
| `src/lib/stores/actions.ts` | Action history store with undo tracking, auto-expiry, and API integration |
| `src/lib/components/UndoToast.svelte` | Floating toast with countdown timer, stacked display, undo/dismiss buttons |
| `src/lib/components/DeferDropdown.svelte` | Dropdown with preset durations, custom picker, reason field, validation |
| `src/lib/utils/resolution.ts` | Resolution payload builder with type-specific extractors for all decision types |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/components/DecisionCard.svelte` | Added loading states, form bindings, defer limit check, resolution dispatch |
| `src/routes/+page.svelte` | Wired handleCardAction to decisionStore.resolve(), 409 handling, undo history |
| `src/routes/inbox/+page.svelte` | Same API integration pattern as main page |
| `src/routes/focus/+page.svelte` | Same API integration pattern as main page |
| `src/routes/+layout.svelte` | Added global UndoToast component for cross-view visibility |
| `src/lib/stores/decisions.ts` | Extended resolve() return type to include undoAvailable, undoExpiresAt, actionId |
| `src/lib/stores/index.ts` | Exported new actionStore and related derived stores |
| `src/lib/stores/config.ts` | Updated UNDO_WINDOW_MS from 30_000 to 300_000 (5 minutes) |

### Documentation Files

| File | Description |
|------|-------------|
| `docs/UNIT-4-DECISION-ACTIONS/IMPLEMENTATION.md` | This file - implementation notes and decisions |
| `docs/UNIT-4-DECISION-ACTIONS/README.md` | Usage guide for action integration components |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DecisionCard.svelte                          │
│  - Collects form data via reactive bindings                     │
│  - Dispatches 'action' event with resolution payload            │
│  - Shows loading state during processing                        │
│  - Disables defer when limit reached                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                    dispatch('action', { resolution })
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Page Components                              │
│  (+page.svelte, inbox/+page.svelte, focus/+page.svelte)        │
│  - handleCardAction() receives event                            │
│  - Calls decisionStore.resolve() with resolution                │
│  - Adds to actionStore on success                               │
│  - Handles 409 conflicts gracefully                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    decisionStore                                │
│  - Optimistic update (mark completed)                           │
│  - API call to Engine                                           │
│  - Insert chained decisions on success                          │
│  - Rollback on failure                                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    actionStore                                  │
│  - Tracks undoable actions with expiry                          │
│  - Auto-cleans expired entries                                  │
│  - Handles undo API calls                                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UndoToast.svelte                             │
│  - Subscribes to undoableActions                                │
│  - Shows countdown timer                                        │
│  - Undo/Dismiss buttons                                         │
│  - Auto-dismiss on expiry                                       │
└─────────────────────────────────────────────────────────────────┘
```
