<!--
  LoadingSpinner.svelte - Reusable button loading indicator

  A small animated spinner that replaces button content during loading.
  Designed to fit inline within button text.

  Part of: Unit 7 - Error States & Loading UX

  Props:
    - size: 'sm' | 'md' | 'lg' (default: 'sm')
    - color: string (default: 'currentColor')

  Usage:
    <button disabled={isLoading}>
      {#if isLoading}
        <LoadingSpinner size="sm" />
        Processing...
      {:else}
        Submit
      {/if}
    </button>

    Or standalone:
    <LoadingSpinner size="lg" color="#f59e0b" />
-->
<script>
  /** @type {'sm' | 'md' | 'lg'} */
  export let size = 'sm';

  /** @type {string} */
  export let color = 'currentColor';

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
</script>

<svg
  class="animate-spin {sizes[size]} inline-block"
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  viewBox="0 0 24 24"
  aria-hidden="true"
>
  <circle
    class="opacity-25"
    cx="12"
    cy="12"
    r="10"
    stroke={color}
    stroke-width="4"
  />
  <path
    class="opacity-75"
    fill={color}
    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
  />
</svg>
