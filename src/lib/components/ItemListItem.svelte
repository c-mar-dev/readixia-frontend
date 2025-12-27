<!--
  ItemListItem.svelte - Compact list item for the Items page

  Displays:
  - Type icon
  - Title (truncated)
  - State badge
  - Project (if any)
  - Time ago

  Props:
  - item: Item from API
  - selected: boolean
  - index: number (for data attribute)
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Item } from '$lib/api/items';

  export let item: Item;
  export let selected = false;
  export let index = 0;

  const dispatch = createEventDispatcher();

  // Type icons and colors
  const typeConfig: Record<string, { icon: string; color: string }> = {
    task: { icon: 'check', color: 'text-blue-400' },
    transcript: { icon: 'mic', color: 'text-purple-400' },
    source: { icon: 'file', color: 'text-green-400' },
    project: { icon: 'folder', color: 'text-amber-400' },
    person: { icon: 'user', color: 'text-pink-400' },
    email: { icon: 'mail', color: 'text-cyan-400' },
    calendar: { icon: 'calendar', color: 'text-orange-400' },
  };

  // State badge colors
  const stateColors: Record<string, string> = {
    inbox: 'bg-blue-900/50 text-blue-300',
    specifying: 'bg-purple-900/50 text-purple-300',
    specified: 'bg-indigo-900/50 text-indigo-300',
    ready: 'bg-green-900/50 text-green-300',
    doing: 'bg-amber-900/50 text-amber-300',
    verifying: 'bg-orange-900/50 text-orange-300',
    in_review: 'bg-pink-900/50 text-pink-300',
    done: 'bg-emerald-900/50 text-emerald-300',
    active: 'bg-green-900/50 text-green-300',
    paused: 'bg-yellow-900/50 text-yellow-300',
    completed: 'bg-emerald-900/50 text-emerald-300',
    archived: 'bg-zinc-700/50 text-zinc-400',
  };

  $: config = typeConfig[item.itemType] || { icon: 'file', color: 'text-zinc-400' };
  $: stateClass = stateColors[item.state] || 'bg-zinc-700/50 text-zinc-400';

  function handleClick() {
    dispatch('click');
  }
</script>

<button
  on:click={handleClick}
  data-index={index}
  class="w-full text-left px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors relative group
         {selected ? 'bg-zinc-800/80' : ''}"
>
  <!-- Active indicator -->
  {#if selected}
    <div class="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
  {/if}

  <div class="flex items-start gap-3">
    <!-- Type icon -->
    <div class="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 {config.color}">
      {#if config.icon === 'check'}
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      {:else if config.icon === 'mic'}
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      {:else if config.icon === 'folder'}
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      {:else if config.icon === 'user'}
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      {:else if config.icon === 'mail'}
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      {:else if config.icon === 'calendar'}
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      {:else}
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      {/if}
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <!-- Title + time -->
      <div class="flex items-center gap-2 mb-1">
        <span class="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
          {item.title}
        </span>
        <span class="text-[10px] text-zinc-600 flex-shrink-0 ml-auto">
          {item.created}
        </span>
      </div>

      <!-- State + Project -->
      <div class="flex items-center gap-2">
        <span class="text-[10px] px-1.5 py-0.5 rounded {stateClass}">
          {item.state}
        </span>
        {#if item.project}
          <span class="text-[10px] text-zinc-500 truncate">
            {item.project.replace('projects/', '').replace('.md', '')}
          </span>
        {/if}
      </div>

      <!-- Description preview -->
      {#if item.description}
        <p class="text-xs text-zinc-500 truncate mt-1">
          {item.description}
        </p>
      {/if}
    </div>
  </div>
</button>
