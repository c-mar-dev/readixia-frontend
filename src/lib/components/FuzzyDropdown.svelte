<script lang="ts">
  /**
   * FuzzyDropdown.svelte - Searchable dropdown with fuzzy filtering
   *
   * Provides a dropdown select that allows typing to filter options.
   * Supports keyboard navigation (arrows, Enter, Escape).
   *
   * Usage:
   *   <FuzzyDropdown
   *     options={['Project A', 'Project B', 'Project C']}
   *     bind:value={selectedProject}
   *     placeholder="Search projects..."
   *     suggestedValue="Project A"
   *   />
   */

  import { createEventDispatcher } from 'svelte';

  /** List of options to choose from */
  export let options: string[] = [];
  /** Currently selected value */
  export let value = '';
  /** Placeholder text when no value */
  export let placeholder = 'Search...';
  /** Whether the input is disabled */
  export let disabled = false;
  /** Value to highlight as AI-suggested */
  export let suggestedValue: string | undefined = undefined;
  /** Allow empty/null selection */
  export let allowEmpty = true;
  /** Label for empty selection */
  export let emptyLabel = 'None';

  const dispatch = createEventDispatcher<{
    change: { value: string };
  }>();

  let inputElement: HTMLInputElement;
  let searchQuery = '';
  let isOpen = false;
  let selectedIndex = -1;

  // Filter options based on search query (case-insensitive contains)
  $: filteredOptions = searchQuery
    ? options.filter((opt) => opt.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  // Reset index when options change
  $: if (filteredOptions) {
    selectedIndex = filteredOptions.length > 0 ? 0 : -1;
  }

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    searchQuery = target.value;
    isOpen = true;
    selectedIndex = filteredOptions.length > 0 ? 0 : -1;
  }

  function handleFocus() {
    isOpen = true;
    searchQuery = '';
  }

  function handleBlur() {
    // Delay to allow click on options
    setTimeout(() => {
      isOpen = false;
      searchQuery = '';
    }, 150);
  }

  function selectOption(option: string) {
    value = option;
    searchQuery = '';
    isOpen = false;
    selectedIndex = -1;
    dispatch('change', { value: option });
  }

  function clearSelection() {
    value = '';
    searchQuery = '';
    isOpen = false;
    selectedIndex = -1;
    dispatch('change', { value: '' });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        isOpen = true;
        return;
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredOptions.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, allowEmpty ? -1 : 0);
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex === -1 && allowEmpty) {
          clearSelection();
        } else if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
          selectOption(filteredOptions[selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        isOpen = false;
        searchQuery = '';
        selectedIndex = -1;
        break;
      case 'Tab':
        isOpen = false;
        searchQuery = '';
        break;
    }
  }

  /**
   * Highlight matching portion of text.
   */
  function highlightMatch(text: string, query: string): string {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-pink-500/30 text-pink-200 rounded px-0.5">$1</mark>');
  }
</script>

<div class="relative">
  <input
    bind:this={inputElement}
    type="text"
    value={isOpen ? searchQuery : value || ''}
    placeholder={value ? value : placeholder}
    {disabled}
    on:input={handleInput}
    on:focus={handleFocus}
    on:blur={handleBlur}
    on:keydown={handleKeydown}
    class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-200 text-sm
           focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none
           disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    autocomplete="off"
    role="combobox"
    aria-expanded={isOpen}
    aria-haspopup="listbox"
  />

  <!-- Dropdown chevron -->
  <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </div>

  {#if isOpen}
    <ul
      class="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg
             shadow-xl max-h-60 overflow-auto"
      role="listbox"
    >
      <!-- Empty option -->
      {#if allowEmpty}
        <li role="option" aria-selected={selectedIndex === -1}>
          <button
            type="button"
            on:mousedown|preventDefault={clearSelection}
            on:mouseenter={() => (selectedIndex = -1)}
            class="w-full text-left px-4 py-2 text-sm transition-colors
                   {selectedIndex === -1
                     ? 'bg-zinc-700 text-white'
                     : 'text-zinc-400 hover:bg-zinc-800'}"
          >
            {emptyLabel}
          </button>
        </li>
      {/if}

      {#each filteredOptions as option, i}
        <li role="option" aria-selected={i === selectedIndex}>
          <button
            type="button"
            on:mousedown|preventDefault={() => selectOption(option)}
            on:mouseenter={() => (selectedIndex = i)}
            class="w-full text-left px-4 py-2 text-sm transition-colors
                   {selectedIndex === i ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:bg-zinc-800'}
                   {option === suggestedValue ? 'text-pink-400' : ''}"
          >
            {@html highlightMatch(option, searchQuery)}
            {#if option === suggestedValue}
              <span class="text-xs text-pink-400/70 ml-2">(suggested)</span>
            {/if}
          </button>
        </li>
      {/each}

      {#if filteredOptions.length === 0 && searchQuery}
        <li class="px-4 py-3 text-zinc-500 text-sm">
          No projects match "{searchQuery}"
        </li>
      {/if}
    </ul>
  {/if}
</div>
