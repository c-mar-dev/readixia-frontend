/**
 * logs.ts - Execution Logs store for Unit 14
 *
 * Centralized store for agent execution logs with pagination and filtering.
 *
 * Exports:
 *   - logsStore: Main writable store with methods
 *   - Derived stores for filtered views
 */

import { writable, derived } from 'svelte/store';
import { logsApi } from '$lib/api/logs';
import type {
  ExecutionLogResponse,
  ExecutionLogDetailResponse,
  LogsFilter,
  StorageStatsResponse,
  ExecutionStatus,
} from '$lib/api/logs';

// =============================================================================
// Types
// =============================================================================

interface LogsStoreState {
  logs: ExecutionLogResponse[];
  selectedLog: ExecutionLogDetailResponse | null;
  stats: StorageStatsResponse | null;

  // Pagination
  totalCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;

  // Filters
  filters: LogsFilter;

  // Loading states
  isLoading: boolean;
  isLoadingDetail: boolean;
  isLoadingMore: boolean;

  // Error state
  error: string | null;
}

// =============================================================================
// Initial State
// =============================================================================

const DEFAULT_LIMIT = 50;

const initialState: LogsStoreState = {
  logs: [],
  selectedLog: null,
  stats: null,

  totalCount: 0,
  limit: DEFAULT_LIMIT,
  offset: 0,
  hasMore: false,

  filters: {},

  isLoading: false,
  isLoadingDetail: false,
  isLoadingMore: false,

  error: null,
};

// =============================================================================
// Store Implementation
// =============================================================================

function createLogsStore() {
  const { subscribe, set, update } = writable<LogsStoreState>(initialState);

  return {
    subscribe,

    /**
     * Load logs with current filters.
     */
    async load(filters?: LogsFilter): Promise<void> {
      update(s => ({
        ...s,
        isLoading: true,
        error: null,
        filters: filters || s.filters,
        offset: 0,
      }));

      try {
        const response = await logsApi.list({
          ...filters,
          limit: DEFAULT_LIMIT,
          offset: 0,
        });

        update(s => ({
          ...s,
          logs: response.logs,
          totalCount: response.total_count,
          hasMore: response.has_more,
          offset: response.offset,
          isLoading: false,
        }));
      } catch (error) {
        update(s => ({
          ...s,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load logs',
        }));
      }
    },

    /**
     * Load more logs (pagination).
     */
    async loadMore(): Promise<void> {
      update(s => {
        if (!s.hasMore || s.isLoadingMore) return s;
        return { ...s, isLoadingMore: true };
      });

      let currentState: LogsStoreState | undefined;
      subscribe(s => { currentState = s; })();

      if (!currentState || !currentState.hasMore) return;

      try {
        const response = await logsApi.list({
          ...currentState.filters,
          limit: DEFAULT_LIMIT,
          offset: currentState.offset + DEFAULT_LIMIT,
        });

        update(s => ({
          ...s,
          logs: [...s.logs, ...response.logs],
          hasMore: response.has_more,
          offset: response.offset,
          isLoadingMore: false,
        }));
      } catch (error) {
        update(s => ({
          ...s,
          isLoadingMore: false,
          error: error instanceof Error ? error.message : 'Failed to load more logs',
        }));
      }
    },

    /**
     * Load full log detail by ID.
     */
    async loadDetail(id: string): Promise<void> {
      update(s => ({
        ...s,
        isLoadingDetail: true,
        error: null,
      }));

      try {
        const detail = await logsApi.get(id);
        update(s => ({
          ...s,
          selectedLog: detail,
          isLoadingDetail: false,
        }));
      } catch (error) {
        update(s => ({
          ...s,
          isLoadingDetail: false,
          error: error instanceof Error ? error.message : 'Failed to load log detail',
        }));
      }
    },

    /**
     * Load storage statistics.
     */
    async loadStats(): Promise<void> {
      try {
        const stats = await logsApi.getStats();
        update(s => ({ ...s, stats }));
      } catch (error) {
        // Stats are optional, don't set error
        console.warn('Failed to load logs stats:', error);
      }
    },

    /**
     * Set filter and reload.
     */
    async setFilter(key: keyof LogsFilter, value: string | undefined): Promise<void> {
      let currentFilters: LogsFilter = {};
      subscribe(s => { currentFilters = s.filters; })();

      const newFilters = { ...currentFilters, [key]: value || undefined };
      await this.load(newFilters);
    },

    /**
     * Clear all filters and reload.
     */
    async clearFilters(): Promise<void> {
      await this.load({});
    },

    /**
     * Clear selected log.
     */
    clearSelection(): void {
      update(s => ({ ...s, selectedLog: null }));
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

export const logsStore = createLogsStore();

// Derived stores
export const logs = derived(logsStore, $s => $s.logs);
export const selectedLog = derived(logsStore, $s => $s.selectedLog);
export const logsStats = derived(logsStore, $s => $s.stats);
export const logsFilters = derived(logsStore, $s => $s.filters);
export const isLogsLoading = derived(logsStore, $s => $s.isLoading);
export const isLogDetailLoading = derived(logsStore, $s => $s.isLoadingDetail);
export const hasMoreLogs = derived(logsStore, $s => $s.hasMore);
export const logsError = derived(logsStore, $s => $s.error);
export const logsTotalCount = derived(logsStore, $s => $s.totalCount);

// Filter by status
export const successLogs = derived(logs, $logs =>
  $logs.filter(log => log.status === 'SUCCESS')
);
export const failedLogs = derived(logs, $logs =>
  $logs.filter(log => log.status === 'FAILED' || log.status === 'TIMEOUT')
);
export const runningLogs = derived(logs, $logs =>
  $logs.filter(log => log.status === 'RUNNING')
);

// Stats helpers
export const logsHasErrors = derived(logs, $logs =>
  $logs.some(log => log.status === 'FAILED' || log.status === 'TIMEOUT')
);
