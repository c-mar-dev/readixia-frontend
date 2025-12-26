<script>
  import { createEventDispatcher } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';

  /** @type {import('$lib/api/types').UiDecision} */
  export let decision;

  const dispatch = createEventDispatcher();

  // Extract data
  $: data = decision.data || {};

  // Form state
  let feedback = '';
  let showFeedback = false;

  // Action state
  let actionInProgress = false;
  let pendingAction = null;

  async function handleApprove() {
    if (actionInProgress) return;
    actionInProgress = true;
    pendingAction = 'approve';

    try {
      dispatch('action', {
        name: 'Approve Request',
        decision,
        payload: {
          approved: true,
          approvalFeedback: feedback || null
        }
      });
    } finally {
      setTimeout(() => {
        actionInProgress = false;
        pendingAction = null;
      }, 100);
    }
  }

  async function handleReject() {
    if (actionInProgress) return;

    // If no feedback and user hasn't seen feedback field, show it
    if (!showFeedback && !feedback) {
      showFeedback = true;
      return;
    }

    actionInProgress = true;
    pendingAction = 'reject';

    try {
      dispatch('action', {
        name: 'Reject Request',
        decision,
        payload: {
          approved: false,
          approvalFeedback: feedback || null
        }
      });
    } finally {
      setTimeout(() => {
        actionInProgress = false;
        pendingAction = null;
      }, 100);
    }
  }

  function handleDefer() {
    dispatch('defer');
  }
</script>

<div class="space-y-6">
  <!-- Action Description -->
  <div class="bg-emerald-900/10 border border-emerald-800/30 rounded-lg p-5">
    <div class="flex items-start gap-4">
      <div class="text-3xl">
        <svg class="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="flex-1">
        <div class="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Action Requiring Approval</div>
        <div class="text-lg text-zinc-200 font-medium">
          {data.action || decision.question || 'Approval requested'}
        </div>
      </div>
    </div>
  </div>

  <!-- Context -->
  {#if data.context}
    <div class="space-y-2">
      <div class="text-xs font-bold text-zinc-500 uppercase tracking-wider">Context</div>
      <div class="bg-zinc-800/50 rounded-lg p-4 text-zinc-300 text-sm">
        {data.context}
      </div>
    </div>
  {/if}

  <!-- Implications -->
  {#if data.implications}
    <div class="bg-amber-900/20 border border-amber-800/30 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <div class="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Implications</div>
          <div class="text-amber-200/80 text-sm">{data.implications}</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Requester Info -->
  {#if data.requestedBy || data.requestedAt}
    <div class="flex items-center gap-4 text-sm text-zinc-500">
      {#if data.requestedBy}
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Requested by <span class="text-zinc-400">{data.requestedBy}</span></span>
        </div>
      {/if}
      {#if data.requestedAt}
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{data.requestedAt}</span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Feedback (shown on reject or optionally) -->
  {#if showFeedback}
    <div class="space-y-2">
      <label for="approval-feedback" class="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
        Feedback <span class="text-zinc-600">(Optional)</span>
      </label>
      <textarea
        id="approval-feedback"
        bind:value={feedback}
        disabled={actionInProgress}
        placeholder="Explain why you're rejecting or add notes..."
        rows="3"
        class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-zinc-600 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  {/if}

  <!-- Actions -->
  <div class="pt-4 border-t border-zinc-800 flex items-center justify-between">
    <button
      on:click={handleDefer}
      disabled={actionInProgress}
      class="px-4 py-2 text-zinc-400 hover:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Decide Later
    </button>

    <div class="flex gap-3">
      <!-- Reject Button -->
      <button
        on:click={handleReject}
        disabled={actionInProgress}
        class="px-6 py-2.5 bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-800 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
      >
        {#if actionInProgress && pendingAction === 'reject'}
          <LoadingSpinner size="sm" /> Rejecting...
        {:else}
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reject
        {/if}
      </button>

      <!-- Approve Button -->
      <button
        on:click={handleApprove}
        disabled={actionInProgress}
        class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
      >
        {#if actionInProgress && pendingAction === 'approve'}
          <LoadingSpinner size="sm" /> Approving...
        {:else}
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Approve
        {/if}
      </button>
    </div>
  </div>
</div>
