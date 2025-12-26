<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { logsStore, selectedLog, isLogDetailLoading, logsError } from '$lib/stores/logs';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';

  $: logId = $page.params.id;

  onMount(() => {
    if (logId) {
      logsStore.loadDetail(logId);
    }
  });

  // Reload when ID changes
  $: if (logId) {
    logsStore.loadDetail(logId);
  }

  function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  }

  function formatTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString();
  }

  function getStatusColor(status) {
    switch (status) {
      case 'SUCCESS': return 'bg-emerald-500/20 text-emerald-400';
      case 'FAILED': return 'bg-red-500/20 text-red-400';
      case 'TIMEOUT': return 'bg-amber-500/20 text-amber-400';
      case 'RUNNING': return 'bg-blue-500/20 text-blue-400';
      case 'CHECKPOINTED': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  }

  function getEventIcon(eventType) {
    switch (eventType) {
      case 'PROMPT_SENT': return '📤';
      case 'TOOL_INVOCATION': return '🔧';
      case 'TOOL_RESULT': return '📥';
      case 'RESPONSE_COMPLETE': return '✅';
      case 'CHECKPOINT_CREATED': return '⏸️';
      case 'STATUS_UPDATE': return '📊';
      case 'ERROR': return '❌';
      case 'COMPLETED': return '🏁';
      default: return '•';
    }
  }

  let showPrompt = false;
  let showResponse = false;
</script>

<div class="min-h-screen bg-zinc-900 text-zinc-100 p-6">
  <div class="max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button
        on:click={() => goto('/logs')}
        class="text-zinc-400 hover:text-zinc-200"
      >
        ← Back to Logs
      </button>
    </div>

    {#if $isLogDetailLoading}
      <div class="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    {:else if $logsError}
      <ErrorState
        message={$logsError}
        on:retry={() => logsStore.loadDetail(logId)}
      />
    {:else if $selectedLog}
      {@const log = $selectedLog}

      <!-- Summary -->
      <div class="bg-zinc-800 rounded-lg p-6 mb-6">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-xl font-bold mb-2">{log.agent_name.replace('_', ' ')}</h1>
            <p class="text-zinc-400 text-sm">{log.task_path}</p>
          </div>
          <span class="px-3 py-1 rounded-full text-sm font-medium {getStatusColor(log.status)}">
            {log.status}
          </span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
          <div>
            <span class="text-zinc-500 block">Duration</span>
            <span class="font-medium">{formatDuration(log.execution_time_ms)}</span>
          </div>
          <div>
            <span class="text-zinc-500 block">Cost</span>
            <span class="font-medium">
              {log.estimated_cost_usd ? `$${log.estimated_cost_usd.toFixed(4)}` : '-'}
            </span>
          </div>
          <div>
            <span class="text-zinc-500 block">Started</span>
            <span class="font-medium">{formatTime(log.started_at)}</span>
          </div>
          <div>
            <span class="text-zinc-500 block">Completed</span>
            <span class="font-medium">{formatTime(log.completed_at)}</span>
          </div>
        </div>

        {#if log.session_id || log.decision_id}
          <div class="mt-4 pt-4 border-t border-zinc-700 text-sm text-zinc-400">
            {#if log.session_id}
              <span>Session: {log.session_id}</span>
            {/if}
            {#if log.decision_id}
              <span class="ml-4">Decision: {log.decision_id}</span>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Prompt -->
      {#if log.prompt_full}
        <div class="bg-zinc-800 rounded-lg mb-6">
          <button
            on:click={() => showPrompt = !showPrompt}
            class="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-700/50 rounded-t-lg"
          >
            <span class="font-medium">Prompt</span>
            <span class="text-zinc-400">{showPrompt ? '▲' : '▼'}</span>
          </button>
          {#if showPrompt}
            <div class="px-6 pb-6">
              <pre class="bg-zinc-900 rounded p-4 text-sm text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">{log.prompt_full}</pre>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Response -->
      {#if log.response_full}
        <div class="bg-zinc-800 rounded-lg mb-6">
          <button
            on:click={() => showResponse = !showResponse}
            class="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-700/50 rounded-t-lg"
          >
            <span class="font-medium">Response</span>
            <span class="text-zinc-400">{showResponse ? '▲' : '▼'}</span>
          </button>
          {#if showResponse}
            <div class="px-6 pb-6">
              <pre class="bg-zinc-900 rounded p-4 text-sm text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">{log.response_full}</pre>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Events Timeline -->
      {#if log.events && log.events.length > 0}
        <div class="bg-zinc-800 rounded-lg p-6">
          <h2 class="font-medium mb-4">Event Timeline</h2>
          <div class="space-y-3">
            {#each log.events as event}
              <div class="flex gap-3 text-sm">
                <span class="text-lg">{getEventIcon(event.event_type)}</span>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <span class="font-medium">{event.event_type}</span>
                    <span class="text-zinc-500 text-xs">
                      {formatTime(event.timestamp)}
                      {#if event.duration_ms}
                        · {formatDuration(event.duration_ms)}
                      {/if}
                    </span>
                  </div>
                  {#if event.tool_name}
                    <span class="text-zinc-400">Tool: {event.tool_name}</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Tool Calls -->
      {#if log.tool_calls_detailed && log.tool_calls_detailed.length > 0}
        <div class="bg-zinc-800 rounded-lg p-6 mt-6">
          <h2 class="font-medium mb-4">Tool Calls ({log.tool_calls_detailed.length})</h2>
          <div class="space-y-4">
            {#each log.tool_calls_detailed as call, i}
              <div class="bg-zinc-900 rounded p-4">
                <pre class="text-xs text-zinc-400 overflow-x-auto">{JSON.stringify(call, null, 2)}</pre>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {:else}
      <div class="text-center text-zinc-500 py-12">
        Log not found
      </div>
    {/if}
  </div>
</div>
