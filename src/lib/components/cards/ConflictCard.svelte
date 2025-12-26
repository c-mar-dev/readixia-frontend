<script>
  import { createEventDispatcher } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';

  /** @type {import('$lib/api/types').UiDecision} */
  export let decision;

  const dispatch = createEventDispatcher();

  // Extract data (supporting both old and new field names)
  $: data = decision.data || {};

  // Normalize version info (support both old and new field names)
  $: myVersion = data.myVersion ? {
    actor: data.myVersion.actor || data.myVersion.by || 'Unknown',
    timestamp: data.myVersion.timestamp || data.myVersion.modified || '',
    seq: data.myVersion.seq || 0,
    changes: data.myVersion.changes || []
  } : null;

  $: incomingVersion = data.incomingVersion ? {
    actor: data.incomingVersion.actor || data.incomingVersion.by || 'Unknown',
    timestamp: data.incomingVersion.timestamp || data.incomingVersion.modified || '',
    seq: data.incomingVersion.seq || 0,
    changes: data.incomingVersion.changes || []
  } : null;

  // Merge state
  let showMergeEditor = false;
  let mergeContent = '';

  // Action state
  let actionInProgress = false;
  let pendingAction = null;

  async function handleKeepMine() {
    if (actionInProgress) return;
    actionInProgress = true;
    pendingAction = 'keep_mine';

    try {
      dispatch('action', {
        name: 'Keep Mine',
        decision,
        payload: { choice: 'keep_mine' }
      });
    } finally {
      setTimeout(() => {
        actionInProgress = false;
        pendingAction = null;
      }, 100);
    }
  }

  async function handleTakeTheirs() {
    if (actionInProgress) return;
    actionInProgress = true;
    pendingAction = 'take_theirs';

    try {
      dispatch('action', {
        name: 'Take Theirs',
        decision,
        payload: { choice: 'take_theirs' }
      });
    } finally {
      setTimeout(() => {
        actionInProgress = false;
        pendingAction = null;
      }, 100);
    }
  }

  function handleMergeClick() {
    if (showMergeEditor) {
      // Submit merge
      handleMerge();
    } else {
      // Show merge editor
      showMergeEditor = true;
      // Pre-populate with combined changes hint
      mergeContent = '';
    }
  }

  async function handleMerge() {
    if (actionInProgress || !mergeContent.trim()) return;
    actionInProgress = true;
    pendingAction = 'merge';

    try {
      dispatch('action', {
        name: 'Merge',
        decision,
        payload: {
          choice: 'merge',
          mergeContent: mergeContent
        }
      });
    } finally {
      setTimeout(() => {
        actionInProgress = false;
        pendingAction = null;
      }, 100);
    }
  }

  function handleCancelMerge() {
    showMergeEditor = false;
    mergeContent = '';
  }

  function handleDefer() {
    dispatch('defer');
  }

  // Get conflict type display
  function getConflictTypeLabel(type) {
    switch (type) {
      case 'version':
        return 'Version Conflict';
      case 'concurrent':
        return 'Concurrent Edit';
      default:
        return 'Conflict Detected';
    }
  }
</script>

<div class="space-y-6">
  <!-- File Path & Conflict Type Header -->
  <div class="flex items-center justify-between">
    {#if data.filePath}
      <div class="flex items-center gap-2 text-sm text-zinc-400">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <code class="text-zinc-300">{data.filePath}</code>
      </div>
    {/if}
    <div class="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded border border-red-900/50">
      {getConflictTypeLabel(data.conflictType)}
    </div>
  </div>

  <!-- Side-by-Side Comparison -->
  <div class="grid grid-cols-2 gap-0 border border-zinc-700 rounded-lg overflow-hidden">
    <!-- My Version -->
    <div class="bg-zinc-900/50 p-4 border-r border-zinc-700">
      <div class="flex items-center justify-between mb-3">
        <div class="text-xs text-red-400 uppercase font-bold">Your Version</div>
        {#if myVersion?.seq}
          <div class="text-xs text-zinc-600">seq: {myVersion.seq}</div>
        {/if}
      </div>

      {#if myVersion}
        <div class="text-xs text-zinc-500 mb-4 space-y-1">
          <div class="flex items-center gap-2">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{myVersion.actor}</span>
          </div>
          {#if myVersion.timestamp}
            <div class="flex items-center gap-2">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{myVersion.timestamp}</span>
            </div>
          {/if}
        </div>

        <div class="space-y-1">
          {#each myVersion.changes as change}
            <div class="text-sm text-red-400 font-mono bg-red-900/10 px-2 py-1 rounded">
              <span class="text-red-500">-</span> {change}
            </div>
          {/each}
          {#if myVersion.changes.length === 0}
            <div class="text-sm text-zinc-600 italic">No changes listed</div>
          {/if}
        </div>
      {:else}
        <div class="text-sm text-zinc-600 italic">Version info unavailable</div>
      {/if}
    </div>

    <!-- Incoming Version -->
    <div class="bg-zinc-900/50 p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-xs text-green-400 uppercase font-bold">Incoming Version</div>
        {#if incomingVersion?.seq}
          <div class="text-xs text-zinc-600">seq: {incomingVersion.seq}</div>
        {/if}
      </div>

      {#if incomingVersion}
        <div class="text-xs text-zinc-500 mb-4 space-y-1">
          <div class="flex items-center gap-2">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{incomingVersion.actor}</span>
          </div>
          {#if incomingVersion.timestamp}
            <div class="flex items-center gap-2">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{incomingVersion.timestamp}</span>
            </div>
          {/if}
        </div>

        <div class="space-y-1">
          {#each incomingVersion.changes as change}
            <div class="text-sm text-green-400 font-mono bg-green-900/10 px-2 py-1 rounded">
              <span class="text-green-500">+</span> {change}
            </div>
          {/each}
          {#if incomingVersion.changes.length === 0}
            <div class="text-sm text-zinc-600 italic">No changes listed</div>
          {/if}
        </div>
      {:else}
        <div class="text-sm text-zinc-600 italic">Version info unavailable</div>
      {/if}
    </div>
  </div>

  <!-- Merge Editor (conditionally shown) -->
  {#if showMergeEditor}
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <label for="merge-content" class="text-xs font-bold text-zinc-500 uppercase tracking-wider">
          Manual Merge Content
        </label>
        <button
          on:click={handleCancelMerge}
          class="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
      <textarea
        id="merge-content"
        bind:value={mergeContent}
        disabled={actionInProgress}
        placeholder="Enter the merged content here..."
        rows="6"
        class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 text-sm font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none placeholder:text-zinc-600 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <div class="text-xs text-zinc-500">
        Combine the changes from both versions as needed
      </div>
    </div>
  {/if}

  <!-- Actions -->
  <div class="flex justify-center gap-4">
    <button
      on:click={handleKeepMine}
      disabled={actionInProgress || showMergeEditor}
      class="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
    >
      {#if actionInProgress && pendingAction === 'keep_mine'}
        <LoadingSpinner size="sm" />
      {/if}
      Keep Mine
    </button>

    <button
      on:click={handleTakeTheirs}
      disabled={actionInProgress || showMergeEditor}
      class="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
    >
      {#if actionInProgress && pendingAction === 'take_theirs'}
        <LoadingSpinner size="sm" />
      {/if}
      Take Theirs
    </button>

    <button
      on:click={handleMergeClick}
      disabled={actionInProgress || (showMergeEditor && !mergeContent.trim())}
      class="px-6 py-3 bg-amber-900/30 hover:bg-amber-900/50 border border-amber-800 text-amber-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
    >
      {#if actionInProgress && pendingAction === 'merge'}
        <LoadingSpinner size="sm" /> Merging...
      {:else if showMergeEditor}
        Submit Merge
      {:else}
        Merge Manually
      {/if}
    </button>
  </div>
</div>
