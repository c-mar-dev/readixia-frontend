<!-- +page.svelte -->
<script>
  import { tick } from 'svelte';
  import { goto } from '$app/navigation';
  import ClarificationModal from '$lib/components/ClarificationModal.svelte';
  import CriteriaChecklist from '$lib/components/CriteriaChecklist.svelte';
  import TaskCreationModal from '$lib/components/TaskCreationModal.svelte';
  
  import {
    mockDecisions,
    decisionTypeConfig,
    thingTypeConfig,
    knownSpeakers,
    allProjects
  } from '$lib/data/decisions.js';

  // Local decisions state
  let decisions = [...mockDecisions];

  // Modal states
  let showClarificationModal = false;
  let showTaskCreationModal = false;
  let clarificationTask = null;
  let clarificationQuestions = [];

  // Filter state
  let stageFilter = 'all';
  let thingFilter = 'all';
  let projectFilter = 'all';
  let searchQuery = '';
  
  // Forms & Inputs
  let activeDropdown = null;
  let dropdownTimeout;
  let formData = {}; // Generic form data holder

  // Session stats
  let completedThisSession = 0;
  let sessionTotal = decisions.filter(d => d.status === 'pending').length;

  // Navigation
  let selectedIndex = 0;
  let queueListEl;
  let detailPanelEl;
  let showCommandPalette = false;
  let commandSearch = '';
  let commandIndex = 0;
  let showSettings = false;

  // Toasts
  let toastId = 0;
  let toasts = [];
  let lastAction = null;

  // Fuzzy Search
  let projectSearchOpen = false;
  let projectSearchQuery = '';
  let projectSearchIndex = 0;
  let speakersSearchOpen = false;
  let speakersSearchQuery = '';
  let speakersSearchIndex = 0;

  // --- Handlers ---

  function openDropdown(name) {
    clearTimeout(dropdownTimeout);
    activeDropdown = name;
  }

  function closeDropdownWithDelay() {
    dropdownTimeout = setTimeout(() => { activeDropdown = null; }, 50);
  }

  function toggleDropdown(name, event) {
    event?.stopPropagation();
    activeDropdown = activeDropdown === name ? null : name;
  }

  function closeDropdowns() {
    activeDropdown = null;
  }

  // Reactive Filters
  $: pendingDecisions = decisions.filter(d => d.status === 'pending');
  $: filteredDecisions = pendingDecisions.filter(d => {
    if (stageFilter !== 'all' && stageFilter !== 'urgent' && d.decisionType !== stageFilter) return false;
    if (stageFilter === 'urgent' && d.priority !== 'urgent') return false;
    if (thingFilter !== 'all' && d.subject.type !== thingFilter) return false;
    if (projectFilter !== 'all' && d.project !== projectFilter) return false;
    if (searchQuery && !d.subject.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  $: selectedDecision = filteredDecisions.length > 0
    ? filteredDecisions[Math.min(selectedIndex, filteredDecisions.length - 1)]
    : null;

  // Reset selection on filter change
  $: if (filteredDecisions) {
    selectedIndex = Math.min(selectedIndex, Math.max(0, filteredDecisions.length - 1));
  }

  // Counts
  $: counts = {
    all: pendingDecisions.length,
    urgent: pendingDecisions.filter(d => d.priority === 'urgent').length,
    byStage: Object.keys(decisionTypeConfig).reduce((acc, key) => {
      acc[key] = pendingDecisions.filter(d => d.decisionType === key).length;
      return acc;
    }, {}),
    byThing: Object.keys(thingTypeConfig).reduce((acc, key) => {
      acc[key] = pendingDecisions.filter(d => d.subject.type === key).length;
      return acc;
    }, {}),
    byProject: allProjects.reduce((acc, proj) => {
      acc[proj] = pendingDecisions.filter(d => d.project === proj).length;
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
    const idx = filteredDecisions.findIndex(d => d.id === decision.id);
    if (idx !== -1) selectedIndex = idx;
    formData = {}; // Reset form data
  }

  function clearFilters() {
    stageFilter = 'all';
    thingFilter = 'all';
    projectFilter = 'all';
    searchQuery = '';
  }

  $: hasActiveFilters = stageFilter !== 'all' || thingFilter !== 'all' || projectFilter !== 'all' || searchQuery !== '';

  // --- Actions ---

  function showToast(message, type = 'success') {
    const id = toastId++;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 3000);
  }

  function markAsCompleted(decisionId) {
    const idx = decisions.findIndex(d => d.id === decisionId);
    if (idx !== -1) {
      decisions[idx] = { ...decisions[idx], status: 'completed' };
      decisions = [...decisions];
      completedThisSession++;
    }
  }

  function handleAction(actionName, decision) {
    showToast(`${actionName}: ${decision.subject.title}`, 'success');
    lastAction = { type: 'action', name: actionName, decision, previousIndex: selectedIndex, timestamp: Date.now() };
    markAsCompleted(decision.id);
    moveToNextDecision();
  }

  function handleSkip() {
    if (!selectedDecision) return;
    lastAction = { type: 'skip', decision: selectedDecision, previousIndex: selectedIndex, timestamp: Date.now() };
    showToast(`Skipped: ${selectedDecision.subject.title}`, 'success');
    moveToNextDecision();
  }

  function handleUndo() {
    if (!lastAction) { showToast('Nothing to undo', 'info'); return; }
    if (Date.now() - lastAction.timestamp > 5000) { showToast('Too late to undo', 'info'); lastAction = null; return; }
    
    showToast(`Undone`, 'success');
    if (lastAction.type !== 'skip') {
      const idx = decisions.findIndex(d => d.id === lastAction.decision.id);
      if (idx !== -1) {
        decisions[idx] = { ...decisions[idx], status: 'pending' };
        decisions = [...decisions];
        completedThisSession--;
      }
    }
    const idx = filteredDecisions.findIndex(d => d.id === lastAction.decision.id);
    if (idx !== -1) { selectedIndex = idx; scrollToSelected(); }
    lastAction = null;
  }

  function moveToNextDecision() {
    if (selectedIndex >= filteredDecisions.length - 1) {
      selectedIndex = Math.max(0, filteredDecisions.length - 2);
    }
    scrollToSelected();
  }

  // --- Specific Handlers ---

  function handleTaskCreate(event) {
    const { title, project, priority } = event.detail;
    const newDecision = {
      id: `d_new_${Date.now()}`,
      decisionType: 'triage',
      status: 'pending',
      subject: { type: 'task', id: `task_${Date.now()}`, title: title, source: 'manual' },
      project: project || null,
      priority: priority,
      question: 'Route this item',
      created: 'just now',
      data: {
        destination: ['Quick Win', 'Project Task', 'Reference'],
        suggestedDestination: 'Project Task',
        suggestedProject: project || 'Inbox',
        suggestedPriority: priority || 'normal'
      },
      _isNew: true
    };
    decisions = [newDecision, ...decisions];
    showTaskCreationModal = false;
    showToast(`Task created: ${title}`, 'success');
    tick().then(() => { selectDecision(newDecision); scrollToSelected(); });
  }

  // Fuzzy Match Helpers
  function fuzzyMatch(query, text) {
    if (!query) return true;
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();
    let queryIndex = 0;
    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
      if (lowerText[i] === lowerQuery[queryIndex]) queryIndex++;
    }
    return queryIndex === lowerQuery.length;
  }

  $: filteredProjects = allProjects.filter(p => fuzzyMatch(projectSearchQuery, p));

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
    if (isTyping) return; // Allow typing in forms
    if (event.altKey) { handleAltShortcut(event); return; }
    handleNavigationShortcut(event);
  }

  function handleNavigationShortcut(event) {
    switch (event.key) {
      case 'ArrowUp': case 'k': event.preventDefault(); if (selectedIndex > 0) { selectedIndex--; scrollToSelected(); } break;
      case 'ArrowDown': case 'j': event.preventDefault(); if (selectedIndex < filteredDecisions.length - 1) { selectedIndex++; scrollToSelected(); } break;
      case 'Home': event.preventDefault(); selectedIndex = 0; scrollToSelected(); break;
      case 'End': event.preventDefault(); selectedIndex = Math.max(0, filteredDecisions.length - 1); scrollToSelected(); break;
      case 's': event.preventDefault(); handleSkip(); break;
      case 'c': event.preventDefault(); clearFilters(); showToast('Filters cleared', 'info'); break;
      case '?': event.preventDefault(); showSettings = true; break;
      case 'l': case 'ArrowRight': event.preventDefault(); detailPanelEl?.querySelector('input, textarea, select, button.action-btn')?.focus(); break;
      case 'i': event.preventDefault(); goto('/inbox'); break;
      case 'f': event.preventDefault(); goto('/focus'); break;
    }
  }

  function handleAltShortcut(event) {
    const key = event.key.toLowerCase();
    const map = { '0': 'all', 'u': 'urgent', 't': 'triage', 's': 'specify', 'r': 'review', 'e': 'enrich', 'c': 'conflict', 'm': 'meeting_triage' };
    if (map[key]) {
      event.preventDefault();
      stageFilter = map[key];
      showToast(`Filter: ${stageFilter}`, 'info');
    }
  }

  // --- Command Palette ---
  function getCommands() {
    return [
      { id: 'nav-up', label: 'Previous', action: () => { if (selectedIndex > 0) selectedIndex--; scrollToSelected(); } },
      { id: 'nav-down', label: 'Next', action: () => { if (selectedIndex < filteredDecisions.length - 1) selectedIndex++; scrollToSelected(); } },
      { id: 'filter-all', label: 'All Stages', action: () => { stageFilter = 'all'; } },
      { id: 'action-skip', label: 'Skip', action: handleSkip },
      { id: 'view-inbox', label: 'Inbox', action: () => goto('/inbox') }
    ];
  }
  $: commands = getCommands();
  $: filteredCommands = commandSearch ? commands.filter(c => c.label.toLowerCase().includes(commandSearch.toLowerCase())) : commands;
  
  function handleCommandPaletteKeydown(event) {
    if (event.key === 'ArrowUp') commandIndex = Math.max(0, commandIndex - 1);
    else if (event.key === 'ArrowDown') commandIndex = Math.min(filteredCommands.length - 1, commandIndex + 1);
    else if (event.key === 'Enter' && filteredCommands[commandIndex]) { showCommandPalette = false; filteredCommands[commandIndex].action(); }
  }
</script>

<svelte:window on:keydown={handleKeydown} on:click={closeDropdowns} />

<div class="min-h-screen bg-zinc-900 text-zinc-100 font-sans">
  <!-- Header -->
  <div class="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur z-20 sticky top-0">
    <div class="px-6 py-4">
      <div class="flex items-center justify-between mb-4 gap-6">
        <div>
          <h1 class="text-xl font-semibold tracking-tight">Decision Queue</h1>
          <p class="text-xs text-zinc-400 mt-1">Orchestrating {filteredDecisions.length} items</p>
        </div>

        <!-- Search -->
        <div class="relative flex-1 max-w-md hidden md:block">
          <input
            id="global-search" type="text" placeholder="Search... (/)"
            class="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-4 pr-4 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
            bind:value={searchQuery}
          />
        </div>

        <!-- Stats -->
        <div class="flex-1 max-w-xs hidden lg:block">
          <div class="flex justify-between text-[10px] uppercase font-bold text-zinc-500 mb-1">
            <span>Velocity</span><span>{completedThisSession} / {sessionTotal}</span>
          </div>
          <div class="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div class="h-full bg-amber-500 transition-all" style="width: {(completedThisSession / Math.max(1, sessionTotal)) * 100}%"></div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3">
           <button on:click={() => showTaskCreationModal = true} class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-sm font-medium transition-colors">+ New Task</button>
           <a href="/inbox" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-sm transition-colors">Inbox</a>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-2">
         {#each ['all', 'urgent', 'triage', 'specify', 'review'] as filter}
            <button 
              on:click={() => stageFilter = filter}
              class="px-2.5 py-1 rounded-md text-xs font-medium border transition-colors capitalize
              {stageFilter === filter ? 'bg-zinc-800 border-zinc-600 text-zinc-200' : 'border-transparent text-zinc-500 hover:text-zinc-300'}"
            >
              {filter}
            </button>
         {/each}
      </div>
    </div>
  </div>

  <div class="flex h-[calc(100vh-140px)]">
    <!-- Queue List -->
    <div class="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900" bind:this={queueListEl}>
       <div class="flex-1 overflow-y-auto">
         {#each filteredDecisions as decision, index}
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
                 <span class="text-[10px] uppercase font-bold tracking-wider text-zinc-500">{decision.decisionType}</span>
                 {#if decision.priority === 'urgent'}<span class="text-[10px] text-red-400 font-bold">URGENT</span>{/if}
                 <span class="text-[10px] text-zinc-600 ml-auto">{decision.created}</span>
               </div>
               <div class="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{decision.subject.title}</div>
               <div class="text-xs text-zinc-500 truncate mt-0.5">{decision.question}</div>
            </button>
         {/each}
       </div>
    </div>

    <!-- Active Decision Panel -->
    <div class="flex-1 bg-zinc-900/30 overflow-y-auto" bind:this={detailPanelEl}>
       {#if selectedDecision}
         {@const config = decisionTypeConfig[selectedDecision.decisionType]}
         {@const thingConfig = thingTypeConfig[selectedDecision.subject.type]}
         {@const data = selectedDecision.data || {}}

         <div class="max-w-4xl mx-auto p-8">
            <!-- Card Header -->
            <div class="mb-8 border-b border-zinc-800 pb-6">
               <div class="flex items-center gap-3 mb-4">
                  <span class="px-2 py-1 rounded text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">{config.icon} {config.label}</span>
                  <span class="px-2 py-1 rounded text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">{thingConfig.icon} {thingConfig.label}</span>
                  {#if selectedDecision.priority === 'urgent'}
                    <span class="px-2 py-1 rounded text-xs font-bold bg-red-900/30 text-red-400 border border-red-900/50">🔥 CRITICAL</span>
                  {/if}
               </div>
               <h2 class="text-2xl font-semibold text-white leading-tight mb-2">{selectedDecision.subject.title}</h2>
               {#if selectedDecision.subject.originalText}
                  <p class="text-zinc-500 italic text-sm">"{selectedDecision.subject.originalText}"</p>
               {/if}
            </div>

            <!-- Card Body - Dynamic based on Type -->
            <div class="space-y-8">
               
               <!-- 1. TRIAGE CARD -->
               {#if selectedDecision.decisionType === 'triage'}
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <!-- Left: Context -->
                     <div class="space-y-4">
                        <div class="text-xs font-bold text-zinc-500 uppercase tracking-wider">Source Context</div>
                        <div class="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 text-sm text-zinc-300 space-y-2">
                           <div><span class="text-zinc-500">Source:</span> {selectedDecision.subject.source}</div>
                           <div><span class="text-zinc-500">Received:</span> {selectedDecision.created}</div>
                           {#if data.context}<div>{data.context}</div>{/if}
                        </div>
                     </div>
                     
                     <!-- Right: Routing -->
                     <div class="space-y-4">
                        <div class="text-xs font-bold text-zinc-500 uppercase tracking-wider">Destination</div>
                        <div class="space-y-2">
                           {#each (data.destination || []) as dest}
                              <button 
                                on:click={() => handleAction('Route to ' + dest, selectedDecision)}
                                class="w-full text-left px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors flex justify-between items-center group"
                              >
                                 <span class="text-zinc-200 group-hover:text-white">{dest}</span>
                                 {#if dest === data.suggestedDestination}
                                    <span class="text-[10px] px-1.5 py-0.5 bg-amber-900/30 text-amber-400 rounded border border-amber-900/50">Suggested</span>
                                 {/if}
                              </button>
                           {/each}
                        </div>

                        <!-- Project/Priority Overrides -->
                        <div class="flex gap-4 mt-4">
                           <div class="flex-1">
                              <label class="block text-xs text-zinc-500 mb-1">Project</label>
                              <select class="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-zinc-300 outline-none focus:border-amber-500">
                                 <option>{data.suggestedProject || 'Select...'}</option>
                                 {#each allProjects as p}<option>{p}</option>{/each}
                              </select>
                           </div>
                           <div class="w-24">
                              <label class="block text-xs text-zinc-500 mb-1">Priority</label>
                              <select class="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-zinc-300 outline-none focus:border-amber-500">
                                 <option>{data.suggestedPriority || 'p3'}</option>
                                 <option>p1</option><option>p2</option><option>p3</option>
                              </select>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div class="pt-6 border-t border-zinc-800 flex justify-end gap-3">
                     <button on:click={handleSkip} class="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors">Defer</button>
                     <button on:click={() => handleAction('Archive', selectedDecision)} class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm border border-zinc-700 transition-colors">Archive</button>
                     <button on:click={() => handleAction('Proceed', selectedDecision)} class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors">Proceed to Spec &rarr;</button>
                  </div>

               <!-- 2. SPECIFICATION CARD -->
               {:else if selectedDecision.decisionType === 'specify'}
                  <!-- AI Spec Editor -->
                  <div class="space-y-4">
                     <div class="flex items-center justify-between">
                        <div class="text-xs font-bold text-zinc-500 uppercase tracking-wider">AI Suggested Spec</div>
                        <span class="text-xs text-amber-500 cursor-pointer hover:underline">Regenerate</span>
                     </div>
                     <div class="bg-zinc-800/30 border border-zinc-700 rounded-lg p-4">
                        {#if data.aiSpec}
                           <div class="grid gap-4">
                              {#each Object.entries(data.aiSpec) as [key, val]}
                                 <div>
                                    <label class="block text-xs text-zinc-500 uppercase mb-1">{key.replace(/([A-Z])/g, ' $1')}</label>
                                    <textarea 
                                      class="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-300 focus:border-amber-500/50 outline-none transition-colors min-h-[60px]"
                                      value={val}
                                    ></textarea>
                                 </div>
                              {/each}
                           </div>
                        {/if}
                     </div>
                  </div>

                  <!-- Success Criteria -->
                  {#if data.successCriteria}
                     <div class="space-y-4">
                        <div class="text-xs font-bold text-zinc-500 uppercase tracking-wider">Success Criteria</div>
                        <div class="bg-zinc-800/30 border border-zinc-700 rounded-lg overflow-hidden">
                           {#each data.successCriteria as criteria}
                              <label class="flex items-start gap-3 p-3 border-b border-zinc-700/50 last:border-0 hover:bg-zinc-800/50 cursor-pointer">
                                 <input type="checkbox" checked={criteria.checked} class="mt-1 rounded border-zinc-600 bg-zinc-700 text-amber-500 focus:ring-0" />
                                 <span class="text-sm text-zinc-300">{criteria.text}</span>
                              </label>
                           {/each}
                           <div class="p-2">
                              <input type="text" placeholder="+ Add criterion..." class="w-full bg-transparent p-2 text-sm text-zinc-400 focus:text-zinc-200 outline-none placeholder-zinc-600" />
                           </div>
                        </div>
                     </div>
                  {/if}

                  <!-- Actions -->
                  <div class="pt-6 border-t border-zinc-800 flex justify-between items-center">
                     <button class="text-sm text-zinc-500 hover:text-zinc-300">Back to Inbox</button>
                     <div class="flex gap-3">
                        <button class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm border border-zinc-700">Save Draft</button>
                        <button on:click={() => handleAction('Save & Continue', selectedDecision)} class="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium">Save & Continue &rarr;</button>
                     </div>
                  </div>

               <!-- 3. CLARIFICATION CARD -->
               {:else if selectedDecision.decisionType === 'clarifying'}
                  <div class="space-y-6">
                     <div class="bg-yellow-900/10 border border-yellow-700/30 p-4 rounded-lg">
                        <h3 class="text-yellow-500 font-medium mb-1">Blocking Questions</h3>
                        <p class="text-sm text-yellow-500/80">Claude needs answers to these questions before proceeding.</p>
                     </div>

                     <div class="space-y-6">
                        {#each (selectedDecision.clarificationQuestions || []) as q, i}
                           <div class="space-y-2">
                              <label class="flex gap-2 text-sm font-medium text-zinc-200">
                                 <span class="text-zinc-500">{i+1}.</span>
                                 {q.text}
                              </label>
                              {#if q.type === 'choice'}
                                 <div class="flex flex-wrap gap-2 ml-6">
                                    {#each q.options as opt}
                                       <label class="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded cursor-pointer hover:border-zinc-500 transition-colors">
                                          <input type="radio" name="q-{i}" class="text-amber-500 focus:ring-0 bg-zinc-700 border-zinc-600" />
                                          <span class="text-sm text-zinc-300">{opt}</span>
                                       </label>
                                    {/each}
                                 </div>
                              {:else if q.type === 'text'}
                                 <input type="text" class="w-full ml-6 max-w-xl bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-zinc-200 focus:border-amber-500 outline-none" placeholder="Type your answer..." />
                              {:else if q.type === 'number'}
                                 <input type="number" class="w-32 ml-6 bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-zinc-200 focus:border-amber-500 outline-none" />
                              {/if}
                           </div>
                        {/each}
                     </div>

                     <div class="pt-6 border-t border-zinc-800 flex justify-end gap-3">
                        <button class="px-4 py-2 text-zinc-400 hover:text-white text-sm">Answer Later</button>
                        <button on:click={() => handleAction('Submit Answers', selectedDecision)} class="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium">Submit & Start &rarr;</button>
                     </div>
                  </div>

               <!-- 4. VERIFICATION CARD -->
               {:else if selectedDecision.decisionType === 'verifying'}
                  <div class="space-y-6">
                     <div class="grid grid-cols-3 gap-4 mb-6">
                        <div class="bg-zinc-800/50 p-3 rounded border border-zinc-700">
                           <div class="text-[10px] text-zinc-500 uppercase">Attempt</div>
                           <div class="text-lg font-mono text-zinc-200">{data.attempt} / {data.maxAttempts}</div>
                        </div>
                        <div class="bg-zinc-800/50 p-3 rounded border border-zinc-700">
                           <div class="text-[10px] text-zinc-500 uppercase">Verifier</div>
                           <div class="text-lg font-mono text-zinc-200">{data.verifier}</div>
                        </div>
                        <div class="bg-zinc-800/50 p-3 rounded border border-zinc-700">
                           <div class="text-[10px] text-zinc-500 uppercase">Status</div>
                           <div class="text-lg font-bold text-red-400">Issues Found</div>
                        </div>
                     </div>

                     <div class="space-y-3">
                        <div class="text-xs font-bold text-zinc-500 uppercase tracking-wider">Criteria Check</div>
                        {#each (data.criteriaResults || []) as res}
                           <div class="flex items-center justify-between p-3 bg-zinc-800/30 border border-zinc-700/50 rounded">
                              <div class="flex items-center gap-3">
                                 <span class="text-lg">{res.status === 'pass' ? '✅' : '❌'}</span>
                                 <span class="text-sm text-zinc-300 {res.status === 'fail' ? 'line-through decoration-red-500/50' : ''}">{res.text}</span>
                              </div>
                              <span class="text-xs font-mono {res.status === 'pass' ? 'text-green-400' : 'text-red-400'}">{res.note}</span>
                           </div>
                        {/each}
                     </div>

                     {#if data.feedback}
                        <div class="bg-red-900/10 border border-red-900/30 p-4 rounded-lg">
                           <div class="text-xs text-red-400 font-bold uppercase mb-1">Verifier Feedback</div>
                           <p class="text-sm text-red-200/80 italic">"{data.feedback}"</p>
                        </div>
                     {/if}

                     <div class="pt-6 border-t border-zinc-800 flex justify-end gap-3">
                        <button class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm border border-zinc-700">Escalate</button>
                        <button on:click={() => handleAction('Override', selectedDecision)} class="px-4 py-2 bg-zinc-800 hover:bg-red-900/30 text-red-400 hover:text-red-300 rounded-lg text-sm border border-zinc-700 hover:border-red-800">Override & Accept</button>
                        <button on:click={() => handleAction('Auto-Retry', selectedDecision)} class="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium">Auto-Retry with Feedback</button>
                     </div>
                  </div>

               <!-- 5. REVIEW CARD -->
               {:else if selectedDecision.decisionType === 'review'}
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-96">
                     <!-- Spec Column -->
                     <div class="flex flex-col border border-zinc-700 rounded-lg overflow-hidden">
                        <div class="bg-zinc-800 p-2 text-xs font-bold text-zinc-400 uppercase text-center border-b border-zinc-700">Specification</div>
                        <div class="p-4 bg-zinc-900/50 flex-1 overflow-y-auto text-sm text-zinc-400 space-y-4">
                           {#if data.specSummary}
                              <div><span class="text-zinc-500 block mb-1">Objective:</span> {data.specSummary.objective}</div>
                              <div>
                                 <span class="text-zinc-500 block mb-1">Criteria:</span>
                                 <ul class="list-disc pl-4 space-y-1">
                                    {#each data.specSummary.criteria as c}<li>{c}</li>{/each}
                                 </ul>
                              </div>
                           {/if}
                        </div>
                     </div>
                     <!-- Result Column -->
                     <div class="flex flex-col border border-zinc-700 rounded-lg overflow-hidden">
                        <div class="bg-zinc-800 p-2 text-xs font-bold text-zinc-400 uppercase text-center border-b border-zinc-700">Result</div>
                        <div class="p-4 bg-zinc-900/50 flex-1 overflow-y-auto">
                           {#if data.resultSummary}
                              <div class="prose prose-invert prose-sm">
                                 <pre class="whitespace-pre-wrap font-sans text-zinc-300">{data.resultSummary.preview}</pre>
                              </div>
                              <div class="mt-4 flex gap-2">
                                 <a href={data.resultSummary.fullDocLink} class="text-xs text-blue-400 hover:underline">View full doc &rarr;</a>
                                 <a href={data.resultSummary.diffLink} class="text-xs text-blue-400 hover:underline">View diff &rarr;</a>
                              </div>
                           {/if}
                        </div>
                     </div>
                  </div>

                  <div class="pt-4">
                     <textarea class="w-full bg-zinc-800 border border-zinc-700 rounded p-3 text-sm text-zinc-200 outline-none focus:border-amber-500 h-20" placeholder="Optional feedback..."></textarea>
                  </div>

                  <div class="pt-4 flex justify-between items-center">
                     <button class="text-zinc-500 text-sm hover:text-zinc-300">Take over manually</button>
                     <div class="flex gap-3">
                        <button on:click={() => handleAction('Request Changes', selectedDecision)} class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm border border-zinc-700">Request Changes</button>
                        <button on:click={() => handleAction('Approve', selectedDecision)} class="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium">Approve & Complete</button>
                     </div>
                  </div>

               <!-- 6. CONFLICT CARD -->
               {:else if selectedDecision.decisionType === 'conflict'}
                  <div class="space-y-6">
                     <div class="grid grid-cols-2 gap-0 border border-zinc-700 rounded-lg overflow-hidden">
                        <!-- My Version -->
                        <div class="bg-zinc-900/50 p-4 border-r border-zinc-700">
                           <div class="text-xs text-zinc-500 uppercase font-bold mb-2">Your Version</div>
                           <div class="text-xs text-zinc-600 mb-4">Modified {data.myVersion?.modified} by {data.myVersion?.by}</div>
                           <div class="space-y-1">
                              {#each (data.myVersion?.changes || []) as change}
                                 <div class="text-sm text-red-400">- {change}</div>
                              {/each}
                           </div>
                        </div>
                        <!-- Incoming -->
                        <div class="bg-zinc-900/50 p-4">
                           <div class="text-xs text-zinc-500 uppercase font-bold mb-2">Incoming Version</div>
                           <div class="text-xs text-zinc-600 mb-4">Modified {data.incomingVersion?.modified} by {data.incomingVersion?.by}</div>
                           <div class="space-y-1">
                              {#each (data.incomingVersion?.changes || []) as change}
                                 <div class="text-sm text-green-400">+ {change}</div>
                              {/each}
                           </div>
                        </div>
                     </div>

                     <div class="flex justify-center gap-4">
                        <button on:click={() => handleAction('Keep Mine', selectedDecision)} class="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-200 text-sm font-medium">Keep Mine</button>
                        <button on:click={() => handleAction('Take Theirs', selectedDecision)} class="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-200 text-sm font-medium">Take Theirs</button>
                        <button class="px-6 py-3 bg-transparent text-zinc-500 hover:text-zinc-300 text-sm">Merge Manually &rarr;</button>
                     </div>
                  </div>

               <!-- 7. ESCALATE CARD -->
               {:else if selectedDecision.decisionType === 'escalate'}
                   <div class="bg-red-900/10 border border-red-900/30 rounded-lg p-6 space-y-6">
                      <div class="flex items-start gap-4">
                         <div class="text-3xl">🚨</div>
                         <div>
                            <h3 class="text-red-400 font-medium text-lg">Automation Failed</h3>
                            <p class="text-red-300/70 text-sm mt-1">{data.reason} (After {data.attempts} attempts)</p>
                         </div>
                      </div>

                      <div class="bg-black/30 rounded p-4 font-mono text-xs text-red-300 space-y-1">
                         {#each (data.history || []) as h}
                           <div>{h}</div>
                         {/each}
                      </div>

                      <div class="border-t border-red-900/30 pt-4 flex gap-3">
                         <button on:click={() => handleAction('Retry New Instructions', selectedDecision)} class="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-200 border border-red-800 rounded text-sm">Retry with New Instructions</button>
                         <button on:click={() => handleAction('Edit Myself', selectedDecision)} class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium">Edit Draft Myself</button>
                         <button on:click={() => handleAction('Abandon', selectedDecision)} class="ml-auto px-4 py-2 text-red-500/70 hover:text-red-400 text-sm">Abandon Task</button>
                      </div>
                   </div>

               <!-- 8. ENRICH CARD -->
               {:else if selectedDecision.decisionType === 'enrich'}
                  <div class="space-y-6">
                     <div class="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700 text-sm text-zinc-300 italic">
                        "{data.preview}"
                     </div>

                     <div class="grid grid-cols-2 gap-6">
                        <div>
                           <label class="block text-xs text-zinc-500 mb-2">Project</label>
                           <input type="text" value={data.suggestedProject} class="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-zinc-200 outline-none focus:border-amber-500" />
                        </div>
                        <div>
                           <label class="block text-xs text-zinc-500 mb-2">Meeting Date</label>
                           <input type="text" value={data.date} class="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-zinc-200 outline-none focus:border-amber-500" />
                        </div>
                     </div>

                     <div>
                        <label class="block text-xs text-zinc-500 mb-2">Speakers</label>
                        <div class="space-y-2">
                           {#each (data.speakers || []) as speaker}
                              <label class="flex items-center gap-2 p-2 bg-zinc-800/30 rounded cursor-pointer hover:bg-zinc-800">
                                 <input type="checkbox" checked={speaker.selected} class="rounded border-zinc-600 bg-zinc-700 text-amber-500" />
                                 <span class="text-sm text-zinc-300">{speaker.name}</span>
                              </label>
                           {/each}
                           <input type="text" placeholder="+ Add speaker" class="w-full bg-transparent p-2 text-sm text-zinc-500 outline-none" />
                        </div>
                     </div>

                     <div class="pt-6 border-t border-zinc-800 flex justify-end gap-3">
                        <button class="px-4 py-2 text-zinc-400 hover:text-white text-sm">Skip</button>
                        <button on:click={() => handleAction('Save & Extract', selectedDecision)} class="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium">Save & Extract Tasks &rarr;</button>
                     </div>
                  </div>
               
               <!-- 9. EXTRACT CARD -->
               {:else if selectedDecision.decisionType === 'extract'}
                   <div class="space-y-6">
                      <div class="flex items-center justify-between text-sm text-zinc-400">
                         <span>Source: {data.sourceTitle}</span>
                         <span>{data.progress}</span>
                      </div>
                      
                      <div class="bg-zinc-800 p-6 rounded-lg border-l-4 border-green-500 shadow-lg">
                         <div class="flex justify-between items-start mb-4">
                            <h3 class="text-xl font-semibold text-white">{selectedDecision.subject.title}</h3>
                            <span class="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded border border-green-900/50">High Confidence</span>
                         </div>
                         
                         <div class="grid grid-cols-2 gap-4 text-sm mb-6">
                            <div><span class="text-zinc-500">Owner:</span> {data.owner}</div>
                            <div><span class="text-zinc-500">Due:</span> {data.due}</div>
                         </div>
                         
                         <div class="text-sm text-zinc-400 italic border-l-2 border-zinc-700 pl-4 py-1">
                            "{data.quote}"
                         </div>
                      </div>
                      
                      <div class="pt-4 flex justify-center gap-4">
                         <button on:click={() => handleAction('Reject Extraction', selectedDecision)} class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm border border-zinc-700">Reject</button>
                         <button class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm border border-zinc-700">Edit</button>
                         <button on:click={() => handleAction('Confirm Extraction', selectedDecision)} class="px-8 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium">Confirm</button>
                      </div>
                   </div>

               <!-- Default Fallback -->
               {:else}
                  <div class="p-8 text-center text-zinc-500">
                     <div class="text-4xl mb-4">🔧</div>
                     <div>Work in progress for this card type.</div>
                  </div>
               {/if}

            </div>
         </div>
       {:else}
         <div class="flex items-center justify-center h-full text-zinc-500">
           <div class="text-center">
              <div class="text-4xl mb-4 opacity-30">⚡</div>
              <p>Select an item to start processing</p>
           </div>
         </div>
       {/if}
    </div>
  </div>
</div>

<!-- Output any modals if they are open -->
{#if showClarificationModal}
  <ClarificationModal
    taskTitle={clarificationTask?.subject?.title}
    questions={clarificationQuestions}
    on:close={() => showClarificationModal = false}
    on:submit={handleClarificationSubmit}
  />
{/if}

{#if showTaskCreationModal}
  <TaskCreationModal
    on:close={() => showTaskCreationModal = false}
    on:submit={handleTaskCreate}
  />
{/if}

<!-- Helper Components like CommandPalette, SettingsModal, Toasts can be here or imported -->