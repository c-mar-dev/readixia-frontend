# UNIT-7-ERROR-STATES Implementation Notes

## Summary

Implemented comprehensive error handling and loading states across the Readixia dashboard UI. The implementation includes a centralized UI state store (`ui.ts`), a general-purpose toast notification system (`Toast.svelte`), reusable loading spinner (`LoadingSpinner.svelte`), error boundary component (`ErrorBoundary.svelte`), and error code mapping utilities. All components integrate with existing patterns and follow the codebase's plain JavaScript + JSDoc approach for Svelte components.

## Decisions Made

### Decision 1: Separate Toast.svelte vs Refactoring UndoToast

**Context:** The spec called for a `Toast.svelte` component, but `UndoToast.svelte` already exists for undo-specific notifications with countdown timers.

**Options Considered:**
1. Create separate `Toast.svelte` that coexists with `UndoToast.svelte`
2. Refactor `UndoToast.svelte` to use a shared base Toast component

**Chosen:** Option 1 - Separate Toast component

**Rationale:** User explicitly chose this approach. UndoToast has specialized countdown/progress ring behavior that differs significantly from general toasts. Keeping them separate avoids breaking working code and keeps each component focused.

**Downstream Impact:** Both components are mounted in `+layout.svelte`. Toast appears bottom-left, UndoToast bottom-right to avoid overlap.

---

### Decision 2: Connection Lost UI Pattern

**Context:** The spec mentioned a "connection lost banner" but left the exact UI pattern open.

**Options Considered:**
1. Full-width banner at top of page
2. Status indicator in header (small dot with label)
3. Toast notification

**Chosen:** Option 2 - Status indicator in header

**Rationale:** User preference. Less intrusive than a banner while still visible. Integrates naturally with existing `ConnectionIndicator.svelte` component.

**Downstream Impact:** Modified `ConnectionIndicator.svelte` to add offline state (gray dot). Toasts still shown on offline/online transitions for immediate feedback.

---

### Decision 3: Error Boundary Implementation

**Context:** Svelte doesn't have React-style error boundaries. Needed a way to catch component crashes.

**Options Considered:**
1. Custom ErrorBoundary wrapper using window error listeners
2. Try/catch in critical paths only

**Chosen:** Option 1 - Custom ErrorBoundary component

**Rationale:** User explicitly chose this approach. Provides better coverage and consistent fallback UI.

**Downstream Impact:** `ErrorBoundary.svelte` uses `window.addEventListener('error')` and `unhandledrejection`. Note: Won't catch all async errors, but handles synchronous render crashes.

---

### Decision 4: Plain JavaScript in Svelte Components

**Context:** Initial implementation used TypeScript (`<script lang="ts">`) but build failed with parse errors.

**Options Considered:**
1. Use TypeScript with `lang="ts"` in script tags
2. Use plain JavaScript with JSDoc type annotations

**Chosen:** Option 2 - Plain JavaScript with JSDoc

**Rationale:** The codebase's Svelte 4 + Vite setup doesn't properly support TypeScript in Svelte component scripts. Build errors occurred with `import type` syntax. Existing components (e.g., `UndoToast.svelte`) use plain JS, so this matches the established pattern.

**Downstream Impact:** All new Svelte components (`Toast.svelte`, `LoadingSpinner.svelte`, `ErrorBoundary.svelte`) use plain JS with JSDoc. TypeScript files (stores, utilities) still use full TypeScript.

---

### Decision 5: Toast Auto-dismiss Durations

**Context:** Spec said "auto-dismiss but allow manual dismiss" without specifying durations.

**Options Considered:**
1. Fixed 3s for all toasts
2. Type-based durations (shorter for success, longer for errors)
3. Configurable per-toast

**Chosen:** Option 2 + 3 - Type-based defaults with per-toast override

**Rationale:** Errors need more time to read. Success can be quick. Per-toast override via `duration` option allows flexibility.

**Downstream Impact:** Defaults: success/info = 4s, error/warning = 6s. Duration of 0 creates "sticky" toast requiring manual dismiss.

---

### Decision 6: Toast Stacking Limit

**Context:** Need to prevent UI clutter from too many simultaneous toasts.

**Options Considered:**
1. Unlimited stacking
2. Fixed limit with FIFO removal

**Chosen:** Option 2 - Max 5 toasts, oldest removed first

**Rationale:** 5 toasts is enough to show recent activity without overwhelming the UI. FIFO ensures user always sees newest information.

**Downstream Impact:** `MAX_TOASTS = 5` in `ui.ts`. When exceeded, oldest toast is removed to make room.

## Deviations from Spec

### Deviation 1: Component File Naming

**Spec Said:** `src/lib/components/LoadingSpinner.svelte`
**Implementation Does:** Same location, but uses plain JS instead of TypeScript
**Reason:** Build system limitation with Svelte 4 TypeScript support
**Severity:** Minor - Functionality identical, only type annotations differ

### Deviation 2: No Dedicated Offline Banner

**Spec Said:** "Connection lost banner when WebSocket disconnects"
**Implementation Does:** Status indicator in header + toast notifications
**Reason:** User clarification - preferred less intrusive approach
**Severity:** Minor - User explicitly approved this deviation

### Deviation 3: Error Boundary Limitations

**Spec Said:** "Error boundary for component crashes"
**Implementation Does:** Window error listener approach (not true React-style boundary)
**Reason:** Svelte doesn't support error boundaries natively
**Severity:** Moderate - Some async errors may not be caught

## Known Limitations

1. **ErrorBoundary async limitations**: Uses window error events which may not catch all async errors or errors in event handlers. Synchronous render crashes are handled.

2. **Toast hover pause is visual only**: The progress bar reflects elapsed time but doesn't actually pause the auto-dismiss timer. Implementing true pause would require more complex timer management.

3. **Offline detection browser support**: `navigator.onLine` has varying reliability across browsers. Falls back to WebSocket connection state in `ConnectionIndicator`.

4. **No retry button on individual toasts**: Error toasts show the message but don't include inline retry buttons. Retry is available via the ErrorState component for page-level errors.

5. **Single ErrorBoundary instance**: Currently catches all window errors globally. Multiple nested boundaries would require more sophisticated error routing.

## Open Questions

- [ ] Should toast notifications be persisted to localStorage for showing missed notifications on page reload?
- [ ] Should there be a "view all notifications" panel for reviewing dismissed toasts?
- [ ] Should ErrorBoundary report errors to an external service (Sentry, etc.)?

## Test Coverage

- **Line coverage:** ~95% for new code
- **Branch coverage:** ~90%
- **Total tests:** 86 (43 in errorMessages.test.ts, 43 in ui.test.ts)

### Uncovered Areas:
- `ErrorBoundary.svelte` template logic (Svelte component testing requires additional setup)
- `Toast.svelte` animation callbacks (visual testing)
- Browser-specific offline detection edge cases

## Dependencies Used

| Dependency | Version | Why |
|------------|---------|-----|
| svelte/store | 4.x (bundled) | Writable/derived stores for state management |
| svelte/transition | 4.x (bundled) | fly/fade transitions for toast animations |
| svelte/animate | 4.x (bundled) | flip animation for toast reordering |
| vitest | 4.x | Unit testing framework |

No new external dependencies added. All functionality uses existing Svelte primitives and Tailwind CSS.

## Files Delivered

### New Files

| File | Description |
|------|-------------|
| `src/lib/utils/errorMessages.ts` | Error code mapping, user-friendly messages, retryable detection |
| `src/lib/stores/ui.ts` | Centralized UI state: toasts, loading states, offline detection |
| `src/lib/components/LoadingSpinner.svelte` | Reusable SVG spinner (sm/md/lg sizes) |
| `src/lib/components/Toast.svelte` | General-purpose toast notification system |
| `src/lib/components/ErrorBoundary.svelte` | Error boundary wrapper component |
| `src/lib/utils/errorMessages.test.ts` | 43 unit tests for error utilities |
| `src/lib/stores/ui.test.ts` | 43 unit tests for UI store |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/stores/index.ts` | Added exports for uiStore, toasts, isOffline, etc. |
| `src/routes/+layout.svelte` | Added Toast component mount, offline detection handlers |
| `src/lib/components/ConnectionIndicator.svelte` | Added offline state (gray indicator), priority logic |
| `src/routes/+page.svelte` | Replaced inline showToast with uiStore methods, added getErrorMessage import |
| `src/lib/components/DecisionCard.svelte` | Added LoadingSpinner import, integrated into 8 primary action buttons |

## API Reference

### uiStore Methods

```typescript
// Toast management
uiStore.showToast({ type, message, title?, duration?, dismissible? }): string
uiStore.dismissToast(id: string): void
uiStore.clearToasts(): void

// Convenience methods
uiStore.success(message: string, title?: string): string
uiStore.error(message: string, title?: string): string
uiStore.info(message: string, title?: string): string
uiStore.warning(message: string, title?: string): string

// Loading state
uiStore.setLoading(actionId: string, isLoading: boolean): void
uiStore.isLoading(actionId: string): boolean
uiStore.isAnyLoading(): boolean
uiStore.clearLoading(): void

// Offline detection
uiStore.setOffline(offline: boolean): void
uiStore.clearWasOffline(): void

// Lifecycle
uiStore.reset(): void
uiStore.destroy(): void
```

### Error Message Utilities

```typescript
import { getErrorMessage, isRetryableError, getErrorToastType } from '$lib/utils/errorMessages';

getErrorMessage(error: ApiError): string
isRetryableError(error: ApiError): boolean
getErrorToastType(error: ApiError): 'error' | 'warning' | 'info'
getErrorAction(error: ApiError): string | null
```

### Derived Stores

```typescript
import { toasts, toastCount, isOffline, wasOffline, isAnyLoading } from '$lib/stores';

$toasts        // ToastItem[]
$toastCount    // number
$isOffline     // boolean
$wasOffline    // boolean
$isAnyLoading  // boolean
```
