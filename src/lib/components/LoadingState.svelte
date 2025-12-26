<!--
  LoadingState.svelte - Skeleton loader for UNIT-3-DECISION-LIST

  Provides a detailed skeleton loader that matches the DecisionCard structure,
  including list items and detail panel. Used during initial page load while
  fetching decisions from the API.

  Part of: UNIT-3-DECISION-LIST (Decision List Integration)
  Used by: +page.svelte, inbox/+page.svelte

  Props:
    - count: Number of skeleton list items to show (default 5)
    - showDetail: Whether to show the detail panel skeleton (default true)

  Usage:
    import LoadingState from '$lib/components/LoadingState.svelte';
    import { isLoading, decisions } from '$lib/stores';

    {#if $isLoading && $decisions.length === 0}
      <LoadingState count={5} showDetail={true} />
    {/if}

  Styling:
    - Uses Tailwind's animate-pulse for skeleton animation
    - Matches zinc color palette from DecisionCard
    - Two-panel layout: 320px list + flexible detail panel
-->
<script>
  export let count = 5;
  export let showDetail = true;
</script>

<div class="flex h-full">
  <!-- List Skeleton (left panel) -->
  <div class="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900">
    <div class="flex-1 overflow-hidden">
      {#each Array(count) as _, i}
        <div class="px-4 py-3 border-b border-zinc-800 animate-pulse">
          <!-- Type label + timestamp row -->
          <div class="flex items-center justify-between mb-2">
            <div class="h-3 w-16 bg-zinc-700 rounded"></div>
            <div class="h-3 w-10 bg-zinc-800 rounded"></div>
          </div>
          <!-- Title -->
          <div class="h-4 w-4/5 bg-zinc-700 rounded mb-2"></div>
          <!-- Question -->
          <div class="h-3 w-3/5 bg-zinc-800 rounded"></div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Detail Panel Skeleton (right panel) -->
  {#if showDetail}
    <div class="flex-1 bg-zinc-900/30 overflow-hidden">
      <div class="max-w-4xl mx-auto p-8 animate-pulse">
        <!-- Workflow Progress Bar Skeleton -->
        <div class="mb-6">
          <div class="flex justify-between items-end mb-2">
            <div class="flex gap-4">
              {#each Array(4) as _}
                <div class="flex flex-col gap-1">
                  <div class="h-2 w-12 bg-zinc-700 rounded"></div>
                  <div class="h-1 w-12 bg-zinc-800 rounded-full"></div>
                </div>
              {/each}
            </div>
            <div class="h-2 w-20 bg-zinc-800 rounded"></div>
          </div>
        </div>

        <!-- Card Header Skeleton -->
        <div class="mb-8 border-b border-zinc-800 pb-6">
          <!-- Badges row -->
          <div class="flex items-center gap-3 mb-4">
            <div class="h-6 w-20 bg-zinc-800 rounded border border-zinc-700"></div>
            <div class="h-6 w-16 bg-zinc-800 rounded border border-zinc-700"></div>
          </div>
          <!-- Title -->
          <div class="h-7 w-3/4 bg-zinc-700 rounded mb-3"></div>
          <!-- Subtitle/original text -->
          <div class="h-4 w-1/2 bg-zinc-800 rounded"></div>
        </div>

        <!-- Card Body Skeleton -->
        <div class="space-y-8">
          <!-- Two column layout -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Left column -->
            <div class="space-y-4">
              <div class="h-3 w-24 bg-zinc-700 rounded"></div>
              <div class="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 space-y-3">
                <div class="h-4 w-full bg-zinc-700 rounded"></div>
                <div class="h-4 w-4/5 bg-zinc-700 rounded"></div>
                <div class="h-4 w-2/3 bg-zinc-700 rounded"></div>
              </div>
            </div>

            <!-- Right column -->
            <div class="space-y-4">
              <div class="h-3 w-20 bg-zinc-700 rounded"></div>
              <div class="space-y-2">
                {#each Array(3) as _}
                  <div class="h-12 w-full bg-zinc-800 rounded-lg border border-zinc-700"></div>
                {/each}
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons Skeleton -->
        <div class="pt-6 border-t border-zinc-800 mt-8 flex justify-end gap-3">
          <div class="h-9 w-16 bg-zinc-800 rounded-lg"></div>
          <div class="h-9 w-20 bg-zinc-800 rounded-lg border border-zinc-700"></div>
          <div class="h-9 w-32 bg-zinc-700 rounded-lg"></div>
        </div>
      </div>
    </div>
  {/if}
</div>
