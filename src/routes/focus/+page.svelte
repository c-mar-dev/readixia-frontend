<!-- Focus Mode - Full-screen single decision interface with auto-advance -->
<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import DecisionCard from '$lib/components/DecisionCard.svelte';

  // Import stores
  import {
    decisionStore,
    decisions,
    pendingDecisions,
    queueStats,
    actionStore,
  } from '$lib/stores';

  // State
  let currentIndex = 0;
  let initialTotal = 0;

  // Toast notifications
  let toastId = 0;
  let toasts = [];

  // Initialize stores on mount
  onMount(() => {
    if (!decisionStore.initialized) {
      decisionStore.load();
    }
    decisionStore.startPolling();
    // Capture initial total for progress calculation
    initialTotal = $queueStats.total;
  });

  onDestroy(() => {
    decisionStore.stopPolling();
  });

  // Reactive derived state (from store)
  $: totalCount = $pendingDecisions.length;
  $: currentDecision = $pendingDecisions[currentIndex] || null;

  // Auto-fix index if out of bounds (e.g. after completion)
  $: if (currentIndex >= $pendingDecisions.length && $pendingDecisions.length > 0) {
     currentIndex = Math.max(0, $pendingDecisions.length - 1);
  }

  // Track initial total for progress bar
  $: if (initialTotal === 0 && $queueStats.total > 0) {
     initialTotal = $queueStats.total;
  }

  function showToast(message, type = 'success') {
    const id = toastId++;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 2000);
  }

  async function handleCardAction(event) {
    const { name, decision, payload } = event.detail;
    showToast(`${name}`, 'success');

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

      // Note: We do NOT increment currentIndex here.
      // Since the current item is removed from 'pendingDecisions',
      // the item that was at currentIndex+1 shifts down to currentIndex.
      // Chained decisions from the API are automatically inserted by the store
      // after the resolved decision, so they naturally appear next.
      await tick(); // Wait for store to update

      if ($pendingDecisions.length === 0) {
        showToast('All decisions completed!', 'success');
        setTimeout(() => goto('/'), 1500);
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
      console.error('Failed to resolve decision:', error);
    }
  }

  function handleSkip() {
    showToast('Skipped', 'info');
    if (currentIndex < $pendingDecisions.length - 1) {
       currentIndex++;
    } else {
       // Loop back to start if at end
       currentIndex = 0;
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') { goto('/'); return; }

    if (event.target.tagName === 'BODY') {
       if (event.key === 'ArrowRight') handleSkip();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="min-h-screen bg-zinc-900 text-zinc-100 flex flex-col">
  <!-- Minimal header -->
  <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900 z-10">
    <button
      on:click={() => goto('/')}
      class="text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-2"
    >
      <span>← Exit Focus Mode</span>
    </button>

    <div class="flex items-center gap-4">
      <!-- Progress bar -->
      <div class="flex items-center gap-3">
        <div class="w-48 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            class="h-full bg-amber-500 transition-all duration-300"
            style="width: {initialTotal > 0 ? ((1 - ($pendingDecisions.length / initialTotal)) * 100) : 100}%"
          ></div>
        </div>
        <span class="text-zinc-400 text-sm font-medium">
          {$pendingDecisions.length} remaining
        </span>
      </div>
    </div>

    <div class="text-zinc-500 text-sm">
      <kbd class="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">Esc</kbd> to exit
    </div>
  </div>

  <!-- Main content area -->
  <div class="flex-1 overflow-y-auto flex items-center justify-center p-4">
    {#if currentDecision}
      <div class="w-full max-w-4xl animate-fade-in">
         <DecisionCard 
            decision={currentDecision} 
            on:action={handleCardAction} 
            on:skip={handleSkip} 
         />
      </div>
    {:else}
      <div class="text-center animate-fade-in">
        <div class="text-6xl mb-4">🎉</div>
        <div class="text-2xl font-bold text-white mb-2">All Clear!</div>
        <p class="text-zinc-400 text-lg mb-8">You've processed all pending decisions.</p>
        <a
          href="/"
          class="inline-block px-8 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-medium transition-colors"
        >
          Back to Dashboard
        </a>
      </div>
    {/if}
  </div>
</div>

<!-- Toast Notifications -->
<div class="fixed top-20 left-1/2 -translate-x-1/2 z-50 space-y-2">
  {#each toasts as toast (toast.id)}
    <div
      class="px-6 py-3 rounded-xl shadow-lg text-base font-medium animate-slide-down
             {toast.type === 'success' ? 'bg-green-600 text-white' : 
              toast.type === 'info' ? 'bg-zinc-700 text-white' : 'bg-red-600 text-white'}"
    >
      {toast.message}
    </div>
  {/each}
</div>

<style>
  @keyframes slide-down {
    from { opacity: 0; transform: translate(-50%, -20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
  
  @keyframes fade-in {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }

  :global(.animate-slide-down) {
    animation: slide-down 0.2s ease-out forwards;
  }
  
  :global(.animate-fade-in) {
    animation: fade-in 0.3s ease-out forwards;
  }
</style>
