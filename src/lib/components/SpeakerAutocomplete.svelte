<script lang="ts">
  /**
   * SpeakerAutocomplete.svelte - Typeahead input for speaker search
   *
   * Provides fuzzy search autocomplete for speaker names during
   * transcript enrichment. Debounces input and shows matching
   * speakers from the cache.
   *
   * Usage:
   *   <SpeakerAutocomplete
   *     placeholder="+ Add speaker"
   *     disabled={false}
   *     on:select={(e) => addSpeaker(e.detail)}
   *   />
   *
   * Events:
   *   - select: Fired when user selects a speaker (detail: SpeakerResult)
   *   - input: Fired when input value changes (detail: string)
   */

  import { createEventDispatcher, onDestroy } from 'svelte';
  import { speakersApi } from '$lib/api';
  import type { SpeakerResult } from '$lib/api';

  /** Placeholder text for the input */
  export let placeholder = 'Search speakers...';
  /** Whether the input is disabled */
  export let disabled = false;

  const dispatch = createEventDispatcher<{
    select: SpeakerResult;
    input: string;
  }>();

  let inputElement: HTMLInputElement;
  let value = '';
  let results: SpeakerResult[] = [];
  let isOpen = false;
  let isLoading = false;
  let selectedIndex = -1;
  let debounceTimer: ReturnType<typeof setTimeout>;

  // Debounce delay in ms
  const DEBOUNCE_MS = 300;
  const MIN_QUERY_LENGTH = 1;

  /**
   * Handle input changes with debouncing.
   */
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
    dispatch('input', value);

    clearTimeout(debounceTimer);

    if (!value.trim() || value.trim().length < MIN_QUERY_LENGTH) {
      results = [];
      isOpen = false;
      return;
    }

    debounceTimer = setTimeout(async () => {
      await search(value);
    }, DEBOUNCE_MS);
  }

  /**
   * Execute search against the API.
   */
  async function search(query: string) {
    if (query.trim().length < MIN_QUERY_LENGTH) return;

    isLoading = true;
    try {
      const response = await speakersApi.search(query.trim(), 10);
      results = response.results;
      isOpen = results.length > 0;
      selectedIndex = -1;
    } catch (error) {
      console.error('Speaker search failed:', error);
      results = [];
      isOpen = false;
    } finally {
      isLoading = false;
    }
  }

  /**
   * Handle keyboard navigation.
   */
  function handleKeydown(event: KeyboardEvent) {
    if (!isOpen) {
      // If dropdown is closed and user presses Enter, treat as custom entry
      if (event.key === 'Enter' && value.trim()) {
        event.preventDefault();
        selectCustom();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          selectSpeaker(results[selectedIndex]);
        } else if (value.trim()) {
          // No selection, treat as custom entry
          selectCustom();
        }
        break;
      case 'Escape':
        isOpen = false;
        selectedIndex = -1;
        break;
      case 'Tab':
        isOpen = false;
        selectedIndex = -1;
        break;
    }
  }

  /**
   * Select a speaker from the results.
   */
  function selectSpeaker(speaker: SpeakerResult) {
    dispatch('select', speaker);
    value = '';
    results = [];
    isOpen = false;
    selectedIndex = -1;
  }

  /**
   * Select custom entry (typed value not in results).
   */
  function selectCustom() {
    if (!value.trim()) return;

    const customSpeaker: SpeakerResult = {
      name: value.trim(),
      frequency: 1,
    };
    dispatch('select', customSpeaker);
    value = '';
    results = [];
    isOpen = false;
    selectedIndex = -1;
  }

  /**
   * Handle blur - delay to allow click on result.
   */
  function handleBlur() {
    setTimeout(() => {
      isOpen = false;
      selectedIndex = -1;
    }, 200);
  }

  /**
   * Handle focus - show results if we have them.
   */
  function handleFocus() {
    if (value.trim() && results.length > 0) {
      isOpen = true;
    }
  }

  onDestroy(() => {
    clearTimeout(debounceTimer);
  });
</script>

<div class="relative">
  <div class="relative">
    <input
      bind:this={inputElement}
      type="text"
      {value}
      {placeholder}
      {disabled}
      on:input={handleInput}
      on:keydown={handleKeydown}
      on:focus={handleFocus}
      on:blur={handleBlur}
      class="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-zinc-200
             outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed
             {isLoading ? 'pr-8' : ''}"
      autocomplete="off"
    />

    {#if isLoading}
      <div class="absolute right-2 top-1/2 -translate-y-1/2">
        <div class="w-4 h-4 border-2 border-zinc-500 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    {/if}
  </div>

  {#if isOpen && results.length > 0}
    <ul
      class="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg
             shadow-lg max-h-60 overflow-auto"
      role="listbox"
    >
      {#each results as speaker, i}
        <li role="option" aria-selected={i === selectedIndex}>
          <button
            type="button"
            on:click={() => selectSpeaker(speaker)}
            on:mouseenter={() => (selectedIndex = i)}
            class="w-full text-left px-3 py-2 text-sm transition-colors
                   {i === selectedIndex
                     ? 'bg-amber-600/20 text-amber-200'
                     : 'text-zinc-300 hover:bg-zinc-700'}"
          >
            <div class="font-medium">{speaker.name}</div>
            {#if speaker.email || speaker.company}
              <div class="text-xs text-zinc-500 mt-0.5">
                {#if speaker.company}{speaker.company}{/if}
                {#if speaker.email && speaker.company} &middot; {/if}
                {#if speaker.email}{speaker.email}{/if}
              </div>
            {/if}
            {#if speaker.frequency > 1}
              <div class="text-xs text-zinc-600 mt-0.5">
                {speaker.frequency} appearances
              </div>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
