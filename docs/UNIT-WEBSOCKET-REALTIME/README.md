# UNIT-WEBSOCKET-REALTIME

Real-time WebSocket integration for the Readixia Dashboard, enabling instant UI updates when decisions are created, resolved, or resurfaced.

## Overview

This unit establishes persistent WebSocket connections to the Decision Engine, replacing polling-based updates with real-time event streaming. It includes automatic reconnection, keepalive mechanisms, and graceful degradation when the connection is unavailable.

## Features

- **Dual WebSocket connections** to `/ws/decisions` and `/ws/agents`
- **Automatic reconnection** with exponential backoff (1s → 30s cap)
- **Ping/pong keepalive** every 30 seconds
- **Polling fallback** every 5s during reconnection
- **Page visibility handling** - buffers events when tab hidden
- **Sequence tracking** for gap detection and resync
- **Connection indicator** showing real-time status

## Installation

The unit is already integrated into the frontend. No additional installation required.

## Usage

### Automatic Initialization

WebSocket connections are automatically established when the app loads via `+layout.svelte`:

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import { realtimeService } from '$lib/services/realtime';
  import { handleDecisionWebSocketEvent, handleAgentWebSocketEvent } from '$lib/services/eventHandlers';
  import { decisionStore } from '$lib/stores';

  onMount(() => {
    realtimeService.onDecisionEvent = handleDecisionWebSocketEvent;
    realtimeService.onAgentEvent = handleAgentWebSocketEvent;
    realtimeService.onPollNeeded = () => decisionStore.refresh();
    realtimeService.initialize();
  });

  onDestroy(() => {
    realtimeService.destroy();
  });
</script>
```

### Checking Connection Status

```svelte
<script>
  import { isConnected, isReconnecting, decisionsConnectionState } from '$lib/stores';
</script>

{#if $isConnected}
  <span class="text-green-500">Connected</span>
{:else if $isReconnecting}
  <span class="text-amber-500">Reconnecting...</span>
{:else}
  <span class="text-red-500">Disconnected</span>
{/if}
```

### Using the Connection Indicator Component

```svelte
<script>
  import ConnectionIndicator from '$lib/components/ConnectionIndicator.svelte';
</script>

<!-- With label -->
<ConnectionIndicator />

<!-- Without label (just the dot) -->
<ConnectionIndicator showLabel={false} />
```

### Accessing Notifications

```svelte
<script>
  import { notifications, realtimeStore } from '$lib/stores';
</script>

{#each $notifications as notification (notification.id)}
  <div class="notification">
    <p>{notification.message}</p>
    <button on:click={() => realtimeStore.dismissNotification(notification.id)}>
      Dismiss
    </button>
  </div>
{/each}
```

## API Reference

### RealtimeService

Singleton service managing WebSocket connections.

```typescript
import { realtimeService } from '$lib/services/realtime';

// Initialize connections (call once on app load)
realtimeService.initialize();

// Destroy connections (call on app unmount)
realtimeService.destroy();

// Check connection state
realtimeService.isConnected();    // boolean
realtimeService.isReconnecting(); // boolean
realtimeService.getState();       // { isInitialized, decisions, agents }

// Event handlers (set before initialize)
realtimeService.onDecisionEvent = (event) => { /* ... */ };
realtimeService.onAgentEvent = (event) => { /* ... */ };
realtimeService.onPollNeeded = () => { /* ... */ };
realtimeService.onResyncNeeded = () => { /* ... */ };
```

### WebSocketClient

Class managing a single WebSocket connection. Not used directly; accessed via RealtimeService.

```typescript
import { WebSocketClient } from '$lib/services/websocket';

const client = new WebSocketClient({
  url: 'ws://localhost:8000/ws/decisions',
  name: 'decisions',
  onMessage: (event) => console.log('Received:', event),
  onStateChange: (state) => console.log('State:', state),
  onError: (error) => console.error('Error:', error),
  onResyncNeeded: (lastSeq) => console.log('Resync from:', lastSeq),
});

client.connect();
client.disconnect();
client.destroy();

client.getState();          // 'online' | 'offline' | 'error' | 'reconnecting'
client.getLastSeq();        // number
client.getReconnectAttempts(); // number
```

### Realtime Store

Svelte store tracking connection state and notifications.

```typescript
import {
  realtimeStore,
  isConnected,
  isReconnecting,
  isDecisionsConnected,
  decisionsConnectionState,
  agentsConnectionState,
  notifications,
  notificationCount,
} from '$lib/stores';

// Update state (called by event handlers)
realtimeStore.setDecisionsState('online', seqNumber);
realtimeStore.setAgentsState('reconnecting');

// Manage notifications
realtimeStore.addNotification({
  type: 'checkpoint_expired',
  message: 'Checkpoint expired for task',
  data: { taskPath: '/tasks/123.md' },
});
realtimeStore.dismissNotification('notif-123');
realtimeStore.clearNotifications();

// Reset
realtimeStore.reset();
```

### Event Types

```typescript
import type {
  // Decision events (from /ws/decisions)
  DecisionCreatedEvent,
  DecisionResolvedEvent,
  DecisionResurfacedEvent,
  UndoAvailableEvent,
  DecisionWebSocketEvent,

  // Agent events (from /ws/agents)
  CheckpointExpiredEvent,
  AgentStatusEvent,
  AgentCompletedEvent,
  AgentWebSocketEvent,

  // Combined
  WebSocketEvent,
} from '$lib/stores';
```

## Configuration

Timing constants in `src/lib/stores/config.ts`:

```typescript
export const REALTIME_CONFIG = {
  INITIAL_RECONNECT_DELAY: 1000,   // Initial delay before reconnect
  MAX_RECONNECT_DELAY: 30000,      // Maximum delay (backoff cap)
  PING_INTERVAL: 30000,            // How often to send ping
  PONG_TIMEOUT: 5000,              // How long to wait for pong
  POLL_FALLBACK_INTERVAL: 5000,    // Polling interval when disconnected
  MAX_EVENT_BUFFER: 100,           // Max events to buffer when tab hidden
  MAX_NOTIFICATIONS: 10,           // Max notifications to keep
};
```

## WebSocket Message Formats

### From /ws/decisions

```typescript
// decision_created
{ seq: 1, type: 'decision_created', decision_id: 'dec-123',
  decision_type: 'triage', subject: { type: 'task', id: 'task-1', title: 'Review PR' },
  priority: 'high', created_at: '2025-01-15T10:00:00Z' }

// decision_resolved
{ seq: 2, type: 'decision_resolved', decision_id: 'dec-123',
  resolution: { choice: 'specify' }, resolved_by: 'human', resolved_at: '...' }

// decision_resurfaced
{ seq: 3, type: 'decision_resurfaced', decision_id: 'dec-456',
  subject: { type: 'task', id: 'task-2', title: 'Deferred task' },
  defer_count: 2, resurfaced_at: '...' }

// undo_available
{ seq: 4, type: 'undo_available', decision_id: 'dec-123',
  action_id: 'act-789', expires_at: '2025-01-15T10:05:00Z' }
```

### From /ws/agents

```typescript
// checkpoint_expired
{ seq: 1, type: 'checkpoint_expired', task_path: '/tasks/123.md',
  question: 'Should I proceed with deletion?', message: 'Checkpoint expired after 5 minutes' }

// agent_status
{ seq: 2, type: 'agent_status', agent_id: 'agent-1', name: 'Executor',
  status: 'running', progress: 45, current_task: 'Writing code...' }

// agent_completed
{ seq: 3, type: 'agent_completed', agent_id: 'agent-1',
  result: 'success', duration_ms: 12500 }
```

## Testing

Run existing tests:

```bash
npm test
```

All 118 tests should pass, including 6 event handling tests that validate the store's `handleEvent()` method with underscore-named events.

## Troubleshooting

### Connection shows "Disconnected"

1. Check that the Decision Engine is running on port 8000
2. Verify WebSocket endpoint is accessible: `wscat -c ws://localhost:8000/ws/decisions`
3. Check browser console for connection errors

### Events not updating UI

1. Verify `realtimeService.initialize()` was called
2. Check that event handlers are wired up before `initialize()`
3. Look for sequence gap warnings in console (triggers resync)

### Reconnection not working

1. Check console for reconnection attempt logs
2. Verify `REALTIME_CONFIG` values are reasonable
3. Ensure Engine is reachable when reconnect fires

---

# Delivery Checklist for UNIT-WEBSOCKET-REALTIME

## Acceptance Criteria (from spec)

- [x] Connect to `ws://localhost:8000/ws/decisions` on page load
- [x] Connect to `ws://localhost:8000/ws/agents` on page load (added per user decision)
- [x] Handle `decision_created`: Add new decision to list
- [x] Handle `decision_resolved`: Remove decision from list
- [x] Handle `decision_resurfaced`: Add deferred decision back to list
- [x] Handle `undo_available`: Show undo button with countdown timer (via actionStore)
- [x] Handle `checkpoint_expired`: Show notification
- [x] Automatic reconnection on disconnect (exponential backoff)
- [x] Connection status indicator (connected/disconnected/reconnecting)
- [x] Polling fallback: Poll every 5s during reconnection attempts
- [x] Ping/pong keepalive every 30 seconds
- [x] Handle page visibility changes (pause/resume connection)
- [x] Graceful degradation when WebSocket unavailable

## Standard Requirements

- [x] All acceptance criteria met
- [ ] Unit test coverage >80% (coverage tooling not installed; existing tests pass)
- [x] Integration tests pass with stubs (N/A - no stubs consumed)
- [x] No hardcoded values (all timings in REALTIME_CONFIG)
- [x] Error handling complete (reconnection, parse errors, pong timeout)
- [x] Logging at appropriate levels (console.log/warn/error)
- [x] Stubs provided for downstream units (N/A - no stubs needed)
- [x] IMPLEMENTATION.md complete
- [x] No linter warnings (only pre-existing a11y warnings in other files)
- [x] Code formatted per standards

## Contract Compliance

- [x] Implements WebSocket client per Engine specification
- [x] Consumes Engine message formats correctly (underscore naming)
- [x] Wire formats match Engine's websocket.py definitions

## Self-Review

- [x] I would approve this PR
- [x] Edge cases considered (visibility, sequence gaps, reconnection, buffer overflow)
- [x] Error messages are helpful (console logs include endpoint name and context)
- [x] No obvious security issues (uses native WebSocket, no eval/innerHTML)

## Files Delivered

### New Files
- `src/lib/services/websocket.ts`
- `src/lib/services/realtime.ts`
- `src/lib/services/eventHandlers.ts`
- `src/lib/stores/realtime.ts`
- `src/lib/components/ConnectionIndicator.svelte`
- `docs/UNIT-WEBSOCKET-REALTIME/IMPLEMENTATION.md`
- `docs/UNIT-WEBSOCKET-REALTIME/README.md`

### Modified Files
- `src/lib/stores/config.ts`
- `src/lib/stores/types.ts`
- `src/lib/api/types.ts`
- `src/lib/stores/decisions.ts`
- `src/lib/stores/index.ts`
- `src/routes/+layout.svelte`
- `src/lib/stores/decisions.test.ts`
