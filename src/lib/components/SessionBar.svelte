<!--
  SessionBar.svelte - Work session status bar for UNIT-SESSION-MGMT

  Displays current session status with start/end controls and productivity stats.
  Position: Sticky bar below main header.

  Features:
    - Start Session button (when no session active)
    - End Session button (when session active)
    - Live duration display (updated via polling)
    - Decisions resolved count
    - Velocity (decisions per hour)
    - Loading/error states

  Usage:
    <SessionBar />
-->
<script>
  import { onMount, onDestroy } from 'svelte';
  import {
    sessionStore,
    isSessionActive,
    isSessionLoading,
    isStarting,
    isEnding,
    sessionError,
    sessionDuration,
    decisionsResolved,
    sessionVelocity,
  } from '$lib/stores';

  // Fetch current session on mount
  onMount(() => {
    sessionStore.fetchCurrent();
  });

  // Clean up polling on destroy
  onDestroy(() => {
    sessionStore.stopPolling();
  });

  // Start session handler
  async function handleStart() {
    await sessionStore.start({ client: 'dashboard', source: 'manual' });
  }

  // End session handler
  async function handleEnd() {
    await sessionStore.end();
  }

  // Clear error handler
  function handleClearError() {
    sessionStore.clearError();
  }
</script>

<div class="session-bar bg-zinc-900 border-b border-zinc-800 px-4 py-2">
  <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
    <!-- Left: Session Status -->
    <div class="flex items-center gap-3">
      {#if $isSessionActive}
        <!-- Active Session Indicator -->
        <div class="flex items-center gap-2">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span class="text-xs font-medium text-zinc-400">Session Active</span>
        </div>
      {:else}
        <!-- No Session Indicator -->
        <div class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-zinc-600"></span>
          <span class="text-xs font-medium text-zinc-500">No Active Session</span>
        </div>
      {/if}
    </div>

    <!-- Center: Stats (only when session active) -->
    {#if $isSessionActive}
      <div class="flex items-center gap-6">
        <!-- Duration -->
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-medium text-zinc-300">{$sessionDuration}</span>
        </div>

        <!-- Decisions Resolved -->
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-medium text-zinc-300">{$decisionsResolved} resolved</span>
        </div>

        <!-- Velocity -->
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span class="text-sm font-medium text-zinc-300">{$sessionVelocity.toFixed(1)}/hr</span>
        </div>
      </div>
    {/if}

    <!-- Right: Controls -->
    <div class="flex items-center gap-3">
      <!-- Error Display -->
      {#if $sessionError}
        <div class="flex items-center gap-2 text-red-400 text-xs">
          <span>{$sessionError.message}</span>
          <button
            on:click={handleClearError}
            class="hover:text-red-300 transition-colors"
            title="Dismiss error"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/if}

      <!-- Start/End Button -->
      {#if $isSessionActive}
        <button
          on:click={handleEnd}
          disabled={$isEnding}
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                 {$isEnding
                   ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                   : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700'}"
        >
          {#if $isEnding}
            <span class="flex items-center gap-1.5">
              <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Ending...
            </span>
          {:else}
            End Session
          {/if}
        </button>
      {:else}
        <button
          on:click={handleStart}
          disabled={$isStarting || $isSessionLoading}
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                 {$isStarting || $isSessionLoading
                   ? 'bg-amber-700 text-amber-300 cursor-not-allowed'
                   : 'bg-amber-600 hover:bg-amber-500 text-white'}"
        >
          {#if $isStarting}
            <span class="flex items-center gap-1.5">
              <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Starting...
            </span>
          {:else if $isSessionLoading}
            <span class="flex items-center gap-1.5">
              <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </span>
          {:else}
            Start Session
          {/if}
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .session-bar {
    position: sticky;
    top: 0;
    z-index: 40;
  }
</style>
