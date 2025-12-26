# Decision Stores

Centralized Svelte stores for decision queue state management in the Readixia Dashboard.

## Overview

This package provides reactive state management for decisions across all views (`/`, `/inbox`, `/focus`). It replaces component-local state with shared stores, enabling:

- **Cross-view state sync:** Filter changes in one view reflect in others
- **Reactive derived data:** Filtered lists and statistics update automatically
- **API integration:** Load, resolve, defer, and undo operations
- **Real-time ready:** Polling with WebSocket-compatible event handling

## Installation

Import from `$lib/stores`:

```typescript
import {
  decisionStore,
  filterStore,
  filteredDecisions,
  queueStats,
} from '$lib/stores';
```

## Quick Start

### Basic Usage in a Svelte Component

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import {
    decisionStore,
    filteredDecisions,
    filterStore,
    queueStats,
  } from '$lib/stores';

  // Initialize on mount
  onMount(() => {
    decisionStore.load();
    decisionStore.startPolling();
  });

  onDestroy(() => {
    decisionStore.stopPolling();
  });
</script>

<!-- Display filtered decisions -->
{#each $filteredDecisions as decision (decision.id)}
  <div>{decision.subject.title}</div>
{/each}

<!-- Show stats -->
<span>Total: {$queueStats.total}</span>
<span>Urgent: {$queueStats.urgent}</span>

<!-- Filter controls -->
<button on:click={() => filterStore.setStage('triage')}>
  Show Triage Only
</button>
<button on:click={() => filterStore.clear()}>
  Clear Filters
</button>
```

## API Reference

### Core Stores

#### `decisionStore`

Main store for decision data with CRUD operations.

```typescript
// Load decisions from API
await decisionStore.load();

// Force refresh
await decisionStore.refresh();

// Resolve a decision
const result = await decisionStore.resolve(id, { action: 'approve' });
// Returns: { decision, chainedDecisions }

// Defer a decision
await decisionStore.defer(id, '2024-12-26T10:00:00Z', 'Need more info');

// Undo a resolved decision
await decisionStore.undo(id);

// Start/stop polling (30s default)
decisionStore.startPolling();
decisionStore.startPolling(60000); // Custom interval
decisionStore.stopPolling();

// Handle real-time events (future WebSocket)
decisionStore.handleEvent({ type: 'decision.created', decision });

// Local mutations
decisionStore.addDecision(newDecision);           // Prepend to list
decisionStore.insertAfter(parentId, newDecision); // Insert after parent (for chaining)
decisionStore.updateDecision(id, { status: 'completed' });
decisionStore.removeDecision(id);

// Pagination
await decisionStore.loadMore();  // Load next batch

// Error handling
decisionStore.clearError();
decisionStore.reset();
```

#### `sessionStore`

Session statistics store with browser persistence.

```typescript
import { sessionStore, completedCount } from '$lib/stores';

// Increment/decrement completed count
sessionStore.increment();  // Called when decision completed
sessionStore.decrement();  // Called on undo

// Reset session stats
sessionStore.reset();

// Access count reactively
$completedCount  // number - completed this session
```

**Persistence:** Uses `sessionStorage` - survives page refresh within same browser tab, cleared when tab closes.

#### `filterStore`

Shared filter state across views.

```typescript
// Set individual filters
filterStore.setStage('triage');     // Decision type or 'all' or 'urgent'
filterStore.setType('task');        // Subject type or 'all'
filterStore.setProject('Q1 Planning'); // Project name or 'all'
filterStore.setSearch('report');    // Free text search

// Set multiple at once
filterStore.setFilters({ stage: 'triage', type: 'task' });

// Clear all filters
filterStore.clear();

// Get current state (sync)
const current = filterStore.getFilters();
```

### Derived Stores

| Store | Type | Description |
|-------|------|-------------|
| `decisions` | `UiDecision[]` | Raw decision array |
| `pendingDecisions` | `UiDecision[]` | Decisions with status='pending' |
| `filteredDecisions` | `UiDecision[]` | Pending decisions with filters applied |
| `queueStats` | `QueueStats` | Counts: total, byType, byPriority, urgent |
| `filteredStats` | `QueueStats` | Stats for filtered subset |
| `allProjects` | `string[]` | Unique project names (sorted) |
| `activeDecisionTypes` | `string[]` | Decision types in current queue |
| `activeSubjectTypes` | `string[]` | Subject types in current queue |
| `countByType` | `Record<string, number>` | Count per decision type |
| `urgentCount` | `number` | Count of critical priority |
| `totalCount` | `number` | Total pending count |
| `hasActiveFilters` | `boolean` | True if any filter is active |
| `isLoading` | `boolean` | True during API calls |
| `isLoadingMore` | `boolean` | True during loadMore operation |
| `hasMore` | `boolean` | True if more decisions available |
| `storeError` | `ApiError \| null` | Current error state |
| `lastFetched` | `Date \| null` | Last successful fetch time |
| `completedCount` | `number` | Completed decisions this session |

### Types

```typescript
import type {
  // Store state
  DecisionStoreState,
  FilterState,
  QueueStats,

  // Per-decision-type data
  TriageData,
  SpecifyData,
  ClarifyingData,
  VerifyingData,
  ReviewData,
  ConflictData,
  EscalateData,
  EnrichData,
  MeetingTriageData,
  ExtractData,
  CategorizeData,

  // Event types (for WebSocket)
  DecisionEvent,
} from '$lib/stores';
```

### Type Guards

```typescript
import {
  isTriageData,
  isSpecifyData,
  isVerifyingData,
  isConflictData,
  isEscalateData,
  isEnrichData,
  isMeetingTriageData,
} from '$lib/stores';

// Usage
if (isTriageData(decision.data)) {
  console.log(decision.data.suggestedDestination);
}
```

### Configuration

```typescript
import { STORE_CONFIG } from '$lib/stores';

// Available constants
STORE_CONFIG.MAX_DECISIONS      // 500 - Max decisions in memory
STORE_CONFIG.POLL_INTERVAL_MS   // 30000 - Polling interval
STORE_CONFIG.UNDO_WINDOW_MS     // 30000 - Undo availability window
STORE_CONFIG.SEARCH_DEBOUNCE_MS // 300 - Search debounce (not implemented)
STORE_CONFIG.PAGE_SIZE          // 100 - Pagination page size
```

## Filtering Logic

Filters are applied in this order:

1. **Status:** Only pending decisions pass
2. **Stage:** Match decision type, or 'urgent' matches priority='critical'
3. **Type:** Match subject type
4. **Project:** Match project name
5. **Search:** Case-insensitive title substring match

```typescript
// Example: Show urgent triage decisions for Q1 Planning
filterStore.setFilters({
  stage: 'triage',
  project: 'Q1 Planning',
});
// Plus: decisions must have priority='critical' for 'urgent' filter
```

## WebSocket Integration (Future)

The store is designed for WebSocket integration. When ready:

```typescript
// In your WebSocket handler
socket.on('decision.created', (decision) => {
  decisionStore.handleEvent({ type: 'decision.created', decision });
});

socket.on('decision.resolved', (data) => {
  decisionStore.handleEvent({
    type: 'decision.resolved',
    id: data.id,
    resolution: data.resolution,
  });
});
```

Supported event types:
- `decision.created` - New decision added
- `decision.updated` - Decision data changed
- `decision.resolved` - Decision completed
- `decision.chained` - Chained decision created
- `decision.expired` - Decision expired
- `decisions.refresh` - Full refresh

## Error Handling

```svelte
<script>
  import { storeError, decisionStore } from '$lib/stores';
</script>

{#if $storeError}
  <div class="error">
    {$storeError.message}
    <button on:click={() => decisionStore.clearError()}>Dismiss</button>
    <button on:click={() => decisionStore.refresh()}>Retry</button>
  </div>
{/if}
```

## Testing

### Running Tests

```bash
npm test           # Watch mode
npm test -- --run  # Single run
npm test:coverage  # With coverage report
```

### Test Results

```
✓ 118 tests passing (3 test files)
  - decisions.test.ts: 33 tests
  - filters.test.ts: 45 tests
  - derived.test.ts: 40 tests
```

### Mocking Stores in Tests

```typescript
import { writable } from 'svelte/store';
import type { UiDecision } from '$lib/api/types';

// Create mock store
const mockDecisions = writable<UiDecision[]>([
  { id: 'test-1', decisionType: 'triage', ... }
]);

// In test setup
vi.mock('$lib/stores', () => ({
  filteredDecisions: mockDecisions,
  decisionStore: {
    load: vi.fn(),
    resolve: vi.fn(),
    insertAfter: vi.fn(),
    // ...
  },
  sessionStore: {
    increment: vi.fn(),
    decrement: vi.fn(),
    reset: vi.fn(),
  },
}));
```

## File Structure

```
src/lib/stores/
├── types.ts              # Type definitions
├── config.ts             # Configuration constants
├── decisions.ts          # Core decision store
├── filters.ts            # Filter state store
├── session.ts            # Session stats store (with persistence)
├── derived.ts            # Derived/computed stores
├── index.ts              # Public exports
├── decisions.test.ts     # Decision store tests (33 tests)
├── filters.test.ts       # Filter store tests (45 tests)
└── derived.test.ts       # Derived store tests (40 tests)
```

## Dependencies

**Runtime:**
- `svelte/store` - Core store primitives
- `$lib/api` - API client and types (Unit 1)

**Dev (Testing):**
- `vitest` - Unit testing framework
- `@testing-library/svelte` - Svelte testing utilities
- `jsdom` - DOM simulation

## Changelog

### v1.1.0 (Open Items Fix)

- Added `sessionStore` with sessionStorage persistence
- Added `insertAfter()` method for chained decision ordering
- Added `loadMore()` for pagination
- Added 118 unit tests (Vitest)
- Added `hasMore` and `isLoadingMore` derived stores

### v1.0.0 (Unit 2)

- Initial implementation
- Core stores: `decisionStore`, `filterStore`
- Derived stores: `filteredDecisions`, `queueStats`, etc.
- API integration with polling
- WebSocket-ready event handling
- Per-decision-type data interfaces
