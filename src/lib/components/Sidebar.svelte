<!--
  Sidebar.svelte - Minimal navigation sidebar

  Icon-only sidebar (64px) that expands to show labels on hover (200px).
  Contains just 2 navigation items: Dashboard and Items.

  Usage:
    <Sidebar />
-->

<script lang="ts">
  import { page } from '$app/stores';

  // Navigation items - just 2
  const navItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: 'grid',
    },
    {
      path: '/items',
      label: 'Items',
      icon: 'database',
    },
  ];

  // Track hover state for expansion
  let isExpanded = false;

  function handleMouseEnter() {
    isExpanded = true;
  }

  function handleMouseLeave() {
    isExpanded = false;
  }

  // Check if path is active (exact match or starts with for nested routes)
  function isActive(itemPath: string, currentPath: string): boolean {
    if (itemPath === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(itemPath);
  }
</script>

<nav
  class="h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col transition-all duration-200 ease-out"
  class:w-16={!isExpanded}
  class:w-48={isExpanded}
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
  role="navigation"
  aria-label="Main navigation"
>
  <!-- Logo / Brand area -->
  <div class="h-14 flex items-center justify-center border-b border-zinc-800 px-4">
    <div class="flex items-center gap-3 overflow-hidden">
      <!-- Logo icon -->
      <div class="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center flex-shrink-0">
        <span class="text-white font-bold text-sm">R</span>
      </div>
      <!-- Brand text (visible when expanded) -->
      {#if isExpanded}
        <span class="text-zinc-100 font-semibold whitespace-nowrap">Readixia</span>
      {/if}
    </div>
  </div>

  <!-- Navigation items -->
  <div class="flex-1 py-4 flex flex-col gap-1 px-2">
    {#each navItems as item}
      {@const active = isActive(item.path, $page.url.pathname)}
      <a
        href={item.path}
        class="relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group
               {active ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'}"
        title={isExpanded ? undefined : item.label}
      >
        <!-- Active indicator bar -->
        {#if active}
          <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r"></div>
        {/if}

        <!-- Icon -->
        <div class="w-5 h-5 flex-shrink-0 flex items-center justify-center">
          {#if item.icon === 'grid'}
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          {:else if item.icon === 'database'}
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          {/if}
        </div>

        <!-- Label (visible when expanded) -->
        {#if isExpanded}
          <span class="whitespace-nowrap text-sm font-medium">{item.label}</span>
        {/if}
      </a>
    {/each}
  </div>
</nav>
