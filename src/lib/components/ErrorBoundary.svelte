<!--
  ErrorBoundary.svelte - Error boundary wrapper component

  Catches JavaScript errors in child components and displays
  a fallback UI. Provides recovery via retry callback.

  Note: Svelte doesn't have React-style error boundaries, so this
  uses window error event listeners. It won't catch all errors
  (especially async errors), but handles synchronous render crashes.

  Part of: Unit 7 - Error States & Loading UX

  Props:
    - onError: Optional callback when error is caught
    - onRetry: Optional callback for retry action (default: page reload)

  Usage:
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>

    <!-- With custom error handler -->
    <ErrorBoundary onError={(e) => logError(e)} onRetry={() => reset()}>
      <MyComponent />
    </ErrorBoundary>

    <!-- With custom fallback -->
    <ErrorBoundary let:error let:retry>
      <MyComponent />
      <svelte:fragment slot="fallback">
        <div>Custom error: {error?.message}</div>
        <button on:click={retry}>Retry</button>
      </svelte:fragment>
    </ErrorBoundary>
-->
<script>
  import { onMount, onDestroy } from 'svelte';
  import ErrorState from './ErrorState.svelte';

  /** @type {((error: Error) => void) | undefined} Callback when an error is caught */
  export let onError = undefined;

  /** @type {(() => void) | undefined} Callback for retry action. Defaults to page reload. */
  export let onRetry = undefined;

  /** @type {boolean} Whether an error has been caught */
  let hasError = false;

  /** @type {Error | null} The caught error */
  let caughtError = null;

  /**
   * Convert JavaScript error to ApiError format for ErrorState.
   * @param {Error | null} error
   * @returns {{ code: string, message: string }}
   */
  function toApiError(error) {
    return {
      code: 'RUNTIME_ERROR',
      message: error?.message || 'An unexpected error occurred',
    };
  }

  /**
   * Handle window error events.
   * @param {ErrorEvent} event
   */
  function handleError(event) {
    hasError = true;
    caughtError = event.error || new Error(event.message);
    onError?.(caughtError);
    event.preventDefault();
  }

  /**
   * Handle unhandled promise rejections.
   * @param {PromiseRejectionEvent} event
   */
  function handleUnhandledRejection(event) {
    hasError = true;
    caughtError =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
    onError?.(caughtError);
    event.preventDefault();
  }

  /**
   * Reset error state and retry.
   */
  function retry() {
    hasError = false;
    caughtError = null;

    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  }

  onMount(() => {
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
  });

  onDestroy(() => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  });
</script>

{#if hasError}
  <slot name="fallback" error={caughtError} {retry}>
    <ErrorState error={toApiError(caughtError)} onRetry={retry} />
  </slot>
{:else}
  <slot />
{/if}
