<script>
  import { createEventDispatcher } from 'svelte';

  export let decision;
  export let disabled = false;

  const dispatch = createEventDispatcher();

  let open = false;
  let reason = '';
  let customDate = '';
  let customTime = '';
  let showCustomPicker = false;
  let validationError = '';

  const MIN_DEFER_MINUTES = 5;
  const MAX_DEFER_DAYS = 30;

  const presets = [
    { label: '1 hour', getDate: () => new Date(Date.now() + 3600000) },
    { label: '4 hours', getDate: () => new Date(Date.now() + 14400000) },
    { label: 'Tomorrow', getDate: () => getTomorrow9am() },
    { label: '1 week', getDate: () => new Date(Date.now() + 604800000) },
  ];

  function getTomorrow9am() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }

  function validateDeferralDate(date) {
    const now = new Date();
    const minDate = new Date(now.getTime() + MIN_DEFER_MINUTES * 60000);
    const maxDate = new Date(now.getTime() + MAX_DEFER_DAYS * 24 * 3600000);

    if (date < minDate) {
      return `Deferral must be at least ${MIN_DEFER_MINUTES} minutes in the future`;
    }
    if (date > maxDate) {
      return `Deferral must be within ${MAX_DEFER_DAYS} days`;
    }
    return null;
  }

  function handlePresetSelect(preset) {
    const until = preset.getDate();
    const error = validateDeferralDate(until);

    if (error) {
      validationError = error;
      return;
    }

    validationError = '';
    dispatch('defer', { until: until.toISOString(), reason: reason || undefined });
    resetState();
  }

  function handleCustomSelect() {
    showCustomPicker = true;

    // Initialize with tomorrow at 9am
    const tomorrow = getTomorrow9am();
    customDate = tomorrow.toISOString().split('T')[0];
    customTime = '09:00';
  }

  function handleCustomConfirm() {
    if (!customDate || !customTime) {
      validationError = 'Please select both date and time';
      return;
    }

    const until = new Date(`${customDate}T${customTime}`);
    const error = validateDeferralDate(until);

    if (error) {
      validationError = error;
      return;
    }

    validationError = '';
    dispatch('defer', { until: until.toISOString(), reason: reason || undefined });
    resetState();
  }

  function resetState() {
    open = false;
    reason = '';
    customDate = '';
    customTime = '';
    showCustomPicker = false;
    validationError = '';
  }

  function handleClickOutside(event) {
    if (open && !event.target.closest('.defer-dropdown')) {
      resetState();
    }
  }

  $: remainingDeferrals = decision?.metadata?.remaining_deferrals;
  $: showDeferralWarning = remainingDeferrals !== undefined && remainingDeferrals < 5;
</script>

<svelte:window on:click={handleClickOutside} />

<div class="defer-dropdown relative inline-block">
  <button
    type="button"
    on:click={() => open = !open}
    {disabled}
    class="px-3 py-1.5 rounded-md border transition-colors text-sm font-medium
           {disabled
             ? 'border-zinc-700 bg-zinc-800 text-zinc-500 cursor-not-allowed'
             : 'border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-500'}"
  >
    Defer
  </button>

  {#if open}
    <div class="absolute left-0 mt-2 w-64 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50">
      <div class="p-3">
        {#if showDeferralWarning}
          <div class="mb-3 px-2 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400">
            {remainingDeferrals} {remainingDeferrals === 1 ? 'deferral' : 'deferrals'} remaining
          </div>
        {/if}

        {#if !showCustomPicker}
          <div class="space-y-1 mb-3">
            {#each presets as preset}
              <button
                type="button"
                on:click={() => handlePresetSelect(preset)}
                class="w-full text-left px-3 py-2 rounded-md text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                {preset.label}
              </button>
            {/each}
            <button
              type="button"
              on:click={handleCustomSelect}
              class="w-full text-left px-3 py-2 rounded-md text-sm text-zinc-300 hover:bg-zinc-700 transition-colors border-t border-zinc-700 mt-1 pt-2"
            >
              Custom...
            </button>
          </div>
        {:else}
          <div class="space-y-3 mb-3">
            <div>
              <label class="block text-xs text-zinc-400 mb-1">Date</label>
              <input
                type="date"
                bind:value={customDate}
                class="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-300 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label class="block text-xs text-zinc-400 mb-1">Time</label>
              <input
                type="time"
                bind:value={customTime}
                class="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-300 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                on:click={() => { showCustomPicker = false; validationError = ''; }}
                class="flex-1 px-3 py-1.5 rounded-md text-sm text-zinc-400 hover:bg-zinc-700 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                on:click={handleCustomConfirm}
                class="flex-1 px-3 py-1.5 rounded-md text-sm bg-amber-500 text-zinc-900 hover:bg-amber-400 transition-colors font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        {/if}

        <div>
          <label class="block text-xs text-zinc-400 mb-1">Reason (optional)</label>
          <textarea
            bind:value={reason}
            placeholder="Why defer this decision?"
            rows="2"
            class="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        {#if validationError}
          <div class="mt-2 px-2 py-1.5 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
            {validationError}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Ensure dropdowns appear above other content */
  .defer-dropdown {
    z-index: 10;
  }
</style>
