<!-- +page.svelte -->
<script>
  import { tick, onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import ClarificationModal from '$lib/components/ClarificationModal.svelte';
  import TaskCreationModal from '$lib/components/TaskCreationModal.svelte';
  import DecisionCard from '$lib/components/DecisionCard.svelte';
  import LoadingState from '$lib/components/LoadingState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import SessionBar from '$lib/components/SessionBar.svelte';

  import {
    decisionTypeConfig,
    decisionTypeGroups,
    getSortedGroups,
    thingTypeConfig,
    knownSpeakers,
  } from '$lib/data/decisions.js';

  // Import stores
  import {
    decisionStore,
    decisions,
    filterStore,
    filteredDecisions,
    pendingDecisions,
    allProjects,
    hasActiveFilters,
    queueStats,
    isLoading,
    storeError,
    hasMore,
    isLoadingMore,
    sessionStore,
    actionStore,
    uiStore,
  } from '$lib/stores';
  import { tasksApi } from '$lib/api';
  import { getErrorMessage } from '$lib/utils/errorMessages';

  // Modal states
  let showClarificationModal = false;
  let showTaskCreationModal = false;
  let clarificationTask = null;
  let clarificationQuestions = [];

  // Local filter bindings (for two-way binding with inputs)
  // These sync with the filter store
  let stageFilter = 'all';
  let stageMode = 'type'; // 'type' | 'group'
  let thingFilter = 'all';
  let projectFilter = 'all';
  let searchQuery = '';

  // Subscribe to filter store to keep local vars in sync
  const unsubscribeFilters = filterStore.subscribe(f => {
    stageFilter = f.stage;
    stageMode = f.stageMode;
    thingFilter = f.type;
    projectFilter = f.project;
    searchQuery = f.search;
  });

  // Sync local filter changes to store
  $: filterStore.setStage(stageFilter);
  $: filterStore.setType(thingFilter);
  $: filterStore.setProject(projectFilter);
  $: filterStore.setSearch(searchQuery);

  // Track previous stage filter for reload detection
  let prevStageFilter = 'all';

  // Reload when stage filter changes to a valid decision type
  // This passes the type filter to the API for server-side filtering
  $: {
    const validDecisionTypes = Object.keys(decisionTypeConfig);
    const isValidType = validDecisionTypes.includes(stageFilter);
    const wasValidType = validDecisionTypes.includes(prevStageFilter);

    // Only reload if filter actually changed and is a valid type (or was valid)
    if (stageFilter !== prevStageFilter && (isValidType || wasValidType || stageFilter === 'all')) {
      decisionStore.load(isValidType ? { type: stageFilter } : undefined);
    }
    prevStageFilter = stageFilter;
  }

  // Initialize stores on mount
  onMount(() => {
    decisionStore.load();
    decisionStore.startPolling();
  });

  onDestroy(() => {
    decisionStore.stopPolling();
    unsubscribeFilters();
  });
  
  // Dropdowns
  let activeDropdown = null;
  let dropdownTimeout;

  function openDropdown(name) {
    clearTimeout(dropdownTimeout);
    activeDropdown = name;
  }

  function closeDropdownWithDelay() {
    dropdownTimeout = setTimeout(() => {
      activeDropdown = null;
    }, 50);
  }

  function toggleDropdown(name, event) {
    event?.stopPropagation();
    if (activeDropdown === name) {
      activeDropdown = null;
    } else {
      activeDropdown = name;
    }
  }

  function closeDropdowns() {
    activeDropdown = null;
  }

  // Navigation
  let selectedIndex = 0;
  let queueListEl;
  let detailPanelEl;
  let showCommandPalette = false;
  let commandSearch = '';
  let commandIndex = 0;
  let showSettings = false;

  // Local undo tracking (for quick skip undo)
  let lastAction = null;

  // Fuzzy Search
  let projectSearchOpen = false;
  let projectSearchQuery = '';
  let projectSearchIndex = 0;

  // Selected decision (derived from store's filtered list)
  $: selectedDecision = $filteredDecisions.length > 0
    ? $filteredDecisions[Math.min(selectedIndex, $filteredDecisions.length - 1)]
    : null;

  // Reset selection on filter change
  $: if ($filteredDecisions) {
    selectedIndex = Math.min(selectedIndex, Math.max(0, $filteredDecisions.length - 1));
  }

  // Counts from store
  $: counts = {
    all: $queueStats.total,
    urgent: $queueStats.urgent,
    byStage: $queueStats.byType,
    byThing: Object.keys(thingTypeConfig).reduce((acc, key) => {
      acc[key] = $pendingDecisions.filter(d => d.subject.type === key).length;
      return acc;
    }, {}),
    byProject: $allProjects.reduce((acc, proj) => {
      acc[proj] = $pendingDecisions.filter(d => d.project === proj).length;
      return acc;
    }, {}),
  };

  function scrollToSelected() {
    tick().then(() => {
      const selectedEl = queueListEl?.querySelector(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  function selectDecision(decision) {
    const idx = $filteredDecisions.findIndex(d => d.id === decision.id);
    if (idx !== -1) selectedIndex = idx;
  }

  function clearFilters() {
    filterStore.clear();
  }

  // --- Actions ---

  function markAsCompleted(decisionId) {
    decisionStore.updateDecision(decisionId, { status: 'completed' });
    // Note: Session decisions_resolved is tracked server-side
  }

  // Handle actions from the DecisionCard component
  async function handleCardAction(event) {
    const { name, decision, payload, resolution } = event.detail;

    // Auto-start session on first decision action
    await sessionStore.autoStartIfNeeded();

    // Special handling: Meeting Task Extraction
    if (name === 'Confirm Meeting Tasks' && payload?.selectedTasks) {
       const meetingTitle = decision.subject.title;
       const meetingProject = decision.project;

       // Filter extracting only checked tasks
       const tasksToCreate = decision.data.extractedTasks.filter(t => payload.selectedTasks[t.id]);

       const nextDecisions = tasksToCreate.map((task, i) => ({
          id: `d_new_${Date.now()}_${i}`,
          decisionType: 'triage',
          status: 'pending',
          subject: {
             type: 'task',
             id: `task_${Date.now()}_${i}`,
             title: task.title,
             source: 'transcript',
             parentTitle: meetingTitle
          },
          project: meetingProject,
          priority: task.priority === 'high' ? 'critical' : 'normal',
          question: 'Route extracted task',
          created: 'just now',
          data: {
             destination: ['Quick Win', 'Project Task', 'Reference'],
             suggestedDestination: 'Project Task',
             suggestedProject: meetingProject,
             suggestedPriority: task.priority === 'high' ? 'p1' : 'p2'
          },
          _isNew: true
       }));

       if (nextDecisions.length > 0) {
          uiStore.success(`Extracted ${nextDecisions.length} tasks`);
       }

       // Insert next decisions via store
       for (const nextDecision of nextDecisions) {
         decisionStore.insertAfter(decision.id, nextDecision);
       }

       // Mark the meeting triage decision as completed
       markAsCompleted(decision.id);
       moveToNextDecision();
       return;
    }

    // Standard resolution flow - call API through store
    try {
      const result = await decisionStore.resolve(decision.id, resolution);

      // Add to undo history
      if (result.actionId) {
        actionStore.add({
          id: result.actionId,
          decisionId: decision.id,
          decisionTitle: decision.subject.title,
          expiresAt: result.undoExpiresAt,
          timestamp: new Date(),
          actionName: name
        });
      }

      // Show success toast
      uiStore.success(`${name}: ${decision.subject.title}`);

      // Auto-select first chained decision if any, otherwise move to next
      if (result.chainedDecisions && result.chainedDecisions.length > 0) {
        await tick(); // Wait for store to update DOM
        selectDecision(result.chainedDecisions[0]);
        scrollToSelected();
      } else {
        moveToNextDecision();
      }

    } catch (error) {
      // Handle 409 conflict (already resolved)
      if (error.code === 'DE-DEC-002' || error.status === 409) {
        uiStore.info('Decision was already completed');
        // Don't rollback - decision should stay removed
        moveToNextDecision();
        return;
      }

      // Other errors: show error toast (store already rolled back)
      uiStore.error(getErrorMessage(error));
      return;
    }
  }

  function handleSkip() {
    if (!selectedDecision) return;
    lastAction = { type: 'skip', decision: selectedDecision, previousIndex: selectedIndex, timestamp: Date.now() };
    uiStore.success(`Skipped: ${selectedDecision.subject.title}`);
    moveToNextDecision();
  }

  function handleDefer() {
    // TODO: Open DeferDropdown component
    uiStore.info('Defer functionality coming soon');
  }

  function handleUndo() {
    if (!lastAction) { uiStore.info('Nothing to undo'); return; }
    if (Date.now() - lastAction.timestamp > 5000) { uiStore.info('Too late to undo'); lastAction = null; return; }

    uiStore.success('Undone');
    if (lastAction.type !== 'skip') {
      decisionStore.updateDecision(lastAction.decision.id, { status: 'pending' });
      // Note: Session decisions_resolved is tracked server-side
    }
    const idx = $filteredDecisions.findIndex(d => d.id === lastAction.decision.id);
    if (idx !== -1) { selectedIndex = idx; scrollToSelected(); }
    lastAction = null;
  }

  function moveToNextDecision() {
    if (selectedIndex >= $filteredDecisions.length - 1) {
      selectedIndex = Math.max(0, $filteredDecisions.length - 2);
    }
    scrollToSelected();
  }

  async function handleTaskCreate(event) {
    const { title, project, priority, description } = event.detail;

    try {
      // Call Engine API to create task in MDQ
      const result = await tasksApi.create({
        title,
        project: project || undefined,
        priority: priority || 'normal',
        description: description || undefined,
      });

      showTaskCreationModal = false;
      uiStore.success(result.message);

      // Task will appear via event-driven flow:
      // MDQ creates file -> Engine receives event -> Creates triage decision ->
      // Dashboard receives via WebSocket/polling
    } catch (error) {
      uiStore.error(`Failed to create task: ${error.message || 'Unknown error'}`);
    }
  }

  // --- Keyboard Shortcuts ---
  function handleKeydown(event) {
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
    if (event.ctrlKey && event.key === 'z') { event.preventDefault(); handleUndo(); return; }
    if (event.key === '/' && !isTyping) { event.preventDefault(); document.getElementById('global-search')?.focus(); return; }
    if (event.key === 'o' && (!isTyping || event.ctrlKey)) { event.preventDefault(); showCommandPalette = !showCommandPalette; commandSearch = ''; commandIndex = 0; return; }
    if (event.key === 'Escape') {
      if (showCommandPalette) { showCommandPalette = false; return; }
      if (showSettings) { showSettings = false; return; }
      if (isTyping) { event.target.blur(); return; }
    }
    if (showCommandPalette) { handleCommandPaletteKeydown(event); return; }
    if (isTyping) return;
    if (event.altKey) { handleAltShortcut(event); return; }
    handleNavigationShortcut(event);
  }

  function handleNavigationShortcut(event) {
    switch (event.key) {
      case 'ArrowUp': case 'k': event.preventDefault(); if (selectedIndex > 0) { selectedIndex--; scrollToSelected(); } break;
      case 'ArrowDown': case 'j': event.preventDefault(); if (selectedIndex < $filteredDecisions.length - 1) { selectedIndex++; scrollToSelected(); } break;
      case 'Home': event.preventDefault(); selectedIndex = 0; scrollToSelected(); break;
      case 'End': event.preventDefault(); selectedIndex = Math.max(0, $filteredDecisions.length - 1); scrollToSelected(); break;
      case 's': event.preventDefault(); handleSkip(); break;
      case 'c': event.preventDefault(); clearFilters(); uiStore.info('Filters cleared'); break;
      case '?': event.preventDefault(); showSettings = true; break;
      case 'l': case 'ArrowRight': event.preventDefault(); detailPanelEl?.querySelector('input, textarea, select, button.action-btn')?.focus(); break;
      case 'i': event.preventDefault(); goto('/inbox'); break;
      case 'f': event.preventDefault(); goto('/focus'); break;
      case ',': event.preventDefault(); goto('/settings'); break;
    }
  }

  function handleAltShortcut(event) {
    const key = event.key.toLowerCase();

    // Group shortcuts: Alt+0 for all, Alt+1-5 for workflow groups
    const sortedGroups = getSortedGroups();
    const groupMap = { '0': 'all' };
    sortedGroups.forEach(([groupKey], index) => {
      groupMap[String(index + 1)] = groupKey;
    });

    if (groupMap[key]) {
      event.preventDefault();
      if (key === '0') {
        filterStore.setStageGroup('all');
        uiStore.info('Filter: All Stages');
      } else {
        const groupKey = groupMap[key];
        const group = decisionTypeGroups[groupKey];
        filterStore.setStageGroup(groupKey);
        uiStore.info(`Filter: ${group.label}`);
      }
      return;
    }

    // Legacy type shortcuts (for backwards compatibility)
    const typeMap = { 's': 'specification', 'r': 'review', 'e': 'enrichment', 'c': 'conflict', 'm': 'meeting_tasks' };
    if (typeMap[key]) {
      event.preventDefault();
      filterStore.setStageType(typeMap[key]);
      const config = decisionTypeConfig[typeMap[key]];
      uiStore.info(`Filter: ${config?.label || typeMap[key]}`);
    }
  }

  // --- Command Palette ---
  function getCommands() {
    // Build group filter commands dynamically
    const groupCommands = getSortedGroups().map(([groupKey, group], index) => ({
      id: `filter-group-${groupKey}`,
      label: `Filter: ${group.icon} ${group.label}`,
      shortcut: `Alt+${index + 1}`,
      action: () => { filterStore.setStageGroup(groupKey); }
    }));

    return [
      { id: 'nav-up', label: 'Previous item', action: () => { if (selectedIndex > 0) selectedIndex--; scrollToSelected(); } },
      { id: 'nav-down', label: 'Next item', action: () => { if (selectedIndex < $filteredDecisions.length - 1) selectedIndex++; scrollToSelected(); } },
      { id: 'filter-all', label: 'Filter: All Stages', shortcut: 'Alt+0', action: () => { filterStore.setStageGroup('all'); } },
      ...groupCommands,
      { id: 'action-skip', label: 'Skip', action: handleSkip },
      { id: 'view-inbox', label: 'Inbox', action: () => goto('/inbox') },
      { id: 'view-focus', label: 'Focus Mode', action: () => goto('/focus') },
      { id: 'view-agents', label: 'Agents Status', action: () => goto('/agents') },
      { id: 'settings', label: 'Keyboard Shortcuts', action: () => showSettings = true }
    ];
  }
  $: commands = getCommands();
  $: paletteFilteredCommands = commandSearch ? commands.filter(c => c.label.toLowerCase().includes(commandSearch.toLowerCase())) : commands;
  
  function handleCommandPaletteKeydown(event) {
    if (event.key === 'ArrowUp') { event.preventDefault(); commandIndex = Math.max(0, commandIndex - 1); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); commandIndex = Math.min(paletteFilteredCommands.length - 1, commandIndex + 1); }
    else if (event.key === 'Enter') {
        event.preventDefault();
        if (paletteFilteredCommands[commandIndex]) {
            showCommandPalette = false;
            paletteFilteredCommands[commandIndex].action();
        }
    }
  }

  $: commandSearch, commandIndex = 0;
</script>

<svelte:window on:keydown={handleKeydown} on:click={closeDropdowns} />

<div class="min-h-screen bg-zinc-900 text-zinc-100 font-sans">
  <!-- Session Bar -->
  <SessionBar />

  <!-- Header -->
  <div class="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur z-20 sticky top-8">
    <div class="px-6 py-4">
      <div class="flex items-center justify-between mb-4 gap-6">
        <div>
          <h1 class="text-xl font-semibold tracking-tight">Decision Queue</h1>
          <p class="text-xs text-zinc-400 mt-1">Orchestrating {$filteredDecisions.length} items</p>
        </div>

        <!-- Search -->
        <div class="relative flex-1 max-w-md hidden md:block">
          <input
            id="global-search" type="text" placeholder="Search... (/)"
            class="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-4 pr-4 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
            bind:value={searchQuery}
          />
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3">
           <button on:click={() => showTaskCreationModal = true} class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-sm font-medium transition-colors">+ New Task</button>
           <a href="/inbox" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-sm transition-colors">Inbox</a>
           <a href="/focus" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-sm transition-colors">Focus</a>
           <a href="/agents" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-sm transition-colors">Agents</a>
           <a href="/logs" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-sm transition-colors">Logs</a>
           <a href="/settings" class="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-md transition-colors" title="Settings">
             <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
           </a>
        </div>
      </div>

      <!-- Filters (Restored Dropdowns) -->
      <div class="flex items-center gap-3 relative z-30">
        
        <!-- Stage Filter (Grouped) -->
        <div class="relative" on:mouseenter={() => openDropdown('stage')} on:mouseleave={closeDropdownWithDelay}>
          <button on:click={(e) => toggleDropdown('stage', e)} class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all {stageFilter !== 'all' ? 'bg-amber-600/20 border-amber-600/50 text-amber-200' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}">
            {#if stageFilter === 'all'}
              <span>Stage</span>
            {:else if stageFilter === 'urgent'}
              <span>Urgent</span>
            {:else if stageMode === 'group'}
              <span>{decisionTypeGroups[stageFilter]?.icon} {decisionTypeGroups[stageFilter]?.label}</span>
            {:else}
              <span>{decisionTypeConfig[stageFilter]?.icon} {decisionTypeConfig[stageFilter]?.label}</span>
            {/if}
            <span class="text-[10px] opacity-60">▼</span>
          </button>
          {#if activeDropdown === 'stage'}
            <div class="absolute top-full left-0 mt-1 w-64 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden py-1 max-h-96 overflow-y-auto">
              <!-- All Stages -->
              <button on:click={() => { filterStore.setStageGroup('all'); closeDropdowns(); }} class="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 transition-colors flex justify-between {stageFilter === 'all' ? 'text-amber-400' : 'text-zinc-300'}">
                <span>All Stages</span>
                <span class="text-xs text-zinc-500">Alt+0</span>
              </button>
              <div class="h-px bg-zinc-700/50 my-1 mx-2"></div>

              <!-- Grouped Decision Types -->
              {#each getSortedGroups() as [groupKey, group], groupIndex}
                <!-- Group Header (clickable to filter entire group) -->
                <button
                  on:click={() => { filterStore.setStageGroup(groupKey); closeDropdowns(); }}
                  class="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 transition-colors flex justify-between items-center {stageFilter === groupKey && stageMode === 'group' ? 'text-amber-400 bg-amber-900/10' : 'text-zinc-200'}"
                >
                  <span class="flex items-center gap-2 font-medium">
                    <span>{group.icon}</span>
                    <span>{group.label}</span>
                  </span>
                  <span class="text-xs text-zinc-500">Alt+{groupIndex + 1}</span>
                </button>

                <!-- Individual Types (indented) -->
                {#each group.types as typeKey}
                  {#if decisionTypeConfig[typeKey] && !decisionTypeConfig[typeKey].deprecated}
                    <button
                      on:click={() => { filterStore.setStageType(typeKey); closeDropdowns(); }}
                      class="w-full text-left pl-8 pr-4 py-1.5 text-sm hover:bg-zinc-700 transition-colors flex justify-between {stageFilter === typeKey && stageMode === 'type' ? 'text-amber-400' : 'text-zinc-400'}"
                    >
                      <span>{decisionTypeConfig[typeKey].icon} {decisionTypeConfig[typeKey].label}</span>
                      {#if stageFilter === typeKey && stageMode === 'type'}<span class="text-amber-400">check</span>{/if}
                    </button>
                  {/if}
                {/each}

                {#if groupIndex < getSortedGroups().length - 1}
                  <div class="h-px bg-zinc-700/50 my-1 mx-2"></div>
                {/if}
              {/each}
            </div>
          {/if}
        </div>

        <!-- Type Filter -->
        <div class="relative" on:mouseenter={() => openDropdown('thing')} on:mouseleave={closeDropdownWithDelay}>
          <button on:click={(e) => toggleDropdown('thing', e)} class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all {thingFilter !== 'all' ? 'bg-amber-600/20 border-amber-600/50 text-amber-200' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}">
            {#if thingFilter === 'all'}<span>Type</span>{:else}<span>{thingTypeConfig[thingFilter]?.icon} {thingTypeConfig[thingFilter]?.label}</span>{/if}
            <span class="text-[10px] opacity-60">▼</span>
          </button>
          {#if activeDropdown === 'thing'}
            <div class="absolute top-full left-0 mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden py-1">
              <button on:click={() => { thingFilter = 'all'; closeDropdowns(); }} class="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 transition-colors flex justify-between {thingFilter === 'all' ? 'text-amber-400' : 'text-zinc-300'}">All Types {#if thingFilter === 'all'}✓{/if}</button>
              <div class="h-px bg-zinc-700/50 my-1 mx-2"></div>
              {#each Object.entries(thingTypeConfig) as [key, config]}
                <button on:click={() => { thingFilter = key; closeDropdowns(); }} class="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 transition-colors flex justify-between {thingFilter === key ? 'text-amber-400' : 'text-zinc-300'}">
                  <span>{config.icon} {config.label}</span>{#if thingFilter === key}✓{/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Project Filter -->
        <div class="relative" on:mouseenter={() => openDropdown('project')} on:mouseleave={closeDropdownWithDelay}>
          <button on:click={(e) => toggleDropdown('project', e)} class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all {projectFilter !== 'all' ? 'bg-amber-600/20 border-amber-600/50 text-amber-200' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}">
            {#if projectFilter === 'all'}<span>Project</span>{:else}<span class="truncate max-w-[150px]">{projectFilter}</span>{/if}
            <span class="text-[10px] opacity-60">▼</span>
          </button>
          {#if activeDropdown === 'project'}
            <div class="absolute top-full left-0 mt-1 w-64 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden py-1 max-h-80 overflow-y-auto">
              <button on:click={() => { projectFilter = 'all'; closeDropdowns(); }} class="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 transition-colors flex justify-between {projectFilter === 'all' ? 'text-amber-400' : 'text-zinc-300'}">All Projects {#if projectFilter === 'all'}✓{/if}</button>
              <div class="h-px bg-zinc-700/50 my-1 mx-2"></div>
              {#each $allProjects as project}
                <button on:click={() => { projectFilter = project; closeDropdowns(); }} class="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 transition-colors flex justify-between {projectFilter === project ? 'text-amber-400' : 'text-zinc-300'}">
                  <span class="truncate">{project}</span>{#if projectFilter === project}✓{/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>

        {#if $hasActiveFilters}
          <div class="h-6 w-px bg-zinc-800 mx-1"></div>
          <button on:click={clearFilters} class="text-xs text-amber-500 hover:text-amber-400 font-medium px-2 py-1 rounded hover:bg-amber-900/20 transition-colors">Reset</button>
        {/if}
      </div>
    </div>
  </div>

  <div class="flex h-[calc(100vh-140px)]">
    <!-- Loading State - full width skeleton -->
    {#if $isLoading && $decisions.length === 0}
      <LoadingState count={5} showDetail={true} />

    <!-- Error State -->
    {:else if $storeError}
      <div class="flex-1 flex items-center justify-center">
        <ErrorState error={$storeError} onRetry={() => decisionStore.refresh()} />
      </div>

    <!-- Empty State: All caught up -->
    {:else if $pendingDecisions.length === 0}
      <div class="flex-1 flex items-center justify-center">
        <EmptyState variant="empty" />
      </div>

    <!-- Empty State: No filter matches -->
    {:else if $filteredDecisions.length === 0 && $hasActiveFilters}
      <div class="flex-1 flex items-center justify-center">
        <EmptyState variant="filtered" onClearFilters={clearFilters} />
      </div>

    <!-- Normal State: Show queue list and detail panel -->
    {:else}
      <!-- Queue List -->
      <div class="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900" bind:this={queueListEl}>
         <div class="flex-1 overflow-y-auto">
            {#each $filteredDecisions as decision, index (decision.id)}
               {@const config = decisionTypeConfig[decision.decisionType]}
               <button
                  on:click={() => selectDecision(decision)}
                  data-index={index}
                  class="w-full text-left px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors relative group
                  {selectedIndex === index ? 'bg-zinc-800/80' : ''}"
               >
                  <!-- Active Indicator -->
                  {#if selectedIndex === index}
                    <div class="absolute left-0 top-0 bottom-0 w-1 {config.bgClass.replace('/20','')}"></div>
                  {/if}

                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-[10px] uppercase font-bold tracking-wider text-zinc-500">{config.label}</span>
                    {#if decision.priority === 'urgent'}<span class="text-[10px] text-red-400 font-bold">URGENT</span>{/if}
                    <span class="text-[10px] text-zinc-600 ml-auto">{decision.created}</span>
                  </div>
                  <div class="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{decision.subject.title}</div>
                  <div class="text-xs text-zinc-500 truncate mt-0.5">{decision.question}</div>
               </button>
            {/each}

            <!-- Load More Button -->
            {#if $hasMore}
              <div class="p-4 border-t border-zinc-800">
                <button
                  on:click={() => decisionStore.loadMore()}
                  disabled={$isLoadingMore}
                  class="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 text-sm rounded-lg transition-colors"
                >
                  {#if $isLoadingMore}
                    Loading...
                  {:else}
                    Load More
                  {/if}
                </button>
              </div>
            {/if}
         </div>
      </div>

      <!-- Active Decision Panel -->
      <div class="flex-1 bg-zinc-900/30 overflow-y-auto" bind:this={detailPanelEl}>
         {#if selectedDecision}
           <DecisionCard
              decision={selectedDecision}
              on:action={handleCardAction}
              on:skip={handleSkip}
              on:defer={handleDefer}
           />
         {:else}
           <div class="flex items-center justify-center h-full text-zinc-500">
             <div class="text-center">
                <div class="text-4xl mb-4 opacity-30">⚡</div>
                <p>Select an item to start processing</p>
             </div>
           </div>
         {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Command Palette Modal -->
{#if showCommandPalette}
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <div
    class="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-[15vh]"
    on:click={() => showCommandPalette = false}
    on:keydown={(e) => e.key === 'Escape' && (showCommandPalette = false)}
    role="dialog"
    aria-modal="true"
    aria-label="Command palette"
  >
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="bg-zinc-800 rounded-xl w-full max-w-lg shadow-2xl border border-zinc-700 overflow-hidden"
      on:click|stopPropagation
    >
      <!-- Search input -->
      <div class="p-4 border-b border-zinc-700 flex items-center gap-3">
        <span class="text-zinc-500">🔍</span>
        <input
          type="text"
          placeholder="Type a command..."
          class="w-full bg-transparent text-zinc-100 text-lg outline-none placeholder-zinc-500"
          bind:value={commandSearch}
          autofocus
        />
        <kbd class="text-xs bg-zinc-700 px-2 py-1 rounded text-zinc-400">Esc</kbd>
      </div>

      <!-- Command list -->
      <div class="max-h-80 overflow-y-auto p-2">
        {#if paletteFilteredCommands.length === 0}
          <div class="text-center py-4 text-zinc-500">
            No commands found
          </div>
        {:else}
          {#each paletteFilteredCommands as command, i}
            <button
              class="w-full text-left px-3 py-2 rounded flex items-center justify-between transition-colors
                     {commandIndex === i ? 'bg-amber-600/20 text-amber-100' : 'hover:bg-zinc-700 text-zinc-200'}"
              on:click={() => { showCommandPalette = false; command.action(); }}
              on:mouseenter={() => commandIndex = i}
            >
              <div class="flex items-center gap-3">
                <span class="text-zinc-500">-</span>
                <span>{command.label}</span>
              </div>
              {#if command.shortcut}
                <kbd class="text-xs bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-400">{command.shortcut}</kbd>
              {/if}
            </button>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      <div class="p-3 border-t border-zinc-700 text-xs text-zinc-500 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span><kbd class="bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-400">↑↓</kbd> navigate</span>
          <span><kbd class="bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-400">Enter</kbd> select</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Settings Modal (Restored) -->
{#if showSettings}
  <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" on:click={() => showSettings = false}>
    <div class="bg-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl border border-zinc-700" on:click|stopPropagation>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold text-zinc-100">Keyboard Shortcuts</h2>
        <button on:click={() => showSettings = false} class="text-zinc-500 hover:text-zinc-300">×</button>
      </div>
      <div class="space-y-4 text-sm text-zinc-300">
        <div class="space-y-2">
          <div class="text-xs text-zinc-500 uppercase tracking-wider">Navigation</div>
          <div class="flex justify-between"><span>Previous / Next item</span><kbd class="bg-zinc-700 px-2 rounded">k / j</kbd></div>
          <div class="flex justify-between"><span>Open Command Palette</span><kbd class="bg-zinc-700 px-2 rounded">o</kbd></div>
          <div class="flex justify-between"><span>Focus Search</span><kbd class="bg-zinc-700 px-2 rounded">/</kbd></div>
        </div>
        <div class="space-y-2">
          <div class="text-xs text-zinc-500 uppercase tracking-wider">Actions</div>
          <div class="flex justify-between"><span>Skip Decision</span><kbd class="bg-zinc-700 px-2 rounded">s</kbd></div>
          <div class="flex justify-between"><span>Clear Filters</span><kbd class="bg-zinc-700 px-2 rounded">c</kbd></div>
        </div>
        <div class="space-y-2">
          <div class="text-xs text-zinc-500 uppercase tracking-wider">Stage Filters</div>
          <div class="flex justify-between"><span>All Stages</span><kbd class="bg-zinc-700 px-2 rounded">Alt+0</kbd></div>
          <div class="flex justify-between"><span>Intake</span><kbd class="bg-zinc-700 px-2 rounded">Alt+1</kbd></div>
          <div class="flex justify-between"><span>Refinement</span><kbd class="bg-zinc-700 px-2 rounded">Alt+2</kbd></div>
          <div class="flex justify-between"><span>Execution</span><kbd class="bg-zinc-700 px-2 rounded">Alt+3</kbd></div>
          <div class="flex justify-between"><span>Verification</span><kbd class="bg-zinc-700 px-2 rounded">Alt+4</kbd></div>
          <div class="flex justify-between"><span>Exceptions</span><kbd class="bg-zinc-700 px-2 rounded">Alt+5</kbd></div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Output any modals if they are open -->
{#if showClarificationModal}
  <ClarificationModal
    taskTitle={clarificationTask?.subject?.title}
    questions={clarificationQuestions}
    on:close={() => showClarificationModal = false}
    on:submit={() => {/* Handled via decision updates mainly */}}
  />
{/if}

{#if showTaskCreationModal}
  <TaskCreationModal
    on:close={() => showTaskCreationModal = false}
    on:submit={handleTaskCreate}
  />
{/if}
