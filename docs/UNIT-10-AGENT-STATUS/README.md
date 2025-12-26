# UNIT-10-AGENT-STATUS

Real-time agent status integration for the Readixia Dashboard, displaying live execution monitoring for background AI agents.

## Overview

This unit connects the `/agents` page to the Decision Engine's WebSocket endpoint, replacing mock data with real-time agent status updates. It provides a reactive Svelte store that tracks agent execution progress, handles completion/failure states, and automatically detects idle agents.

## Features

- **Real-time status updates** from `ws://localhost:8000/ws/agents`
- **Six agent states**: idle, running, error, completed, failed, timeout
- **Idle detection**: Running agents transition to idle after 30s without activity
- **Progress tracking**: Visual progress bar for running agents
- **Log streaming**: Displays last 2 log entries per agent
- **Permanent retention**: Agents remain visible until page refresh

## Installation

The unit is already integrated into the frontend. No additional installation required.

## Usage

### Viewing Agent Status

Navigate to `/agents` in the dashboard. The page automatically:
1. Subscribes to the agents derived store
2. Starts idle detection on mount
3. Displays agents in a responsive grid

### Accessing Agent Data in Components

```svelte
<script>
  import { agents, activeAgents, hasErrors, runningCount } from '$lib/stores';
</script>

<!-- Show all agents -->
{#each $agents as agent (agent.id)}
  <div>{agent.name}: {agent.status}</div>
{/each}

<!-- Show running count -->
<span>{$runningCount} agents running</span>

<!-- Show error indicator -->
{#if $hasErrors}
  <span class="text-red-500">Errors detected</span>
{/if}
```

### Using the AgentCard Component

```svelte
<script>
  import AgentCard from '$lib/components/AgentCard.svelte';
  import type { AgentState } from '$lib/stores';

  export let agent: AgentState;
</script>

<AgentCard {agent} />
```

### Manual Store Interaction

```typescript
import { agentStore, agents } from '$lib/stores';

// Start idle detection (normally done by agents page)
agentStore.startIdleDetection();

// Stop idle detection
agentStore.stopIdleDetection();

// Remove a specific agent
agentStore.remove('agent-123');

// Clear all agents
agentStore.clear();

// Access current agents as array
const currentAgents = get(agents);
```

## API Reference

### Agent Store (`agentStore`)

The main writable store managing agent state.

| Method | Parameters | Description |
|--------|------------|-------------|
| `handleEvent(event)` | `AgentWebSocketEvent` | Process incoming WebSocket event |
| `remove(agentId)` | `string` | Remove agent from store |
| `clear()` | none | Remove all agents |
| `reset()` | none | Reset to initial state |
| `startIdleDetection()` | none | Start 10s interval for idle checks |
| `stopIdleDetection()` | none | Stop idle check interval |

### Derived Stores

| Store | Type | Description |
|-------|------|-------------|
| `agents` | `AgentState[]` | All agents sorted by lastActive (newest first) |
| `activeAgents` | `AgentState[]` | Only agents with status 'running' |
| `hasErrors` | `boolean` | True if any agent has error/failed status |
| `runningCount` | `number` | Count of running agents |
| `errorCount` | `number` | Count of agents with errors |

### AgentState Interface

```typescript
interface AgentState {
  id: string;           // Unique agent identifier
  name: string;         // Human-readable name (e.g., "Executor")
  role: string;         // Role description (e.g., "Task Executor")
  status: AgentStatus;  // Current state
  progress: number;     // 0-100 percentage
  currentTask: string | null;  // Current activity description
  lastActive: Date;     // Last activity timestamp
  logs: string[];       // Recent log entries (max 10)
  result?: AgentResult; // Completion/failure details
}

type AgentStatus = 'idle' | 'running' | 'error' | 'completed' | 'failed' | 'timeout';
```

### WebSocket Events Handled

| Event Type | Source Field | Description |
|------------|--------------|-------------|
| `agent_status` | `agent_id` | Periodic status update (~1s) |
| `agent_completed` | `agent_id` | Agent finished successfully |
| `agent_failed` | `decision_id` | Agent execution failed |
| `agent_timeout` | `decision_id` | Agent execution timed out |
| `checkpoint_expired` | N/A | Handled by notifications (Unit 5) |

## Component: AgentCard

Displays a single agent's status with visual indicators.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `agent` | `AgentState` | Yes | Agent data to display |

### Status Colors

| Status | Border/Text | Background |
|--------|-------------|------------|
| running | green-400/500 | green-900/20 |
| idle | zinc-400/700 | zinc-800/50 |
| error | red-400/500 | red-900/20 |
| completed | blue-400/500 | blue-900/20 |
| failed | red-400/500 | red-900/20 |
| timeout | amber-400/500 | amber-900/20 |

### Features

- Animated ping indicator for running agents
- Progress bar with CSS transitions
- Relative time formatting ("Now", "2m ago", "1h ago")
- Last 2 log entries in monospace font
- Result display (duration, retry count, errors)

## Configuration

Constants in `src/lib/stores/agents.ts`:

```typescript
const MAX_LOGS_PER_AGENT = 10;          // Log entries stored per agent
const IDLE_TIMEOUT_MS = 30_000;         // 30s without activity = idle
const IDLE_CHECK_INTERVAL_MS = 10_000;  // Check every 10s
```

## Testing

### Build Verification

```bash
npm run build    # Should complete without errors
npm run dev      # Should render agents page
```

### Manual Testing Checklist

1. **Empty state**: Navigate to `/agents` with no Engine running
   - Should show robot emoji with "No Active Agents" message

2. **Agent display**: Connect to running Engine with active agents
   - Agents should appear with correct status colors
   - Progress bars should animate smoothly
   - Logs should display in monospace

3. **Idle transition**: Disconnect Engine while agents are running
   - After 30 seconds, running agents should transition to idle

4. **Completion**: Wait for agent to complete task
   - Status should change to "completed" (blue)
   - Duration should display (e.g., "Completed in 12.5s")

5. **Error handling**: Trigger agent failure
   - Status should change to "failed" (red)
   - Error message should display

## Troubleshooting

### Agents Not Appearing

1. Verify Engine is running: `curl http://localhost:8000/health`
2. Check WebSocket connection in browser DevTools Network tab
3. Verify `realtimeService.initialize()` was called in layout

### Agents Stuck in Running State

1. Check if Engine is sending status updates (Network tab)
2. Verify idle detection is started (`startIdleDetection()` called)
3. Check browser console for errors

### Progress Bar Not Updating

1. Verify `agent_status` events include `progress` field
2. Check that progress value is 0-100
3. CSS transitions require `transition-all` class

## Related Units

| Unit | Relationship |
|------|--------------|
| Unit 5: WebSocket Realtime | Provides WebSocket infrastructure (dependency) |
| Unit 11: Agent Execution Logging | Will provide full log history (future) |

---

# Delivery Checklist for UNIT-10-AGENT-STATUS

## Acceptance Criteria (from spec)

- [x] Connect to `ws://localhost:8000/ws/agents` channel
- [x] Display live agent status: name, role, status, progress percentage, current task
- [x] Handle `agent_status` event: Periodic updates
- [x] Handle `agent_completed` event: Show success state
- [x] Handle `agent_failed` event: Show error state
- [x] Handle `agent_timeout` event: Show error state
- [x] Handle `checkpoint_expired` event: Show alert (via existing notification system)
- [x] Agent log entries stream in real-time (last entries displayed)
- [x] Agents without recent activity show "idle" state (30s threshold)
- [x] High-frequency updates handled (1Hz per agent)

## Standard Requirements

- [x] All acceptance criteria met
- [ ] Unit test coverage >80% (skipped - see IMPLEMENTATION.md deviation)
- [x] Integration tests pass with stubs (N/A - no stubs consumed)
- [x] No hardcoded values (constants defined, configurable)
- [x] Error handling complete (unknown events ignored, missing agents handled)
- [x] Logging at appropriate levels (console.log/warn in dev)
- [x] Stubs provided for downstream units (N/A - no stubs needed)
- [x] IMPLEMENTATION.md complete
- [x] No linter warnings (only pre-existing a11y warnings)
- [x] Code formatted per standards

## Contract Compliance

- [x] Consumes `AgentStatusEvent` from Engine correctly
- [x] Consumes `AgentCompletedEvent` from Engine correctly
- [x] Added `AgentFailedEvent` type matching Engine format
- [x] Added `AgentTimeoutEvent` type matching Engine format
- [x] Wire formats match Engine's websocket.py definitions

## Self-Review

- [x] I would approve this PR
- [x] Edge cases considered (empty state, rapid updates, connection loss)
- [x] Error messages are helpful (status displayed, error text shown)
- [x] No obvious security issues (no user input, read-only display)

## Files Delivered

### New Files
- `src/lib/stores/agents.ts` - Agent status store
- `src/lib/components/AgentCard.svelte` - Agent card component
- `docs/UNIT-10-AGENT-STATUS/IMPLEMENTATION.md` - Implementation notes
- `docs/UNIT-10-AGENT-STATUS/README.md` - This file

### Modified Files
- `src/lib/stores/types.ts` - Added AgentFailedEvent, AgentTimeoutEvent
- `src/lib/stores/index.ts` - Exported agent store and types
- `src/lib/services/eventHandlers.ts` - Extended agent event handling
- `src/routes/agents/+page.svelte` - Replaced mock with store
