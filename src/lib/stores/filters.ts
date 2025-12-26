/**
 * filters.ts - Filter state store for UNIT-STORE-ARCH
 *
 * Centralized store for filter state shared across views.
 * Filter changes in one view reflect in all others.
 *
 * Exports:
 *   - filterStore: Writable store with filter methods
 *   - hasActiveFilters: Derived boolean for filter status
 *
 * Usage:
 *   import { filterStore, hasActiveFilters } from '$lib/stores';
 *
 *   filterStore.setStage('triage');
 *   filterStore.setSearch('report');
 *
 *   {#if $hasActiveFilters}
 *     <button on:click={filterStore.clear}>Clear filters</button>
 *   {/if}
 */

import { writable, derived } from 'svelte/store';
import type { FilterState } from './types';

// =============================================================================
// Store Implementation
// =============================================================================

/**
 * Default filter state - no filters applied.
 */
const DEFAULT_FILTERS: FilterState = {
  stage: 'all',
  type: 'all',
  project: 'all',
  search: '',
  stageMode: 'type',
};

/**
 * Create the filter store with methods.
 */
function createFilterStore() {
  const { subscribe, set, update } = writable<FilterState>({ ...DEFAULT_FILTERS });

  return {
    subscribe,

    /**
     * Set the stage (decision type) filter.
     * Use 'all' to show all types, 'urgent' for critical priority.
     *
     * @param stage - Decision type or 'all' or 'urgent'
     */
    setStage(stage: string): void {
      update((s) => ({ ...s, stage }));
    },

    /**
     * Set the stage filter to a specific decision type.
     * Sets stageMode to 'type' for individual type filtering.
     *
     * @param type - Decision type or 'all' or 'urgent'
     */
    setStageType(type: string): void {
      update((s) => ({ ...s, stage: type, stageMode: 'type' }));
    },

    /**
     * Set the stage filter to a workflow group.
     * Sets stageMode to 'group' for group-based filtering.
     *
     * @param group - Group key (e.g., 'intake', 'refinement') or 'all'
     */
    setStageGroup(group: string): void {
      update((s) => ({ ...s, stage: group, stageMode: group === 'all' ? 'type' : 'group' }));
    },

    /**
     * Set the subject type filter.
     * Use 'all' to show all types.
     *
     * @param type - Subject type or 'all'
     */
    setType(type: string): void {
      update((s) => ({ ...s, type }));
    },

    /**
     * Set the project filter.
     * Use 'all' to show all projects.
     *
     * @param project - Project name or 'all'
     */
    setProject(project: string): void {
      update((s) => ({ ...s, project }));
    },

    /**
     * Set the search query.
     * Filters by title substring match (case-insensitive).
     *
     * @param search - Search query string
     */
    setSearch(search: string): void {
      update((s) => ({ ...s, search }));
    },

    /**
     * Clear all filters to default state.
     */
    clear(): void {
      set({ ...DEFAULT_FILTERS });
    },

    /**
     * Reset to initial state (alias for clear).
     */
    reset(): void {
      this.clear();
    },

    /**
     * Set multiple filters at once.
     * Useful for restoring saved filter state.
     *
     * @param filters - Partial filter state to apply
     */
    setFilters(filters: Partial<FilterState>): void {
      update((s) => ({ ...s, ...filters }));
    },

    /**
     * Get current filter state synchronously.
     * Useful for checking state without subscribing.
     */
    getFilters(): FilterState {
      let current: FilterState = { ...DEFAULT_FILTERS };
      const unsubscribe = subscribe((s) => {
        current = s;
      });
      unsubscribe();
      return current;
    },
  };
}

// =============================================================================
// Exports
// =============================================================================

/** Main filter store with all methods */
export const filterStore = createFilterStore();

/**
 * Derived store indicating if any filter is active.
 * True when any filter differs from default.
 */
export const hasActiveFilters = derived(
  filterStore,
  ($filters) =>
    $filters.stage !== 'all' ||
    $filters.type !== 'all' ||
    $filters.project !== 'all' ||
    $filters.search !== ''
);

/**
 * Derived store for just the stage filter value.
 */
export const stageFilter = derived(
  filterStore,
  ($filters) => $filters.stage
);

/**
 * Derived store for just the type filter value.
 */
export const typeFilter = derived(
  filterStore,
  ($filters) => $filters.type
);

/**
 * Derived store for just the project filter value.
 */
export const projectFilter = derived(
  filterStore,
  ($filters) => $filters.project
);

/**
 * Derived store for just the search query.
 */
export const searchQuery = derived(
  filterStore,
  ($filters) => $filters.search
);

/**
 * Derived store for the stage filter mode.
 */
export const stageMode = derived(
  filterStore,
  ($filters) => $filters.stageMode
);
