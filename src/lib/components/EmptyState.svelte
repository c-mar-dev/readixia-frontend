<!--
  EmptyState.svelte - Context-aware empty state for UNIT-3-DECISION-LIST

  Displays appropriate empty state message based on context:
  - "All caught up!" when queue is truly empty (celebration)
  - "No decisions match filters" when filters hide all items (actionable)

  Part of: UNIT-3-DECISION-LIST (Decision List Integration)
  Used by: +page.svelte, inbox/+page.svelte

  Props:
    - variant: 'empty' | 'filtered' (default: 'empty')
    - onClearFilters: Callback for clear filters button (filtered variant only)

  Variants:
    - 'empty': Shows sparkles emoji with "All caught up!" message
    - 'filtered': Shows search emoji with "No decisions match filters"
                  and a "Clear Filters" button

  Usage:
    import EmptyState from '$lib/components/EmptyState.svelte';
    import { pendingDecisions, filteredDecisions, hasActiveFilters, filterStore } from '$lib/stores';

    {#if $pendingDecisions.length === 0}
      <EmptyState variant="empty" />
    {:else if $filteredDecisions.length === 0 && $hasActiveFilters}
      <EmptyState variant="filtered" onClearFilters={() => filterStore.clear()} />
    {/if}
-->
<script>
  export let variant = 'empty';
  export let onClearFilters = undefined;
</script>

<div class="flex items-center justify-center h-full bg-zinc-900/30">
  <div class="text-center p-8 max-w-md">
    {#if variant === 'empty'}
      <!-- All Caught Up State -->
      <div class="text-5xl mb-4">
        <span role="img" aria-label="Sparkles">✨</span>
      </div>
      <h3 class="text-xl font-medium text-zinc-200 mb-2">
        All caught up!
      </h3>
      <p class="text-sm text-zinc-400">
        No pending decisions. Take a break or check back later.
      </p>
    {:else if variant === 'filtered'}
      <!-- No Filter Matches State -->
      <div class="text-5xl mb-4 opacity-60">
        <span role="img" aria-label="Search">🔍</span>
      </div>
      <h3 class="text-lg font-medium text-zinc-200 mb-2">
        No decisions match filters
      </h3>
      <p class="text-sm text-zinc-400 mb-6">
        Try adjusting your filters to see more items.
      </p>
      {#if onClearFilters}
        <button
          on:click={onClearFilters}
          class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors border border-zinc-700"
        >
          Clear Filters
        </button>
      {/if}
    {:else}
      <!-- Fallback for unknown variant -->
      <div class="text-5xl mb-4 opacity-40">
        <span role="img" aria-label="Empty">📭</span>
      </div>
      <h3 class="text-lg font-medium text-zinc-200 mb-2">
        Nothing here
      </h3>
      <p class="text-sm text-zinc-400">
        The queue is empty.
      </p>
    {/if}
  </div>
</div>
