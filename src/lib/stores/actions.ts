/**
 * actions.ts - Action history store for UNIT-4-DECISION-ACTIONS
 *
 * Tracks recently completed actions for undo functionality.
 * Actions expire based on Engine's undo_expires_at timestamp (5 minutes).
 *
 * Used by downstream units: UNIT-5 (Test Infrastructure), UNIT-11 (Advanced Features)
 *
 * Exports:
 *   - actionStore: Writable store with add/remove/undo methods
 *   - undoableActions: Derived store with non-expired actions
 *   - hasUndoableActions: Derived boolean
 *   - latestUndoableAction: Most recent action for toast display
 *   - isUndoing: Boolean for loading state
 *   - undoError: Error from last undo attempt
 *
 * Usage:
 *   import { actionStore, undoableActions } from '$lib/stores';
 *
 *   // After resolving a decision
 *   actionStore.add({
 *     id: response.action_id,
 *     decisionId: 'dec-123',
 *     decisionTitle: 'Review project proposal',
 *     expiresAt: new Date(response.undo_expires_at),
 *     timestamp: new Date(),
 *     actionName: 'Approve'
 *   });
 *
 *   // Undo an action
 *   const success = await actionStore.undo('action-id');
 *
 * Testing:
 *   // Mock for unit tests
 *   vi.spyOn(actionStore, 'add').mockImplementation(() => {});
 *   vi.spyOn(actionStore, 'undo').mockResolvedValue(true);
 */

import { writable, derived, get } from 'svelte/store';
import { decisionStore } from './decisions';
import type { ApiError } from '$lib/api/types';

// =============================================================================
// Types
// =============================================================================

/**
 * An action that can be undone within the undo window.
 */
export interface UndoableAction {
  /** Unique action ID from Engine (act-{uuid}) */
  id: string;
  /** The decision that was resolved */
  decisionId: string;
  /** Human-readable title for the toast */
  decisionTitle: string;
  /** When the undo window expires (from Engine's undo_expires_at) */
  expiresAt: Date;
  /** When the action was performed */
  timestamp: Date;
  /** The action name that was taken */
  actionName?: string;
}

/**
 * Store state shape.
 */
interface ActionStoreState {
  /** List of undoable actions, newest first */
  history: UndoableAction[];
  /** Currently processing undo for this action ID */
  undoingId: string | null;
  /** Error from last undo attempt */
  error: ApiError | null;
}

// =============================================================================
// Constants
// =============================================================================

/** Maximum actions to keep in history */
const MAX_HISTORY = 10;

/** Cleanup interval for expired actions (1 second) */
const CLEANUP_INTERVAL_MS = 1000;

// =============================================================================
// Store Implementation
// =============================================================================

function createActionStore() {
  const initialState: ActionStoreState = {
    history: [],
    undoingId: null,
    error: null,
  };

  const { subscribe, set, update } = writable<ActionStoreState>(initialState);

  let cleanupInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start the cleanup interval to remove expired actions.
   */
  function startCleanup(): void {
    if (cleanupInterval) return;

    cleanupInterval = setInterval(() => {
      const now = new Date();
      update((s) => ({
        ...s,
        history: s.history.filter((a) => a.expiresAt > now),
      }));
    }, CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop the cleanup interval.
   */
  function stopCleanup(): void {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  }

  // Start cleanup when store is created (browser only)
  if (typeof window !== 'undefined') {
    startCleanup();
  }

  return {
    subscribe,

    /**
     * Add an action to the undo history.
     * Automatically starts cleanup interval if not running.
     */
    add(action: UndoableAction): void {
      // Ensure cleanup is running
      if (typeof window !== 'undefined') {
        startCleanup();
      }

      update((s) => {
        // Check if action already expired
        if (action.expiresAt <= new Date()) {
          return s;
        }

        // Remove any existing entry for the same decision (shouldn't happen, but safety)
        const filtered = s.history.filter((a) => a.decisionId !== action.decisionId);

        // Add new action at the front, limit to MAX_HISTORY
        const newHistory = [action, ...filtered].slice(0, MAX_HISTORY);

        return {
          ...s,
          history: newHistory,
          error: null,
        };
      });
    },

    /**
     * Remove an action from history (after successful undo or expiry).
     */
    remove(actionId: string): void {
      update((s) => ({
        ...s,
        history: s.history.filter((a) => a.id !== actionId),
        error: null,
      }));
    },

    /**
     * Remove action by decision ID.
     */
    removeByDecisionId(decisionId: string): void {
      update((s) => ({
        ...s,
        history: s.history.filter((a) => a.decisionId !== decisionId),
        error: null,
      }));
    },

    /**
     * Perform undo for an action.
     * Calls decisionStore.undo() and handles the response.
     *
     * @returns true if undo succeeded, false otherwise
     */
    async undo(actionId: string): Promise<boolean> {
      const state = get({ subscribe });
      const action = state.history.find((a) => a.id === actionId);

      if (!action) {
        update((s) => ({
          ...s,
          error: { code: 'NOT_FOUND', message: 'Action not found in history' },
        }));
        return false;
      }

      // Check if expired
      if (action.expiresAt <= new Date()) {
        this.remove(actionId);
        update((s) => ({
          ...s,
          error: { code: 'EXPIRED', message: 'Undo window has expired' },
        }));
        return false;
      }

      // Set undoing state
      update((s) => ({ ...s, undoingId: actionId, error: null }));

      try {
        await decisionStore.undo(action.decisionId);

        // Success - remove from history
        this.remove(actionId);

        update((s) => ({ ...s, undoingId: null }));
        return true;
      } catch (error) {
        // Handle specific error codes
        const apiError: ApiError = {
          code: (error as { code?: string })?.code || 'UNDO_FAILED',
          message: error instanceof Error ? error.message : 'Failed to undo action',
        };

        // If expired or invalid, remove from history
        if (apiError.code === 'DE-DEC-005' || apiError.code === 'DE-DEC-003') {
          this.remove(actionId);
        }

        update((s) => ({
          ...s,
          undoingId: null,
          error: apiError,
        }));

        return false;
      }
    },

    /**
     * Clear all history.
     */
    clear(): void {
      set(initialState);
    },

    /**
     * Get time remaining for an action in seconds.
     */
    getTimeRemaining(actionId: string): number {
      const state = get({ subscribe });
      const action = state.history.find((a) => a.id === actionId);

      if (!action) return 0;

      const remaining = Math.max(0, action.expiresAt.getTime() - Date.now());
      return Math.ceil(remaining / 1000);
    },

    /**
     * Stop cleanup interval (for cleanup on unmount).
     */
    destroy(): void {
      stopCleanup();
    },
  };
}

// =============================================================================
// Exports
// =============================================================================

/** Main action store with undo history and methods */
export const actionStore = createActionStore();

/**
 * Derived store with only non-expired actions.
 * Updates every second due to cleanup interval.
 */
export const undoableActions = derived(actionStore, ($store) => {
  const now = new Date();
  return $store.history.filter((a) => a.expiresAt > now);
});

/**
 * Derived boolean for whether there are any undoable actions.
 */
export const hasUndoableActions = derived(
  undoableActions,
  ($actions) => $actions.length > 0
);

/**
 * Derived store for the most recent undoable action (for toast display).
 */
export const latestUndoableAction = derived(
  undoableActions,
  ($actions) => $actions[0] || null
);

/**
 * Derived store for whether an undo is in progress.
 */
export const isUndoing = derived(
  actionStore,
  ($store) => $store.undoingId !== null
);

/**
 * Derived store for undo error.
 */
export const undoError = derived(actionStore, ($store) => $store.error);
