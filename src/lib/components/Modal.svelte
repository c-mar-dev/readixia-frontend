<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  export let title = '';
  export let closeOnOutsideClick = true;

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      close();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
  role="dialog"
  aria-modal="true"
>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
    on:click={closeOnOutsideClick ? close : null}
    role="button"
    tabindex="-1"
    transition:fade={{ duration: 200 }}
  ></div>

  <!-- Modal Panel -->
  <div
    class="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl transition-all"
    transition:scale={{ duration: 200, start: 0.95 }}
  >
    <!-- Header -->
    {#if title}
      <div class="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-zinc-100">{title}</h3>
        <button
          on:click={close}
          class="text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg p-1 hover:bg-zinc-800"
        >
          <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    {/if}

    <!-- Content -->
    <div class="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
      <slot />
    </div>

    <!-- Footer -->
    {#if $$slots.footer}
      <div class="bg-zinc-800/50 px-6 py-4 flex items-center justify-end gap-3 border-t border-zinc-800">
        <slot name="footer" />
      </div>
    {/if}
  </div>
</div>
