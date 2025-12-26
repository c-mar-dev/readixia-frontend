/**
 * ui.ts - Centralized UI state store for Unit 7
 *
 * Manages transient UI state: toasts, loading states, and offline detection.
 * Designed to work alongside existing stores (decisions, actions, realtime).
 *
 * Exports:
 *   - uiStore: Writable store with toast/loading/offline methods
 *   - toasts: Derived store of active toasts
 *   - isOffline: Derived boolean for offline state
 *   - Convenience methods: success(), error(), info(), warning()
 *
 * Usage:
 *   import { uiStore, toasts, isOffline } from '$lib/stores';
 *
 *   // Show toast
 *   uiStore.success('Decision completed');
 *   uiStore.error('Failed to save', 'Error');
 *
 *   // Track loading
 *   uiStore.setLoading('resolve:dec-123', true);
 *   const loading = uiStore.isLoading('resolve:dec-123');
 *
 *   // Subscribe to toasts
 *   {#each $toasts as toast}
 *     <ToastItem {toast} />
 *   {/each}
 */

import { writable, derived, get } from 'svelte/store';

// =============================================================================
// Types
// =============================================================================

/**
 * Toast notification item.
 */
export interface ToastItem {
  /** Unique toast ID */
  id: string;
  /** Toast type determines color scheme */
  type: 'success' | 'error' | 'info' | 'warning';
  /** Main message text */
  message: string;
  /** Optional title (displayed above message) */
  title?: string;
  /** Auto-dismiss duration in ms (0 = sticky/manual dismiss only) */
  duration: number;
  /** When the toast was created */
  createdAt: Date;
  /** Whether the dismiss button is shown */
  dismissible: boolean;
}

/**
 * Options for creating a toast.
 */
export interface ToastOptions {
  type: ToastItem['type'];
  message: string;
  title?: string;
  /** Duration in ms. Defaults vary by type: success/info=4000, error/warning=6000 */
  duration?: number;
  /** Whether to show dismiss button. Defaults to true. */
  dismissible?: boolean;
}

/**
 * Store state shape.
 */
interface UiStoreState {
  /** Active toast notifications */
  toasts: ToastItem[];
  /** Loading states keyed by action identifier */
  loadingActions: Record<string, boolean>;
  /** Browser offline state */
  isOffline: boolean;
  /** Track if we were previously offline (for "back online" toast) */
  wasOffline: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** Maximum number of visible toasts */
const MAX_TOASTS = 5;

/** Default duration by toast type (ms) */
const DEFAULT_DURATIONS: Record<ToastItem['type'], number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 6000,
};

/** Auto-dismiss check interval (ms) */
const DISMISS_CHECK_INTERVAL = 100;

// =============================================================================
// Store Implementation
// =============================================================================

function createUiStore() {
  const initialState: UiStoreState = {
    toasts: [],
    loadingActions: {},
    isOffline: false,
    wasOffline: false,
  };

  const { subscribe, set, update } = writable<UiStoreState>(initialState);

  let dismissInterval: ReturnType<typeof setInterval> | null = null;
  let toastCounter = 0;

  /**
   * Generate unique toast ID.
   */
  function generateId(): string {
    toastCounter++;
    return `toast-${Date.now()}-${toastCounter}`;
  }

  /**
   * Start auto-dismiss interval if not running.
   */
  function startDismissInterval(): void {
    if (dismissInterval) return;

    dismissInterval = setInterval(() => {
      const now = Date.now();
      update((s) => {
        const stillActive = s.toasts.filter((t) => {
          if (t.duration === 0) return true; // Sticky toast
          const elapsed = now - t.createdAt.getTime();
          return elapsed < t.duration;
        });

        if (stillActive.length === s.toasts.length) return s;
        return { ...s, toasts: stillActive };
      });

      // Stop interval if no toasts
      const state = get({ subscribe });
      if (state.toasts.length === 0) {
        stopDismissInterval();
      }
    }, DISMISS_CHECK_INTERVAL);
  }

  /**
   * Stop auto-dismiss interval.
   */
  function stopDismissInterval(): void {
    if (dismissInterval) {
      clearInterval(dismissInterval);
      dismissInterval = null;
    }
  }

  return {
    subscribe,

    // =========================================================================
    // Toast Management
    // =========================================================================

    /**
     * Show a toast notification.
     *
     * @param options - Toast configuration
     * @returns Toast ID for manual dismissal
     */
    showToast(options: ToastOptions): string {
      const id = generateId();
      const duration = options.duration ?? DEFAULT_DURATIONS[options.type];

      const toast: ToastItem = {
        id,
        type: options.type,
        message: options.message,
        title: options.title,
        duration,
        createdAt: new Date(),
        dismissible: options.dismissible ?? true,
      };

      update((s) => {
        // Add new toast, keep only MAX_TOASTS (FIFO removal of oldest)
        const newToasts = [toast, ...s.toasts].slice(0, MAX_TOASTS);
        return { ...s, toasts: newToasts };
      });

      // Start auto-dismiss if needed
      if (duration > 0 && typeof window !== 'undefined') {
        startDismissInterval();
      }

      return id;
    },

    /**
     * Dismiss a specific toast by ID.
     */
    dismissToast(id: string): void {
      update((s) => ({
        ...s,
        toasts: s.toasts.filter((t) => t.id !== id),
      }));
    },

    /**
     * Clear all toasts.
     */
    clearToasts(): void {
      update((s) => ({ ...s, toasts: [] }));
      stopDismissInterval();
    },

    // Convenience methods
    success(message: string, title?: string): string {
      return this.showToast({ type: 'success', message, title });
    },

    error(message: string, title?: string): string {
      return this.showToast({ type: 'error', message, title });
    },

    info(message: string, title?: string): string {
      return this.showToast({ type: 'info', message, title });
    },

    warning(message: string, title?: string): string {
      return this.showToast({ type: 'warning', message, title });
    },

    // =========================================================================
    // Loading State Management
    // =========================================================================

    /**
     * Set loading state for an action.
     *
     * Use composite keys for granular control:
     * - "resolve:dec-123" for a specific decision resolve
     * - "defer:dec-456" for a specific defer action
     * - "global:refresh" for global refresh
     *
     * @param actionId - Unique identifier for the action
     * @param isLoading - Whether the action is loading
     */
    setLoading(actionId: string, isLoading: boolean): void {
      update((s) => {
        const newLoadingActions = { ...s.loadingActions };
        if (isLoading) {
          newLoadingActions[actionId] = true;
        } else {
          delete newLoadingActions[actionId];
        }
        return { ...s, loadingActions: newLoadingActions };
      });
    },

    /**
     * Check if an action is currently loading.
     *
     * @param actionId - The action identifier
     * @returns True if the action is loading
     */
    isLoading(actionId: string): boolean {
      return get({ subscribe }).loadingActions[actionId] ?? false;
    },

    /**
     * Check if any action is loading.
     */
    isAnyLoading(): boolean {
      return Object.keys(get({ subscribe }).loadingActions).length > 0;
    },

    /**
     * Clear all loading states.
     */
    clearLoading(): void {
      update((s) => ({ ...s, loadingActions: {} }));
    },

    // =========================================================================
    // Offline Detection
    // =========================================================================

    /**
     * Set offline state.
     * Called by +layout.svelte on navigator online/offline events.
     *
     * @param offline - Whether the browser is offline
     */
    setOffline(offline: boolean): void {
      update((s) => ({
        ...s,
        isOffline: offline,
        wasOffline: offline ? true : s.wasOffline,
      }));
    },

    /**
     * Clear the wasOffline flag (after showing "back online" toast).
     */
    clearWasOffline(): void {
      update((s) => ({ ...s, wasOffline: false }));
    },

    // =========================================================================
    // Lifecycle
    // =========================================================================

    /**
     * Reset store to initial state.
     */
    reset(): void {
      stopDismissInterval();
      set(initialState);
    },

    /**
     * Cleanup intervals (for unmount).
     */
    destroy(): void {
      stopDismissInterval();
    },
  };
}

// =============================================================================
// Exports
// =============================================================================

/** Main UI store with toast, loading, and offline management */
export const uiStore = createUiStore();

/**
 * Derived store of active toasts.
 */
export const toasts = derived(uiStore, ($s) => $s.toasts);

/**
 * Derived store for toast count.
 */
export const toastCount = derived(uiStore, ($s) => $s.toasts.length);

/**
 * Derived store for offline state.
 */
export const isOffline = derived(uiStore, ($s) => $s.isOffline);

/**
 * Derived store for wasOffline flag (for "back online" toast).
 */
export const wasOffline = derived(uiStore, ($s) => $s.wasOffline);

/**
 * Derived store for any loading state.
 */
export const isAnyLoading = derived(
  uiStore,
  ($s) => Object.keys($s.loadingActions).length > 0
);

/**
 * Create a derived store for a specific loading action.
 *
 * @param actionId - The action identifier to track
 * @returns Derived store that is true when action is loading
 */
export function createLoadingStore(actionId: string) {
  return derived(uiStore, ($s) => $s.loadingActions[actionId] ?? false);
}
