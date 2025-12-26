<script>
  import { onMount, onDestroy } from 'svelte';
  import '../app.css';
  import UndoToast from '$lib/components/UndoToast.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import ConnectionIndicator from '$lib/components/ConnectionIndicator.svelte';
  import { realtimeService } from '$lib/services/realtime';
  import {
    handleDecisionWebSocketEvent,
    handleAgentWebSocketEvent,
  } from '$lib/services/eventHandlers';
  import { decisionStore, uiStore, wasOffline } from '$lib/stores';

  // Track wasOffline for "back online" toast
  let previousWasOffline = false;

  onMount(() => {
    // Initialize offline detection
    uiStore.setOffline(!navigator.onLine);

    const handleOnline = () => {
      uiStore.setOffline(false);
      // Show "back online" toast if we were offline
      if (previousWasOffline) {
        uiStore.success('Connection restored', 'Back Online');
        uiStore.clearWasOffline();
      }
    };

    const handleOffline = () => {
      uiStore.setOffline(true);
      previousWasOffline = true;
      uiStore.warning('No internet connection', 'Offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Wire up event handlers
    realtimeService.onDecisionEvent = handleDecisionWebSocketEvent;
    realtimeService.onAgentEvent = handleAgentWebSocketEvent;
    realtimeService.onPollNeeded = () => decisionStore.refresh();
    realtimeService.onResyncNeeded = () => decisionStore.refresh();

    // Initialize WebSocket connections
    realtimeService.initialize();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  onDestroy(() => {
    realtimeService.destroy();
    uiStore.destroy();
  });
</script>

<!-- Connection status indicator in top-right corner -->
<div class="fixed right-4 top-4 z-40">
  <ConnectionIndicator />
</div>

<slot />

<!-- Global toast notifications (bottom-left) -->
<Toast />

<!-- Global UndoToast component for undo notifications (bottom-right) -->
<UndoToast />
