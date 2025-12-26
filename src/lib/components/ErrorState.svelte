<!--
  ErrorState.svelte - Error display for UNIT-3-DECISION-LIST

  Displays user-friendly error messages with a retry button for recovery.
  Maps technical error codes to helpful messages and provides debugging info.

  Part of: UNIT-3-DECISION-LIST (Decision List Integration)
  Used by: +page.svelte, inbox/+page.svelte

  Props:
    - error: ApiError object with code and message (required)
    - onRetry: Callback function for retry button (default: no-op)

  Error Code Mapping:
    - NETWORK_ERROR → "Unable to connect. Check your connection."
    - TIMEOUT       → "Request timed out. Try again?"
    - HTTP_5xx      → "Server error. Please try again."
    - Other         → Uses error.message directly

  Usage:
    import ErrorState from '$lib/components/ErrorState.svelte';
    import { storeError, decisionStore } from '$lib/stores';

    {#if $storeError}
      <ErrorState
        error={$storeError}
        onRetry={() => decisionStore.refresh()}
      />
    {/if}
-->
<script>
  export let error;
  export let onRetry = () => {};

  // Map error codes to user-friendly messages
  function getErrorMessage(err) {
    if (!err) return 'An unexpected error occurred.';

    // Network-level errors
    if (err.code === 'NETWORK_ERROR' || err.message?.includes('fetch')) {
      return 'Unable to connect. Check your connection.';
    }

    // Timeout errors
    if (err.code === 'TIMEOUT' || err.message?.includes('timeout')) {
      return 'Request timed out. Try again?';
    }

    // Server errors (5xx)
    if (err.code?.startsWith('5') || err.message?.includes('Server')) {
      return 'Server error. Please try again.';
    }

    // Default to the error message if available
    return err.message || 'An unexpected error occurred.';
  }

  $: message = getErrorMessage(error);
</script>

<div class="flex items-center justify-center h-full bg-zinc-900/30">
  <div class="text-center p-8 max-w-md">
    <!-- Error Icon -->
    <div class="text-5xl mb-4 opacity-60">
      <span role="img" aria-label="Error">⚠️</span>
    </div>

    <!-- Error Message -->
    <h3 class="text-lg font-medium text-zinc-200 mb-2">
      Something went wrong
    </h3>
    <p class="text-sm text-zinc-400 mb-6">
      {message}
    </p>

    <!-- Error Details (collapsible for debugging) -->
    {#if error?.code}
      <p class="text-xs text-zinc-600 mb-4 font-mono">
        Error code: {error.code}
      </p>
    {/if}

    <!-- Retry Button -->
    <button
      on:click={onRetry}
      class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Try Again
    </button>

    <!-- Help text -->
    <p class="text-xs text-zinc-500 mt-4">
      If the problem persists, check that the backend is running.
    </p>
  </div>
</div>
