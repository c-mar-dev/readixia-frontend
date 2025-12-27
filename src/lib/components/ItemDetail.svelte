<!--
  ItemDetail.svelte - Detail view for a single item

  Displays:
  - Header with title, type, state
  - Frontmatter table
  - Body content (markdown)
  - Action buttons

  Props:
  - item: ItemDetail from API
-->
<script lang="ts">
  import type { ItemDetail } from '$lib/api/items';

  export let item: ItemDetail;

  // Type labels
  const typeLabels: Record<string, string> = {
    task: 'Task',
    transcript: 'Meeting',
    source: 'Source',
    project: 'Project',
    person: 'Person',
    email: 'Email',
    calendar: 'Calendar',
  };

  // State badge colors
  const stateColors: Record<string, string> = {
    inbox: 'bg-blue-600',
    specifying: 'bg-purple-600',
    specified: 'bg-indigo-600',
    ready: 'bg-green-600',
    doing: 'bg-amber-600',
    verifying: 'bg-orange-600',
    in_review: 'bg-pink-600',
    done: 'bg-emerald-600',
    active: 'bg-green-600',
    paused: 'bg-yellow-600',
    completed: 'bg-emerald-600',
    archived: 'bg-zinc-600',
  };

  // Format frontmatter for display
  $: displayFrontmatter = Object.entries(item.frontmatter || {})
    .filter(([key]) => !key.startsWith('_') && key !== 'title' && key !== 'state')
    .map(([key, value]) => ({
      key: formatKey(key),
      value: formatValue(value),
    }));

  function formatKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatValue(value: unknown): string {
    if (value === null || value === undefined) return '-';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string' && value.startsWith('[[') && value.endsWith(']]')) {
      return value.slice(2, -2).split('/').pop()?.replace('.md', '') || value;
    }
    return String(value);
  }

  $: stateClass = stateColors[item.state] || 'bg-zinc-600';
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="p-6 border-b border-zinc-800">
    <div class="flex items-start gap-4">
      <div class="flex-1">
        <!-- Type + State badges -->
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs uppercase font-bold tracking-wider text-zinc-500">
            {typeLabels[item.itemType] || item.itemType}
          </span>
          <span class="text-xs px-2 py-0.5 rounded-full text-white {stateClass}">
            {item.state}
          </span>
          {#if item.priority}
            <span class="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300">
              {item.priority}
            </span>
          {/if}
        </div>

        <!-- Title -->
        <h1 class="text-2xl font-semibold text-zinc-100 mb-2">
          {item.title}
        </h1>

        <!-- Path -->
        <p class="text-xs text-zinc-500 font-mono">
          {item.path}
        </p>
      </div>
    </div>
  </div>

  <!-- Content area -->
  <div class="flex-1 overflow-y-auto p-6">
    <!-- Frontmatter table -->
    {#if displayFrontmatter.length > 0}
      <div class="mb-6">
        <h2 class="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Properties
        </h2>
        <div class="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden">
          <table class="w-full text-sm">
            <tbody>
              {#each displayFrontmatter as { key, value }}
                <tr class="border-b border-zinc-700/50 last:border-0">
                  <td class="px-4 py-2 text-zinc-400 font-medium w-1/3">
                    {key}
                  </td>
                  <td class="px-4 py-2 text-zinc-200">
                    {value}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Body content -->
    {#if item.body}
      <div class="mb-6">
        <h2 class="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Content
        </h2>
        <div class="bg-zinc-800/50 rounded-lg border border-zinc-700 p-4">
          <pre class="text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">{item.body}</pre>
        </div>
      </div>
    {/if}

    <!-- Tags -->
    {#if item.tags && item.tags.length > 0}
      <div class="mb-6">
        <h2 class="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Tags
        </h2>
        <div class="flex flex-wrap gap-2">
          {#each item.tags as tag}
            <span class="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full">
              #{tag}
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Timestamps -->
    <div class="text-xs text-zinc-500 mt-8 pt-4 border-t border-zinc-800">
      <div class="flex items-center gap-4">
        <span>Created: {item.created}</span>
        {#if item.createdAt}
          <span class="text-zinc-600">({item.createdAt})</span>
        {/if}
      </div>
    </div>
  </div>
</div>
