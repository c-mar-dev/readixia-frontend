/**
 * session.ts - API-backed session store for UNIT-SESSION-MGMT
 *
 * Manages work session lifecycle with server-side persistence.
 * Tracks productivity metrics: duration, decisions resolved, velocity.
 *
 * Features:
 *   - Server-synced session state via Engine API
 *   - 30-second polling for live stats updates
 *   - Auto-start on first decision action
 *   - Graceful error handling (404 = no session, 409 = already active)
 *
 * Exports:
 *   - sessionStore: Main store with actions
 *   - isSessionActive: Derived boolean
 *   - sessionDuration: Formatted duration string
 *   - sessionVelocity: Decisions per hour
 *   - decisionsResolved: Count of completed decisions
 *
 * Usage:
 *   import { sessionStore, isSessionActive } from '$lib/stores';
 *
 *   // Check if session is active
 *   if ($isSessionActive) { ... }
 *
 *   // Start/end session
 *   await sessionStore.start();
 *   await sessionStore.end();
 *
 *   // Auto-start on first action
 *   await sessionStore.autoStartIfNeeded();
 */

import { writable, derived } from 'svelte/store';
import { sessionsApi } from '$lib/api';
import type { SessionState, SessionCurrentResponse, ApiError } from '$lib/api';

const POLL_INTERVAL_MS = 30000; // 30 seconds

/**
 * Format seconds into "Xh Ym" or "Xm" format.
 */
function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || seconds === null) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Initial store state.
 */
function getInitialState(): SessionState {
  return {
    session: null,
    loading: false,
    starting: false,
    ending: false,
    error: null,
    lastPolled: null,
  };
}

/**
 * Create the session store with API integration.
 */
function createSessionStore() {
  const { subscribe, set, update } = writable<SessionState>(getInitialState());

  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let isPollPending = false;

  /**
   * Clear any active polling interval.
   */
  function clearPollInterval() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  /**
   * Start polling for session updates.
   */
  function startPolling() {
    clearPollInterval();
    pollInterval = setInterval(async () => {
      if (isPollPending) return; // Skip if previous poll still pending
      isPollPending = true;
      try {
        const session = await sessionsApi.current();
        update(s => ({
          ...s,
          session,
          lastPolled: new Date(),
          error: session ? null : s.error, // Clear error if session found
        }));
        // Stop polling if no session (404)
        if (!session) {
          clearPollInterval();
        }
      } catch (error) {
        // Network errors during polling - keep last known state
        console.warn('[Session] Poll failed:', error);
      } finally {
        isPollPending = false;
      }
    }, POLL_INTERVAL_MS);
  }

  /**
   * Stop polling.
   */
  function stopPolling() {
    clearPollInterval();
  }

  return {
    subscribe,

    /**
     * Fetch the current session from the API.
     * Called on mount to restore session state.
     */
    async fetchCurrent(): Promise<void> {
      update(s => ({ ...s, loading: true, error: null }));
      try {
        const session = await sessionsApi.current();
        update(s => ({
          ...s,
          session,
          loading: false,
          lastPolled: new Date(),
        }));
        // Start polling if session is active
        if (session) {
          startPolling();
        }
      } catch (error) {
        update(s => ({
          ...s,
          loading: false,
          error: error as ApiError,
        }));
      }
    },

    /**
     * Start a new session.
     * @param metadata - Optional metadata (client, source, etc.)
     */
    async start(metadata?: Record<string, unknown>): Promise<void> {
      update(s => ({ ...s, starting: true, error: null }));
      try {
        const response = await sessionsApi.start(metadata);
        // Fetch full session data after start
        const session = await sessionsApi.current();
        update(s => ({
          ...s,
          session,
          starting: false,
          lastPolled: new Date(),
        }));
        startPolling();
      } catch (error) {
        const apiError = error as ApiError;
        // Handle 409 - session already active
        if (apiError.code === 'HTTP_409') {
          // Fetch the existing session
          try {
            const session = await sessionsApi.current();
            update(s => ({
              ...s,
              session,
              starting: false,
              lastPolled: new Date(),
            }));
            if (session) startPolling();
            return;
          } catch {
            // Fall through to error handling
          }
        }
        update(s => ({
          ...s,
          starting: false,
          error: apiError,
        }));
      }
    },

    /**
     * End the current session.
     */
    async end(): Promise<void> {
      update(s => ({ ...s, ending: true, error: null }));
      stopPolling();
      try {
        await sessionsApi.end();
        update(s => ({
          ...s,
          session: null,
          ending: false,
        }));
      } catch (error) {
        const apiError = error as ApiError;
        // Handle 404 - no session to end (already ended elsewhere)
        if (apiError.code === 'HTTP_404') {
          update(s => ({
            ...s,
            session: null,
            ending: false,
          }));
          return;
        }
        update(s => ({
          ...s,
          ending: false,
          error: apiError,
        }));
      }
    },

    /**
     * Auto-start a session if none is active.
     * Used for first-decision trigger.
     */
    async autoStartIfNeeded(): Promise<void> {
      let currentState: SessionState | null = null;
      const unsubscribe = subscribe(s => { currentState = s; });
      unsubscribe();

      if (!currentState) return;

      // Already have a session
      if (currentState.session) return;

      // Already starting
      if (currentState.starting) return;

      // Already loading (might be checking for existing session)
      if (currentState.loading) return;

      // Start with auto metadata
      await this.start({ client: 'dashboard', source: 'auto' });
    },

    /**
     * Manually start polling (e.g., on component mount).
     */
    startPolling,

    /**
     * Manually stop polling (e.g., on component unmount).
     */
    stopPolling,

    /**
     * Clear error state.
     */
    clearError(): void {
      update(s => ({ ...s, error: null }));
    },

    /**
     * Reset to initial state (for testing/cleanup).
     */
    reset(): void {
      stopPolling();
      set(getInitialState());
    },
  };
}

export const sessionStore = createSessionStore();

// =============================================================================
// Derived Stores
// =============================================================================

/** Whether a session is currently active */
export const isSessionActive = derived(
  sessionStore,
  $s => $s.session !== null
);

/** Whether session operations are in progress */
export const isSessionLoading = derived(
  sessionStore,
  $s => $s.loading || $s.starting || $s.ending
);

/** Whether starting a session */
export const isStarting = derived(
  sessionStore,
  $s => $s.starting
);

/** Whether ending a session */
export const isEnding = derived(
  sessionStore,
  $s => $s.ending
);

/** Current session error, if any */
export const sessionError = derived(
  sessionStore,
  $s => $s.error
);

/** Formatted session duration (e.g., "1h 23m") */
export const sessionDuration = derived(
  sessionStore,
  $s => formatDuration($s.session?.duration_seconds)
);

/** Decisions resolved in current session */
export const decisionsResolved = derived(
  sessionStore,
  $s => $s.session?.decisions_resolved ?? 0
);

/** Velocity (decisions per hour) */
export const sessionVelocity = derived(
  sessionStore,
  $s => $s.session?.velocity ?? 0
);

/** Raw session data */
export const currentSession = derived(
  sessionStore,
  $s => $s.session
);

// =============================================================================
// Legacy Compatibility (deprecated)
// =============================================================================

/**
 * @deprecated Use decisionsResolved instead
 */
export const completedCount = decisionsResolved;

// =============================================================================
// Types
// =============================================================================

export type { SessionState };
