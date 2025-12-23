<script>
  import { decisionTypeConfig, thingTypeConfig, allProjects } from '$lib/data/decisions.js';
  import CriteriaChecklist from './CriteriaChecklist.svelte';
  import { createEventDispatcher } from 'svelte';

  export let decision;
  
  const dispatch = createEventDispatcher();

  // Local state for meeting tasks
  let selectedTasks = {};
  
  $: if (decision && decision.decisionType === 'meeting_triage' && decision.data?.extractedTasks) {
     // Initialize selected tasks based on data
     decision.data.extractedTasks.forEach(t => {
        if (selectedTasks[t.id] === undefined) {
           selectedTasks[t.id] = t.checked;
        }
     });
  }

  function handleAction(actionName, payload = null) {
    dispatch('action', { name: actionName, decision, payload });
  }

  function toggleTask(taskId) {
     selectedTasks[taskId] = !selectedTasks[taskId];
  }

  $: selectedTaskCount = Object.values(selectedTasks).filter(Boolean).length;

  $: config = decisionTypeConfig[decision.decisionType];
  $: thingConfig = thingTypeConfig[decision.subject.type];
  $: data = decision.data || {};

  // Workflow stages for the progress bar
  const workflow = ['triage', 'specify', 'verifying', 'review'];
  $: currentStep = workflow.indexOf(decision.decisionType);
  $: showProgress = currentStep !== -1;
  $: progressPercent = ((currentStep + 1) / (workflow.length + 1)) * 100;
</script>

<div class="max-w-4xl mx-auto p-8">
  <!-- Discreet Workflow Progress -->
  {#if showProgress}
    <div class="mb-6">
      <div class="flex justify-between items-end mb-2">
        <div class="flex gap-4">
          {#each workflow as step, i}
            <div class="flex flex-col gap-1">
              <span class="text-[10px] uppercase font-bold tracking-widest {i <= currentStep ? 'text-amber-500' : 'text-zinc-600'}">
                {step}
              </span>
              <div class="h-1 w-12 rounded-full {i <= currentStep ? 'bg-amber-500' : 'bg-zinc-800'} transition-all duration-500"></div>
            </div>
          {/each}
        </div>
        <span class="text-[10px] font-mono text-zinc-500 uppercase">Stage {currentStep + 1} of 4</span>
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
           <button on:click={() => dispatch('skip')} class="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors">Defer</button>
           <button on:click={() => handleAction('Archive')} class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm border border-zinc-700 transition-colors">Archive</button>
           <button on:click={() => handleAction('Proceed')} class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors">Proceed to Spec &rarr;</button>
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
           <button class="text-sm text-zinc-500 hover:text-zinc-300">Back to Inbox</button>
           <div class="flex gap-3">
              <button class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm border border-zinc-700">Save Draft</button>
              <button on:click={() => handleAction('Save & Continue')} class="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium">Save & Continue &rarr;</button>
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
              <button class="px-4 py-2 text-zinc-400 hover:text-white text-sm">Answer Later</button>
              <button on:click={() => handleAction('Submit Answers')} class="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium">Submit & Start &rarr;</button>
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
              <button class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm border border-zinc-700">Escalate</button>
              <button on:click={() => handleAction('Override')} class="px-4 py-2 bg-zinc-800 hover:bg-red-900/30 text-red-400 hover:text-red-300 rounded-lg text-sm border border-zinc-700 hover:border-red-800">Override & Accept</button>
              <button on:click={() => handleAction('Auto-Retry')} class="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium">Auto-Retry with Feedback</button>
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
           <textarea class="w-full bg-zinc-800 border border-zinc-700 rounded p-3 text-sm text-zinc-200 outline-none focus:border-amber-500 h-20" placeholder="Optional feedback..."></textarea>
        </div>

        <div class="pt-4 flex justify-between items-center">
           <button class="text-zinc-500 text-sm hover:text-zinc-300">Take over manually</button>
           <div class="flex gap-3">
              <button on:click={() => handleAction('Request Changes')} class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm border border-zinc-700">Request Changes</button>
              <button on:click={() => handleAction('Approve')} class="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium">Approve & Complete</button>
           </div>
        </div>

     <!-- 6. CONFLICT CARD -->
     {:else if decision.decisionType === 'conflict'}
        <div class="space-y-6">
           <div class="grid grid-cols-2 gap-0 border border-zinc-700 rounded-lg overflow-hidden">
              <div class="bg-zinc-900/50 p-4 border-r border-zinc-700">
                 <div class="text-xs text-zinc-500 uppercase font-bold mb-2">Your Version</div>
                 <div class="text-xs text-zinc-600 mb-4">Modified {data.myVersion?.modified} by {data.myVersion?.by}</div>
                 <div class="space-y-1">
                    {#each (data.myVersion?.changes || []) as change}
                       <div class="text-sm text-red-400">- {change}</div>
                    {/each}
                 </div>
              </div>
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
              <button on:click={() => handleAction('Keep Mine')} class="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-200 text-sm font-medium">Keep Mine</button>
              <button on:click={() => handleAction('Take Theirs')} class="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-200 text-sm font-medium">Take Theirs</button>
              <button class="px-6 py-3 bg-transparent text-zinc-500 hover:text-zinc-300 text-sm">Merge Manually &rarr;</button>
           </div>
        </div>

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
               <button on:click={() => handleAction('Retry New Instructions')} class="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-200 border border-red-800 rounded text-sm">Retry with New Instructions</button>
               <button on:click={() => handleAction('Edit Myself')} class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium">Edit Draft Myself</button>
               <button on:click={() => handleAction('Abandon')} class="ml-auto px-4 py-2 text-red-500/70 hover:text-red-400 text-sm">Abandon Task</button>
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
              <button on:click={() => handleAction('Save & Extract')} class="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium">Save & Extract Tasks &rarr;</button>
           </div>
        </div>
     
     <!-- 9. EXTRACT CARD -->
     {:else if decision.decisionType === 'extract'}
         <div class="space-y-6">
            <div class="flex items-center justify-between text-sm text-zinc-400">
               <span>Source: {data.sourceTitle}</span>
               <span>{data.progress}</span>
            </div>
            
            <div class="bg-zinc-800 p-6 rounded-lg border-l-4 border-green-500 shadow-lg">
               <div class="flex justify-between items-start mb-4">
                  <h3 class="text-xl font-semibold text-white">{decision.subject.title}</h3>
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
               <button on:click={() => handleAction('Reject Extraction')} class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm border border-zinc-700">Reject</button>
               <button class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm border border-zinc-700">Edit</button>
               <button on:click={() => handleAction('Confirm Extraction')} class="px-8 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium">Confirm</button>
            </div>
         </div>

     <!-- 10. MEETING TRIAGE CARD (Restored & Adapted) -->
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
               <button on:click={() => dispatch('skip')} class="px-4 py-2 text-zinc-400 hover:text-white text-sm">Skip</button>
               <button 
                  on:click={() => handleAction('Confirm Meeting Tasks', { selectedTasks })}
                  disabled={selectedTaskCount === 0}
                  class="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
               >
                  Confirm Selection ({selectedTaskCount}) &rarr;
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
