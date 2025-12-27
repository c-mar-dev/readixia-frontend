<script>
  import { onMount, onDestroy } from 'svelte';
  import '../app.css';
  import UndoToast from '$lib/components/UndoToast.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import ConnectionIndicator from '$lib/components/ConnectionIndicator.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import { realtimeService } from '$lib/services/realtime';
  import {
    handleDecisionWebSocketEvent,
    handleAgentWebSocketEvent,
  } from '$lib/services/eventHandlers';
  import { decisionStore, uiStore, wasOffline } from '$lib/stores';

  // Track wasOffline for "back online" toast
  let previousWasOffline = false;

  onMount(() => {
    console.log('[Layout] onMount starting');

    try {
      // Initialize offline detection
      uiStore.setOffline(!navigator.onLine);
      console.log('[Layout] Offline detection initialized');

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
      console.log('[Layout] Event listeners added');

      // Wire up event handlers
      realtimeService.onDecisionEvent = handleDecisionWebSocketEvent;
      realtimeService.onAgentEvent = handleAgentWebSocketEvent;
      realtimeService.onPollNeeded = () => decisionStore.refresh();
      realtimeService.onResyncNeeded = () => decisionStore.refresh();
      console.log('[Layout] Realtime handlers wired');

      // Initialize WebSocket connections
      realtimeService.initialize();
      console.log('[Layout] Realtime initialized');

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } catch (error) {
      console.error('[Layout] Error in onMount:', error);
    }
  });

  onDestroy(() => {
    realtimeService.destroy();
    uiStore.destroy();
  });
</script>

<!-- Main layout with sidebar -->
<div class="flex h-screen overflow-hidden">
  <!-- Sidebar navigation -->
  <Sidebar />

  <!-- Main content area -->
  <div class="flex-1 overflow-hidden">
    <!-- Connection status indicator in top-right corner -->
    <div class="fixed right-4 top-4 z-40">
      <ConnectionIndicator />
    </div>

    <slot />
  </div>
</div>

<!-- Global toast notifications (bottom-left) -->
<Toast />

<!-- Global UndoToast component for undo notifications (bottom-right) -->
<UndoToast />
