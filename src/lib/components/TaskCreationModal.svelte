<script>
  import Modal from './Modal.svelte';
  import FuzzyDropdown from './FuzzyDropdown.svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import { projectsApi } from '$lib/api';

  const dispatch = createEventDispatcher();

  let title = '';
  let project = '';
  let priority = 'normal';
  let description = '';

  // Projects from API
  let projects = [];
  let projectsLoading = false;

  onMount(async () => {
    try {
      projectsLoading = true;
      const response = await projectsApi.list({ state: 'active' });
      projects = response.projects.map(p => p.title);
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    } finally {
      projectsLoading = false;
    }
  });

  function handleSubmit() {
    if (!title.trim()) return;
    dispatch('submit', {
      title,
      project,
      priority,
      description
    });
  }
</script>

<Modal title="Create New Task" on:close>
  <div class="space-y-5">
    <!-- Title -->
    <div>
      <label for="task-title" class="block text-sm font-medium text-zinc-300 mb-1">Task Title</label>
      <input
        id="task-title"
        type="text"
        bind:value={title}
        class="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-200 focus:border-amber-500 focus:outline-none placeholder-zinc-500"
        placeholder="e.g., Draft Q3 Report"
        autofocus
      />
    </div>

    <!-- Project & Priority Row -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="task-project" class="block text-sm font-medium text-zinc-300 mb-1">Project (Optional)</label>
        {#if projectsLoading}
          <div class="px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-500 text-sm">
            Loading projects...
          </div>
        {:else}
          <FuzzyDropdown
            options={projects}
            bind:value={project}
            placeholder="Search or select project..."
            allowEmpty={true}
            emptyLabel="No project"
          />
        {/if}
      </div>
      <div>
        <label for="task-priority" class="block text-sm font-medium text-zinc-300 mb-1">Priority</label>
        <select
          id="task-priority"
          bind:value={priority}
          class="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-200 focus:border-amber-500 focus:outline-none"
        >
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
    </div>

    <!-- Description -->
    <div>
      <label for="task-desc" class="block text-sm font-medium text-zinc-300 mb-1">Description / Notes</label>
      <textarea
        id="task-desc"
        bind:value={description}
        rows="4"
        class="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-200 focus:border-amber-500 focus:outline-none placeholder-zinc-500"
        placeholder="Any initial thoughts or context..."
      ></textarea>
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
      disabled={!title.trim()}
      class="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
    >
      Create Task
    </button>
  </div>
</Modal>
