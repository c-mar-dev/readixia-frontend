<!--
  Items Page - Browse all MDQ vault items

  Two-panel layout:
  - Left: Item list with filters
  - Right: Selected item detail
-->
<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import LoadingState from '$lib/components/LoadingState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ItemListItem from '$lib/components/ItemListItem.svelte';
  import ItemDetail from '$lib/components/ItemDetail.svelte';

  import {
    itemsStore,
    items,
    isItemsLoading,
    isItemsLoadingMore,
    itemsError,
    itemsHasMore,
    selectedItem,
    isLoadingDetail,
    itemFilterStore,
    itemTypeFilter,
    itemStateFilter,
    itemSearchQuery,
    hasItemFilters,
  } from '$lib/stores';

  import type { ItemType } from '$lib/api/items';

  // Item type tabs
  const itemTypes: { key: ItemType | null; label: string; icon: string }[] = [
    { key: null, label: 'All', icon: '' },
    { key: 'task', label: 'Tasks', icon: '' },
    { key: 'transcript', label: 'Meetings', icon: '' },
    { key: 'source', label: 'Sources', icon: '' },
    { key: 'project', label: 'Projects', icon: '' },
    { key: 'person', label: 'People', icon: '' },
  ];

  // State options by type
  const stateOptions: Record<string, string[]> = {
    task: ['inbox', 'specifying', 'specified', 'ready', 'doing', 'verifying', 'in_review', 'done'],
    project: ['active', 'paused', 'completed', 'archived'],
    default: [],
  };

  // Local filter state
  let selectedType: ItemType | null = null;
  let selectedState: string | null = null;
  let searchQuery = '';
  let selectedIndex = 0;
  let listEl: HTMLDivElement;

  // Subscribe to filter store
  const unsubscribeFilters = itemFilterStore.subscribe((f) => {
    selectedType = f.itemType;
    selectedState = f.state;
    searchQuery = f.search;
  });

  // Sync local changes to store
  $: itemFilterStore.setType(selectedType);
  $: itemFilterStore.setState(selectedState);
  $: itemFilterStore.setSearch(searchQuery);

  // Load items when filters change
  $: {
    const params: Record<string, unknown> = {};
    if (selectedType) params.type = selectedType;
    if (selectedState) params.state = selectedState;
    if (searchQuery) params.q = searchQuery;
    itemsStore.load(params);
  }

  // Selected item from list
  $: currentItem = $items.length > 0
    ? $items[Math.min(selectedIndex, $items.length - 1)]
    : null;

  // Reset selection when items change
  $: if ($items) {
    selectedIndex = Math.min(selectedIndex, Math.max(0, $items.length - 1));
  }

  // Load item details when selection changes
  $: if (currentItem) {
    itemsStore.selectItem(currentItem.path);
  }

  // Get available states for current type
  $: availableStates = selectedType
    ? stateOptions[selectedType] || stateOptions.default
    : stateOptions.default;

  // Initialize
  onMount(() => {
    itemsStore.load();
  });

  onDestroy(() => {
    unsubscribeFilters();
    itemsStore.reset();
  });

  function selectItem(index: number) {
    selectedIndex = index;
    scrollToSelected();
  }

  function scrollToSelected() {
    tick().then(() => {
      const selectedEl = listEl?.querySelector(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  function clearFilters() {
    itemFilterStore.clear();
    selectedIndex = 0;
  }

  // Keyboard navigation
  function handleKeydown(event: KeyboardEvent) {
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName);
    if (isTyping) return;

    switch (event.key) {
      case 'ArrowUp':
      case 'k':
        event.preventDefault();
        if (selectedIndex > 0) {
          selectedIndex--;
          scrollToSelected();
        }
        break;
      case 'ArrowDown':
      case 'j':
        event.preventDefault();
        if (selectedIndex < $items.length - 1) {
          selectedIndex++;
          scrollToSelected();
        }
        break;
      case '/':
        event.preventDefault();
        document.getElementById('items-search')?.focus();
        break;
      case 'Escape':
        (event.target as HTMLElement).blur();
        break;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="h-full flex flex-col bg-zinc-900 text-zinc-100">
  <!-- Header -->
  <div class="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur px-6 py-4">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">Items</h1>
        <p class="text-xs text-zinc-400 mt-1">
          {$items.length} items in vault
        </p>
      </div>

      <!-- Search -->
      <div class="relative flex-1 max-w-md mx-6">
        <input
          id="items-search"
          type="text"
          placeholder="Search items... (/)"
          class="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-4 pr-4 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
          bind:value={searchQuery}
        />
      </div>

      <!-- Clear filters -->
      {#if $hasItemFilters}
        <button
          on:click={clearFilters}
          class="text-xs text-amber-500 hover:text-amber-400 font-medium px-3 py-1.5 rounded hover:bg-amber-900/20 transition-colors"
        >
          Clear Filters
        </button>
      {/if}
    </div>

    <!-- Type tabs -->
    <div class="flex items-center gap-1">
      {#each itemTypes as type}
        <button
          on:click={() => { selectedType = type.key; selectedState = null; }}
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                 {selectedType === type.key
                   ? 'bg-amber-600/20 text-amber-200 border border-amber-600/50'
                   : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}"
        >
          {type.label}
        </button>
      {/each}

      <!-- State filter (when type is selected) -->
      {#if availableStates.length > 0}
        <div class="h-6 w-px bg-zinc-700 mx-2"></div>
        <select
          bind:value={selectedState}
          class="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-300 focus:border-amber-500 focus:outline-none"
        >
          <option value={null}>All States</option>
          {#each availableStates as state}
            <option value={state}>{state}</option>
          {/each}
        </select>
      {/if}
    </div>
  </div>

  <!-- Main content -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Loading State -->
    {#if $isItemsLoading && $items.length === 0}
      <div class="flex-1">
        <LoadingState count={8} showDetail={true} />
      </div>

    <!-- Error State -->
    {:else if $itemsError}
      <div class="flex-1 flex items-center justify-center">
        <ErrorState error={$itemsError} onRetry={() => itemsStore.refresh()} />
      </div>

    <!-- Empty State -->
    {:else if $items.length === 0}
      <div class="flex-1 flex items-center justify-center">
        <EmptyState
          variant={$hasItemFilters ? 'filtered' : 'empty'}
          onClearFilters={$hasItemFilters ? clearFilters : undefined}
        />
      </div>

    <!-- Normal State: List + Detail -->
    {:else}
      <!-- Item List (40%) -->
      <div
        class="w-2/5 border-r border-zinc-800 flex flex-col bg-zinc-900 overflow-y-auto"
        bind:this={listEl}
      >
        {#each $items as item, index (item.path)}
          <ItemListItem
            {item}
            selected={selectedIndex === index}
            {index}
            on:click={() => selectItem(index)}
          />
        {/each}

        <!-- Load More -->
        {#if $itemsHasMore}
          <div class="p-4 border-t border-zinc-800">
            <button
              on:click={() => itemsStore.loadMore()}
              disabled={$isItemsLoadingMore}
              class="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 text-sm rounded-lg transition-colors"
            >
              {#if $isItemsLoadingMore}
                Loading...
              {:else}
                Load More
              {/if}
            </button>
          </div>
        {/if}
      </div>

      <!-- Detail Panel (60%) -->
      <div class="flex-1 bg-zinc-900/30 overflow-y-auto">
        {#if $isLoadingDetail}
          <div class="flex items-center justify-center h-full">
            <div class="text-zinc-500">Loading...</div>
          </div>
        {:else if $selectedItem}
          <ItemDetail item={$selectedItem} />
        {:else}
          <div class="flex items-center justify-center h-full text-zinc-500">
            <div class="text-center">
              <div class="text-4xl mb-4 opacity-30">select</div>
              <p>Select an item to view details</p>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
