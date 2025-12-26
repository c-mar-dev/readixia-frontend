<!--
  ConnectionIndicator.svelte - Real-time connection status indicator

  Shows the current WebSocket connection state with appropriate styling:
  - Green dot: Connected to both endpoints
  - Yellow dot + animation: Reconnecting
  - Red dot: Disconnected
  - Gray dot: Browser offline (no internet)

  Priority: offline > reconnecting > disconnected > connected

  Part of: Unit 7 - Error States & Loading UX

  Usage:
    <ConnectionIndicator />
    <ConnectionIndicator showLabel={false} />
-->
<script>
  import {
    isConnected,
    isReconnecting,
    decisionsConnectionState,
    agentsConnectionState,
  } from '$lib/stores/realtime';
  import { isOffline } from '$lib/stores';

  /** Whether to show the status text label */
  export let showLabel = true;

  // Compute display state with offline priority
  $: displayState = $isOffline
    ? 'offline'
    : $isConnected
      ? 'connected'
      : $isReconnecting
        ? 'reconnecting'
        : 'disconnected';

  $: statusText = {
    connected: 'Connected',
    reconnecting: 'Reconnecting...',
    disconnected: 'Disconnected',
    offline: 'Offline',
  }[displayState] ?? 'Unknown';

  $: statusColor = {
    connected: 'bg-green-500',
    reconnecting: 'bg-amber-500',
    disconnected: 'bg-red-500',
    offline: 'bg-zinc-500',
  }[displayState] ?? 'bg-zinc-500';

  $: tooltipText = $isOffline
    ? 'No internet connection'
    : `${statusText}\nDecisions: ${$decisionsConnectionState}\nAgents: ${$agentsConnectionState}`;
</script>

<div
  class="flex items-center gap-2 text-xs text-zinc-400"
  title={tooltipText}
  role="status"
  aria-label={statusText}
>
  <span class="relative flex h-2 w-2">
    {#if displayState === 'reconnecting'}
      <span
        class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 {statusColor}"
      ></span>
    {/if}
    <span class="relative inline-flex h-2 w-2 rounded-full {statusColor}"></span>
  </span>
  {#if showLabel}
    <span class="hidden sm:inline">{statusText}</span>
  {/if}
</div>
