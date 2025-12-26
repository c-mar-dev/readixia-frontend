/**
 * realtime.ts - Realtime connection state store for UNIT-WEBSOCKET-REALTIME
 *
 * Tracks WebSocket connection states and notifications.
 * Provides derived stores for UI components.
 *
 * Exports:
 *   - realtimeStore: Writable store with connection state methods
 *   - isConnected: Derived boolean (both endpoints online)
 *   - isReconnecting: Derived boolean (any endpoint reconnecting)
 *   - decisionsConnectionState: Derived state for decisions endpoint
 *   - agentsConnectionState: Derived state for agents endpoint
 *   - notifications: Derived array of notifications
 *
 * Usage:
 *   import { isConnected, notifications } from '$lib/stores/realtime';
 *
 *   {#if $isConnected}
 *     <span class="text-green-500">Connected</span>
 *   {/if}
 *
 *   {#each $notifications as notification}
 *     <NotificationToast {notification} />
 *   {/each}
 */

import { writable, derived } from 'svelte/store';
import type { ConnectionState } from '$lib/api/types';
import { REALTIME_CONFIG } from './config';

// =============================================================================
// Types
// =============================================================================

/**
 * Notification from realtime events (e.g., checkpoint_expired).
 */
export interface RealtimeNotification {
  /** Unique notification ID */
  id: string;
  /** Notification type */
  type: 'checkpoint_expired' | 'info' | 'warning' | 'error';
  /** Human-readable message */
  message: string;
  /** When the notification was created */
  timestamp: Date;
  /** Additional data associated with the notification */
  data?: Record<string, unknown>;
}

/**
 * Endpoint connection state with tracking info.
 */
interface EndpointState {
  /** Current connection state */
  state: ConnectionState;
  /** Last received sequence number */
  lastSeq: number;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
}

/**
 * Realtime store state.
 */
export interface RealtimeStoreState {
  /** Decisions endpoint connection state */
  decisions: EndpointState;
  /** Agents endpoint connection state */
  agents: EndpointState;
  /** Active notifications */
  notifications: RealtimeNotification[];
}

// =============================================================================
// Store Implementation
// =============================================================================

function createRealtimeStore() {
  const initialState: RealtimeStoreState = {
    decisions: { state: 'offline', lastSeq: 0, reconnectAttempts: 0 },
    agents: { state: 'offline', lastSeq: 0, reconnectAttempts: 0 },
    notifications: [],
  };

  const { subscribe, set, update } = writable<RealtimeStoreState>(initialState);

  return {
    subscribe,

    /**
     * Update the decisions endpoint state.
     */
    setDecisionsState(state: ConnectionState, seq?: number): void {
      update((s) => ({
        ...s,
        decisions: {
          ...s.decisions,
          state,
          lastSeq: seq ?? s.decisions.lastSeq,
          reconnectAttempts: state === 'online' ? 0 : s.decisions.reconnectAttempts,
        },
      }));
    },

    /**
     * Update the agents endpoint state.
     */
    setAgentsState(state: ConnectionState, seq?: number): void {
      update((s) => ({
        ...s,
        agents: {
          ...s.agents,
          state,
          lastSeq: seq ?? s.agents.lastSeq,
          reconnectAttempts: state === 'online' ? 0 : s.agents.reconnectAttempts,
        },
      }));
    },

    /**
     * Increment reconnection attempts for an endpoint.
     */
    incrementReconnectAttempts(endpoint: 'decisions' | 'agents'): void {
      update((s) => ({
        ...s,
        [endpoint]: {
          ...s[endpoint],
          reconnectAttempts: s[endpoint].reconnectAttempts + 1,
        },
      }));
    },

    /**
     * Add a notification.
     */
    addNotification(
      notification: Omit<RealtimeNotification, 'id' | 'timestamp'>
    ): void {
      const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      update((s) => ({
        ...s,
        notifications: [
          { ...notification, id, timestamp: new Date() },
          ...s.notifications.slice(0, REALTIME_CONFIG.MAX_NOTIFICATIONS - 1),
        ],
      }));
    },

    /**
     * Dismiss a notification by ID.
     */
    dismissNotification(id: string): void {
      update((s) => ({
        ...s,
        notifications: s.notifications.filter((n) => n.id !== id),
      }));
    },

    /**
     * Clear all notifications.
     */
    clearNotifications(): void {
      update((s) => ({
        ...s,
        notifications: [],
      }));
    },

    /**
     * Reset store to initial state.
     */
    reset(): void {
      set(initialState);
    },
  };
}

// =============================================================================
// Exports
// =============================================================================

/** Main realtime store */
export const realtimeStore = createRealtimeStore();

/**
 * True when connected to both endpoints.
 */
export const isConnected = derived(
  realtimeStore,
  ($s) => $s.decisions.state === 'online' && $s.agents.state === 'online'
);

/**
 * True when any endpoint is reconnecting.
 */
export const isReconnecting = derived(
  realtimeStore,
  ($s) =>
    $s.decisions.state === 'reconnecting' || $s.agents.state === 'reconnecting'
);

/**
 * True when the decisions endpoint is connected.
 * This is the primary connection for decision updates.
 */
export const isDecisionsConnected = derived(
  realtimeStore,
  ($s) => $s.decisions.state === 'online'
);

/**
 * Decisions endpoint connection state.
 */
export const decisionsConnectionState = derived(
  realtimeStore,
  ($s) => $s.decisions.state
);

/**
 * Agents endpoint connection state.
 */
export const agentsConnectionState = derived(
  realtimeStore,
  ($s) => $s.agents.state
);

/**
 * Active notifications.
 */
export const notifications = derived(
  realtimeStore,
  ($s) => $s.notifications
);

/**
 * Number of active notifications.
 */
export const notificationCount = derived(
  realtimeStore,
  ($s) => $s.notifications.length
);
