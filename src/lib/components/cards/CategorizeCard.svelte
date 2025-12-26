<script>
  import { createEventDispatcher } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';

  /** @type {import('$lib/api/types').UiDecision} */
  export let decision;

  const dispatch = createEventDispatcher();

  // Extract data
  $: data = decision.data || {};

  // Form state
  let selectedCategory = data.suggestedCategory || '';
  let selectedProject = data.suggestedProject || '';
  let selectedType = '';
  let additionalFieldValues = {};
  let showAdditionalFields = false;

  // Initialize additional field values
  $: if (data.additionalFields) {
    data.additionalFields.forEach(field => {
      if (!(field.name in additionalFieldValues)) {
        additionalFieldValues[field.name] = field.value || '';
      }
    });
  }

  // Action state
  let actionInProgress = false;

  // Check if form is valid (category is required)
  $: isValid = selectedCategory.trim() !== '';

  // Check if AI suggestion is selected
  $: isAISuggestion = selectedCategory === data.suggestedCategory && selectedProject === data.suggestedProject;

  function selectAISuggestion() {
    if (data.suggestedCategory) {
      selectedCategory = data.suggestedCategory;
    }
    if (data.suggestedProject) {
      selectedProject = data.suggestedProject;
    }
  }

  async function handleSave() {
    if (actionInProgress || !isValid) return;
    actionInProgress = true;

    // Build field updates from additional fields
    const fieldUpdates = {};
    if (data.additionalFields) {
      data.additionalFields.forEach(field => {
        if (field.editable && additionalFieldValues[field.name] !== field.value) {
          fieldUpdates[field.name] = additionalFieldValues[field.name];
        }
      });
    }

    // Add type if selected
    if (selectedType) {
      fieldUpdates.itemType = selectedType;
    }

    try {
      dispatch('action', {
        name: 'Save Category',
        decision,
        payload: {
          category: selectedCategory,
          project: selectedProject || null,
          fieldUpdates: Object.keys(fieldUpdates).length > 0 ? fieldUpdates : null
        }
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
  <!-- Item Preview -->
  {#if data.preview}
    <div class="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
      <div class="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Item Preview</div>
      <div class="text-sm text-zinc-300 italic">
        "{data.preview}"
      </div>
    </div>
  {/if}

  <!-- AI Suggestion Quick-Select -->
  {#if data.suggestedCategory}
    <div class="bg-pink-900/20 border border-pink-800/30 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="text-2xl">
            <svg class="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <div class="text-pink-300 font-medium">AI Suggestion</div>
            <div class="text-pink-400/70 text-sm">
              {data.suggestedCategory}
              {#if data.suggestedProject}
                in <span class="text-pink-300">{data.suggestedProject}</span>
              {/if}
            </div>
          </div>
        </div>
        {#if !isAISuggestion}
          <button
            on:click={selectAISuggestion}
            disabled={actionInProgress}
            class="px-3 py-1.5 bg-pink-600/30 hover:bg-pink-600/50 text-pink-300 text-sm rounded border border-pink-700 disabled:opacity-50"
          >
            Use Suggestion
          </button>
        {:else}
          <div class="text-pink-400 text-sm flex items-center gap-1">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            Selected
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Category Selection -->
  <div class="space-y-2">
    <label for="category-select" class="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
      Category <span class="text-red-400">*</span>
    </label>
    <select
      id="category-select"
      bind:value={selectedCategory}
      disabled={actionInProgress}
      class="select-dropdown w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-200 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer pr-10"
    >
      <option value="">Select a category...</option>
      {#each (data.categories || []) as category}
        <option value={category} class:text-pink-400={category === data.suggestedCategory}>
          {category}{category === data.suggestedCategory ? ' (suggested)' : ''}
        </option>
      {/each}
    </select>
  </div>

  <!-- Project Selection -->
  <div class="space-y-2">
    <label for="project-select" class="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
      Project <span class="text-zinc-600">(Optional)</span>
    </label>
    <select
      id="project-select"
      bind:value={selectedProject}
      disabled={actionInProgress}
      class="select-dropdown w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-200 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer pr-10"
    >
      <option value="">No project</option>
      {#each (data.projects || []) as project}
        <option value={project} class:text-pink-400={project === data.suggestedProject}>
          {project}{project === data.suggestedProject ? ' (suggested)' : ''}
        </option>
      {/each}
    </select>
  </div>

  <!-- Item Type Selection (conditional) -->
  {#if data.showTypeSelector && data.itemTypes && data.itemTypes.length > 0}
    <div class="space-y-2">
      <label for="item-type-select" class="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
        Item Type
      </label>
      <select
        id="item-type-select"
        bind:value={selectedType}
        disabled={actionInProgress}
        class="select-dropdown w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-200 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer pr-10"
      >
        <option value="">Select type...</option>
        {#each data.itemTypes as itemType}
          <option value={itemType}>{itemType}</option>
        {/each}
      </select>
    </div>
  {/if}

  <!-- Additional Fields (collapsible) -->
  {#if data.additionalFields && data.additionalFields.length > 0}
    <div class="border border-zinc-700 rounded-lg overflow-hidden">
      <button
        on:click={() => showAdditionalFields = !showAdditionalFields}
        class="w-full px-4 py-3 bg-zinc-800/50 flex items-center justify-between text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <span class="font-medium">Additional Fields ({data.additionalFields.length})</span>
        <svg
          class="w-5 h-5 transform transition-transform {showAdditionalFields ? 'rotate-180' : ''}"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {#if showAdditionalFields}
        <div class="p-4 space-y-4 border-t border-zinc-700">
          {#each data.additionalFields as field}
            <div class="space-y-1">
              <label for="field-{field.name}" class="block text-xs text-zinc-500">{field.name}</label>
              {#if field.editable}
                <input
                  id="field-{field.name}"
                  type="text"
                  bind:value={additionalFieldValues[field.name]}
                  disabled={actionInProgress}
                  class="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-200 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              {:else}
                <div class="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded text-zinc-400 text-sm">
                  {field.value || '-'}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Actions -->
  <div class="pt-4 border-t border-zinc-800 flex justify-end gap-3">
    <button
      on:click={handleDefer}
      disabled={actionInProgress}
      class="px-4 py-2 text-zinc-400 hover:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Skip
    </button>
    <button
      on:click={handleSave}
      disabled={actionInProgress || !isValid}
      class="px-6 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
    >
      {#if actionInProgress}
        <LoadingSpinner size="sm" /> Saving...
      {:else}
        Save Category
      {/if}
    </button>
  </div>
</div>
