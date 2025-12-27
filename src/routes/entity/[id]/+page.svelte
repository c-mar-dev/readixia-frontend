<!-- Entity Timeline View - Shows state progression with clickable I/O -->
<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { entitiesApi } from '$lib/api';
  import TimelineEvent from '$lib/components/TimelineEvent.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';

  // Get entity path from URL (URL-encoded)
  $: entityPath = decodeURIComponent($page.params.id);

  // State
  /** @type {import('$lib/api').UiTimeline | null} */
  let timeline = null;
  /** @type {import('$lib/api').UiProgress | null} */
  let progress = null;
  /** @type {import('$lib/api').UiVerification | null} */
  let verification = null;
  let loading = true;
  let loadingMore = false;
  /** @type {import('$lib/api').ApiError | null} */
  let error = null;
  let notFound = false;

  // Pagination
  const PAGE_SIZE = 50;
  let currentOffset = 0;

  // Load all entity data
  async function loadEntityData() {
    loading = true;
    error = null;
    notFound = false;

    try {
      // Fetch all three endpoints in parallel
      // Verification is optional, so we catch its errors separately
      const [timelineResult, progressResult] = await Promise.all([
        entitiesApi.getTimeline(entityPath, { limit: PAGE_SIZE, offset: 0 }),
        entitiesApi.getProgress(entityPath),
      ]);

      timeline = timelineResult;
      progress = progressResult;
      currentOffset = timeline.events.length;

      // Verification is optional - entity may not have been verified yet
      try {
        verification = await entitiesApi.getVerificationStatus(entityPath);
      } catch (verErr) {
        // Not found for verification is OK - just means no verification yet
        verification = null;
      }
    } catch (err) {
      const apiErr = err;
      if (apiErr.code === 'DE-ENT-001' || apiErr.code?.startsWith('HTTP_404')) {
        notFound = true;
      } else {
        error = apiErr;
      }
    } finally {
      loading = false;
    }
  }

  // Load more timeline events
  async function loadMore() {
    if (!timeline || !timeline.hasMore || loadingMore) return;

    loadingMore = true;
    try {
      const moreData = await entitiesApi.getTimeline(entityPath, {
        limit: PAGE_SIZE,
        offset: currentOffset,
      });

      timeline = {
        ...timeline,
        events: [...timeline.events, ...moreData.events],
        hasMore: moreData.hasMore,
      };
      currentOffset += moreData.events.length;
    } catch (err) {
      console.error('Failed to load more events:', err);
    } finally {
      loadingMore = false;
    }
  }

  // Retry loading
  function retry() {
    loadEntityData();
  }

  // Keyboard handler
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      goto('/');
    }
  }

  // Load data on mount
  onMount(() => {
    loadEntityData();
  });

  // Reload when entity path changes
  $: if (entityPath) {
    // This will trigger on path change after initial mount
  }

  // Get state color for visual timeline
  function getStateColor(state) {
    const colors = {
      'inbox': 'bg-zinc-600',
      'created': 'bg-zinc-600',
      'received': 'bg-zinc-600',
      'recorded': 'bg-zinc-600',
      'transcribed': 'bg-blue-600',
      'categorized': 'bg-pink-600',
      'triaged': 'bg-purple-600',
      'specifying': 'bg-orange-500',
      'specified': 'bg-orange-600',
      'ready': 'bg-cyan-500',
      'executing': 'bg-cyan-600',
      'executed': 'bg-cyan-600',
      'doing': 'bg-cyan-600',
      'verifying': 'bg-amber-500',
      'pending_review': 'bg-amber-600',
      'pending_enrichment': 'bg-amber-600',
      'in_review': 'bg-amber-600',
      'approved': 'bg-green-600',
      'done': 'bg-green-600',
      'completed': 'bg-green-600',
      'archived': 'bg-zinc-500',
      'rejected': 'bg-red-600',
    };
    return colors[state] || 'bg-zinc-600';
  }

  // Extract entity title from path
  function getEntityTitle(path) {
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace(/\.md$/, '').replace(/_/g, ' ');
  }

  // Get entity type from path
  function getEntityType(path) {
    if (path.includes('/tasks/')) return 'task';
    if (path.includes('/sources/')) return 'source';
    if (path.includes('/transcripts/')) return 'transcript';
    if (path.includes('/emails/')) return 'email';
    return timeline?.itemType || 'unknown';
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="h-full overflow-auto bg-zinc-900 text-zinc-100">
  <!-- Header -->
  <div class="border-b border-zinc-800">
    <div class="px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <a href="/" class="text-zinc-400 hover:text-zinc-200 transition-colors">
          ← Back
        </a>
        <div class="h-6 w-px bg-zinc-700"></div>
        <h1 class="text-lg font-semibold">Entity Timeline</h1>
      </div>
      <div class="text-zinc-500 text-sm">
        <kbd class="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">Esc</kbd> to go back
      </div>
    </div>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="max-w-4xl mx-auto p-6">
      <div class="animate-pulse space-y-6">
        <!-- Header skeleton -->
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="h-6 w-16 bg-zinc-800 rounded"></div>
            <div class="h-6 w-24 bg-zinc-800 rounded"></div>
          </div>
          <div class="h-8 w-2/3 bg-zinc-700 rounded"></div>
          <div class="h-4 w-1/3 bg-zinc-800 rounded"></div>
        </div>

        <!-- Progress bar skeleton -->
        <div class="space-y-3">
          <div class="h-2 w-full bg-zinc-800 rounded-full"></div>
          <div class="flex justify-between">
            {#each Array(6) as _}
              <div class="flex flex-col items-center gap-1">
                <div class="w-3 h-3 bg-zinc-700 rounded-full"></div>
                <div class="h-3 w-12 bg-zinc-800 rounded"></div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Timeline skeleton -->
        <div class="space-y-4">
          {#each Array(3) as _}
            <div class="bg-zinc-800/50 rounded-lg border border-zinc-700 p-4">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-6 h-6 bg-zinc-700 rounded-full"></div>
                <div class="h-4 w-24 bg-zinc-700 rounded"></div>
              </div>
              <div class="h-3 w-full bg-zinc-800 rounded mb-2"></div>
              <div class="h-3 w-2/3 bg-zinc-800 rounded"></div>
            </div>
          {/each}
        </div>
      </div>
    </div>

  <!-- Error State -->
  {:else if error}
    <div class="max-w-4xl mx-auto p-6">
      <div class="bg-zinc-800/50 rounded-lg p-8 text-center">
        <div class="text-4xl mb-4 opacity-60">⚠️</div>
        <h3 class="text-lg font-medium text-zinc-200 mb-2">Something went wrong</h3>
        <p class="text-sm text-zinc-400 mb-4">{error.message || 'Failed to load entity data'}</p>
        {#if error.code}
          <p class="text-xs text-zinc-600 mb-4 font-mono">Error code: {error.code}</p>
        {/if}
        <button
          on:click={retry}
          class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>

  <!-- Not Found State -->
  {:else if notFound}
    <div class="max-w-4xl mx-auto p-6">
      <div class="bg-zinc-800/50 rounded-lg p-8 text-center">
        <div class="text-4xl mb-4">🔍</div>
        <h3 class="text-lg font-medium text-zinc-200 mb-2">Entity Not Found</h3>
        <p class="text-zinc-400 mb-6">
          No entity with path "{entityPath}" exists or has no timeline history.
        </p>
        <a
          href="/"
          class="inline-block px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
        >
          Back to Queue
        </a>
      </div>
    </div>

  <!-- Timeline Content -->
  {:else if timeline}
    <div class="max-w-4xl mx-auto p-6">
      <!-- Entity Header -->
      <div class="mb-8">
        <div class="flex items-center gap-3 mb-2">
          <span class="text-sm px-3 py-1 rounded bg-zinc-800 text-zinc-300 capitalize">
            {getEntityType(entityPath)}
          </span>
          {#if verification?.hasVerification}
            <span class="text-sm px-3 py-1 rounded {verification.passed ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}">
              {verification.passed ? 'Verified' : 'Verification Failed'}
            </span>
          {/if}
        </div>
        <h2 class="text-2xl font-bold text-zinc-100">{getEntityTitle(entityPath)}</h2>
        <p class="text-zinc-500 mt-1 text-sm font-mono">{entityPath}</p>
      </div>

      <!-- Progress Bar -->
      {#if progress}
        <div class="mb-8 bg-zinc-800/30 rounded-lg p-4 border border-zinc-700">
          <ProgressBar {progress} />
        </div>
      {/if}

      <!-- Visual Timeline (compact) -->
      {#if timeline.events.length > 0}
        <div class="mb-8">
          <div class="flex items-center gap-1 overflow-x-auto pb-2">
            {#each timeline.events as event, i}
              <div class="flex items-center flex-shrink-0">
                <div class="w-8 h-8 rounded-full {getStateColor(event.toState)} flex items-center justify-center text-white text-sm font-medium">
                  {i + 1}
                </div>
                {#if i < timeline.events.length - 1}
                  <div class="w-8 h-0.5 bg-zinc-700"></div>
                {/if}
              </div>
            {/each}
          </div>
          <div class="flex items-center gap-1 mt-2 overflow-x-auto">
            {#each timeline.events as event, i}
              <div class="flex items-center flex-shrink-0">
                <div class="w-8 text-center text-xs text-zinc-500 truncate" title={event.toState}>
                  {event.toState.split('_')[0].slice(0, 4)}
                </div>
                {#if i < timeline.events.length - 1}
                  <div class="w-8"></div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- Timeline Events -->
        <div class="space-y-4">
          {#each timeline.events as event, index (event.id)}
            <TimelineEvent
              {event}
              index={index + 1}
              verification={event.toState === 'verifying' ? verification : null}
            />
          {/each}
        </div>

        <!-- Load More Button -->
        {#if timeline.hasMore}
          <div class="mt-6 text-center">
            <button
              on:click={loadMore}
              disabled={loadingMore}
              class="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {#if loadingMore}
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              {:else}
                Load More ({timeline.totalCount - timeline.events.length} remaining)
              {/if}
            </button>
          </div>
        {/if}

        <!-- Total count -->
        <div class="mt-4 text-center text-sm text-zinc-500">
          Showing {timeline.events.length} of {timeline.totalCount} events
        </div>

      {:else}
        <!-- No history yet -->
        <div class="bg-zinc-800/50 rounded-lg p-8 text-center">
          <p class="text-zinc-400 mb-4">No history available for this entity yet.</p>
          <a
            href="/"
            class="inline-block px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
          >
            Back to Queue
          </a>
        </div>
      {/if}
    </div>
  {/if}
</div>
