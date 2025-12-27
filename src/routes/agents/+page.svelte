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

<div class="h-full overflow-auto bg-zinc-900 text-zinc-100 p-8 font-sans">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">System Agents</h1>
        <p class="text-zinc-400 mt-1">Real-time status of background workers</p>
      </div>
      <div class="flex items-center gap-3">
        <a href="/" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
          Back to Queue
        </a>
        <a href="/settings" class="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors" title="Settings">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </a>
      </div>
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
