/**
 * connection.ts - Connection status store for UNIT-API-CLIENT
 *
 * Tracks the connection state to the Decision Engine API.
 * Used by downstream units: Layout components, error boundaries
 *
 * Exports:
 *   - connectionStore: Writable store with setOnline/setOffline/setError/checkHealth
 *   - isOnline: Derived boolean store
 *   - isOffline: Derived boolean store
 *   - hasError: Derived boolean store
 *   - connectionError: Derived store with error details
 *
 * Usage:
 *   <script>
 *     import { connectionStore, isOnline } from '$lib/stores/connection';
 *     import { onMount } from 'svelte';
 *
 *     onMount(() => connectionStore.checkHealth());
 *   </script>
 *
 *   {#if $isOnline}
 *     <span class="status-ok">Connected</span>
 *   {:else}
 *     <span class="status-error">Disconnected</span>
 *   {/if}
 *
 * States:
 *   - online: API is reachable and responding
 *   - offline: Network connection unavailable
 *   - error: API returned an error or is unreachable
 */

import { writable, derived } from 'svelte/store';
import type { ConnectionStatus, ConnectionState, ApiError } from '$lib/api/types';
import { DEFAULT_CONFIG } from '$lib/api/config';

/**
 * Create the connection status store with methods.
 */
function createConnectionStore() {
  const { subscribe, set, update } = writable<ConnectionStatus>({
    state: 'online',
    lastChecked: null,
    error: null,
  });

  return {
    subscribe,

    /**
     * Set connection to online state.
     * Clears any previous error.
     */
    setOnline() {
      update((s) => ({
        ...s,
        state: 'online' as ConnectionState,
        lastChecked: new Date(),
        error: null,
      }));
    },

    /**
     * Set connection to offline state.
     * Indicates network is unavailable.
     */
    setOffline() {
      update((s) => ({
        ...s,
        state: 'offline' as ConnectionState,
        lastChecked: new Date(),
      }));
    },

    /**
     * Set connection to error state with error details.
     * Indicates API is unreachable or returning errors.
     *
     * @param error - The error that occurred
     */
    setError(error: ApiError) {
      update((s) => ({
        ...s,
        state: 'error' as ConnectionState,
        lastChecked: new Date(),
        error,
      }));
    },

    /**
     * Check API health and update connection state.
     * Uses a lightweight endpoint with short timeout.
     *
     * @returns true if API is healthy, false otherwise
     */
    async checkHealth(): Promise<boolean> {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(
          `${DEFAULT_CONFIG.baseUrl}/api/health`,
          {
            method: 'GET',
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          this.setOnline();
          return true;
        }

        // API returned error status
        this.setError({
          code: `HTTP_${response.status}`,
          message: response.statusText || 'API returned error status',
        });
        return false;
      } catch (error) {
        // Network error or timeout
        if (error instanceof TypeError) {
          this.setOffline();
        } else if (error instanceof DOMException && error.name === 'AbortError') {
          this.setError({
            code: 'TIMEOUT',
            message: 'Health check timed out',
          });
        } else {
          this.setError({
            code: 'HEALTH_CHECK_FAILED',
            message: error instanceof Error ? error.message : 'Health check failed',
          });
        }
        return false;
      }
    },

    /**
     * Reset to initial state.
     */
    reset() {
      set({
        state: 'online',
        lastChecked: null,
        error: null,
      });
    },
  };
}

/** Main connection status store */
export const connectionStore = createConnectionStore();

// =============================================================================
// Derived Stores for Convenience
// =============================================================================

/**
 * True when connected to API.
 * @example {#if $isOnline}Connected{/if}
 */
export const isOnline = derived(
  connectionStore,
  ($connection) => $connection.state === 'online'
);

/**
 * True when network is unavailable.
 * @example {#if $isOffline}No network connection{/if}
 */
export const isOffline = derived(
  connectionStore,
  ($connection) => $connection.state === 'offline'
);

/**
 * True when API has returned an error.
 * @example {#if $hasError}API Error: {$connectionStore.error?.message}{/if}
 */
export const hasError = derived(
  connectionStore,
  ($connection) => $connection.state === 'error'
);

/**
 * The current error, or null if no error.
 * Convenience derived store to avoid null checks.
 */
export const connectionError = derived(
  connectionStore,
  ($connection) => $connection.error
);
