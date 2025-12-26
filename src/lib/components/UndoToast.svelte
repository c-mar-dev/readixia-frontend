<!--
  UndoToast.svelte - Floating undo toast for UNIT-ACTIONS-INTEGRATION

  Displays a toast notification after resolving a decision, allowing undo
  within the 5-minute window. Shows countdown timer and stacks multiple toasts.

  Usage:
    <UndoToast />

  The component automatically subscribes to the action store and displays
  toasts for all undoable actions.
-->
<script>
  import { onDestroy } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import {
    undoableActions,
    actionStore,
    isUndoing
  } from '$lib/stores';

  // Track time remaining for each action
  let timeRemaining = {};
  let updateInterval;

  // Update countdown every second
  function startCountdown() {
    updateInterval = setInterval(() => {
      const now = Date.now();
      $undoableActions.forEach((action) => {
        const remaining = Math.max(0, action.expiresAt.getTime() - now);
        timeRemaining[action.id] = Math.ceil(remaining / 1000);
      });
      // Trigger reactivity
      timeRemaining = { ...timeRemaining };
    }, 1000);
  }

  // Initialize countdown on mount
  startCountdown();

  onDestroy(() => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });

  /**
   * Format seconds into MM:SS display.
   */
  function formatTime(seconds) {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Handle undo button click.
   */
  async function handleUndo(actionId) {
    const success = await actionStore.undo(actionId);
    if (!success) {
      // Error is stored in actionStore, could show additional feedback here
    }
  }

  /**
   * Dismiss a toast without undoing.
   */
  function dismiss(actionId) {
    actionStore.remove(actionId);
  }

  // Calculate progress percentage for countdown ring
  function getProgress(action) {
    const totalWindow = 5 * 60; // 5 minutes in seconds
    const remaining = timeRemaining[action.id] || 0;
    return (remaining / totalWindow) * 100;
  }
</script>

{#if $undoableActions.length > 0}
  <div
    class="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-3 pointer-events-none"
    role="region"
    aria-label="Undo notifications"
  >
    {#each $undoableActions as action (action.id)}
      <div
        animate:flip={{ duration: 200 }}
        in:fly={{ y: 50, duration: 300 }}
        out:fade={{ duration: 200 }}
        class="pointer-events-auto bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl p-4 max-w-sm flex items-start gap-4"
        role="alert"
        aria-live="polite"
      >
        <!-- Countdown Ring -->
        <div class="relative flex-shrink-0 w-12 h-12">
          <svg class="w-12 h-12 -rotate-90 transform" viewBox="0 0 36 36">
            <!-- Background circle -->
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="#3f3f46"
              stroke-width="3"
            />
            <!-- Progress circle -->
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="#f59e0b"
              stroke-width="3"
              stroke-linecap="round"
              stroke-dasharray="97.5"
              stroke-dashoffset={97.5 - (getProgress(action) / 100) * 97.5}
              class="transition-all duration-1000 ease-linear"
            />
          </svg>
          <!-- Time in center -->
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-xs font-mono text-zinc-300">
              {formatTime(timeRemaining[action.id])}
            </span>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-zinc-100 truncate">
            {action.actionName || 'Completed'}
          </p>
          <p class="text-xs text-zinc-400 truncate mt-0.5">
            {action.decisionTitle}
          </p>

          <!-- Actions -->
          <div class="flex items-center gap-3 mt-3">
            <button
              on:click={() => handleUndo(action.id)}
              disabled={$isUndoing}
              class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {#if $isUndoing}
                Undoing...
              {:else}
                Undo
              {/if}
            </button>
            <button
              on:click={() => dismiss(action.id)}
              class="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        <!-- Close button -->
        <button
          on:click={() => dismiss(action.id)}
          class="flex-shrink-0 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Dismiss"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  /* Ensure toasts don't overlap with other fixed elements */
  @media (max-width: 640px) {
    .fixed {
      left: 1rem;
      right: 1rem;
      bottom: 1rem;
    }
  }
</style>
