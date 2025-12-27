/**
 * items.ts - Items store for the Items page
 *
 * Centralized store for MDQ items with API integration.
 * Used by the Items page to display vault contents.
 *
 * Exports:
 *   - itemsStore: Writable store with CRUD methods
 *   - items: Derived store with just the items array
 *   - isItemsLoading: Derived boolean for loading state
 *   - itemsError: Derived store for error state
 *
 * Usage:
 *   import { itemsStore, items } from '$lib/stores';
 *
 *   onMount(() => {
 *     itemsStore.load();
 *   });
 *
 *   {#each $items as item (item.path)}
 *     <ItemCard {item} />
 *   {/each}
 */

import { writable, derived } from 'svelte/store';
import { itemsApi } from '$lib/api';
import type { Item, ItemDetail, ItemListParams } from '$lib/api/items';
import type { ApiError } from '$lib/api/types';

// =============================================================================
// Types
// =============================================================================

export interface ItemsStoreState {
  items: Item[];
  loading: boolean;
  error: ApiError | null;
  lastFetched: Date | null;
  hasMore: boolean;
  loadingMore: boolean;
  total: number;
  selectedItem: ItemDetail | null;
  loadingDetail: boolean;
}

// =============================================================================
// Store Implementation
// =============================================================================

function createItemsStore() {
  const initialState: ItemsStoreState = {
    items: [],
    loading: false,
    error: null,
    lastFetched: null,
    hasMore: false,
    loadingMore: false,
    total: 0,
    selectedItem: null,
    loadingDetail: false,
  };

  const { subscribe, set, update } = writable<ItemsStoreState>(initialState);

  let loadController: AbortController | null = null;
  let currentParams: ItemListParams = {};

  return {
    subscribe,

    /**
     * Load items from API.
     * Sets loading state and handles errors gracefully.
     *
     * @param params - Optional filters
     */
    async load(params?: ItemListParams): Promise<void> {
      // Cancel any in-flight request
      loadController?.abort();
      loadController = new AbortController();

      // Track current params for loadMore
      currentParams = params || {};

      update((s) => ({ ...s, loading: true, error: null }));

      try {
        const response = await itemsApi.list(
          { ...params, limit: 50 },
          { signal: loadController.signal }
        );

        update((s) => ({
          ...s,
          items: response.items,
          loading: false,
          lastFetched: new Date(),
          hasMore: response.hasMore,
          total: response.total,
        }));
      } catch (error) {
        // Ignore aborted requests
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        const apiError: ApiError = {
          code: 'LOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to load items',
        };

        update((s) => ({
          ...s,
          loading: false,
          error: apiError,
        }));
      }
    },

    /**
     * Load more items (pagination).
     */
    async loadMore(): Promise<void> {
      let currentState: ItemsStoreState;
      const unsubscribe = subscribe((s) => (currentState = s));
      unsubscribe();

      if (currentState!.loadingMore || !currentState!.hasMore) {
        return;
      }

      update((s) => ({ ...s, loadingMore: true }));

      try {
        const response = await itemsApi.list({
          ...currentParams,
          limit: 50,
          offset: currentState!.items.length,
        });

        update((s) => ({
          ...s,
          items: [...s.items, ...response.items],
          loadingMore: false,
          hasMore: response.hasMore,
          total: response.total,
        }));
      } catch (error) {
        update((s) => ({
          ...s,
          loadingMore: false,
          error: {
            code: 'LOAD_MORE_FAILED',
            message: error instanceof Error ? error.message : 'Failed to load more items',
          },
        }));
      }
    },

    /**
     * Refresh items with current filters.
     */
    async refresh(): Promise<void> {
      return this.load(currentParams);
    },

    /**
     * Select an item and load its details.
     */
    async selectItem(path: string): Promise<void> {
      update((s) => ({ ...s, loadingDetail: true }));

      try {
        const detail = await itemsApi.get(path);
        update((s) => ({
          ...s,
          selectedItem: detail,
          loadingDetail: false,
        }));
      } catch (error) {
        update((s) => ({
          ...s,
          loadingDetail: false,
          error: {
            code: 'GET_FAILED',
            message: error instanceof Error ? error.message : 'Failed to load item details',
          },
        }));
      }
    },

    /**
     * Clear selected item.
     */
    clearSelection(): void {
      update((s) => ({ ...s, selectedItem: null }));
    },

    /**
     * Reset store to initial state.
     */
    reset(): void {
      loadController?.abort();
      set(initialState);
    },
  };
}

// =============================================================================
// Store Instances
// =============================================================================

export const itemsStore = createItemsStore();

// =============================================================================
// Derived Stores
// =============================================================================

/** Just the items array */
export const items = derived(itemsStore, ($s) => $s.items);

/** Loading state */
export const isItemsLoading = derived(itemsStore, ($s) => $s.loading);

/** Loading more state */
export const isItemsLoadingMore = derived(itemsStore, ($s) => $s.loadingMore);

/** Error state */
export const itemsError = derived(itemsStore, ($s) => $s.error);

/** Has more items to load */
export const itemsHasMore = derived(itemsStore, ($s) => $s.hasMore);

/** Total item count */
export const itemsTotal = derived(itemsStore, ($s) => $s.total);

/** Selected item */
export const selectedItem = derived(itemsStore, ($s) => $s.selectedItem);

/** Loading detail state */
export const isLoadingDetail = derived(itemsStore, ($s) => $s.loadingDetail);
