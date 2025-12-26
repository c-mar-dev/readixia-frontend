<!-- Inbox View - Email-style layout with wider list panel -->
<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import DecisionCard from '$lib/components/DecisionCard.svelte';
  import LoadingState from '$lib/components/LoadingState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import {
    decisionTypeConfig,
    thingTypeConfig,
  } from '$lib/data/decisions.js';

  // Import stores
  import {
    decisionStore,
    decisions,
    filterStore,
    filteredDecisions,
    pendingDecisions,
    hasActiveFilters,
    isLoading,
    storeError,
    hasMore,
    isLoadingMore,
    actionStore,
  } from '$lib/stores';

  function clearFilters() {
    filterStore.clear();
  }

  // Local filter state (synced with store)
  let stageFilter = 'all';
  let thingFilter = 'all';
  let projectFilter = 'all';

  // Subscribe to filter store
  const unsubscribeFilters = filterStore.subscribe(f => {
    stageFilter = f.stage;
    thingFilter = f.type;
    projectFilter = f.project;
  });

  // Sync local changes to store
  $: filterStore.setStage(stageFilter);
  $: filterStore.setType(thingFilter);
  $: filterStore.setProject(projectFilter);

  // Track previous stage filter for reload detection
  let prevStageFilter = 'all';

  // Reload when stage filter changes to a valid decision type
  $: {
    const validDecisionTypes = Object.keys(decisionTypeConfig);
    const isValidType = validDecisionTypes.includes(stageFilter);
    const wasValidType = validDecisionTypes.includes(prevStageFilter);

    if (stageFilter !== prevStageFilter && (isValidType || wasValidType || stageFilter === 'all')) {
      decisionStore.load(isValidType ? { type: stageFilter } : undefined);
    }
    prevStageFilter = stageFilter;
  }

  // Initialize stores on mount
  onMount(() => {
    if (!decisionStore.initialized) {
      decisionStore.load();
    }
    decisionStore.startPolling();
  });

  onDestroy(() => {
    decisionStore.stopPolling();
    unsubscribeFilters();
  });

  // Navigation state
  let selectedIndex = 0;
  let queueListEl;
  let detailPanelEl;

  // Toast notifications
  let toastId = 0;
  let toasts = [];
  let lastAction = null;

  // Reactive selection (from store)
  $: selectedDecision = $filteredDecisions.length > 0
    ? $filteredDecisions[Math.min(selectedIndex, $filteredDecisions.length - 1)]
    : null;

  $: if ($filteredDecisions) {
    selectedIndex = Math.min(selectedIndex, Math.max(0, $filteredDecisions.length - 1));
  }

  function selectDecision(decision) {
    const idx = $filteredDecisions.findIndex(d => d.id === decision.id);
    if (idx !== -1) selectedIndex = idx;
  }

  function showToast(message, type = 'success') {
    const id = toastId++;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 3000);
  }

  async function handleCardAction(event) {
    const { name, decision, payload } = event.detail;
    showToast(`${name}: ${decision.subject.title}`, 'success');
    lastAction = { type: 'action', name, decision, previousIndex: selectedIndex, timestamp: Date.now() };

    try {
      // Use decisionStore.resolve() which returns action metadata
      const response = await decisionStore.resolve(decision.id, { action: name, ...payload });

      // Add to action store for undo functionality
      if (response?.actionId && response?.undoExpiresAt) {
        actionStore.add({
          id: response.actionId,
          decisionId: decision.id,
          decisionTitle: decision.subject.title,
          actionName: name,
          expiresAt: response.undoExpiresAt,
          timestamp: new Date(),
        });
      }

      // Auto-select first chained decision if any, otherwise move to next
      if (response.chainedDecisions && response.chainedDecisions.length > 0) {
        await tick(); // Wait for store to update DOM
        selectDecision(response.chainedDecisions[0]);
      } else {
        moveToNextDecision();
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
      console.error('Failed to resolve decision:', error);
    }
  }

  function handleSkip() {
    if (!selectedDecision) return;
    lastAction = { type: 'skip', decision: selectedDecision, previousIndex: selectedIndex, timestamp: Date.now() };
    showToast(`Skipped`, 'success');
    moveToNextDecision();
  }

  function moveToNextDecision() {
    if (selectedIndex >= $filteredDecisions.length - 1) {
      selectedIndex = Math.max(0, $filteredDecisions.length - 2);
    }
  }

  // Keyboard handler
  function handleKeydown(event) {
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
    if (isTyping) return;

    if (event.key === 'Escape') { goto('/'); return; }

    switch (event.key) {
      case 'ArrowUp': case 'k':
        event.preventDefault();
        if (selectedIndex > 0) selectedIndex--;
        break;
      case 'ArrowDown': case 'j':
        event.preventDefault();
        if (selectedIndex < $filteredDecisions.length - 1) selectedIndex++;
        break;
      case 's':
        event.preventDefault();
        handleSkip();
        break;
      case 'f':
        event.preventDefault();
        goto('/focus');
        break;
      case ',':
        event.preventDefault();
        goto('/settings');
        break;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="min-h-screen bg-zinc-900 text-zinc-100">
  <!-- Compact Header -->
  <div class="border-b border-zinc-800 bg-zinc-900 z-10 sticky top-0">
    <div class="px-6 py-3 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <a href="/" class="text-zinc-400 hover:text-zinc-200 transition-colors text-sm font-medium">
          ← Queue
        </a>
        <h1 class="text-lg font-semibold tracking-tight">Inbox</h1>
      </div>
      <div class="flex items-center gap-4">
        <!-- Compact filters -->
        <div class="flex items-center gap-1">
          <button
            on:click={() => stageFilter = 'all'}
            class="px-2.5 py-1 rounded text-xs font-medium transition-colors border {stageFilter === 'all' ? 'bg-amber-600/20 border-amber-600/50 text-amber-200' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}"
          >
            All
          </button>
          <button
            on:click={() => stageFilter = 'urgent'}
            class="px-2.5 py-1 rounded text-xs font-medium transition-colors border {stageFilter === 'urgent' ? 'bg-red-900/30 border-red-900/50 text-red-200' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}"
          >
            Urgent
          </button>
          <div class="w-px h-4 bg-zinc-800 mx-1"></div>
          {#each Object.entries(decisionTypeConfig) as [key, config]}
            <button
              on:click={() => stageFilter = key}
              title={config.label}
              class="px-2 py-1 rounded text-xs transition-colors border {stageFilter === key ? 'bg-zinc-700 border-zinc-600 text-white' : 'bg-zinc-800 border-transparent text-zinc-400 hover:text-zinc-200'}"
            >
              {config.icon}
            </button>
          {/each}
        </div>
        <div class="text-amber-400 font-bold text-lg tabular-nums">{$filteredDecisions.length}</div>
        <a href="/settings" class="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-md transition-colors" title="Settings">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </a>
      </div>
    </div>
  </div>

  <!-- Two-panel layout -->
  <div class="flex h-[calc(100vh-57px)]">
    <!-- Loading State -->
    {#if $isLoading && $decisions.length === 0}
      <LoadingState count={5} showDetail={true} />

    <!-- Error State -->
    {:else if $storeError}
      <div class="flex-1 flex items-center justify-center">
        <ErrorState error={$storeError} onRetry={() => decisionStore.refresh()} />
      </div>

    <!-- Empty State: All caught up -->
    {:else if $pendingDecisions.length === 0}
      <div class="flex-1 flex items-center justify-center">
        <EmptyState variant="empty" />
      </div>

    <!-- Empty State: No filter matches -->
    {:else if $filteredDecisions.length === 0 && $hasActiveFilters}
      <div class="flex-1 flex items-center justify-center">
        <EmptyState variant="filtered" onClearFilters={clearFilters} />
      </div>

    <!-- Normal State: Show list and detail panel -->
    {:else}
      <!-- Left Panel - Email-style list (40% width) -->
      <div class="w-2/5 border-r border-zinc-800 flex flex-col bg-zinc-900/50" bind:this={queueListEl}>
        <div class="flex-1 overflow-y-auto">
          {#each $filteredDecisions as decision, index (decision.id)}
            {@const config = decisionTypeConfig[decision.decisionType]}
            {@const thingConfig = thingTypeConfig[decision.subject.type]}
            <button
              on:click={() => selectDecision(decision)}
              data-index={index}
              class="w-full text-left p-4 border-b border-zinc-800 cursor-pointer transition-colors border-l-2 relative group
                     {selectedIndex === index ? 'bg-zinc-800 border-l-amber-500' : 'border-l-transparent hover:bg-zinc-800/30'}"
            >
              <div class="flex items-start gap-3">
                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    {#if decision.priority === 'urgent'}
                      <span class="text-[10px] font-bold text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded">URGENT</span>
                    {/if}
                    <span class="font-medium text-zinc-200 truncate">{decision.subject.title}</span>
                    <span class="text-xs text-zinc-500 ml-auto flex-shrink-0">{decision.created}</span>
                  </div>

                  <div class="text-sm text-zinc-400 truncate mb-2">{decision.question}</div>

                  <div class="flex items-center gap-2">
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center gap-1">
                      {config.icon} {config.label}
                    </span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                      {thingConfig.icon} {thingConfig.label}
                    </span>
                    {#if decision.project}
                      <span class="text-[10px] text-blue-400 truncate max-w-[100px]">{decision.project}</span>
                    {/if}
                  </div>
                </div>
              </div>
            </button>
          {/each}

          <!-- Load More Button -->
          {#if $hasMore}
            <div class="p-4 border-b border-zinc-800">
              <button
                on:click={() => decisionStore.loadMore()}
                disabled={$isLoadingMore}
                class="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 text-sm rounded-lg transition-colors"
              >
                {#if $isLoadingMore}
                  Loading...
                {:else}
                  Load More
                {/if}
              </button>
            </div>
          {/if}
        </div>

        <!-- Footer hints -->
        <div class="px-4 py-2 border-t border-zinc-800 bg-zinc-900 text-[10px] text-zinc-500 flex items-center gap-4">
          <span><kbd class="bg-zinc-800 px-1 rounded text-zinc-400">j/k</kbd> navigate</span>
          <span><kbd class="bg-zinc-800 px-1 rounded text-zinc-400">s</kbd> skip</span>
          <span><kbd class="bg-zinc-800 px-1 rounded text-zinc-400">Esc</kbd> back</span>
        </div>
      </div>

      <!-- Right Panel - Expanded detail view -->
      <div class="flex-1 bg-zinc-900 overflow-y-auto" bind:this={detailPanelEl}>
        {#if selectedDecision}
           <DecisionCard
              decision={selectedDecision}
              on:action={handleCardAction}
              on:skip={handleSkip}
           />
        {:else}
          <div class="flex items-center justify-center h-full text-zinc-500">
            <div class="text-center">
               <div class="text-4xl mb-4 opacity-20">⚡</div>
               <p>Select an item to view details</p>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Toast Notifications -->
<div class="fixed bottom-4 right-4 z-50 space-y-2">
  {#each toasts as toast (toast.id)}
    <div
      class="px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-in
             {toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-zinc-700 text-zinc-200'}"
    >
      {toast.message}
    </div>
  {/each}
</div>

<style>
  @keyframes slide-in {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }
  :global(.animate-slide-in) { animation: slide-in 0.2s ease-out; }
</style>
