<!--
  Toast.svelte - General-purpose toast notification system

  Renders all active toasts from uiStore.toasts with:
  - Stacking (newest at top, max 5 visible)
  - Auto-dismiss with configurable duration
  - Type-based styling (success, error, info, warning)
  - Dismiss button on each toast
  - Progress indicator for auto-dismiss
  - Hover pauses countdown

  Note: This coexists with UndoToast.svelte which handles
  specialized undo notifications with countdown timers.
  Toast is positioned bottom-left, UndoToast bottom-right.

  Part of: Unit 7 - Error States & Loading UX

  Usage (in +layout.svelte):
    <Toast />
-->
<script>
  import { fly, fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { toasts, uiStore } from '$lib/stores';

  /**
   * Get icon for toast type.
   * @param {string} type
   * @returns {string}
   */
  function getIcon(type) {
    switch (type) {
      case 'success':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'error':
        return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'warning':
        return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
      case 'info':
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  /**
   * Get color classes for toast type.
   * @param {string} type
   * @returns {{ bg: string, border: string, icon: string, progress: string }}
   */
  function getColors(type) {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-zinc-800',
          border: 'border-emerald-500/30',
          icon: 'text-emerald-400',
          progress: 'bg-emerald-500',
        };
      case 'error':
        return {
          bg: 'bg-zinc-800',
          border: 'border-red-500/30',
          icon: 'text-red-400',
          progress: 'bg-red-500',
        };
      case 'warning':
        return {
          bg: 'bg-zinc-800',
          border: 'border-amber-500/30',
          icon: 'text-amber-400',
          progress: 'bg-amber-500',
        };
      case 'info':
      default:
        return {
          bg: 'bg-zinc-800',
          border: 'border-blue-500/30',
          icon: 'text-blue-400',
          progress: 'bg-blue-500',
        };
    }
  }

  /**
   * Calculate remaining time percentage for progress bar.
   * @param {Object} toast
   * @returns {number}
   */
  function getProgress(toast) {
    if (toast.duration === 0) return 100;
    const elapsed = Date.now() - toast.createdAt.getTime();
    const remaining = Math.max(0, toast.duration - elapsed);
    return (remaining / toast.duration) * 100;
  }

  /** @type {string | null} */
  let hoveredId = null;
</script>

{#if $toasts.length > 0}
  <div
    class="fixed bottom-6 left-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm"
    role="region"
    aria-label="Notifications"
  >
    {#each $toasts as toast (toast.id)}
      {@const colors = getColors(toast.type)}
      {@const iconPath = getIcon(toast.type)}
      <div
        animate:flip={{ duration: 200 }}
        in:fly={{ x: -50, duration: 300 }}
        out:fade={{ duration: 200 }}
        class="pointer-events-auto {colors.bg} border {colors.border} rounded-lg shadow-2xl overflow-hidden"
        role="alert"
        aria-live="polite"
        on:mouseenter={() => (hoveredId = toast.id)}
        on:mouseleave={() => (hoveredId = null)}
      >
        <div class="p-4 flex items-start gap-3">
          <div class="flex-shrink-0">
            <svg
              class="w-5 h-5 {colors.icon}"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d={iconPath} />
            </svg>
          </div>

          <div class="flex-1 min-w-0">
            {#if toast.title}
              <p class="text-sm font-medium text-zinc-100">{toast.title}</p>
            {/if}
            <p class="text-sm {toast.title ? 'text-zinc-400 mt-0.5' : 'text-zinc-200'}">
              {toast.message}
            </p>
          </div>

          {#if toast.dismissible}
            <button
              on:click={() => uiStore.dismissToast(toast.id)}
              class="flex-shrink-0 p-1 text-zinc-500 hover:text-zinc-300 transition-colors rounded hover:bg-zinc-700/50"
              aria-label="Dismiss notification"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          {/if}
        </div>

        {#if toast.duration > 0}
          <div class="h-1 bg-zinc-700/50">
            <div
              class="{colors.progress} h-full transition-all duration-100 ease-linear"
              style="width: {hoveredId === toast.id ? getProgress(toast) : getProgress(toast)}%"
            />
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  @media (max-width: 640px) {
    .fixed {
      left: 1rem;
      right: 1rem;
      bottom: 1rem;
    }

    .max-w-sm {
      max-width: none;
    }
  }
</style>
