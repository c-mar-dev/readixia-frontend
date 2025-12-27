<script>
  import { decisionTypeConfig, thingTypeConfig } from '$lib/data/decisions.js';
  import CriteriaChecklist from './CriteriaChecklist.svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import SpeakerAutocomplete from './SpeakerAutocomplete.svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import { buildResolutionPayload } from '$lib/utils/resolution';
  import { chainHistory, WORKFLOW_ORDER } from '$lib/stores';
  import { projectsApi } from '$lib/api';

  // New modular card components (Unit 12)
  import {
    CheckpointCard,
    ApprovalCard,
    ConflictCard,
    CategorizeCard
  } from './cards';

  // Forward action events from sub-cards
  function handleSubCardAction(event) {
    const { name, decision: decisionData, payload } = event.detail;
    handleAction(name, payload);
  }

  function handleSubCardDefer() {
    dispatch('defer');
  }

  export let decision;

  const dispatch = createEventDispatcher();

  // Loading state - disables all buttons during API call
  let actionInProgress = false;

  // Local state for meeting tasks
  let selectedTasks = {};

  // Form data bindings for each card type
  // Triage
  let triageProject = '';
  let triagePriority = '';

  // Specify
  let specAiSpec = {};
  let specSuccessCriteria = [];

  // Review
  let reviewFeedback = '';

  // Clarifying
  let clarifyAnswers = {};

  // Enrich
  let enrichProject = '';
  let enrichDate = '';
  let enrichSpeakers = [];

  // Projects from API (shared by triage and enrich cards)
  let projects = [];
  let projectsLoading = false;

  // Fetch projects on mount
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

  // Initialize form data when decision changes
  $: if (decision) {
    const d = decision.data || {};

    // Triage
    triageProject = d.suggestedProject || '';
    triagePriority = d.suggestedPriority || 'p3';

    // Specify
    specAiSpec = d.aiSpec ? { ...d.aiSpec } : {};
    specSuccessCriteria = d.successCriteria ? [...d.successCriteria] : [];

    // Enrich
    enrichProject = d.suggestedProject || '';
    enrichDate = d.date || '';
    enrichSpeakers = d.speakers ? d.speakers.map(s => ({ ...s })) : [];

    // Reset clarify answers
    clarifyAnswers = {};
  }

  $: if (decision && decision.decisionType === 'meeting_triage' && decision.data?.extractedTasks) {
     // Initialize selected tasks based on data
     decision.data.extractedTasks.forEach(t => {
        if (selectedTasks[t.id] === undefined) {
           selectedTasks[t.id] = t.checked;
        }
     });
  }

  /**
   * Collect form data based on decision type.
   */
  function collectFormData(actionName) {
    const formData = {};

    switch (decision.decisionType) {
      case 'triage':
        formData.project = triageProject;
        formData.priority = triagePriority;
        break;
      case 'specify':
        formData.aiSpec = specAiSpec;
        formData.successCriteria = specSuccessCriteria;
        break;
      case 'review':
        formData.feedback = reviewFeedback;
        break;
      case 'clarifying':
      case 'checkpoint':
        formData.answers = clarifyAnswers;
        break;
      case 'enrich':
        formData.project = enrichProject;
        formData.date = enrichDate;
        formData.speakers = enrichSpeakers;
        break;
      case 'meeting_triage':
        formData.selectedTasks = Object.entries(selectedTasks)
          .filter(([_, selected]) => selected)
          .map(([id]) => id);
        break;
    }

    return formData;
  }

  /**
   * Handle action with loading state and form data collection.
   */
  async function handleAction(actionName, payload = null) {
    // Prevent double-clicks
    if (actionInProgress) return;

    actionInProgress = true;

    try {
      // Use payload from sub-cards if provided, otherwise collect from local form
      const formData = payload || collectFormData(actionName);

      // Build resolution payload
      const resolutionPayload = buildResolutionPayload(decision, actionName, formData);

      // Dispatch action with all data
      dispatch('action', {
        name: actionName,
        decision,
        payload: payload || formData,
        resolution: resolutionPayload.resolution
      });
    } finally {
      // Reset loading after a short delay to allow parent to handle
      // The parent will set loading via store actions
      setTimeout(() => {
        actionInProgress = false;
      }, 100);
    }
  }

  function toggleTask(taskId) {
     selectedTasks[taskId] = !selectedTasks[taskId];
  }

  $: selectedTaskCount = Object.values(selectedTasks).filter(Boolean).length;

  $: config = decisionTypeConfig[decision.decisionType];
  $: thingConfig = thingTypeConfig[decision.subject.type];
  $: data = decision.data || {};

  // Deferral limit check (5 max deferrals)
  $: deferDisabled = (decision.deferCount || 0) >= 5;
  $: remainingDeferrals = 5 - (decision.deferCount || 0);

  // Workflow stages for the progress bar (subject-based tracking)
  const workflow = WORKFLOW_ORDER;

  // Get completed stages for this subject from chain history
  $: subjectHistory = $chainHistory.get(decision.subject.id) || [];
  $: completedTypes = subjectHistory.map(s => s.type);

  // Current step is where this decision type falls in the workflow
  $: currentStep = workflow.indexOf(decision.decisionType);
  $: showProgress = currentStep !== -1;

  // Check if a step is completed (from history or current is past it)
  $: isStepCompleted = (stepIndex) => {
    const stepType = workflow[stepIndex];
    return completedTypes.includes(stepType) || stepIndex < currentStep;
  };

  // Calculate progress including completed history
  $: completedCount = completedTypes.length;
  $: progressPercent = ((completedCount + 1) / (workflow.length + 1)) * 100;
</script>

<div class="max-w-4xl mx-auto p-8">
  <!-- Discreet Workflow Progress (subject-based) -->
  {#if showProgress}
    <div class="mb-6">
      <div class="flex justify-between items-end mb-2">
        <div class="flex gap-4">
          {#each workflow as step, i}
            {@const isCompleted = isStepCompleted(i)}
            {@const isCurrent = i === currentStep}
            <div class="flex flex-col gap-1">
              <span class="text-[10px] uppercase font-bold tracking-widest {isCompleted ? 'text-green-500' : isCurrent ? 'text-amber-500' : 'text-zinc-600'}">
                {step}
              </span>
              <div class="h-1 w-12 rounded-full {isCompleted ? 'bg-green-500' : isCurrent ? 'bg-amber-500' : 'bg-zinc-800'} transition-all duration-500"></div>
            </div>
          {/each}
        </div>
        <span class="text-[10px] font-mono text-zinc-500 uppercase">
          {#if completedCount > 0}
            {completedCount} completed
          {:else}
            Stage {currentStep + 1} of {workflow.length}
          {/if}
        </span>
      </div>
    </div>
  {/if}

  <!-- Card Header -->
  <div class="mb-8 border-b border-zinc-800 pb-6">
     <div class="flex items-center gap-3 mb-4">
        <span class="px-2 py-1 rounded text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">{config.icon} {config.label}</span>
        <span class="px-2 py-1 rounded text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">{thingConfig.icon} {thingConfig.label}</span>
        {#if decision.priority === 'urgent'}
          <span class="px-2 py-1 rounded text-xs font-bold bg-red-900/30 text-red-400 border border-red-900/50">🔥 CRITICAL</span>
        {/if}
     </div>
     <h2 class="text-2xl font-semibold text-white leading-tight mb-2">{decision.subject.title}</h2>
     {#if decision.subject.originalText}
        <p class="text-zinc-500 italic text-sm">"{decision.subject.originalText}"</p>
     {/if}
  </div>

  <!-- Card Body -->
  <div class="space-y-8">
     
     <!-- 1. TRIAGE CARD -->
     {#if decision.decisionType === 'triage'}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div class="space-y-4">
              <div class="text-xs font-bold text-zinc-500 uppercase tracking-wider">Source Context</div>
              <div class="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 text-sm text-zinc-300 space-y-2">
                 <div><span class="text-zinc-500">Source:</span> {decision.subject.source}</div>
                 <div><span class="text-zinc-500">Received:</span> {decision.created}</div>
                 {#if data.context}<div>{data.context}</div>{/if}
              </div>
           </div>
           
           <div class="space-y-4">
              <div class="text-xs font-bold text-zinc-500 uppercase tracking-wider">Destination</div>
              <div class="space-y-2">
                 {#each (data.destination || []) as dest}
                    <button 
                      on:click={() => handleAction('Route to ' + dest)}
                      class="w-full text-left px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors flex justify-between items-center group"
                    >
                       <span class="text-zinc-200 group-hover:text-white">{dest}</span>
                       {#if dest === data.suggestedDestination}
                          <span class="text-[10px] px-1.5 py-0.5 bg-amber-900/30 text-amber-400 rounded border border-amber-900/50">Suggested</span>
                       {/if}
                    </button>
                 {/each}
              </div>

              <div class="flex gap-4 mt-4">
                 <div class="flex-1">
                    <label class="block text-xs text-zinc-500 mb-1">Project</label>
                    <select
                      bind:value={triageProject}
                      disabled={actionInProgress || projectsLoading}
                      class="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-zinc-300 outline-none focus:border-amber-500 disabled:opacity-50"
                    >
                       <option value="">{projectsLoading ? 'Loading...' : (data.suggestedProject || 'Select...')}</option>
                       {#each projects as p}<option value={p}>{p}</option>{/each}
                    </select>
                 </div>
                 <div class="w-24">
                    <label class="block text-xs text-zinc-500 mb-1">Priority</label>
                    <select
                      bind:value={triagePriority}
                      disabled={actionInProgress}
                      class="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-zinc-300 outline-none focus:border-amber-500 disabled:opacity-50"
                    >
                       <option value={data.suggestedPriority || 'p3'}>{data.suggestedPriority || 'p3'}</option>
                       <option value="p1">p1</option><option value="p2">p2</option><option value="p3">p3</option>
                    </select>
                 </div>
              </div>
           </div>
        </div>

        <div class="pt-6 border-t border-zinc-800 flex justify-end gap-3">
           <button
             on:click={() => dispatch('defer')}
             disabled={actionInProgress || deferDisabled}
             class="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             title={deferDisabled ? 'Maximum deferrals reached (5)' : `${remainingDeferrals} deferrals remaining`}
           >
             Defer {#if deferDisabled}(limit){/if}
           </button>
           <button
             on:click={() => handleAction('Archive')}
             disabled={actionInProgress}
             class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm border border-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {#if actionInProgress}...{:else}Archive{/if}
           </button>
           <button
             on:click={() => handleAction('Proceed')}
             disabled={actionInProgress}
             class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
           >
             {#if actionInProgress}<LoadingSpinner size="sm" /> Processing...{:else}Proceed to Spec &rarr;{/if}
           </button>
        </div>

     <!-- 2. SPECIFICATION CARD -->
     {:else if decision.decisionType === 'specify'}
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

        {#if data.successCriteria}
           <div class="space-y-4">
              <div class="text-xs font-bold text-zinc-500 uppercase tracking-wider">Success Criteria</div>
              <CriteriaChecklist criteria={data.successCriteria} />
           </div>
        {/if}

        <div class="pt-6 border-t border-zinc-800 flex justify-between items-center">
           <button disabled={actionInProgress} class="text-sm text-zinc-500 hover:text-zinc-300 disabled:opacity-50">Back to Inbox</button>
           <div class="flex gap-3">
              <button
                on:click={() => handleAction('Save Draft')}
                disabled={actionInProgress}
                class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Draft
              </button>
              <button
                on:click={() => handleAction('Save & Continue')}
                disabled={actionInProgress}
                class="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {#if actionInProgress}<LoadingSpinner size="sm" /> Processing...{:else}Save & Continue &rarr;{/if}
              </button>
           </div>
        </div>

     <!-- 3. CLARIFICATION CARD -->
     {:else if decision.decisionType === 'clarifying'}
        <div class="space-y-6">
           <div class="bg-yellow-900/10 border border-yellow-700/30 p-4 rounded-lg">
              <h3 class="text-yellow-500 font-medium mb-1">Blocking Questions</h3>
              <p class="text-sm text-yellow-500/80">Claude needs answers to these questions before proceeding.</p>
           </div>

           <div class="space-y-6">
              {#each (decision.clarificationQuestions || []) as q, i}
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
              <button
                on:click={() => dispatch('defer')}
                disabled={actionInProgress || deferDisabled}
                class="px-4 py-2 text-zinc-400 hover:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Answer Later
              </button>
              <button
                on:click={() => handleAction('Submit Answers')}
                disabled={actionInProgress}
                class="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {#if actionInProgress}<LoadingSpinner size="sm" /> Submitting...{:else}Submit & Start &rarr;{/if}
              </button>
           </div>
        </div>

     <!-- 4. VERIFICATION CARD -->
     {:else if decision.decisionType === 'verifying'}
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
              <button
                on:click={() => handleAction('Escalate')}
                disabled={actionInProgress}
                class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Escalate
              </button>
              <button
                on:click={() => handleAction('Override')}
                disabled={actionInProgress}
                class="px-4 py-2 bg-zinc-800 hover:bg-red-900/30 text-red-400 hover:text-red-300 rounded-lg text-sm border border-zinc-700 hover:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Override & Accept
              </button>
              <button
                on:click={() => handleAction('Auto-Retry')}
                disabled={actionInProgress}
                class="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {#if actionInProgress}<LoadingSpinner size="sm" /> Retrying...{:else}Auto-Retry with Feedback{/if}
              </button>
           </div>
        </div>

     <!-- 5. REVIEW CARD -->
     {:else if decision.decisionType === 'review'}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-96">
           <div class="flex flex-col border border-zinc-700 rounded-lg overflow-hidden">
              <div class="bg-zinc-800 p-2 text-xs font-bold text-zinc-400 uppercase text-center border-b border-zinc-700">Specification</div>
              <div class="p-4 bg-zinc-900/50 flex-1 overflow-y-auto text-sm text-zinc-400 space-y-4">
                 {#if data.specSummary}
                    <div><span class="text-zinc-500 block mb-1">Objective:</span> {data.specSummary.objective}</div>
                    <div>
                       <span class="text-zinc-500 block mb-1">Criteria:</span>
                       <ul class="list-disc pl-4 space-y-1">
                          {#each data.specSummary.criteria || [] as c}<li>{c}</li>{/each}
                       </ul>
                    </div>
                 {/if}
              </div>
           </div>
           <div class="flex flex-col border border-zinc-700 rounded-lg overflow-hidden">
              <div class="bg-zinc-800 p-2 text-xs font-bold text-zinc-400 uppercase text-center border-b border-zinc-700">Result</div>
              <div class="p-4 bg-zinc-900/50 flex-1 overflow-y-auto">
                 {#if data.resultSummary}
                    <div class="prose prose-invert prose-sm">
                       <pre class="whitespace-pre-wrap font-sans text-zinc-300">{data.resultSummary.preview}</pre>
                    </div>
                    <div class="mt-4 flex gap-2">
                       <a href={data.resultSummary.fullDocLink} class="text-xs text-blue-400 hover:underline">View full doc &rarr;</a>
                    </div>
                 {/if}
              </div>
           </div>
        </div>

        <div class="pt-4">
           <textarea
             bind:value={reviewFeedback}
             disabled={actionInProgress}
             class="w-full bg-zinc-800 border border-zinc-700 rounded p-3 text-sm text-zinc-200 outline-none focus:border-amber-500 h-20 disabled:opacity-50"
             placeholder="Optional feedback..."
           ></textarea>
        </div>

        <div class="pt-4 flex justify-between items-center">
           <button disabled={actionInProgress} class="text-zinc-500 text-sm hover:text-zinc-300 disabled:opacity-50">Take over manually</button>
           <div class="flex gap-3">
              <button
                on:click={() => handleAction('Request Changes')}
                disabled={actionInProgress}
                class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Request Changes
              </button>
              <button
                on:click={() => handleAction('Approve')}
                disabled={actionInProgress}
                class="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {#if actionInProgress}<LoadingSpinner size="sm" /> Approving...{:else}Approve & Complete{/if}
              </button>
           </div>
        </div>

     <!-- 6. CONFLICT CARD (Using modular component) -->
     {:else if decision.decisionType === 'conflict'}
        <ConflictCard {decision} on:action={handleSubCardAction} on:defer={handleSubCardDefer} />

     <!-- 7. CHECKPOINT CARD (Unit 12) -->
     {:else if decision.decisionType === 'checkpoint'}
        <CheckpointCard {decision} on:action={handleSubCardAction} on:defer={handleSubCardDefer} />

     <!-- 8. APPROVAL CARD (Unit 12) -->
     {:else if decision.decisionType === 'approval'}
        <ApprovalCard {decision} on:action={handleSubCardAction} on:defer={handleSubCardDefer} />

     <!-- 10. CATEGORIZE CARD (Unit 12) -->
     {:else if decision.decisionType === 'categorize'}
        <CategorizeCard {decision} on:action={handleSubCardAction} on:defer={handleSubCardDefer} />

     <!-- 7. ESCALATE CARD -->
     {:else if decision.decisionType === 'escalate'}
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
               <button
                 on:click={() => handleAction('Retry New Instructions')}
                 disabled={actionInProgress}
                 class="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-200 border border-red-800 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Retry with New Instructions
               </button>
               <button
                 on:click={() => handleAction('Edit Myself')}
                 disabled={actionInProgress}
                 class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Edit Draft Myself
               </button>
               <button
                 on:click={() => handleAction('Abandon')}
                 disabled={actionInProgress}
                 class="ml-auto px-4 py-2 text-red-500/70 hover:text-red-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Abandon Task
               </button>
            </div>
         </div>

     <!-- 8. ENRICH CARD -->
     {:else if decision.decisionType === 'enrich'}
        <div class="space-y-6">
           <div class="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700 text-sm text-zinc-300 italic">
              "{data.preview}"
           </div>

           <div class="grid grid-cols-2 gap-6">
              <div>
                 <label class="block text-xs text-zinc-500 mb-2">Project</label>
                 <input
                   type="text"
                   bind:value={enrichProject}
                   disabled={actionInProgress}
                   class="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-zinc-200 outline-none focus:border-amber-500 disabled:opacity-50"
                 />
              </div>
              <div>
                 <label class="block text-xs text-zinc-500 mb-2">Meeting Date</label>
                 <input
                   type="text"
                   bind:value={enrichDate}
                   disabled={actionInProgress}
                   class="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-zinc-200 outline-none focus:border-amber-500 disabled:opacity-50"
                 />
              </div>
           </div>

           <div>
              <label class="block text-xs text-zinc-500 mb-2">Speakers</label>
              <div class="space-y-2">
                 {#each enrichSpeakers as speaker, i}
                    <div class="flex items-center gap-2 p-2 bg-zinc-800/30 rounded">
                       <input
                         type="checkbox"
                         bind:checked={enrichSpeakers[i].selected}
                         disabled={actionInProgress}
                         class="rounded border-zinc-600 bg-zinc-700 text-amber-500 disabled:opacity-50"
                       />
                       <span class="text-sm text-zinc-300 flex-1">{speaker.name}</span>
                       <button
                         type="button"
                         on:click={() => {
                           enrichSpeakers = enrichSpeakers.filter((_, idx) => idx !== i);
                         }}
                         disabled={actionInProgress}
                         class="text-zinc-500 hover:text-red-400 text-sm px-1 disabled:opacity-50 disabled:cursor-not-allowed"
                         title="Remove speaker"
                       >
                         &times;
                       </button>
                    </div>
                 {/each}
                 <SpeakerAutocomplete
                   placeholder="+ Add speaker"
                   disabled={actionInProgress}
                   on:select={(e) => {
                     const speaker = e.detail;
                     // Don't add duplicates
                     if (!enrichSpeakers.some(s => s.name.toLowerCase() === speaker.name.toLowerCase())) {
                       enrichSpeakers = [...enrichSpeakers, {
                         name: speaker.name,
                         selected: true,
                       }];
                     }
                   }}
                 />
              </div>
           </div>

           <div class="pt-6 border-t border-zinc-800 flex justify-end gap-3">
              <button
                on:click={() => dispatch('defer')}
                disabled={actionInProgress || deferDisabled}
                class="px-4 py-2 text-zinc-400 hover:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Skip
              </button>
              <button
                on:click={() => handleAction('Save & Extract')}
                disabled={actionInProgress}
                class="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {#if actionInProgress}<LoadingSpinner size="sm" /> Saving...{:else}Save & Extract Tasks &rarr;{/if}
              </button>
           </div>
        </div>
     
     <!-- 9. MEETING TRIAGE CARD (Restored & Adapted) -->
     {:else if decision.decisionType === 'meeting_triage'}
         <div class="space-y-6">
            <div class="flex items-center justify-between text-sm text-zinc-400">
               <span>{decision.subject.date}</span>
               <span>{decision.subject.duration}</span>
            </div>

            <div class="space-y-3">
               <div class="flex items-center justify-between">
                  <div class="text-xs font-bold text-zinc-500 uppercase tracking-wider">Extracted Tasks</div>
                  <span class="text-xs text-zinc-500">{selectedTaskCount} selected</span>
               </div>
               
               <div class="space-y-2">
                  {#each (data.extractedTasks || []) as task}
                     <button 
                        on:click={() => toggleTask(task.id)}
                        class="w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3
                        {selectedTasks[task.id] 
                           ? 'bg-emerald-900/20 border-emerald-500/50 hover:bg-emerald-900/30' 
                           : 'bg-zinc-800/30 border-zinc-700 hover:bg-zinc-800/50'}"
                     >
                        <div class="mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors
                           {selectedTasks[task.id] ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}">
                           {#if selectedTasks[task.id]}
                              <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                                 <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                           {/if}
                        </div>
                        <div class="flex-1 min-w-0">
                           <div class="text-sm font-medium text-zinc-200">{task.title}</div>
                           <div class="flex items-center gap-2 mt-1">
                              {#if task.assignee}
                                 <span class="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">{task.assignee}</span>
                              {/if}
                              {#if task.priority === 'high'}
                                 <span class="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400">High</span>
                              {/if}
                           </div>
                        </div>
                     </button>
                  {/each}
               </div>
            </div>

            <div class="pt-6 border-t border-zinc-800 flex justify-end gap-3">
               <button
                 on:click={() => dispatch('defer')}
                 disabled={actionInProgress || deferDisabled}
                 class="px-4 py-2 text-zinc-400 hover:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Skip
               </button>
               <button
                  on:click={() => handleAction('Confirm Meeting Tasks', { selectedTasks })}
                  disabled={actionInProgress || selectedTaskCount === 0}
                  class="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
               >
                  {#if actionInProgress}<LoadingSpinner size="sm" /> Confirming...{:else}Confirm Selection ({selectedTaskCount}) &rarr;{/if}
               </button>
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
