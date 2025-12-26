# UNIT-STORE-ARCH Implementation Notes

## Summary

Implemented centralized Svelte stores for decision state management, replacing component-local state across three views (`/`, `/inbox`, `/focus`). The architecture provides shared filter state, reactive derived stores for filtered decisions and queue statistics, API integration with polling, and a WebSocket-ready interface for future real-time updates.

## Decisions Made

### Decision 1: Factory Function Pattern for Stores

**Context:** Needed to create stores with custom methods beyond basic writable/derived stores.

**Options Considered:**
1. Simple writable stores with external helper functions
2. Factory function pattern (like existing `connection.ts`)
3. Class-based store wrappers

**Chosen:** Factory function pattern

**Rationale:**
- Matches existing codebase convention (`src/lib/stores/connection.ts:41-153`)
- Encapsulates store state and methods cleanly
- Allows private internal state (polling interval, initialization flag)
- Returns a store-compatible object with `subscribe` method

**Downstream Impact:** All components import stores the same way; consistent API across the codebase.

---

### Decision 2: Local Variable Sync for Two-Way Filter Binding

**Context:** Svelte's `bind:value` requires local variables, but filter state must be shared via store.

**Options Considered:**
1. Use `$filterStore.stage` directly in templates (no two-way binding)
2. Create local variables that sync bidirectionally with store
3. Use custom input components that interact with store directly

**Chosen:** Local variables with bidirectional sync

**Rationale:**
- Preserves existing template patterns (minimal template changes)
- Reactive statements (`$:`) handle sync automatically
- Store subscription populates local vars; reactive statements push changes back

**Downstream Impact:** Components maintain familiar patterns; filter changes propagate across views.

**Implementation:**
```typescript
// Subscribe to populate local vars
const unsubscribe = filterStore.subscribe(f => {
  stageFilter = f.stage;
});

// Reactive sync back to store
$: filterStore.setStage(stageFilter);
```

---

### Decision 3: Optimistic Updates with Rollback

**Context:** Decision resolution should feel instant, but API calls may fail.

**Options Considered:**
1. Wait for API response before updating UI
2. Optimistic update, rollback on failure
3. Optimistic update, ignore failures (eventual consistency)

**Chosen:** Optimistic update with rollback on failure

**Rationale:**
- Provides responsive UX (instant feedback)
- Maintains data integrity (reverts on error)
- Error state captured in store for UI display

**Downstream Impact:** UI shows immediate feedback; error handling required in components.

**Implementation:** `decisions.ts:130-194`

---

### Decision 4: WebSocket-Ready Architecture

**Context:** Spec required "real-time updates" but user confirmed polling for now with WebSocket preparation.

**Options Considered:**
1. Implement WebSocket immediately
2. Polling only, add WebSocket later (breaking changes)
3. Design for WebSocket, implement polling initially

**Chosen:** Design for WebSocket, implement polling initially

**Rationale:**
- `handleEvent()` method accepts typed `DecisionEvent` union
- Event types cover: created, updated, resolved, chained, expired, refresh
- Polling uses same internal update mechanisms
- Future WebSocket integration requires only transport layer

**Downstream Impact:** No breaking changes when WebSocket is added; event handling logic already tested.

---

### Decision 5: Polling Interval Configuration

**Context:** Need to balance responsiveness with API load.

**Options Considered:**
1. Fixed 10s interval (responsive, higher load)
2. Fixed 30s interval (balanced)
3. Adaptive polling (complex)
4. User-configurable (complexity)

**Chosen:** Fixed 30s interval, configurable via `STORE_CONFIG`

**Rationale:**
- Single-user system (<1000 tasks per CLAUDE.md)
- 30s provides reasonable freshness
- `STORE_CONFIG.POLL_INTERVAL_MS` allows tuning without code changes

**Downstream Impact:** Can be adjusted in `config.ts` without touching store logic.

---

### Decision 6: Priority Terminology Alignment

**Context:** Mock data used `'urgent'` priority, but Engine uses `'critical'`.

**Options Considered:**
1. Keep `'urgent'` in frontend, transform at API boundary
2. Align with Engine terminology (`'critical'`)
3. Support both with aliases

**Chosen:** Align with Engine terminology

**Rationale:**
- Per `UNIT-API-CLIENT/IMPLEMENTATION.md`: "Engine uses `critical`, not `urgent`"
- Consistent terminology reduces mapping bugs
- Transformation already handled in `transforms.ts`

**Downstream Impact:**
- Filter logic uses `d.priority !== 'critical'` for urgent filter
- New decision creation uses `'critical'` priority
- DecisionCard component may need update (separate unit)

---

### Decision 7: Keyed Each Blocks for Performance

**Context:** Spec required "minimal re-renders" with keyed each blocks.

**Options Considered:**
1. Index-based iteration (Svelte default)
2. Keyed by `decision.id`

**Chosen:** Keyed by `decision.id`

**Rationale:**
- Svelte can track identity across list changes
- Prevents unnecessary DOM recreation
- Required for animations on insert/remove

**Downstream Impact:** All `{#each}` loops use `(decision.id)` key expression.

---

### Decision 8: Rename `filteredCommands` to Avoid Conflict

**Context:** Main page had local `filteredCommands` for command palette, conflicting with store's `filteredDecisions` naming pattern.

**Options Considered:**
1. Keep name, risk confusion
2. Rename to `paletteFilteredCommands`
3. Move command palette to separate component

**Chosen:** Rename to `paletteFilteredCommands`

**Rationale:**
- Clear distinction from store-derived `filteredDecisions`
- Minimal change, local to one file
- Avoids future confusion

**Downstream Impact:** Only affects `+page.svelte`; template references updated.

---

## Deviations from Spec

### Deviation 1: Search Debounce Not Implemented

**Spec Said:** "Debounce search input (300ms)" mentioned in test strategy edge cases.

**Implementation Does:** No debounce on search input; reactive updates are immediate.

**Reason:**
- Filtering is client-side (no API call per keystroke)
- With <1000 decisions, filtering is fast enough
- Debounce adds complexity for minimal benefit

**Severity:** Minor

**Recommendation:** Add debounce in future if performance issues arise with larger datasets.

---

### Deviation 2: Undo Window Expiration Not Automated

**Spec Said:** "Undo window expiration: Remove `canUndo` after `undoExpiresAt`"

**Implementation Does:** Relies on API response for undo availability; no client-side timer.

**Reason:**
- API is source of truth for undo availability
- Adding client-side timers creates sync issues
- Polling refresh will update `canUndo` state

**Severity:** Minor

**Recommendation:** Could add client-side timer as optimization, but not required for correctness.

---

## Known Limitations

1. **No Offline Support:** Actions fail silently when offline; no queue for retry
2. ~~**Session Stats Local:**~~ ✅ RESOLVED - Session stats now persist via `sessionStore` with sessionStorage
3. **No WebSocket Yet:** Real-time updates via polling only (30s delay)
4. ~~**Chained Decisions Prepend:**~~ ✅ RESOLVED - Added `insertAfter()` method for proper ordering
5. **No Pagination API:** All pending decisions loaded at once; windowing is client-side only
6. **Filter State Not Persisted:** Filters reset on page refresh (SvelteKit navigation preserves)

## Open Questions

- [ ] Should search debounce be added? (Currently immediate, spec mentioned 300ms)
- [x] ~~Should session stats persist across browser sessions?~~ → Implemented with sessionStorage (tab-scoped)
- [x] ~~How should chained decisions be ordered relative to parent in the list?~~ → Use `insertAfter(parentId, decision)`
- [ ] Should filter state persist in URL query params for shareability?

## Test Coverage

**Status:** ✅ Comprehensive test suite implemented with Vitest

```
✓ 118 tests passing (3 test files)
  - decisions.test.ts: 33 tests
  - filters.test.ts: 45 tests
  - derived.test.ts: 40 tests
```

**Test Categories:**
- **Decision store:** load, resolve, defer, undo, addDecision, insertAfter, updateDecision, removeDecision, handleEvent (6 event types), polling, reset
- **Filter store:** setStage, setType, setProject, setSearch, clear, setFilters, getFilters, derived stores
- **Derived stores:** pendingDecisions, filteredDecisions, queueStats, allProjects, activeDecisionTypes, activeSubjectTypes

**Mocking Strategy:**
- Mock `decisionsApi` from `$lib/api` using `vi.mock()`
- Factory function `createMockDecision()` for consistent test data
- `beforeEach` hooks reset stores between tests

**Run Tests:**
```bash
npm test           # Watch mode
npm test -- --run  # Single run
npm test:coverage  # With coverage report
```

## Dependencies Used

| Dependency | Version | Why |
|------------|---------|-----|
| svelte | 4.x | Writable/derived store primitives |
| svelte/store | built-in | Core store functionality |
| $lib/api | Unit 1 | `decisionsApi` for data fetching, types |
| vitest | 4.x | Unit testing framework |
| @testing-library/svelte | 5.x | Svelte component testing utilities |
| jsdom | 27.x | DOM simulation for tests |

## Files Delivered

### New Files

| File | Description |
|------|-------------|
| `src/lib/stores/types.ts` | TypeScript interfaces for store state, filter state, queue stats, and 11 per-decision-type data shapes with type guards |
| `src/lib/stores/config.ts` | Configuration constants: `MAX_DECISIONS`, `POLL_INTERVAL_MS`, `UNDO_WINDOW_MS`, `SEARCH_DEBOUNCE_MS`, `PAGE_SIZE` |
| `src/lib/stores/decisions.ts` | Core decision store with `load`, `refresh`, `resolve`, `defer`, `undo`, `startPolling`, `stopPolling`, `handleEvent`, `addDecision`, `insertAfter`, `updateDecision`, `removeDecision`, `loadMore` methods |
| `src/lib/stores/filters.ts` | Filter state store with `setStage`, `setType`, `setProject`, `setSearch`, `clear`, `setFilters`, `getFilters` methods |
| `src/lib/stores/derived.ts` | Derived stores: `pendingDecisions`, `filteredDecisions`, `queueStats`, `filteredStats`, `allProjects`, `activeDecisionTypes`, `activeSubjectTypes`, `countByType`, `urgentCount`, `totalCount` |
| `src/lib/stores/session.ts` | Session statistics store with sessionStorage persistence: `increment`, `decrement`, `reset` methods |
| `src/lib/stores/index.ts` | Public exports for all stores, types, and type guards |
| `vitest.config.ts` | Vitest configuration for SvelteKit with jsdom environment |
| `src/lib/stores/decisions.test.ts` | 33 unit tests for decision store |
| `src/lib/stores/filters.test.ts` | 45 unit tests for filter store |
| `src/lib/stores/derived.test.ts` | 40 unit tests for derived stores |

### Modified Files

| File | Changes |
|------|---------|
| `src/routes/+page.svelte` | Replaced local state with store imports; uses `sessionStore` for velocity stats; uses `insertAfter()` for chained decisions |
| `src/routes/inbox/+page.svelte` | Same refactor pattern; uses `insertAfter()` for chaining |
| `src/routes/focus/+page.svelte` | Same refactor pattern; uses `insertAfter()` for chaining |
| `package.json` | Added test scripts and devDependencies (vitest, @testing-library/svelte, jsdom) |

### Documentation Files

| File | Description |
|------|-------------|
| `docs/UNIT-STORE-ARCH/IMPLEMENTATION.md` | This file |
| `docs/UNIT-STORE-ARCH/README.md` | Package usage documentation |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Components                               │
│  +page.svelte    inbox/+page.svelte    focus/+page.svelte       │
└─────────────────────────────┬───────────────────────────────────┘
                              │ import { $store }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      src/lib/stores/                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ decisions   │  │  filters    │  │       derived           │  │
│  │ .ts         │  │  .ts        │  │       .ts               │  │
│  │             │  │             │  │                         │  │
│  │ • load()    │  │ • setStage  │  │ • pendingDecisions      │  │
│  │ • resolve() │  │ • setType   │  │ • filteredDecisions     │  │
│  │ • defer()   │  │ • setProject│  │ • queueStats            │  │
│  │ • undo()    │  │ • setSearch │  │ • allProjects           │  │
│  │ • insertAft │  │ • clear()   │  │                         │  │
│  │ • loadMore  │  │             │  │                         │  │
│  │ • handleEvt │  │             │  │                         │  │
│  └──────┬──────┘  └─────────────┘  └────────────┬────────────┘  │
│         │                                        │               │
│         │   ┌─────────────┐     combines         │               │
│         │   │  session    │◄─────────────────────┘               │
│         │   │  .ts        │                                      │
│         │   │             │                                      │
│         │   │ • increment │  ◄── sessionStorage                  │
│         │   │ • decrement │                                      │
│         │   │ • reset     │                                      │
│         │   └─────────────┘                                      │
│         │                                                        │
└─────────┼────────────────────────────────────────────────────────┘
          │ decisionsApi
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      src/lib/api/                                │
│  decisions.ts  •  transforms.ts  •  types.ts  •  client.ts      │
└─────────────────────────────────────────────────────────────────┘
```
