<script>
  import { createEventDispatcher } from 'svelte';
  
  export let criteria = [];
  export let readonly = false;

  const dispatch = createEventDispatcher();

  function toggleCriterion(id) {
    if (readonly) return;
    dispatch('toggle', { id });
  }

  function addCriterion() {
    dispatch('add');
  }

  function removeCriterion(id) {
    dispatch('remove', { id });
  }

  function updateCriterion(id, text) {
    dispatch('update', { id, text });
  }
</script>

<div class="bg-zinc-800/30 rounded-lg border border-zinc-700/50 overflow-hidden">
  <div class="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700/50 flex items-center justify-between">
    <h3 class="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Done Criteria</h3>
    {#if !readonly}
      <button 
        on:click={addCriterion}
        class="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
      >
        <span class="text-lg leading-none">+</span> Add Criterion
      </button>
    {/if}
  </div>

  <div class="divide-y divide-zinc-700/30">
    {#if criteria.length === 0}
      <div class="p-4 text-center text-zinc-500 text-sm italic">
        No criteria defined.
      </div>
    {:else}
      {#each criteria as item (item.id)}
        <div class="group flex items-start gap-3 p-3 hover:bg-zinc-800/30 transition-colors">
          <!-- Checkbox / Status Icon -->
          <button
            class="flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                   {item.status === 'pass' ? 'bg-green-500 border-green-500' : 
                    item.status === 'fail' ? 'bg-red-500 border-red-500' :
                    item.checked ? 'bg-amber-500 border-amber-500' : 'border-zinc-600 hover:border-zinc-500'}"
            on:click={() => toggleCriterion(item.id)}
            disabled={readonly && item.status !== 'pending'}
          >
            {#if item.status === 'pass' || item.checked}
              <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            {:else if item.status === 'fail'}
               <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            {/if}
          </button>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            {#if readonly}
              <div class="text-sm text-zinc-200 {item.checked || item.status === 'pass' ? 'line-through text-zinc-500' : ''}">
                {item.text}
              </div>
              {#if item.feedback}
                <div class="text-xs text-red-400 mt-1 pl-2 border-l-2 border-red-900/50">
                  {item.feedback}
                </div>
              {/if}
            {:else}
              <input
                type="text"
                value={item.text}
                on:input={(e) => updateCriterion(item.id, e.target.value)}
                class="w-full bg-transparent border-none p-0 text-sm text-zinc-200 focus:ring-0 placeholder-zinc-600"
                placeholder="Describe success criteria..."
              />
            {/if}
          </div>

          <!-- Actions -->
          {#if !readonly}
            <button
              on:click={() => removeCriterion(item.id)}
              class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
            >
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </button>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>
