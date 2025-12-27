/**
 * itemFilters.ts - Filter store for Items page
 *
 * Manages filter state for the Items page.
 * Follows the same pattern as filters.ts for decisions.
 *
 * Exports:
 *   - itemFilterStore: Writable store with filter methods
 *   - Derived stores for each filter
 *
 * Usage:
 *   import { itemFilterStore, itemTypeFilter } from '$lib/stores';
 *
 *   itemFilterStore.setType('task');
 *   $: console.log($itemTypeFilter); // 'task'
 */

import { writable, derived } from 'svelte/store';
import type { ItemType } from '$lib/api/items';

// =============================================================================
// Types
// =============================================================================

export interface ItemFilterState {
  /** Item type filter (null = all) */
  itemType: ItemType | null;
  /** State filter (null = all) */
  state: string | null;
  /** Project filter (null = all) */
  project: string | null;
  /** Search query */
  search: string;
}

// =============================================================================
// Store Implementation
// =============================================================================

function createItemFilterStore() {
  const initialState: ItemFilterState = {
    itemType: null,
    state: null,
    project: null,
    search: '',
  };

  const { subscribe, set, update } = writable<ItemFilterState>(initialState);

  return {
    subscribe,

    /**
     * Set item type filter.
     */
    setType(type: ItemType | null): void {
      update((s) => ({ ...s, itemType: type }));
    },

    /**
     * Set state filter.
     */
    setState(state: string | null): void {
      update((s) => ({ ...s, state }));
    },

    /**
     * Set project filter.
     */
    setProject(project: string | null): void {
      update((s) => ({ ...s, project }));
    },

    /**
     * Set search query.
     */
    setSearch(search: string): void {
      update((s) => ({ ...s, search }));
    },

    /**
     * Clear all filters.
     */
    clear(): void {
      set(initialState);
    },

    /**
     * Check if any filters are active.
     */
    hasFilters(): boolean {
      let current: ItemFilterState;
      const unsubscribe = subscribe((s) => (current = s));
      unsubscribe();
      return !!(current!.itemType || current!.state || current!.project || current!.search);
    },
  };
}

// =============================================================================
// Store Instances
// =============================================================================

export const itemFilterStore = createItemFilterStore();

// =============================================================================
// Derived Stores
// =============================================================================

/** Item type filter */
export const itemTypeFilter = derived(itemFilterStore, ($s) => $s.itemType);

/** State filter */
export const itemStateFilter = derived(itemFilterStore, ($s) => $s.state);

/** Project filter */
export const itemProjectFilter = derived(itemFilterStore, ($s) => $s.project);

/** Search query */
export const itemSearchQuery = derived(itemFilterStore, ($s) => $s.search);

/** Whether any filters are active */
export const hasItemFilters = derived(
  itemFilterStore,
  ($s) => !!($s.itemType || $s.state || $s.project || $s.search)
);
