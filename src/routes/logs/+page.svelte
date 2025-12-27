<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import {
    logsStore,
    logs,
    logsStats,
    isLogsLoading,
    hasMoreLogs,
    logsError,
    logsTotalCount,
  } from '$lib/stores/logs';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

  // Agent filter options
  const AGENTS = [
    'filing_clerk',
    'inquisitor',
    'specifier',
    'executor',
    'qa_clerk',
    'verifier',
    'researcher',
    'summarizer',
    'archivist',
  ];

  const STATUS_OPTIONS = ['SUCCESS', 'FAILED', 'TIMEOUT', 'RUNNING', 'CHECKPOINTED'];

  // Filter state
  let agentFilter = '';
  let statusFilter = '';
  let searchQuery = '';

  // Load logs on mount
  onMount(() => {
    logsStore.load();
    logsStore.loadStats();
  });

  // Apply filters
  async function applyFilters() {
    const filters = {
      agent: agentFilter || undefined,
      status: statusFilter || undefined,
      task: searchQuery || undefined,
    };
    await logsStore.load(filters);
  }

  function clearFilters() {
    agentFilter = '';
    statusFilter = '';
    searchQuery = '';
    logsStore.clearFilters();
  }

  function viewLog(id) {
    goto(`/logs/${encodeURIComponent(id)}`);
  }

  function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  }

  function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString();
  }

  function getStatusColor(status) {
    switch (status) {
      case 'SUCCESS': return 'text-emerald-400';
      case 'FAILED': return 'text-red-400';
      case 'TIMEOUT': return 'text-amber-400';
      case 'RUNNING': return 'text-blue-400';
      case 'CHECKPOINTED': return 'text-purple-400';
      default: return 'text-zinc-400';
    }
  }
</script>

<div class="h-full overflow-auto bg-zinc-900 text-zinc-100 p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">Execution Logs</h1>
        <p class="text-zinc-400 mt-1">
          {#if $logsStats}
            {$logsTotalCount.toLocaleString()} logs · {($logsStats.total_prompt_bytes / 1024 / 1024).toFixed(1)}MB prompts
          {:else}
            Agent execution history
          {/if}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <a href="/" class="text-zinc-400 hover:text-zinc-200">
          ← Back to Queue
        </a>
        <a href="/settings" class="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors" title="Settings">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </a>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-zinc-800 rounded-lg p-4 mb-6">
      <div class="flex flex-wrap gap-4 items-end">
        <!-- Agent filter -->
        <div class="flex-1 min-w-[150px]">
          <label class="block text-sm text-zinc-400 mb-1">Agent</label>
          <select
            bind:value={agentFilter}
            on:change={applyFilters}
            class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm"
          >
            <option value="">All agents</option>
            {#each AGENTS as agent}
              <option value={agent}>{agent.replace('_', ' ')}</option>
            {/each}
          </select>
        </div>

        <!-- Status filter -->
        <div class="flex-1 min-w-[150px]">
          <label class="block text-sm text-zinc-400 mb-1">Status</label>
          <select
            bind:value={statusFilter}
            on:change={applyFilters}
            class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {#each STATUS_OPTIONS as status}
              <option value={status}>{status}</option>
            {/each}
          </select>
        </div>

        <!-- Search -->
        <div class="flex-[2] min-w-[200px]">
          <label class="block text-sm text-zinc-400 mb-1">Search task</label>
          <input
            type="text"
            bind:value={searchQuery}
            on:keydown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="Task path..."
            class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm"
          />
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            on:click={applyFilters}
            class="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm font-medium"
          >
            Search
          </button>
          {#if agentFilter || statusFilter || searchQuery}
            <button
              on:click={clearFilters}
              class="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm"
            >
              Clear
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Content -->
    {#if $isLogsLoading}
      <div class="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    {:else if $logsError}
      <ErrorState
        message={$logsError}
        on:retry={() => logsStore.load()}
      />
    {:else if $logs.length === 0}
      <EmptyState
        variant={agentFilter || statusFilter || searchQuery ? 'filtered' : 'empty'}
        on:clear={clearFilters}
      />
    {:else}
      <!-- Logs table -->
      <div class="bg-zinc-800 rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-zinc-700/50">
            <tr class="text-left text-sm text-zinc-400">
              <th class="px-4 py-3">Agent</th>
              <th class="px-4 py-3">Task</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Duration</th>
              <th class="px-4 py-3">Cost</th>
              <th class="px-4 py-3">Started</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-700">
            {#each $logs as log}
              <tr
                class="hover:bg-zinc-700/50 cursor-pointer"
                on:click={() => viewLog(log.id)}
              >
                <td class="px-4 py-3 text-sm">
                  <span class="font-medium">{log.agent_name.replace('_', ' ')}</span>
                </td>
                <td class="px-4 py-3 text-sm text-zinc-300 max-w-xs truncate">
                  {log.task_path}
                </td>
                <td class="px-4 py-3">
                  <span class="text-sm font-medium {getStatusColor(log.status)}">
                    {log.status}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-zinc-400">
                  {formatDuration(log.execution_time_ms)}
                </td>
                <td class="px-4 py-3 text-sm text-zinc-400">
                  {log.estimated_cost_usd ? `$${log.estimated_cost_usd.toFixed(4)}` : '-'}
                </td>
                <td class="px-4 py-3 text-sm text-zinc-400">
                  {formatTime(log.started_at)}
                </td>
                <td class="px-4 py-3">
                  {#if log.has_detail}
                    <span class="text-xs bg-zinc-600 px-2 py-0.5 rounded">Detail</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Load more -->
      {#if $hasMoreLogs}
        <div class="mt-4 text-center">
          <button
            on:click={() => logsStore.loadMore()}
            class="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm"
          >
            Load more
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>
