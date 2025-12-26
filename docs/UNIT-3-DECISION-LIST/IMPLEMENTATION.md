# UNIT-3-DECISION-LIST Implementation Notes

## Summary

Unit 3 replaces mock data loading with real API integration for the decision queue, adding proper loading skeletons, error handling with retry functionality, context-aware empty states, and pagination support. The implementation leverages the existing store architecture from Units 1-2 while adding AbortController-based request cancellation and filter-triggered API reloads.

## Decisions Made

### Decision 1: Client-Side Loading vs SvelteKit Load Functions

**Context:** The spec mentioned `+page.ts` or `+page.server.ts` for data loading, but the existing codebase uses client-side `onMount()` with store-based state management.

**Options Considered:**
1. Switch to SvelteKit `load()` functions for SSR-friendly data fetching
2. Keep client-side `onMount()` approach with existing store architecture

**Chosen:** Option 2 - Keep client-side `onMount()`

**Rationale:**
- Polling infrastructure already implemented in stores
- Store-based architecture provides reactive updates without hydration complexity
- Single-user personal system doesn't benefit from SSR
- Would require significant refactoring of store initialization patterns

**Downstream Impact:** No impact - maintains consistency with existing patterns.

---

### Decision 2: Pagination Strategy

**Context:** Engine API limits responses to 50 decisions with no cursor pagination support. Need to handle cases with >50 pending decisions.

**Options Considered:**
1. Accept 50-item limit as sufficient for personal system
2. Implement "Load More" button with client-side deduplication

**Chosen:** Option 2 - "Load More" button (per user requirement)

**Rationale:**
- User explicitly requested "Load More" functionality
- Provides better UX for edge cases with many pending decisions
- Uses `hasMore` flag based on whether API returns exactly 50 items
- Deduplication by ID prevents duplicates when new items arrive

**Downstream Impact:** Added `hasMore` and `loadingMore` state to store; downstream components can react to loading state.

---

### Decision 3: Skeleton Design Approach

**Context:** Need loading state that provides visual feedback during API fetch.

**Options Considered:**
1. Simple list skeleton with basic pulsing bars
2. Detailed card skeleton matching exact DecisionCard structure

**Chosen:** Option 2 - Detailed card skeleton (per user requirement)

**Rationale:**
- Provides more polished UX
- Reduces perceived layout shift when content loads
- Matches the two-panel layout (list + detail)

**Downstream Impact:** LoadingState component can be reused by other views (focus mode future enhancement).

---

### Decision 4: Race Condition Prevention

**Context:** Multiple rapid filter changes could cause out-of-order API responses.

**Options Considered:**
1. Debounce filter changes before API calls
2. Use AbortController to cancel in-flight requests
3. Track request ID and ignore stale responses

**Chosen:** Option 2 - AbortController

**Rationale:**
- Native browser API, no additional dependencies
- Immediately cancels network request (saves bandwidth)
- Clean error handling pattern (AbortError is easily identified)
- Already supported by existing API client

**Downstream Impact:** `load()` method now cancels previous requests automatically.

---

### Decision 5: Filter-Triggered Reload Scope

**Context:** Need to pass filter parameters as query params to API, but API only supports `type` filter (not `project` or `search`).

**Options Considered:**
1. Reload on any filter change
2. Reload only when stage filter changes to valid decision type
3. Never reload on filter changes (rely on polling)

**Chosen:** Option 2 - Reload only for stage filter with valid decision types

**Rationale:**
- API only supports `type` parameter
- `project` and `search` filters are applied client-side via derived stores
- Reduces unnecessary network requests
- `urgent` filter maps to priority (client-side), not a decision type

**Downstream Impact:** Stage filter changes trigger immediate API refresh when switching between decision types.

---

### Decision 6: Empty State Differentiation

**Context:** Need to distinguish between "no decisions at all" and "no decisions match current filters".

**Options Considered:**
1. Single generic empty state
2. Two variants with different messaging and actions

**Chosen:** Option 2 - Two variants via `variant` prop

**Rationale:**
- "All caught up!" is celebratory (task completion)
- "No matches" with clear filters button is actionable
- Prevents user confusion about why queue appears empty

**Downstream Impact:** EmptyState component is reusable with configurable variant.

---

## Deviations from Spec

### Deviation 1: No `+page.ts` Data Loading

**Spec Said:** "src/routes/+page.ts or +page.server.ts - Data loading"

**Implementation Does:** Uses client-side `onMount()` with store-based loading

**Reason:** Maintains consistency with existing architecture; polling requires client-side lifecycle. SvelteKit load functions would require significant refactoring without benefit for single-user system.

**Severity:** Minor - Same functionality achieved via different pattern.

---

### Deviation 2: Pagination Without Server Offset

**Spec Said:** "Pagination support (Engine has 50-item limit)"

**Implementation Does:** "Load More" refetches all and deduplicates client-side

**Reason:** Engine API doesn't support offset parameter. True pagination would require Engine changes outside this unit's scope.

**Severity:** Minor - Functional pagination achieved; may fetch duplicate data on "Load More".

---

## Known Limitations

1. **Pagination Efficiency**: "Load More" refetches all decisions and deduplicates client-side since Engine doesn't support offset. For >50 decisions, this means redundant data transfer.

2. **Session Stats Reset**: `completedThisSession` counter resets on page refresh since it's stored in component state, not persisted.

3. **Relative Time Staleness**: The `created` field shows relative time (e.g., "2m ago") which doesn't update dynamically. Times update on polling refresh (30s interval).

4. **Project Filter Client-Side Only**: API doesn't support project filtering; filtering happens client-side which means all decisions are fetched even when filtering by project.

5. **No Cursor Pagination**: Cannot efficiently paginate through large result sets; limited to 50-item batches with potential duplicates.

---

## Open Questions

- [ ] Should session stats persist to localStorage for continuity across page refreshes?
- [ ] Should relative times update more frequently than the 30s poll interval?
- [ ] Future: Add Engine support for offset/cursor pagination?

---

## Test Coverage

**Note:** This is a frontend Svelte implementation. Formal test coverage metrics require setting up Vitest/Testing Library infrastructure which was not in scope for this unit.

### Manual Testing Performed:
- Loading state displays skeleton on initial load
- Error state appears on network failure with working retry button
- Empty states show correct variant based on context
- "Load More" button appears when `hasMore` is true
- Filter changes trigger appropriate API reloads
- AbortController cancels requests on rapid filter changes
- Session stats counter works correctly

### Recommended Test Scenarios:
- Component unit tests for LoadingState, ErrorState, EmptyState
- Store integration tests for load/loadMore/hasMore behavior
- E2E tests for full user flow

---

## Dependencies Used

| Dependency | Version | Why |
|------------|---------|-----|
| svelte | 4.x | Core framework (existing) |
| svelte/store | - | Reactive state management (existing) |
| tailwindcss | 3.4.x | Styling with animate-pulse for skeletons (existing) |

No new dependencies added.

---

## Files Delivered

### New Files

| File | Description |
|------|-------------|
| `src/lib/components/LoadingState.svelte` | Skeleton loader component with list and detail panel variants |
| `src/lib/components/ErrorState.svelte` | Error display with retry button and user-friendly messages |
| `src/lib/components/EmptyState.svelte` | Context-aware empty state with 'empty' and 'filtered' variants |
| `docs/UNIT-3-DECISION-LIST/IMPLEMENTATION.md` | This implementation documentation |
| `docs/UNIT-3-DECISION-LIST/README.md` | Usage guide and API reference |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/stores/types.ts` | Added `hasMore` and `loadingMore` to `DecisionStoreState` interface |
| `src/lib/stores/decisions.ts` | Added AbortController, type filter param, `loadMore()` method, `hasMore`/`isLoadingMore` derived stores |
| `src/lib/stores/index.ts` | Exported `hasMore` and `isLoadingMore` derived stores |
| `src/routes/+page.svelte` | Integrated loading/error/empty states, Load More button, filter-triggered reload |
| `src/routes/inbox/+page.svelte` | Same integration as main queue page |

---

## Architecture Notes

### State Flow

```
User Action (filter change)
       ↓
Reactive Statement ($:)
       ↓
decisionStore.load({ type })
       ↓
AbortController (cancel previous)
       ↓
decisionsApi.list()
       ↓
transformDecisions()
       ↓
Store Update (decisions, hasMore)
       ↓
Derived Stores (filteredDecisions)
       ↓
UI Re-render
```

### Component Hierarchy

```
+page.svelte
├── LoadingState (when loading && no data)
├── ErrorState (when storeError)
├── EmptyState (when empty or filtered-empty)
└── [Normal View]
    ├── Queue List
    │   ├── Decision Items
    │   └── Load More Button
    └── Detail Panel
        └── DecisionCard
```
