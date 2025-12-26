<!--
  TimelineEvent.svelte - Timeline entry component for Unit 8

  Displays a single state transition with expandable input/output details.
  Also supports displaying verification results as timeline entries.

  Props:
    - event: UiTimelineEvent - The transition event to display
    - index: number - Position in the timeline (1-based display)
    - verification?: UiVerification - Optional verification data to display as timeline entry

  Usage:
    <TimelineEvent {event} index={1} />
    <TimelineEvent {event} index={2} verification={verificationData} />
-->
<script>
  /** @type {import('$lib/api').UiTimelineEvent} */
  export let event;
  /** @type {number} */
  export let index;
  /** @type {import('$lib/api').UiVerification | null} */
  export let verification = null;

  // State for expanded sections
  let inputExpanded = false;
  let outputExpanded = false;

  // Get state color based on state name
  function getStateColor(state) {
    const colors = {
      'inbox': 'bg-zinc-600',
      'created': 'bg-zinc-600',
      'received': 'bg-zinc-600',
      'recorded': 'bg-zinc-600',
      'transcribed': 'bg-blue-600',
      'categorized': 'bg-pink-600',
      'triaged': 'bg-purple-600',
      'specifying': 'bg-orange-500',
      'specified': 'bg-orange-600',
      'ready': 'bg-cyan-500',
      'executing': 'bg-cyan-600',
      'executed': 'bg-cyan-600',
      'doing': 'bg-cyan-600',
      'verifying': 'bg-amber-500',
      'pending_review': 'bg-amber-600',
      'pending_enrichment': 'bg-amber-600',
      'pending_categorization': 'bg-amber-600',
      'in_review': 'bg-amber-600',
      'approved': 'bg-green-600',
      'done': 'bg-green-600',
      'completed': 'bg-green-600',
      'archived': 'bg-zinc-500',
      'rejected': 'bg-red-600',
    };
    return colors[state] || 'bg-zinc-600';
  }

  // Format JSON for display
  function formatJson(obj) {
    if (!obj) return 'null';
    return JSON.stringify(obj, null, 2);
  }

  // Count fields in an object
  function fieldCount(obj) {
    if (!obj) return 0;
    return Object.keys(obj).length;
  }

  // Get preview of a value
  function getPreview(value) {
    if (typeof value === 'object') {
      if (Array.isArray(value)) return '[...]';
      return '{...}';
    }
    const str = String(value);
    return str.length > 20 ? str.slice(0, 20) + '...' : str;
  }
</script>

<div class="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden">
  <!-- Event header -->
  <div class="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <!-- Index badge -->
      <div class="w-6 h-6 rounded-full {getStateColor(event.toState)} flex items-center justify-center text-white text-xs font-bold">
        {index}
      </div>
      <!-- State name -->
      <span class="font-semibold text-zinc-200 uppercase tracking-wide text-sm">
        {event.toState.replace(/_/g, ' ')}
      </span>
      <!-- Actor label -->
      <span class="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-700/50 rounded">
        {event.actorLabel}
      </span>
    </div>
    <!-- Timestamp -->
    <span class="text-sm text-zinc-500" title={event.timestamp.toISOString()}>
      {event.relativeTime}
    </span>
  </div>

  <!-- Event content -->
  <div class="p-4 space-y-4">
    <!-- From state indicator (if not initial) -->
    {#if event.fromState}
      <div class="text-xs text-zinc-500">
        Transitioned from <span class="text-zinc-400 font-medium">{event.fromState}</span>
      </div>
    {:else}
      <div class="text-xs text-zinc-500">
        Initial state
      </div>
    {/if}

    <!-- Input section -->
    {#if event.inputSummary && fieldCount(event.inputSummary) > 0}
      <div>
        <button
          class="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-2"
          on:click={() => inputExpanded = !inputExpanded}
        >
          <span class="text-xs">{inputExpanded ? '▼' : '▶'}</span>
          <span class="font-medium">Input</span>
          <span class="text-xs text-zinc-600">
            {fieldCount(event.inputSummary)} fields
          </span>
        </button>

        {#if inputExpanded}
          <pre class="bg-zinc-900 rounded-lg p-4 text-sm text-zinc-300 overflow-x-auto font-mono">{formatJson(event.inputSummary)}</pre>
        {:else}
          <div class="flex flex-wrap gap-2">
            {#each Object.entries(event.inputSummary) as [key, value]}
              <button
                class="text-sm px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors text-left"
                on:click={() => inputExpanded = true}
              >
                <span class="text-zinc-500">{key}:</span>
                <span class="ml-1 text-amber-400">{getPreview(value)}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Output section -->
    {#if event.outputSummary && fieldCount(event.outputSummary) > 0}
      <div>
        <button
          class="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-2"
          on:click={() => outputExpanded = !outputExpanded}
        >
          <span class="text-xs">{outputExpanded ? '▼' : '▶'}</span>
          <span class="font-medium">Output</span>
          <span class="text-xs text-zinc-600">
            {fieldCount(event.outputSummary)} fields
          </span>
        </button>

        {#if outputExpanded}
          <pre class="bg-zinc-900 rounded-lg p-4 text-sm text-zinc-300 overflow-x-auto font-mono">{formatJson(event.outputSummary)}</pre>
        {:else}
          <div class="flex flex-wrap gap-2">
            {#each Object.entries(event.outputSummary) as [key, value]}
              <button
                class="text-sm px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors text-left"
                on:click={() => outputExpanded = true}
              >
                <span class="text-zinc-500">{key}:</span>
                <span class="ml-1 text-cyan-400">{getPreview(value)}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Verification results (if this is a verification event) -->
    {#if verification && verification.hasVerification && event.toState === 'verifying'}
      <div class="mt-4 border-t border-zinc-700 pt-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-sm font-medium {verification.passed ? 'text-green-400' : 'text-red-400'}">
            {verification.passed ? '✓ Verification Passed' : '✗ Verification Failed'}
          </span>
          <span class="text-xs text-zinc-500">
            {verification.relativeTime}
          </span>
        </div>

        <!-- Criteria results -->
        {#if verification.criteria.length > 0}
          <div class="space-y-2">
            {#each verification.criteria as criterion}
              <div class="flex items-start gap-2 text-sm">
                <span class="mt-0.5">
                  {#if criterion.status === 'pass'}
                    <span class="text-green-400">✓</span>
                  {:else if criterion.status === 'fail'}
                    <span class="text-red-400">✗</span>
                  {:else}
                    <span class="text-zinc-500">○</span>
                  {/if}
                </span>
                <div class="flex-1">
                  <div class="{criterion.status === 'pass' ? 'text-zinc-300' : criterion.status === 'fail' ? 'text-red-300' : 'text-zinc-500'}">
                    {criterion.text}
                  </div>
                  {#if criterion.note}
                    <div class="text-xs text-zinc-500 mt-1">
                      {criterion.note}
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Feedback -->
        {#if verification.feedback}
          <div class="mt-3 text-sm text-zinc-400 bg-zinc-900 rounded p-3">
            {verification.feedback}
          </div>
        {/if}

        <!-- Retry info -->
        {#if verification.canRetry}
          <div class="mt-2 text-xs text-zinc-500">
            Retries: {verification.retryCount} / {verification.maxRetries}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Decision/Execution links -->
    {#if event.decisionId || event.executionId}
      <div class="flex items-center gap-4 text-xs text-zinc-500 pt-2 border-t border-zinc-700/50">
        {#if event.decisionId}
          <span>Decision: <code class="text-zinc-400">{event.decisionId.slice(0, 8)}...</code></span>
        {/if}
        {#if event.executionId}
          <span>Execution: <code class="text-zinc-400">{event.executionId.slice(0, 8)}...</code></span>
        {/if}
      </div>
    {/if}
  </div>
</div>
