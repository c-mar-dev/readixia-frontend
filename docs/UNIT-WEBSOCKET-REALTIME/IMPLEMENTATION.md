# UNIT-WEBSOCKET-REALTIME Implementation Notes

## Summary

This unit implements real-time WebSocket integration between the SvelteKit frontend and the Decision Engine. It establishes persistent connections to both `/ws/decisions` and `/ws/agents` endpoints, enabling instant UI updates when decisions are created, resolved, or resurfaced. The implementation includes automatic reconnection with exponential backoff, ping/pong keepalive, polling fallback during disconnection, and page visibility handling.

## Decisions Made

### Decision 1: Event Type Naming Convention (Underscores)

**Context:** The existing `DecisionEvent` type in the store used dot notation (`decision.created`), but the Engine WebSocket sends underscore notation (`decision_created`). A mismatch would require translation logic.

**Options Considered:**
1. Keep dot notation in store, add translation layer in WebSocket client
2. Update store to use underscores, matching Engine format directly
3. Support both formats with runtime detection

**Chosen:** Option 2 - Update store types to underscores

**Rationale:**
- Eliminates translation overhead and potential bugs
- Single source of truth for event naming
- Simpler debugging when event types match across stack
- Existing tests were easily updated to match

**Downstream Impact:** Required updating `decisions.test.ts` with new event type names. Any code consuming `DecisionEvent` type will use underscore format.

---

### Decision 2: Dual WebSocket Connections

**Context:** The Engine exposes two separate WebSocket endpoints: `/ws/decisions` for decision lifecycle events and `/ws/agents` for agent status/checkpoint events. The spec mentioned `checkpoint_expired` which comes from the agents endpoint.

**Options Considered:**
1. Connect only to `/ws/decisions`, defer agent events to future unit
2. Connect to both endpoints, handle all event types
3. Create single multiplexed connection (would require Engine changes)

**Chosen:** Option 2 - Connect to both endpoints

**Rationale:**
- Enables `checkpoint_expired` notifications as specified
- Future-proofs for agent status display
- Each connection can have independent reconnection state
- Matches Engine's architecture without requiring backend changes

**Downstream Impact:** `RealtimeService` manages two `WebSocketClient` instances. Connection state is tracked per-endpoint in `realtimeStore`.

---

### Decision 3: Sequence-Based Resync Strategy

**Context:** When reconnecting after a disconnect, the client may have missed events. Need to ensure UI stays in sync with server state.

**Options Considered:**
1. Full REST refresh on every reconnect - simple but may cause UI flicker
2. Sequence tracking with gap detection, request missed events
3. Accept eventual consistency, let normal polling catch up

**Chosen:** Option 2 - Sequence tracking with full refresh on gap

**Rationale:**
- Every WebSocket message includes a `seq` number
- Gap detection (`seq > lastSeq + 1`) identifies missed events
- On gap detection, trigger `decisionStore.refresh()` via REST API
- Engine doesn't support requesting specific missed events, so refresh is the resync mechanism

**Downstream Impact:** `WebSocketClient` tracks `lastProcessedSeq` and calls `onResyncNeeded` callback on gap detection or reconnection.

---

### Decision 4: Keep-Alive with Pause on Visibility Change

**Context:** Browser tabs can be throttled when hidden. Need to handle visibility changes without losing connection or flooding with stale events on return.

**Options Considered:**
1. Disconnect WebSocket when hidden, reconnect when visible
2. Keep connection alive, pause event processing, buffer events
3. Keep connection alive, continue processing normally

**Chosen:** Option 2 - Keep alive with buffering

**Rationale:**
- Avoids reconnection overhead (which triggers resync)
- Ping/pong continues to keep connection alive
- Events are buffered (max 100) and flushed on tab becoming visible
- Prevents UI updates while user isn't looking

**Downstream Impact:** `WebSocketClient` buffers events in `eventBuffer` array when `isPageVisible === false`, flushes in order when visible.

---

### Decision 5: Class-Based WebSocket Client Pattern

**Context:** Need encapsulated WebSocket lifecycle management with state tracking, timers, and event handling.

**Options Considered:**
1. Functional factory pattern (like existing stores)
2. Class-based with instance methods
3. Store-based reactive pattern

**Chosen:** Option 2 - Class-based

**Rationale:**
- WebSocket has inherent stateful lifecycle (connecting → open → closing → closed)
- Multiple timers (reconnect, ping, pong timeout) need coordinated management
- Class encapsulation keeps state private and methods organized
- Singleton `RealtimeService` wraps the classes for app-wide access

**Downstream Impact:** `WebSocketClient` class instantiated by `RealtimeService`. Consumers interact via service singleton, not class directly.

---

### Decision 6: Realtime Store Separate from Connection Store

**Context:** Existing `connectionStore` tracks REST API connection state. WebSocket connection state is different (two endpoints, sequence tracking, notifications).

**Options Considered:**
1. Extend existing `connectionStore` with WebSocket state
2. Create new `realtimeStore` for WebSocket-specific state
3. Keep state only in service, no store

**Chosen:** Option 2 - New `realtimeStore`

**Rationale:**
- Separation of concerns: REST vs WebSocket are different connection types
- `realtimeStore` includes notifications (for `checkpoint_expired`)
- Per-endpoint state tracking (decisions vs agents)
- Derived stores (`isConnected`, `isReconnecting`) for UI

**Downstream Impact:** Components import from `$lib/stores/realtime` for WebSocket state. Existing `connectionStore` unchanged.

---

## Deviations from Spec

### Deviation 1: No SharedWorker Implementation

**Spec Said:** "Multiple tabs: Each opens separate WebSocket - consider SharedWorker for production"

**Implementation Does:** Each tab opens its own WebSocket connections.

**Reason:** SharedWorker adds significant complexity (cross-tab communication, worker lifecycle, error handling). For a single-user personal productivity app with typical usage of 1-2 tabs, the overhead isn't justified. Can be added as future optimization if needed.

**Severity:** Minor - Noted as future consideration, not blocking functionality.

---

### Deviation 2: Resync Uses Full Refresh, Not Selective Event Replay

**Spec Said:** "Sequence tracking - track last seen seq, request missed events on reconnect"

**Implementation Does:** On sequence gap or reconnect, triggers `decisionStore.refresh()` which fetches all pending decisions via REST API.

**Reason:** The Engine WebSocket doesn't provide an endpoint to request missed events by sequence range. The only resync mechanism available is to fetch current state via REST. This achieves the same end result (UI in sync) with available infrastructure.

**Severity:** Minor - Functional behavior matches intent; implementation differs due to Engine constraints.

---

### Deviation 3: UndoToast Already Existed

**Spec Said:** "Show undo button with countdown timer" for `undo_available` events

**Implementation Does:** Integrates with existing `actionStore` and `UndoToast` component that were already implemented.

**Reason:** The undo UI was already built as part of a previous unit. This unit correctly feeds `undo_available` events into `actionStore.add()`, which the existing toast displays.

**Severity:** None - Implementation correctly integrates with existing infrastructure.

---

## Known Limitations

1. **No SharedWorker for multi-tab** - Each browser tab opens separate WebSocket connections. For typical usage this is acceptable; high tab count could create server load.

2. **Coverage tooling not installed** - `@vitest/coverage-v8` not in devDependencies. Coverage percentage not measured, though all existing tests pass.

3. **Partial decision data in WebSocket events** - `decision_created` and `decision_resurfaced` events contain minimal data. Full decision details may require REST fetch for complete UI rendering.

4. **No agent status UI** - `agent_status` and `agent_completed` events are received but not displayed. Connection tracking only; visual display deferred to future unit.

5. **Notification auto-dismiss not implemented** - `checkpoint_expired` notifications are added to store but no auto-dismiss timer. UI component would need to implement dismiss behavior.

6. **Browser compatibility** - Uses native `WebSocket` API. Works in all modern browsers but no polyfill for legacy browsers.

---

## Open Questions

- [ ] Should `checkpoint_expired` notifications auto-dismiss after a timeout?
- [ ] Should there be a maximum reconnection attempt limit before giving up?
- [ ] Should agent status events populate a visible UI component?

---

## Test Coverage

**Existing Store Tests:** 118/118 passing
- `filters.test.ts`: 45 tests
- `derived.test.ts`: 40 tests
- `decisions.test.ts`: 33 tests (includes 6 event handling tests updated for underscore naming)

**Coverage Tooling:** Not installed (`@vitest/coverage-v8` missing)

**Uncovered Areas:**
- `WebSocketClient` class - no unit tests (would require WebSocket mocking)
- `RealtimeService` singleton - no unit tests (integration-level testing recommended)
- `eventHandlers.ts` - no unit tests (would require store mocking)
- `ConnectionIndicator.svelte` - no component tests

**Justification:** The new WebSocket code is infrastructure that's best tested via integration tests with a running Engine. Unit testing WebSocket behavior requires complex mocking. The existing store tests validate event handling logic.

---

## Dependencies Used

| Dependency | Version | Why |
|------------|---------|-----|
| svelte | ^4.0.0 | Core framework (existing) |
| svelte/store | (bundled) | Reactive state management (existing) |
| Native WebSocket | Browser API | Real-time communication |
| Native document.visibilityState | Browser API | Page visibility detection |

No new npm dependencies were added. Implementation uses only built-in browser APIs and existing Svelte infrastructure.

---

## Files Delivered

### New Files (6)

| File | Description |
|------|-------------|
| `src/lib/services/websocket.ts` | WebSocketClient class with reconnection, ping/pong, visibility handling, sequence tracking |
| `src/lib/services/realtime.ts` | RealtimeService singleton managing both WebSocket connections and polling fallback |
| `src/lib/services/eventHandlers.ts` | Functions transforming WebSocket events into store updates |
| `src/lib/stores/realtime.ts` | Svelte store tracking connection state and notifications |
| `src/lib/components/ConnectionIndicator.svelte` | UI component showing connection status (green/yellow/red dot) |
| `docs/UNIT-WEBSOCKET-REALTIME/IMPLEMENTATION.md` | This documentation |

### Modified Files (7)

| File | Changes |
|------|---------|
| `src/lib/stores/config.ts` | Added `REALTIME_CONFIG` with timing constants |
| `src/lib/stores/types.ts` | Added 16 WebSocket event type definitions |
| `src/lib/api/types.ts` | Added `'reconnecting'` to `ConnectionState` union |
| `src/lib/stores/decisions.ts` | Updated `handleEvent()` to use underscore event names |
| `src/lib/stores/index.ts` | Exported new stores, types, and config |
| `src/routes/+layout.svelte` | Initializes WebSocket on mount, renders ConnectionIndicator |
| `src/lib/stores/decisions.test.ts` | Updated 6 event handling tests with underscore naming |

---

## Configuration

All timing values are configurable via `REALTIME_CONFIG` in `src/lib/stores/config.ts`:

```typescript
export const REALTIME_CONFIG = {
  INITIAL_RECONNECT_DELAY: 1000,   // 1 second
  MAX_RECONNECT_DELAY: 30000,      // 30 seconds (backoff cap)
  PING_INTERVAL: 30000,            // 30 seconds
  PONG_TIMEOUT: 5000,              // 5 seconds
  POLL_FALLBACK_INTERVAL: 5000,    // 5 seconds
  MAX_EVENT_BUFFER: 100,           // events when tab hidden
  MAX_NOTIFICATIONS: 10,           // checkpoint notifications
};
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    +layout.svelte                           │
│  onMount: realtimeService.initialize()                      │
│  renders: <ConnectionIndicator />                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    RealtimeService                          │
│  - Manages two WebSocketClient instances                    │
│  - Routes events to handlers                                │
│  - Triggers polling fallback when disconnected              │
└─────────────────────────────────────────────────────────────┘
            │                                    │
            ▼                                    ▼
┌───────────────────────┐          ┌───────────────────────┐
│   WebSocketClient     │          │   WebSocketClient     │
│   (/ws/decisions)     │          │   (/ws/agents)        │
│   - Reconnection      │          │   - Reconnection      │
│   - Ping/pong         │          │   - Ping/pong         │
│   - Visibility buffer │          │   - Visibility buffer │
└───────────────────────┘          └───────────────────────┘
            │                                    │
            ▼                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Event Handlers                           │
│  handleDecisionWebSocketEvent() → decisionStore, actionStore│
│  handleAgentWebSocketEvent()    → realtimeStore.notifications│
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Svelte Stores                            │
│  realtimeStore  → isConnected, isReconnecting, notifications│
│  decisionStore  → decisions list (via handleEvent)          │
│  actionStore    → undo history (via add)                    │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                    UI Components                            │
│  ConnectionIndicator → shows connection status              │
│  Decision views      → reactively update from stores        │
│  UndoToast          → shows undo actions                    │
└─────────────────────────────────────────────────────────────┘
```
