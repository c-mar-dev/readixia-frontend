<!--
  ProgressBar.svelte - Workflow progress visualization for Unit 8

  Displays the current workflow stage and completion percentage with stage markers.

  Props:
    - progress: UiProgress - Progress data from entitiesApi.getProgress()

  Usage:
    <ProgressBar {progress} />
-->
<script>
  /** @type {import('$lib/api').UiProgress} */
  export let progress;

  // Default stages for task workflow (fallback if not provided)
  const defaultStages = [
    { id: 'inbox', label: 'Inbox', index: 0 },
    { id: 'specifying', label: 'Specifying', index: 1 },
    { id: 'ready', label: 'Ready', index: 2 },
    { id: 'executing', label: 'Executing', index: 3 },
    { id: 'verifying', label: 'Verifying', index: 4 },
    { id: 'done', label: 'Done', index: 5 },
  ];

  // Generate stages array from progress data
  $: stages = Array.from({ length: progress.totalStages }, (_, i) => {
    // Check if this is the current stage
    if (progress.currentStage.index === i) {
      return progress.currentStage;
    }
    // Check if it's a completed stage
    const completedStage = progress.completedStages.find((_, idx) => idx === i);
    if (completedStage) {
      return defaultStages.find(s => s.id === completedStage) || { id: completedStage, label: completedStage, index: i };
    }
    // Fallback to default stages
    return defaultStages[i] || { id: `stage-${i}`, label: `Stage ${i + 1}`, index: i };
  });

  // Determine stage status
  function getStageStatus(index) {
    if (progress.completedStages.includes(stages[index]?.id)) {
      return 'completed';
    }
    if (progress.currentStage.index === index) {
      return 'current';
    }
    return 'pending';
  }
</script>

<div class="space-y-3">
  <!-- Progress bar -->
  <div class="flex items-center gap-2">
    <div class="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div
        class="h-full bg-amber-500 transition-all duration-500 ease-out"
        style="width: {progress.percentage}%"
      ></div>
    </div>
    <span class="text-zinc-400 text-sm font-medium tabular-nums">
      {progress.percentage}%
    </span>
  </div>

  <!-- Stage markers -->
  <div class="flex items-center justify-between">
    {#each stages as stage, i}
      {@const status = getStageStatus(i)}
      <div class="flex flex-col items-center gap-1">
        <!-- Stage dot -->
        <div
          class="w-3 h-3 rounded-full transition-colors
            {status === 'completed' ? 'bg-green-500' :
             status === 'current' ? 'bg-amber-500 ring-2 ring-amber-500/30' :
             'bg-zinc-700'}"
        ></div>
        <!-- Stage label -->
        <span
          class="text-xs transition-colors
            {status === 'completed' ? 'text-green-400' :
             status === 'current' ? 'text-amber-400 font-medium' :
             'text-zinc-500'}"
        >
          {stage.label}
        </span>
      </div>

      <!-- Connector line (except after last stage) -->
      {#if i < stages.length - 1}
        <div
          class="flex-1 h-0.5 mx-1 transition-colors
            {progress.completedStages.includes(stages[i + 1]?.id) || progress.currentStage.index > i ? 'bg-green-500' : 'bg-zinc-700'}"
        ></div>
      {/if}
    {/each}
  </div>

  <!-- Current stage label -->
  <div class="text-center">
    <span class="text-sm text-zinc-400">
      Currently in: <span class="text-amber-400 font-medium">{progress.currentStage.label}</span>
    </span>
  </div>
</div>
