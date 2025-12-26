# Unit 4: Decision Actions Integration

Wire up all decision resolution actions (resolve, defer, undo) to Engine API endpoints with optimistic updates, rollback on failure, and undo support.

## Overview

This unit provides the complete action lifecycle for decision resolution:

- **Resolve**: Submit decision resolution with type-specific payload
- **Defer**: Postpone decision to a future time with optional reason
- **Undo**: Revert a resolution within the 5-minute window

## Installation

Components are part of the main frontend package. No additional installation required.

```javascript
// Import stores
import { actionStore, undoableActions, hasUndoableActions } from '$lib/stores';

// Import components
import UndoToast from '$lib/components/UndoToast.svelte';
import DeferDropdown from '$lib/components/DeferDropdown.svelte';

// Import utilities
import { buildResolutionPayload } from '$lib/utils/resolution';
```

## Usage

### Basic Resolution Flow

```svelte
<script>
  import { decisionStore, actionStore } from '$lib/stores';
  import { buildResolutionPayload } from '$lib/utils/resolution';

  async function handleAction(event) {
    const { name, decision, resolution } = event.detail;

    try {
      const result = await decisionStore.resolve(decision.id, resolution);

      // Add to undo history
      if (result.actionId) {
        actionStore.add({
          id: result.actionId,
          decisionId: decision.id,
          decisionTitle: decision.subject.title,
          expiresAt: result.undoExpiresAt,
          timestamp: new Date(),
          actionName: name
        });
      }
    } catch (error) {
      if (error.code === 'DE-DEC-002') {
        // Already resolved - handle gracefully
        console.log('Decision was already completed');
      }
    }
  }
</script>

<DecisionCard {decision} on:action={handleAction} />
```

### Adding UndoToast Globally

Add to your root layout for cross-view visibility:

```svelte
<!-- +layout.svelte -->
<script>
  import UndoToast from '$lib/components/UndoToast.svelte';
</script>

<slot />
<UndoToast />
```

### Using DeferDropdown

```svelte
<script>
  import DeferDropdown from '$lib/components/DeferDropdown.svelte';
  import { decisionStore } from '$lib/stores';

  async function handleDefer(event) {
    const { until, reason } = event.detail;
    await decisionStore.defer(decision.id, until, reason);
  }
</script>

<DeferDropdown
  {decision}
  disabled={actionInProgress}
  on:defer={handleDefer}
/>
```

### Building Resolution Payloads

```javascript
import { buildResolutionPayload } from '$lib/utils/resolution';

// For triage decisions
const formData = {
  destination: 'Project Task',
  project: 'Q4 Planning',
  priority: 'p2'
};
const payload = buildResolutionPayload(decision, 'Proceed', formData);
// Result: { resolution: { action: 'route', destination: 'Project Task', ... } }

// For review decisions
const reviewData = { feedback: 'Looks good!' };
const payload = buildResolutionPayload(decision, 'Approve', reviewData);
// Result: { resolution: { approved: true, feedback: 'Looks good!' } }
```

## API Reference

### actionStore

Manages the undo history with automatic expiration.

```typescript
interface UndoableAction {
  id: string;              // From Engine's action_id
  decisionId: string;      // Decision that was resolved
  decisionTitle: string;   // For display in toast
  expiresAt: Date;         // When undo window closes
  timestamp: Date;         // When action occurred
  actionName?: string;     // Action type for display
}

// Methods
actionStore.add(action: UndoableAction): void
actionStore.remove(actionId: string): void
actionStore.undo(actionId: string): Promise<boolean>
actionStore.clear(): void
actionStore.getTimeRemaining(actionId: string): number  // seconds

// Derived stores
undoableActions      // Array of non-expired actions
hasUndoableActions   // Boolean
latestUndoableAction // Most recent action or null
isUndoing            // Boolean - undo in progress
undoError            // Error from last undo attempt
```

### buildResolutionPayload

Builds type-specific resolution payloads.

```typescript
function buildResolutionPayload(
  decision: UiDecision,
  actionName: string,
  formData: CardFormData
): ResolutionPayload

interface ResolutionPayload {
  resolution: Record<string, unknown>;
}
```

**Supported Decision Types:**

| Type | Payload Fields |
|------|----------------|
| `triage` | `destination`, `project`, `priority` |
| `specify` | `aiSpec`, `successCriteria` |
| `review` | `approved`, `feedback` |
| `clarifying` | `answers` |
| `conflict` | `choice` (keep_mine/take_theirs/merge) |
| `verifying` | `action` (retry/override/escalate) |
| `escalate` | `action`, `instructions` |
| `enrich` | `project`, `date`, `speakers` |
| `extract` | `confirmed`, `edits` |
| `meeting_triage` | `selectedTasks` |

### DecisionCard Props

```typescript
export let decision: UiDecision;

// Events dispatched:
// 'action' - { name, decision, payload, resolution }
// 'defer' - when defer button clicked
// 'skip' - when skip button clicked
```

### UndoToast

Self-contained component that subscribes to actionStore.

```svelte
<UndoToast />
<!-- No props required - self-manages via store subscription -->
```

### DeferDropdown

```typescript
export let decision: UiDecision;  // For defer count check
export let disabled: boolean = false;

// Events dispatched:
// 'defer' - { until: string (ISO), reason?: string }
```

## Error Handling

### 409 Conflict (Already Resolved)

When a decision is resolved by another tab/user:

```javascript
try {
  await decisionStore.resolve(id, resolution);
} catch (error) {
  if (error.code === 'DE-DEC-002' || error.status === 409) {
    // Don't rollback - decision should stay removed
    showToast('Decision was already completed', 'info');
    return;
  }
  // Other errors - store already rolled back
  showToast(`Error: ${error.message}`, 'error');
}
```

### Undo Window Expired

```javascript
const success = await actionStore.undo(actionId);
if (!success) {
  // Check error
  if ($undoError?.code === 'EXPIRED' || $undoError?.code === 'DE-DEC-005') {
    showToast('Undo window has expired', 'info');
  }
}
```

### Deferral Limit

Defer button is automatically disabled when `decision.deferCount >= 5`:

```svelte
<button
  disabled={deferDisabled}
  title={deferDisabled ? 'Maximum deferrals reached (5)' : `${remainingDeferrals} remaining`}
>
  Defer {#if deferDisabled}(limit){/if}
</button>
```

## Testing

### Running Tests

```bash
npm test
```

### Mocking the Action Store

```javascript
import { actionStore } from '$lib/stores';

// Mock add
vi.spyOn(actionStore, 'add').mockImplementation(() => {});

// Mock undo
vi.spyOn(actionStore, 'undo').mockResolvedValue(true);
```

### Testing Resolution Payloads

```javascript
import { buildResolutionPayload } from '$lib/utils/resolution';

test('builds triage payload', () => {
  const decision = { decisionType: 'triage', /* ... */ };
  const formData = { destination: 'Quick Win', project: 'Inbox' };

  const result = buildResolutionPayload(decision, 'Proceed', formData);

  expect(result.resolution).toEqual({
    action: 'route',
    destination: 'Quick Win',
    project: 'Inbox',
    priority: 'normal'
  });
});
```

## Configuration

Configuration values in `src/lib/stores/config.ts`:

```typescript
export const STORE_CONFIG = {
  // Undo window duration (matches Engine's 5 minutes)
  UNDO_WINDOW_MS: 300_000,

  // Other config...
};
```

## Dependencies

This unit depends on:

- **Unit 3**: API Client (`decisionsApi.resolve()`, `defer()`, `undo()`)
- **Unit 3**: Decision Store (`decisionStore.resolve()`, `defer()`, `undo()`)

This unit is depended on by:

- **Unit 5**: Test Infrastructure (will test these components)
- **Unit 11**: Advanced Features (will extend action handling)

## Changelog

### v1.0.0 (Initial Implementation)

- Action history store with auto-expiry
- UndoToast component with countdown
- DeferDropdown with presets + custom
- Resolution payload builder for all decision types
- DecisionCard loading states and form bindings
- 409 conflict handling
- Deferral limit enforcement
