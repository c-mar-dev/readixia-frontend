<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';

  /** @type {import('$lib/api/types').UiDecision} */
  export let decision;

  const dispatch = createEventDispatcher();

  // Extract data
  $: data = decision.data || {};

  // Questions can come from clarificationQuestions or data.questions
  $: questions = decision.clarificationQuestions || [];

  // Form state for answers
  let answers = {};

  // Timer state
  let timeRemaining = '';
  let isExpired = false;
  let timerInterval = null;

  // Action state
  let actionInProgress = false;

  // Initialize answers when questions change
  $: if (questions.length > 0) {
    questions.forEach(q => {
      if (!(q.id in answers)) {
        if (q.type === 'choice' && q.options) {
          answers[q.id] = '';
        } else if (q.type === 'number') {
          answers[q.id] = 0;
        } else {
          answers[q.id] = '';
        }
      }
    });
  }

  // Calculate time remaining
  function updateTimeRemaining() {
    if (!data.expiresAt) {
      timeRemaining = '';
      return;
    }

    const now = new Date().getTime();
    const expiry = new Date(data.expiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) {
      isExpired = true;
      timeRemaining = 'Expired';
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      return;
    }

    isExpired = false;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
      timeRemaining = `${minutes}m ${seconds}s remaining`;
    } else {
      timeRemaining = `${seconds}s remaining`;
    }
  }

  onMount(() => {
    if (data.expiresAt) {
      updateTimeRemaining();
      timerInterval = setInterval(updateTimeRemaining, 1000);
    }
  });

  onDestroy(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  });

  async function handleSubmit() {
    if (actionInProgress || isExpired) return;
    actionInProgress = true;

    try {
      dispatch('action', {
        name: 'Submit Checkpoint',
        decision,
        payload: { answers }
      });
    } finally {
      setTimeout(() => { actionInProgress = false; }, 100);
    }
  }

  function handleDefer() {
    dispatch('defer');
  }
</script>

<div class="space-y-6">
  <!-- Agent Context Banner -->
  {#if data.taskContext || data.agentName}
    <div class="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-4">
      <div class="flex items-center gap-3">
        <div class="text-2xl">
          {#if isExpired}
            <span class="text-red-400">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          {:else}
            <span class="animate-pulse">
              <svg class="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          {/if}
        </div>
        <div class="flex-1">
          <div class="text-yellow-300 font-medium">
            {#if data.agentName}
              {data.agentName} is waiting for your input
            {:else}
              Agent Paused
            {/if}
          </div>
          {#if data.taskContext}
            <div class="text-yellow-400/70 text-sm mt-1">
              Working on: {data.taskContext}
            </div>
          {/if}
        </div>
        {#if data.progress}
          <div class="text-yellow-400/70 text-sm">
            {data.progress}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Timer Display -->
  {#if timeRemaining}
    <div class="flex items-center justify-center gap-2 text-sm {isExpired ? 'text-red-400' : 'text-yellow-400'}">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="font-mono">{timeRemaining}</span>
    </div>
  {/if}

  <!-- Expired Warning -->
  {#if isExpired}
    <div class="bg-red-900/20 border border-red-800/50 rounded-lg p-4 text-center">
      <div class="text-red-400 font-medium">Checkpoint Expired</div>
      <div class="text-red-400/70 text-sm mt-1">
        The agent has timed out waiting for a response.
      </div>
    </div>
  {/if}

  <!-- Questions -->
  {#if questions.length > 0}
    <div class="space-y-4">
      <div class="text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Blocking Questions ({questions.length})
      </div>

      {#each questions as q}
        <div class="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
          <label for="q-{q.id}" class="block text-sm text-zinc-200 mb-3">{q.text}</label>

          {#if q.type === 'choice' && q.options}
            <div class="space-y-2">
              {#each q.options as option}
                <label class="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name={q.id}
                    value={option}
                    bind:group={answers[q.id]}
                    disabled={actionInProgress || isExpired}
                    class="w-4 h-4 text-yellow-500 bg-zinc-700 border-zinc-600 focus:ring-yellow-500 focus:ring-2 disabled:opacity-50"
                  />
                  <span class="text-sm text-zinc-300 group-hover:text-white transition-colors">{option}</span>
                </label>
              {/each}
            </div>
          {:else if q.type === 'number'}
            <input
              id="q-{q.id}"
              type="number"
              bind:value={answers[q.id]}
              disabled={actionInProgress || isExpired}
              class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          {:else}
            <input
              id="q-{q.id}"
              type="text"
              bind:value={answers[q.id]}
              disabled={actionInProgress || isExpired}
              placeholder="Type your answer..."
              class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none placeholder:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-center text-zinc-500 py-8">
      No questions to answer
    </div>
  {/if}

  <!-- Actions -->
  <div class="pt-4 border-t border-zinc-800 flex justify-end gap-3">
    <button
      on:click={handleDefer}
      disabled={actionInProgress}
      class="px-4 py-2 text-zinc-400 hover:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Answer Later
    </button>
    <button
      on:click={handleSubmit}
      disabled={actionInProgress || isExpired || questions.length === 0}
      class="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
    >
      {#if actionInProgress}
        <LoadingSpinner size="sm" /> Submitting...
      {:else if isExpired}
        Expired
      {:else}
        Submit & Continue
      {/if}
    </button>
  </div>
</div>
