<script>
  import Modal from './Modal.svelte';
  import { createEventDispatcher } from 'svelte';

  export let taskTitle = '';
  export let questions = [];
  
  // Local state for answers
  let answers = {};
  
  const dispatch = createEventDispatcher();

  function handleSubmit() {
    dispatch('submit', { answers });
  }

  // Initialize answers object
  $: {
    questions.forEach(q => {
      if (!(q.id in answers)) {
        answers[q.id] = '';
      }
    });
  }

  $: allAnswered = questions.every(q => answers[q.id] && answers[q.id].trim().length > 0);
</script>

<Modal title="Clarification Needed" on:close>
  <div class="space-y-6">
    <div class="bg-amber-900/20 border border-amber-900/50 rounded-lg p-4 flex items-start gap-3">
      <span class="text-2xl">🤔</span>
      <div>
        <h4 class="text-amber-200 font-medium mb-1">Claude needs your input</h4>
        <p class="text-sm text-amber-200/80">
          Before starting on <span class="font-semibold text-amber-100">"{taskTitle}"</span>, 
          the following points need to be cleared up to ensure a high-quality result.
        </p>
      </div>
    </div>

    <div class="space-y-6">
      {#each questions as question (question.id)}
        <div class="space-y-2">
          <label for={question.id} class="block text-sm font-medium text-zinc-200">
            {question.text}
          </label>
          {#if question.context}
            <p class="text-xs text-zinc-500">{question.context}</p>
          {/if}
          <textarea
            id={question.id}
            bind:value={answers[question.id]}
            rows="3"
            class="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:border-amber-500 focus:outline-none transition-colors"
            placeholder="Type your answer..."
          ></textarea>
        </div>
      {/each}
    </div>
  </div>

  <div slot="footer">
    <button
      on:click={() => dispatch('close')}
      class="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors text-sm font-medium"
    >
      Cancel
    </button>
    <button
      on:click={handleSubmit}
      disabled={!allAnswered}
      class="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
    >
      <span>Submit & Execute</span>
      <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
</Modal>
