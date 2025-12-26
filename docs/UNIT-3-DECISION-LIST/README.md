# Unit 3: Decision List Integration

Real API integration for the decision queue with loading states, error handling, empty states, and pagination support.

## Overview

This unit replaces mock data loading with real API calls to the Decision Engine (`GET /api/decisions/`), providing a polished user experience with proper feedback during loading, error recovery options, and context-aware empty states.

## Installation

No additional installation required. Components are part of the existing SvelteKit application.

## Usage

### Loading State Component

Display skeleton loader while fetching decisions:

```svelte
<script>
  import LoadingState from '$lib/components/LoadingState.svelte';
  import { isLoading, decisions } from '$lib/stores';
</script>

{#if $isLoading && $decisions.length === 0}
  <LoadingState count={5} showDetail={true} />
{/if}
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `count` | number | 5 | Number of skeleton list items to show |
| `showDetail` | boolean | true | Whether to show the detail panel skeleton |

---

### Error State Component

Display error with retry functionality:

```svelte
<script>
  import ErrorState from '$lib/components/ErrorState.svelte';
  import { storeError, decisionStore } from '$lib/stores';
</script>

{#if $storeError}
  <ErrorState
    error={$storeError}
    onRetry={() => decisionStore.refresh()}
  />
{/if}
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `error` | ApiError | required | Error object with `code` and `message` |
| `onRetry` | () => void | () => {} | Callback when retry button is clicked |

**Error Message Mapping:**
- `NETWORK_ERROR` → "Unable to connect. Check your connection."
- `TIMEOUT` → "Request timed out. Try again?"
- `HTTP_5xx` → "Server error. Please try again."
- Other → Uses error message directly

---

### Empty State Component

Display context-aware empty message:

```svelte
<script>
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { pendingDecisions, filteredDecisions, hasActiveFilters, filterStore } from '$lib/stores';
</script>

{#if $pendingDecisions.length === 0}
  <EmptyState variant="empty" />
{:else if $filteredDecisions.length === 0 && $hasActiveFilters}
  <EmptyState variant="filtered" onClearFilters={() => filterStore.clear()} />
{/if}
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | 'empty' \| 'filtered' | 'empty' | Which empty state to show |
| `onClearFilters` | () => void | undefined | Callback for "Clear filters" button (filtered variant only) |

**Variants:**
- `empty`: Shows "✨ All caught up!" - for when queue is truly empty
- `filtered`: Shows "🔍 No decisions match filters" with clear button

---

### Store Integration

The decision store has been enhanced with pagination and filter support:

```svelte
<script>
  import {
    decisionStore,
    decisions,
    isLoading,
    storeError,
    hasMore,
    isLoadingMore,
    filteredDecisions,
    pendingDecisions,
    hasActiveFilters,
  } from '$lib/stores';

  // Load with optional type filter
  decisionStore.load({ type: 'triage' });

  // Load more for pagination
  function handleLoadMore() {
    decisionStore.loadMore();
  }
</script>

<!-- Load More Button -->
{#if $hasMore}
  <button
    on:click={handleLoadMore}
    disabled={$isLoadingMore}
  >
    {$isLoadingMore ? 'Loading...' : 'Load More'}
  </button>
{/if}
```

**New Store Methods:**
| Method | Signature | Description |
|--------|-----------|-------------|
| `load` | `(filters?: { type?: string }) => Promise<void>` | Load decisions with optional type filter |
| `loadMore` | `() => Promise<void>` | Load next batch and append |
| `refresh` | `() => Promise<void>` | Force refresh with current filter |

**New Derived Stores:**
| Store | Type | Description |
|-------|------|-------------|
| `hasMore` | `Readable<boolean>` | True if more decisions may be available |
| `isLoadingMore` | `Readable<boolean>` | True during loadMore operation |

---

### Filter-Triggered Reload

Stage filter changes automatically reload from API when switching to a valid decision type:

```svelte
<script>
  import { decisionStore, filterStore } from '$lib/stores';
  import { decisionTypeConfig } from '$lib/data/decisions.js';

  let prevStageFilter = 'all';

  // Reactive reload on filter change
  $: {
    const validTypes = Object.keys(decisionTypeConfig);
    const isValidType = validTypes.includes(stageFilter);

    if (stageFilter !== prevStageFilter && isValidType) {
      decisionStore.load({ type: stageFilter });
    }
    prevStageFilter = stageFilter;
  }
</script>
```

**Filter Types:**
- `'all'` - Fetches all decision types (no type param)
- `'urgent'` - Client-side filter for critical priority (no API reload)
- `'triage'`, `'specify'`, etc. - Passes type param to API

---

## Complete Page Integration Example

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import DecisionCard from '$lib/components/DecisionCard.svelte';
  import LoadingState from '$lib/components/LoadingState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import {
    decisionStore,
    decisions,
    filteredDecisions,
    pendingDecisions,
    isLoading,
    storeError,
    hasMore,
    isLoadingMore,
    hasActiveFilters,
    filterStore,
  } from '$lib/stores';

  onMount(() => {
    decisionStore.load();
    decisionStore.startPolling();
  });

  onDestroy(() => {
    decisionStore.stopPolling();
  });

  function clearFilters() {
    filterStore.clear();
  }
</script>

<div class="queue-container">
  {#if $isLoading && $decisions.length === 0}
    <LoadingState count={5} showDetail={true} />

  {:else if $storeError}
    <ErrorState error={$storeError} onRetry={() => decisionStore.refresh()} />

  {:else if $pendingDecisions.length === 0}
    <EmptyState variant="empty" />

  {:else if $filteredDecisions.length === 0 && $hasActiveFilters}
    <EmptyState variant="filtered" onClearFilters={clearFilters} />

  {:else}
    <div class="list">
      {#each $filteredDecisions as decision (decision.id)}
        <DecisionCard {decision} />
      {/each}

      {#if $hasMore}
        <button
          on:click={() => decisionStore.loadMore()}
          disabled={$isLoadingMore}
        >
          {$isLoadingMore ? 'Loading...' : 'Load More'}
        </button>
      {/if}
    </div>
  {/if}
</div>
```

---

## API Reference

### DecisionStoreState

```typescript
interface DecisionStoreState {
  decisions: UiDecision[];
  loading: boolean;
  error: ApiError | null;
  lastFetched: Date | null;
  hasMore: boolean;      // NEW: pagination flag
  loadingMore: boolean;  // NEW: loadMore in progress
}
```

### API Endpoint

```
GET /api/decisions/?type={decisionType}&limit=50
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | - | Filter by decision type (triage, specify, etc.) |
| `limit` | number | 50 | Max results (1-50) |

**Response:** `DecisionResponse[]` ordered by priority then created_at

---

## Testing

### Manual Testing Checklist

1. **Loading State**
   - [ ] Skeleton appears on initial page load
   - [ ] Both list and detail panel skeletons render
   - [ ] Skeleton disappears when data loads

2. **Error State**
   - [ ] Stop backend, refresh page → Error state appears
   - [ ] Click "Try Again" → Retry attempt made
   - [ ] Start backend → Data loads on retry

3. **Empty States**
   - [ ] Resolve all decisions → "All caught up!" appears
   - [ ] Set stage filter to unused type → "No matches" appears
   - [ ] Click "Clear Filters" → Filters reset

4. **Pagination**
   - [ ] Create 51+ decisions → "Load More" button appears
   - [ ] Click "Load More" → Additional decisions append
   - [ ] Button shows "Loading..." during fetch

5. **Filter Reload**
   - [ ] Change stage filter to "triage" → New API call made
   - [ ] Change to "urgent" → No API call (client-side filter)
   - [ ] Rapid filter changes → Only last request completes

---

## Troubleshooting

### Loading State Stuck

If skeleton persists indefinitely:
1. Check browser console for errors
2. Verify backend is running on configured port
3. Check network tab for pending/failed requests

### "Load More" Not Appearing

Button only shows when `hasMore` is true (API returned exactly 50 items):
1. Verify you have >50 pending decisions
2. Check that decisions aren't being filtered client-side

### Filter Changes Not Reloading

Reload only occurs for valid decision types:
1. 'urgent' and 'all' are client-side filters (no reload)
2. Check `decisionTypeConfig` keys for valid types

---

## Delivery Checklist

### Acceptance Criteria (from spec)

- [x] On page load, fetch decisions from `GET /api/decisions/`
- [x] Filter parameters passed as query params (`?type=triage&limit=50`)
- [x] Display loading skeleton while fetching (skeleton preferred over spinner)
- [x] Display error state with retry button on failure
- [x] Empty state when no pending decisions ("All caught up!")
- [x] Empty state for filtered results ("No decisions match filters")
- [x] Decisions sorted by priority then age (API handles ordering)
- [x] Pagination support (Load More button when >50 items)
- [x] Session statistics still work (completed count maintained)

### Standard Requirements

- [x] All acceptance criteria met
- [ ] Unit test coverage >80% (tests not implemented - frontend testing infrastructure not in scope)
- [x] No hardcoded values (configurable via stores/config.ts)
- [x] Error handling complete
- [x] No linter warnings (only pre-existing a11y warnings)
- [x] Code formatted per standards

### Contract Compliance

- [x] Consumes `GET /api/decisions/` endpoint correctly per Engine API
- [x] Uses existing `decisionsApi.list()` from Unit 1
- [x] Extends `DecisionStoreState` from Unit 2 with new fields
- [x] Transforms match Engine response format

### Self-Review

- [x] I would approve this PR
- [x] Edge cases considered (empty, error, loading, pagination)
- [x] Error messages are helpful
- [x] No obvious security issues
