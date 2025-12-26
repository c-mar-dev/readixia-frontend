/**
 * decisions.ts - Core decision store for UNIT-STORE-ARCH
 *
 * Centralized store for decision state with API integration and polling.
 * Replaces component-local state in +page.svelte, inbox, and focus views.
 *
 * Exports:
 *   - decisionStore: Writable store with CRUD methods + polling
 *   - decisions: Derived store with just the decision array
 *   - isLoading: Derived boolean for loading state
 *   - storeError: Derived store for error state
 *
 * Usage:
 *   import { decisionStore, decisions } from '$lib/stores';
 *
 *   onMount(() => {
 *     decisionStore.load();
 *     decisionStore.startPolling();
 *     return () => decisionStore.stopPolling();
 *   });
 *
 *   {#each $decisions as decision (decision.id)}
 *     <DecisionCard {decision} />
 *   {/each}
 */

import { writable, derived, get } from 'svelte/store';
import { decisionsApi } from '$lib/api';
import type { UiDecision, ResolutionRequest, DeferRequest, ApiError } from '$lib/api/types';
import type { DecisionStoreState, DecisionEvent } from './types';
import { STORE_CONFIG } from './config';
import { chainHistoryStore } from './chainHistory';

// =============================================================================
// Store Implementation
// =============================================================================

/**
 * Create the decision store with methods.
 * Follows the pattern from connection.ts.
 */
function createDecisionStore() {
  const initialState: DecisionStoreState = {
    decisions: [],
    loading: false,
    error: null,
    lastFetched: null,
    hasMore: false,
    loadingMore: false,
  };

  const { subscribe, set, update } = writable<DecisionStoreState>(initialState);

  let pollingInterval: ReturnType<typeof setInterval> | null = null;
  let isInitialized = false;
  let loadController: AbortController | null = null;
  let currentTypeFilter: string | undefined = undefined;

  /**
   * Apply windowing to keep decision list within MAX_DECISIONS.
   * Keeps most recent decisions based on created timestamp.
   */
  function windowDecisions(decisions: UiDecision[]): UiDecision[] {
    if (decisions.length <= STORE_CONFIG.MAX_DECISIONS) {
      return decisions;
    }
    // Sort by created (most recent first) and take MAX
    // Note: 'created' is relative time string, so we rely on array order from API
    return decisions.slice(0, STORE_CONFIG.MAX_DECISIONS);
  }

  /**
   * Deduplicate decisions by ID, keeping the newer version.
   */
  function dedupeDecisions(decisions: UiDecision[]): UiDecision[] {
    const seen = new Map<string, UiDecision>();
    for (const d of decisions) {
      seen.set(d.id, d);
    }
    return Array.from(seen.values());
  }

  return {
    subscribe,

    /**
     * Load decisions from API.
     * Sets loading state and handles errors gracefully.
     *
     * @param filters - Optional filters (type for API-level filtering)
     */
    async load(filters?: { type?: string }): Promise<void> {
      // Cancel any in-flight request
      loadController?.abort();
      loadController = new AbortController();

      // Track current type filter for loadMore
      currentTypeFilter = filters?.type;

      update((s) => ({ ...s, loading: true, error: null }));

      try {
        // Build API params
        const params: { status?: string; type?: string; limit?: number } = {
          status: 'pending',
          limit: 50,
        };

        // Only pass type filter if it's a valid decision type (not 'all' or 'urgent')
        if (filters?.type && filters.type !== 'all' && filters.type !== 'urgent') {
          params.type = filters.type;
        }

        const apiDecisions = await decisionsApi.list(params, {
          signal: loadController.signal,
        });
        const windowed = windowDecisions(apiDecisions);

        // Check if there might be more (API returned exactly 50)
        const hasMore = apiDecisions.length === 50;

        update((s) => ({
          ...s,
          decisions: windowed,
          loading: false,
          lastFetched: new Date(),
          hasMore,
        }));

        isInitialized = true;
      } catch (error) {
        // Ignore aborted requests
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        const apiError: ApiError = {
          code: 'LOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to load decisions',
        };

        update((s) => ({
          ...s,
          loading: false,
          error: apiError,
        }));
      }
    },

    /**
     * Force refresh decisions from API.
     * Unlike load(), always fetches even if recently loaded.
     */
    async refresh(): Promise<void> {
      return this.load(currentTypeFilter ? { type: currentTypeFilter } : undefined);
    },

    /**
     * Load more decisions (pagination).
     * Fetches next batch and appends to existing decisions.
     * Note: Since Engine doesn't support offset, this refetches all and
     * uses client-side deduplication to find new items.
     */
    async loadMore(): Promise<void> {
      // Don't load more if already loading or no more available
      let currentState: DecisionStoreState | undefined;
      const unsubscribe = subscribe((s) => {
        currentState = s;
      });
      unsubscribe();

      if (!currentState || currentState.loading || currentState.loadingMore || !currentState.hasMore) {
        return;
      }

      update((s) => ({ ...s, loadingMore: true }));

      try {
        // Build API params (same as load)
        const params: { status?: string; type?: string; limit?: number } = {
          status: 'pending',
          limit: 50,
        };

        if (currentTypeFilter && currentTypeFilter !== 'all' && currentTypeFilter !== 'urgent') {
          params.type = currentTypeFilter;
        }

        const apiDecisions = await decisionsApi.list(params);

        update((s) => {
          // Merge with existing, deduplicating by ID
          const existingIds = new Set(s.decisions.map((d) => d.id));
          const newDecisions = apiDecisions.filter((d) => !existingIds.has(d.id));

          // If we got new items, there might be more
          const hasMore = apiDecisions.length === 50 && newDecisions.length > 0;

          return {
            ...s,
            decisions: dedupeDecisions(windowDecisions([...s.decisions, ...newDecisions])),
            loadingMore: false,
            hasMore,
            lastFetched: new Date(),
          };
        });
      } catch (error) {
        update((s) => ({
          ...s,
          loadingMore: false,
          error: {
            code: 'LOAD_MORE_FAILED',
            message: error instanceof Error ? error.message : 'Failed to load more decisions',
          },
        }));
      }
    },

    /**
     * Resolve a decision with optimistic update.
     * Handles chained decisions by inserting them after the resolved one.
     *
     * @param id - Decision ID to resolve
     * @param resolution - Resolution data
     * @returns The resolved decision and any chained decisions
     */
    async resolve(
      id: string,
      resolution: Record<string, unknown>
    ): Promise<{
      decision: UiDecision;
      chainedDecisions: UiDecision[];
      undoAvailable: boolean;
      undoExpiresAt: Date | null;
      actionId: string | null;
    }> {
      // Capture decision info before resolving (for chain history tracking)
      let decisionInfo: { subjectId: string; decisionType: string } | null = null;
      const unsubscribe = subscribe((s) => {
        const decision = s.decisions.find((d) => d.id === id);
        if (decision) {
          decisionInfo = {
            subjectId: decision.subject.id,
            decisionType: decision.decisionType,
          };
        }
      });
      unsubscribe();

      // Optimistic update: mark as completed
      update((s) => ({
        ...s,
        decisions: s.decisions.map((d) =>
          d.id === id ? { ...d, status: 'completed' as const } : d
        ),
      }));

      try {
        const request: ResolutionRequest = { resolution };
        const result = await decisionsApi.resolve(id, request);

        // Record completion in chain history for progress tracking
        if (decisionInfo) {
          chainHistoryStore.recordCompletion(
            decisionInfo.subjectId,
            decisionInfo.decisionType,
            id
          );
        }

        // Update with server response and insert chained decisions
        update((s) => {
          let newDecisions = s.decisions.map((d) =>
            d.id === id ? result.decision : d
          );

          // Insert chained decisions after the resolved one
          if (result.chainedDecisions.length > 0) {
            const resolvedIndex = newDecisions.findIndex((d) => d.id === id);
            if (resolvedIndex !== -1) {
              // Mark chained decisions as new for UI animation
              const chainedWithFlag = result.chainedDecisions.map((d) => ({
                ...d,
                _isNew: true,
              }));
              newDecisions.splice(resolvedIndex + 1, 0, ...chainedWithFlag);
            } else {
              // Fallback: prepend if resolved not found
              newDecisions = [...result.chainedDecisions, ...newDecisions];
            }
          }

          return {
            ...s,
            decisions: dedupeDecisions(windowDecisions(newDecisions)),
          };
        });

        return {
          decision: result.decision,
          chainedDecisions: result.chainedDecisions,
          undoAvailable: result.undoAvailable,
          undoExpiresAt: result.undoExpiresAt,
          actionId: result.actionId,
        };
      } catch (error) {
        // Revert optimistic update on failure
        update((s) => ({
          ...s,
          decisions: s.decisions.map((d) =>
            d.id === id ? { ...d, status: 'pending' as const } : d
          ),
          error: {
            code: 'RESOLVE_FAILED',
            message: error instanceof Error ? error.message : 'Failed to resolve decision',
          },
        }));
        throw error;
      }
    },

    /**
     * Defer a decision to a later time.
     *
     * @param id - Decision ID to defer
     * @param until - ISO 8601 timestamp
     * @param reason - Optional reason for deferral
     */
    async defer(id: string, until: string, reason?: string): Promise<void> {
      const request: DeferRequest = { until, reason };

      try {
        const result = await decisionsApi.defer(id, request);

        update((s) => ({
          ...s,
          decisions: s.decisions.map((d) =>
            d.id === id ? result.decision : d
          ),
        }));
      } catch (error) {
        update((s) => ({
          ...s,
          error: {
            code: 'DEFER_FAILED',
            message: error instanceof Error ? error.message : 'Failed to defer decision',
          },
        }));
        throw error;
      }
    },

    /**
     * Undo a recently resolved decision.
     * Only available within the undo window.
     *
     * @param id - Decision ID to undo
     */
    async undo(id: string): Promise<void> {
      try {
        const result = await decisionsApi.undo(id);

        update((s) => ({
          ...s,
          decisions: s.decisions.map((d) =>
            d.id === id ? result.decision : d
          ),
        }));
      } catch (error) {
        update((s) => ({
          ...s,
          error: {
            code: 'UNDO_FAILED',
            message: error instanceof Error ? error.message : 'Failed to undo decision',
          },
        }));
        throw error;
      }
    },

    /**
     * Start polling for decision updates.
     *
     * @param intervalMs - Polling interval (defaults to POLL_INTERVAL_MS)
     */
    startPolling(intervalMs: number = STORE_CONFIG.POLL_INTERVAL_MS): void {
      if (pollingInterval) {
        return; // Already polling
      }

      pollingInterval = setInterval(() => {
        // Skip if already loading
        let currentState: DecisionStoreState | undefined;
        const unsubscribe = subscribe((s) => {
          currentState = s;
        });
        unsubscribe();

        if (!currentState?.loading) {
          this.refresh();
        }
      }, intervalMs);
    },

    /**
     * Stop polling for decision updates.
     */
    stopPolling(): void {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    },

    /**
     * Handle a real-time event from WebSocket.
     * Updates store state based on event type.
     * Uses underscore naming to match Engine WebSocket format.
     */
    handleEvent(event: DecisionEvent): void {
      update((s) => {
        switch (event.type) {
          case 'decision_created':
            return {
              ...s,
              decisions: dedupeDecisions(
                windowDecisions([{ ...event.decision, _isNew: true }, ...s.decisions])
              ),
            };

          case 'decision_updated':
            return {
              ...s,
              decisions: s.decisions.map((d) =>
                d.id === event.decision.id ? event.decision : d
              ),
            };

          case 'decision_resolved':
            return {
              ...s,
              decisions: s.decisions.map((d) =>
                d.id === event.id ? { ...d, status: 'completed' as const } : d
              ),
            };

          case 'decision_chained':
            const parentIndex = s.decisions.findIndex((d) => d.id === event.parentId);
            if (parentIndex !== -1) {
              const newDecisions = [...s.decisions];
              newDecisions.splice(parentIndex + 1, 0, { ...event.child, _isNew: true });
              return { ...s, decisions: dedupeDecisions(windowDecisions(newDecisions)) };
            }
            return {
              ...s,
              decisions: dedupeDecisions(
                windowDecisions([{ ...event.child, _isNew: true }, ...s.decisions])
              ),
            };

          case 'decision_expired':
            return {
              ...s,
              decisions: s.decisions.map((d) =>
                d.id === event.id ? { ...d, status: 'expired' as const } : d
              ),
            };

          case 'decisions_refresh':
            return {
              ...s,
              decisions: windowDecisions(event.decisions),
              lastFetched: new Date(),
            };

          default:
            return s;
        }
      });
    },

    /**
     * Add a decision locally (for optimistic creates).
     * Useful for UI-created decisions before API confirmation.
     */
    addDecision(decision: UiDecision): void {
      update((s) => ({
        ...s,
        decisions: dedupeDecisions(
          windowDecisions([{ ...decision, _isNew: true }, ...s.decisions])
        ),
      }));
    },

    /**
     * Insert a decision after a specific parent decision.
     * Used for chained decisions to maintain visual context.
     *
     * @param afterId - ID of the decision to insert after
     * @param decision - Decision to insert
     */
    insertAfter(afterId: string, decision: UiDecision): void {
      update((s) => {
        const insertIndex = s.decisions.findIndex((d) => d.id === afterId);
        if (insertIndex === -1) {
          // Fallback to prepend if parent not found
          return {
            ...s,
            decisions: dedupeDecisions(
              windowDecisions([{ ...decision, _isNew: true }, ...s.decisions])
            ),
          };
        }

        const newDecisions = [...s.decisions];
        newDecisions.splice(insertIndex + 1, 0, { ...decision, _isNew: true });
        return {
          ...s,
          decisions: dedupeDecisions(windowDecisions(newDecisions)),
        };
      });
    },

    /**
     * Remove a decision locally.
     * Used when a decision is removed from the queue.
     */
    removeDecision(id: string): void {
      update((s) => ({
        ...s,
        decisions: s.decisions.filter((d) => d.id !== id),
      }));
    },

    /**
     * Update a single decision locally.
     * Used for local state changes before API sync.
     */
    updateDecision(id: string, updates: Partial<UiDecision>): void {
      update((s) => ({
        ...s,
        decisions: s.decisions.map((d) =>
          d.id === id ? { ...d, ...updates } : d
        ),
      }));
    },

    /**
     * Clear any error state.
     */
    clearError(): void {
      update((s) => ({ ...s, error: null }));
    },

    /**
     * Reset store to initial state.
     */
    reset(): void {
      this.stopPolling();
      set(initialState);
      isInitialized = false;
    },

    /**
     * Check if store has been initialized (loaded at least once).
     */
    get initialized(): boolean {
      return isInitialized;
    },
  };
}

// =============================================================================
// Exports
// =============================================================================

/** Main decision store with all methods */
export const decisionStore = createDecisionStore();

/**
 * Derived store with just the decision array.
 * Use this for simple iteration without needing loading/error state.
 */
export const decisions = derived(
  decisionStore,
  ($store) => $store.decisions
);

/**
 * Derived store for loading state.
 */
export const isLoading = derived(
  decisionStore,
  ($store) => $store.loading
);

/**
 * Derived store for error state.
 */
export const storeError = derived(
  decisionStore,
  ($store) => $store.error
);

/**
 * Derived store for last fetched timestamp.
 */
export const lastFetched = derived(
  decisionStore,
  ($store) => $store.lastFetched
);

/**
 * Derived store for whether more decisions are available.
 */
export const hasMore = derived(
  decisionStore,
  ($store) => $store.hasMore
);

/**
 * Derived store for load more loading state.
 */
export const isLoadingMore = derived(
  decisionStore,
  ($store) => $store.loadingMore
);
