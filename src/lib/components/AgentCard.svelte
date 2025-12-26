<!--
  AgentCard.svelte - Agent status card for UNIT-10-AGENT-STATUS

  Displays real-time agent execution status with progress, logs, and results.
  Extracted from src/routes/agents/+page.svelte for reusability.

  Props:
    - agent: AgentState object with status, progress, logs, etc.

  Features:
    - Status-based color coding (running, idle, error, completed, failed, timeout)
    - Animated ping indicator for running agents
    - Progress bar with smooth transitions
    - Last 2 log entries in monospace
    - Relative time formatting for lastActive
    - Result display (duration, errors, retry count)

  Usage:
    import AgentCard from '$lib/components/AgentCard.svelte';
    import type { AgentState } from '$lib/stores';

    <AgentCard {agent} />
-->
<script>
  export let agent;

  /**
   * Get status color classes based on agent status.
   */
  function getStatusColor(status) {
    switch (status) {
      case 'running':
        return 'text-green-400 border-green-500/50 bg-green-900/20';
      case 'idle':
        return 'text-zinc-400 border-zinc-700 bg-zinc-800/50';
      case 'error':
        return 'text-red-400 border-red-500/50 bg-red-900/20';
      case 'completed':
        return 'text-blue-400 border-blue-500/50 bg-blue-900/20';
      case 'failed':
        return 'text-red-400 border-red-500/50 bg-red-900/20';
      case 'timeout':
        return 'text-amber-400 border-amber-500/50 bg-amber-900/20';
      default:
        return 'text-zinc-400 border-zinc-700 bg-zinc-800/50';
    }
  }

  /**
   * Format lastActive timestamp as relative time.
   */
  function formatLastActive(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 10) {
      return 'Now';
    } else if (diffSec < 60) {
      return `${diffSec}s ago`;
    } else if (diffMin < 60) {
      return `${diffMin}m ago`;
    } else if (diffHour < 24) {
      return `${diffHour}h ago`;
    } else {
      const days = Math.floor(diffHour / 24);
      return `${days}d ago`;
    }
  }

  /**
   * Get task display text based on status.
   */
  function getTaskDisplay() {
    if (agent.currentTask) {
      return agent.currentTask;
    }

    // Default messages based on status
    switch (agent.status) {
      case 'idle':
        return 'Waiting for new items...';
      case 'error':
        return 'Error occurred';
      case 'completed':
        return 'Task completed';
      case 'failed':
        return agent.result?.error || 'Execution failed';
      case 'timeout':
        return 'Execution timed out';
      default:
        return 'Processing...';
    }
  }
</script>

<div
  class="rounded-xl border p-5 flex flex-col h-64 transition-all {getStatusColor(
    agent.status
  )} border-opacity-50"
>
  <!-- Header -->
  <div class="flex justify-between items-start mb-4">
    <div>
      <div class="font-bold text-lg">{agent.name}</div>
      <div class="text-xs opacity-70 uppercase tracking-wide">{agent.role}</div>
    </div>
    <div class="flex items-center gap-2">
      {#if agent.status === 'running'}
        <span class="relative flex h-3 w-3">
          <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
          ></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      {/if}
      <span
        class="text-xs font-mono uppercase px-2 py-0.5 rounded bg-black/20 border border-black/10"
      >
        {agent.status}
      </span>
    </div>
  </div>

  <!-- Current Task -->
  <div class="mb-auto">
    <div class="text-sm opacity-90 truncate font-medium">{getTaskDisplay()}</div>
    <div class="text-xs opacity-60 mt-1">
      Last active: {formatLastActive(agent.lastActive)}
    </div>

    {#if agent.status === 'running'}
      <div class="mt-3 h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
        <div
          class="h-full bg-current transition-all duration-500"
          style="width: {agent.progress}%"
        ></div>
      </div>
    {/if}

    {#if agent.result}
      <div class="mt-3 text-xs opacity-75">
        {#if agent.result.durationMs}
          <div>Duration: {agent.result.durationMs}ms</div>
        {/if}
        {#if agent.result.retryCount !== undefined}
          <div>Retries: {agent.result.retryCount}</div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Logs Preview -->
  <div
    class="mt-4 pt-4 border-t border-black/10 text-xs font-mono opacity-80 space-y-1"
  >
    {#each agent.logs.slice(-2) as log}
      <div class="truncate">> {log}</div>
    {/each}
    {#if agent.logs.length === 0}
      <div class="truncate opacity-50">> No logs yet</div>
    {/if}
  </div>

  <!-- View Full Logs Link (Unit 14) -->
  <a
    href="/logs?agent={agent.name.toLowerCase().replace(' ', '_')}"
    class="mt-3 text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
  >
    <span>📋</span>
    <span>View Full Logs</span>
  </a>
</div>
