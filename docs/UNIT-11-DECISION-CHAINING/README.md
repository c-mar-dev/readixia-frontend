# Unit 11: Decision Chaining & Workflow

Server-driven decision chaining with auto-selection and subject-based progress tracking.

## Overview

When a decision is resolved, the Engine may create follow-up decisions (e.g., triage → specify → verifying → review). This unit ensures the frontend handles this flow correctly by:

1. Using server-provided `chained_decisions[]` from resolution response
2. Auto-selecting the first chained decision for immediate action
3. Tracking workflow progress per subject for accurate progress display

## Installation

This unit is part of the frontend SvelteKit application. No separate installation required.

```typescript
// Import from stores
import {
  chainHistoryStore,
  chainHistory,
  WORKFLOW_ORDER
} from '$lib/stores';
```

## Usage

### Automatic Chaining (Built-in)

Chaining is handled automatically when resolving decisions:

```typescript
// In page component
const result = await decisionStore.resolve(decision.id, resolution);

// result.chainedDecisions contains any follow-up decisions
// They are automatically inserted into the queue and first is auto-selected
if (result.chainedDecisions.length > 0) {
  await tick();
  selectDecision(result.chainedDecisions[0]);
}
```

### Progress Tracking

Chain history is recorded automatically. Access it for progress display:

```svelte
<script>
  import { chainHistory, WORKFLOW_ORDER } from '$lib/stores';

  // Get completed stages for a subject
  $: subjectHistory = $chainHistory.get(decision.subject.id) || [];
  $: completedTypes = subjectHistory.map(s => s.type);
</script>

<!-- Display progress -->
{#each WORKFLOW_ORDER as step, i}
  {@const isCompleted = completedTypes.includes(step)}
  <div class="{isCompleted ? 'bg-green-500' : 'bg-zinc-800'}">
    {step}
  </div>
{/each}
```

### Manual Recording (Advanced)

For custom workflows, record completions manually:

```typescript
import { chainHistoryStore } from '$lib/stores';

// Record a completion
chainHistoryStore.recordCompletion(
  decision.subject.id,  // Subject identifier
  decision.decisionType, // 'triage', 'specify', etc.
  decision.id           // Decision ID (for idempotency)
);

// Get progress
const progress = chainHistoryStore.getProgress(subjectId);
// { completed: ['triage', 'specify'], completedCount: 2, totalStages: 4 }

// Check if subject has history
const hasHistory = chainHistoryStore.hasHistory(subjectId);

// Clear history
chainHistoryStore.clear(); // All subjects
chainHistoryStore.clearSubject(subjectId); // Single subject
```

## API Reference

### chainHistoryStore

Main store for tracking decision workflow progress.

| Method | Description |
|--------|-------------|
| `recordCompletion(subjectId, decisionType, decisionId)` | Record a completed decision stage |
| `getHistory(subjectId): CompletedStage[]` | Get all completed stages for subject |
| `getProgress(subjectId)` | Get progress summary for subject |
| `hasHistory(subjectId): boolean` | Check if subject has any history |
| `clear()` | Clear all history |
| `clearSubject(subjectId)` | Clear history for specific subject |
| `reset()` | Reset store to initial state |

### chainHistory (Derived Store)

Svelte-subscribable derived store containing the raw history Map.

```typescript
$: history = $chainHistory; // Map<string, CompletedStage[]>
```

### WORKFLOW_ORDER

Constant defining the standard workflow stages:

```typescript
const WORKFLOW_ORDER = ['triage', 'specify', 'verifying', 'review'] as const;
```

### CompletedStage

Type for completed stage records:

```typescript
interface CompletedStage {
  type: string;       // Decision type (e.g., 'triage')
  decisionId: string; // ID of resolved decision
  completedAt: Date;  // When completed
}
```

## Workflow Stages

The standard workflow follows this progression:

```
┌─────────┐    ┌─────────┐    ┌───────────┐    ┌────────┐
│ triage  │───▶│ specify │───▶│ verifying │───▶│ review │
└─────────┘    └─────────┘    └───────────┘    └────────┘
     │              ▲                               │
     │              └───────────────────────────────┘
     │                    (revision loop)
     ▼
  [done]
```

### Chaining Rules (Engine-Controlled)

| Source | Action | Creates |
|--------|--------|---------|
| triage | route to specify | specification |
| categorize | route to AI | specification |
| specification | needs clarification | clarification |
| verification | failed (max retries) | review |
| verification | timeout/error | escalation |
| meeting_tasks | approved | multiple categorize |
| review | escalate | escalation |

## Testing

Run unit tests:

```bash
npm test -- --run src/lib/stores/chainHistory.test.ts
```

Run all store tests:

```bash
npm test -- --run src/lib/stores/
```

### Test Coverage

- 33 tests covering all chainHistoryStore methods
- Integration with decisions store tested
- Edge cases: idempotency, memory limits, concurrent subjects

## Configuration

| Constant | Value | Description |
|----------|-------|-------------|
| `WORKFLOW_ORDER` | `['triage', 'specify', 'verifying', 'review']` | Standard workflow stages |
| `MAX_SUBJECTS` | 200 | Maximum subjects tracked (prevents memory leaks) |

## Dependencies

- **Blocked by:** Units 4, 5, 6, 7 (store architecture, API client)
- **Blocks:** Unit 13 (advanced workflow features)

## Acceptance Criteria

- [x] Resolution response includes `chained_decisions[]` from Engine
- [x] Chained decisions added to list immediately (before WebSocket confirms)
- [x] Auto-select first chained decision after resolution
- [x] Progress indicator shows workflow position per subject
- [x] Batch resolution for `meeting_triage` creates multiple triage decisions
- [x] Decision chain context preserved (same `subject.id` throughout)
- [x] Handle long chains gracefully (no infinite loops)
- [x] Some workflows may skip stages (progress shows actual completed)

## Files

| File | Purpose |
|------|---------|
| `src/lib/stores/chainHistory.ts` | Chain history store implementation |
| `src/lib/stores/chainHistory.test.ts` | Unit tests |
| `src/lib/stores/index.ts` | Public exports |
| `src/lib/stores/decisions.ts` | Integration (records completions) |
| `src/routes/+page.svelte` | Auto-selection implementation |
| `src/routes/inbox/+page.svelte` | Auto-selection implementation |
| `src/routes/focus/+page.svelte` | Natural auto-advance |
| `src/lib/components/DecisionCard.svelte` | Progress bar display |
