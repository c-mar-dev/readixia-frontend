<script>
  import { onMount, onDestroy } from 'svelte';
  import { agents, agentStore } from '$lib/stores';
  import AgentCard from '$lib/components/AgentCard.svelte';

  // Start idle detection when page mounts
  onMount(() => {
    agentStore.startIdleDetection();
  });

  // Stop idle detection when page unmounts
  onDestroy(() => {
    agentStore.stopIdleDetection();
  });
</script>

<div class="min-h-screen bg-zinc-900 text-zinc-100 p-8 font-sans">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">System Agents</h1>
        <p class="text-zinc-400 mt-1">Real-time status of background workers</p>
      </div>
      <a href="/" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
        Back to Queue
      </a>
    </div>

    <!-- Grid -->
    {#if $agents.length === 0}
      <div class="flex items-center justify-center py-24">
        <div class="text-center">
          <div class="text-5xl mb-4 opacity-40">
            <span role="img" aria-label="Robot">🤖</span>
          </div>
          <h3 class="text-lg font-medium text-zinc-200 mb-2">
            No Active Agents
          </h3>
          <p class="text-sm text-zinc-400">
            Agents will appear here when they start processing tasks.
          </p>
        </div>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each $agents as agent (agent.id)}
          <AgentCard {agent} />
        {/each}
      </div>
    {/if}
  </div>
</div>
