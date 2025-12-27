<script>
  import { onMount } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import {
    settingsStore,
    generalConfig,
    modelsConfig,
    agentsConfig,
    overseerConfig,
    autoArchiveConfig,
    apiConnectionConfig,
    costsConfig,
    settingsLoading,
    isAnyLoading,
    isAnySaving,
    settingsError,
  } from '$lib/stores/settings';

  let activeTab = 'general';

  // Tab definitions
  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'agents', label: 'Agents', icon: '🤖' },
    { id: 'costs', label: 'Costs & Usage', icon: '💰' },
    { id: 'archive', label: 'Auto-Archive', icon: '📦' },
    { id: 'api', label: 'API & Connections', icon: '🔌' },
    { id: 'advanced', label: 'Advanced', icon: '🛠️' }
  ];

  // Agent accordion state
  let expandedAgent = null;

  // Auto-archive rule editing
  let editingRule = null;
  let newRule = { item_type: 'task', state: 'done', after_days: 30 };
  let showAddRule = false;

  // Available item types and states for rules
  const itemTypes = ['task', 'transcript', 'email', 'calendar', 'source', 'project', 'person'];
  const statesByType = {
    task: ['done', 'archived'],
    transcript: ['filed', 'processed', 'archived'],
    email: ['processed', 'filed', 'archived'],
    calendar: ['processed', 'archived'],
    source: ['processed', 'archived'],
    project: ['completed', 'archived'],
    person: ['archived']
  };

  // Load all settings on mount
  onMount(() => {
    settingsStore.loadAll();
  });

  // Keyboard navigation
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      goto('/');
    }
    if (event.key === ',') {
      event.preventDefault(); // Already on settings
    }
  }

  // General settings handlers
  async function updateTheme(theme) {
    await settingsStore.updateGeneral({ theme });
  }

  async function updateNotifications(enabled) {
    await settingsStore.updateGeneral({ notifications_enabled: enabled });
  }

  async function updateSoundEffects(enabled) {
    await settingsStore.updateGeneral({ sound_effects: enabled });
  }

  // Agent handlers
  function toggleAgent(agentName) {
    if (expandedAgent === agentName) {
      expandedAgent = null;
    } else {
      expandedAgent = agentName;
    }
  }

  async function updateAgentEnabled(agentName, enabled) {
    await settingsStore.updateAgent(agentName, { enabled });
  }

  async function updateAgentTimeout(agentName, timeout) {
    const timeoutNum = parseInt(timeout, 10);
    if (!isNaN(timeoutNum) && timeoutNum > 0) {
      await settingsStore.updateAgent(agentName, { timeout_seconds: timeoutNum });
    }
  }

  // Costs handlers
  async function updateSubscriptionMode(mode) {
    await settingsStore.updateCosts({ subscription_mode: mode });
  }

  async function updateDailyLimit(value) {
    const limit = parseFloat(value);
    if (!isNaN(limit) && limit >= 0) {
      await settingsStore.updateCosts({ daily_limit_usd: limit });
    }
  }

  async function updateHourlyLimit(value) {
    const limit = parseFloat(value);
    if (!isNaN(limit) && limit >= 0) {
      await settingsStore.updateCosts({ hourly_limit_usd: limit });
    }
  }

  async function updateWeeklyComputeHours(value) {
    const limit = parseFloat(value);
    if (!isNaN(limit) && limit >= 0) {
      await settingsStore.updateCosts({ weekly_compute_hours_limit: limit });
    }
  }

  async function updateHourlyRequestLimit(value) {
    const limit = parseInt(value, 10);
    if (!isNaN(limit) && limit >= 0) {
      await settingsStore.updateCosts({ hourly_request_limit: limit });
    }
  }

  async function updateAlertThreshold(value) {
    const threshold = parseFloat(value);
    if (!isNaN(threshold) && threshold >= 0 && threshold <= 100) {
      await settingsStore.updateCosts({ alert_threshold_pct: threshold });
    }
  }

  // Auto-archive handlers
  async function toggleAutoArchive(enabled) {
    await settingsStore.updateAutoArchive({ enabled });
  }

  async function addRule() {
    if (!$autoArchiveConfig) return;
    const rules = [...$autoArchiveConfig.rules, { ...newRule }];
    await settingsStore.updateAutoArchive({ rules });
    showAddRule = false;
    newRule = { item_type: 'task', state: 'done', after_days: 30 };
  }

  async function deleteRule(index) {
    if (!$autoArchiveConfig) return;
    const rules = $autoArchiveConfig.rules.filter((_, i) => i !== index);
    await settingsStore.updateAutoArchive({ rules });
  }

  async function updateRule(index, field, value) {
    if (!$autoArchiveConfig) return;
    const rules = [...$autoArchiveConfig.rules];
    if (field === 'after_days') {
      rules[index] = { ...rules[index], [field]: parseInt(value, 10) };
    } else {
      rules[index] = { ...rules[index], [field]: value };
    }
    await settingsStore.updateAutoArchive({ rules });
  }

  // Overseer handlers
  async function updateOverseerSandbox(enabled) {
    await settingsStore.updateOverseer({ sandbox_mode: enabled });
  }

  async function updateOverseerRetries(value) {
    const retries = parseInt(value, 10);
    if (!isNaN(retries) && retries >= 0 && retries <= 10) {
      await settingsStore.updateOverseer({ max_retries: retries });
    }
  }

  async function updateOverseerTimeout(value) {
    const timeout = parseInt(value, 10);
    if (!isNaN(timeout) && timeout >= 30 && timeout <= 3600) {
      await settingsStore.updateOverseer({ timeout_seconds: timeout });
    }
  }

  async function updateOverseerConcurrent(value) {
    const concurrent = parseInt(value, 10);
    if (!isNaN(concurrent) && concurrent >= 1 && concurrent <= 10) {
      await settingsStore.updateOverseer({ max_concurrent_tasks: concurrent });
    }
  }

  // Utility functions
  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  function getUsagePercent(current, limit) {
    if (!limit) return 0;
    return Math.min(100, (current / limit) * 100);
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="h-full overflow-auto bg-zinc-900 text-zinc-100 flex flex-col">
  <!-- Header -->
  <div class="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-10">
    <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <a href="/" class="text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </a>
        <h1 class="text-xl font-semibold">Settings</h1>
      </div>
      <div class="flex items-center gap-3">
        {#if $isAnySaving}
          <span class="text-sm text-amber-400 flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
          </span>
        {/if}
        {#if $settingsError}
          <span class="text-sm text-red-400">{$settingsError.message}</span>
        {/if}
      </div>
    </div>
  </div>

  <div class="flex-1 max-w-5xl mx-auto w-full p-6 flex gap-8">
    <!-- Sidebar -->
    <div class="w-64 flex-shrink-0 space-y-1">
      {#each tabs as tab}
        <button
          on:click={() => activeTab = tab.id}
          class="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors
                 {activeTab === tab.id
                   ? 'bg-zinc-800 text-amber-400 font-medium'
                   : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}"
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      {/each}
    </div>

    <!-- Content -->
    <div class="flex-1 space-y-8">

      <!-- Loading State -->
      {#if $isAnyLoading && !$generalConfig && !$agentsConfig}
        <div class="flex items-center justify-center py-20">
          <div class="text-center">
            <svg class="w-10 h-10 animate-spin text-amber-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-zinc-400">Loading settings...</p>
          </div>
        </div>

      <!-- General Settings -->
      {:else if activeTab === 'general'}
        <section class="space-y-6" in:fade={{ duration: 150 }}>
          <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
            <h2 class="text-lg font-medium mb-4">Interface & Experience</h2>
            <div class="space-y-4">
              <!-- Theme -->
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-zinc-200">Theme</div>
                  <div class="text-sm text-zinc-500">Choose your preferred color scheme</div>
                </div>
                <select
                  value={$generalConfig?.theme || 'dark'}
                  on:change={(e) => updateTheme(e.target.value)}
                  class="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>

              <!-- Notifications -->
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-zinc-200">Desktop Notifications</div>
                  <div class="text-sm text-zinc-500">Get notified when tasks need review</div>
                </div>
                <input
                  type="checkbox"
                  class="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-amber-600 focus:ring-amber-600"
                  checked={$generalConfig?.notifications_enabled ?? true}
                  on:change={(e) => updateNotifications(e.target.checked)}
                />
              </div>

              <!-- Sound Effects -->
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-zinc-200">Sound Effects</div>
                  <div class="text-sm text-zinc-500">Audio feedback for actions</div>
                </div>
                <input
                  type="checkbox"
                  class="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-amber-600 focus:ring-amber-600"
                  checked={$generalConfig?.sound_effects ?? false}
                  on:change={(e) => updateSoundEffects(e.target.checked)}
                />
              </div>
            </div>
          </div>
        </section>

      <!-- Agents Tab -->
      {:else if activeTab === 'agents'}
        <section class="space-y-4" in:fade={{ duration: 150 }}>
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-lg font-medium">AI Agents</h2>
              <p class="text-sm text-zinc-500">Configure individual agent settings and prompts</p>
            </div>
          </div>

          {#if $agentsConfig?.agents}
            <div class="space-y-2">
              {#each $agentsConfig.agents as agent (agent.name)}
                <div class="bg-zinc-800/30 rounded-xl border border-zinc-800 overflow-hidden">
                  <!-- Agent Header -->
                  <button
                    on:click={() => toggleAgent(agent.name)}
                    class="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-lg">🤖</span>
                      <div class="text-left">
                        <div class="font-medium text-zinc-200">{agent.display_name}</div>
                        <div class="text-xs text-zinc-500">{agent.model_role} role</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="text-xs px-2 py-1 rounded {agent.enabled ? 'bg-green-900/30 text-green-400' : 'bg-zinc-700 text-zinc-500'}">
                        {agent.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <span class="text-xs text-zinc-500">{agent.timeout_seconds}s</span>
                      <svg class="w-4 h-4 text-zinc-500 transition-transform {expandedAgent === agent.name ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  <!-- Agent Details -->
                  {#if expandedAgent === agent.name}
                    <div class="border-t border-zinc-800 p-4 space-y-4" transition:slide={{ duration: 150 }}>
                      <!-- Config Section -->
                      <div class="grid grid-cols-2 gap-4">
                        <div>
                          <label class="block text-sm text-zinc-400 mb-1">Enabled</label>
                          <input
                            type="checkbox"
                            class="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-amber-600 focus:ring-amber-600"
                            checked={agent.enabled}
                            on:change={(e) => updateAgentEnabled(agent.name, e.target.checked)}
                          />
                        </div>
                        <div>
                          <label class="block text-sm text-zinc-400 mb-1">Timeout (seconds)</label>
                          <input
                            type="number"
                            min="10"
                            max="600"
                            value={agent.timeout_seconds}
                            on:blur={(e) => updateAgentTimeout(agent.name, e.target.value)}
                            class="w-24 bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <!-- Prompt Section (placeholder for future) -->
                      <div class="border-t border-zinc-800 pt-4">
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-sm text-zinc-400">Prompt Template</span>
                          <div class="flex gap-2">
                            <button class="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors">
                              Edit
                            </button>
                            <button class="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors">
                              Preview
                            </button>
                            <button class="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors">
                              History
                            </button>
                          </div>
                        </div>
                        <p class="text-xs text-zinc-500">Prompt template editing coming soon...</p>
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="text-center py-10 text-zinc-500">
              <p>No agents configured</p>
            </div>
          {/if}
        </section>

      <!-- Costs Tab -->
      {:else if activeTab === 'costs'}
        <section class="space-y-6" in:fade={{ duration: 150 }}>
          <!-- Subscription Mode -->
          <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
            <h2 class="text-lg font-medium mb-4">Subscription Type</h2>
            <div class="flex gap-2">
              <button
                on:click={() => updateSubscriptionMode('api')}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
                       {($costsConfig?.subscription_mode ?? 'api') === 'api'
                         ? 'bg-amber-600 text-white'
                         : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}"
              >
                API (Pay-per-use)
              </button>
              <button
                on:click={() => updateSubscriptionMode('max_5x')}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
                       {$costsConfig?.subscription_mode === 'max_5x'
                         ? 'bg-amber-600 text-white'
                         : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}"
              >
                Max 5x
              </button>
              <button
                on:click={() => updateSubscriptionMode('max_20x')}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
                       {$costsConfig?.subscription_mode === 'max_20x'
                         ? 'bg-amber-600 text-white'
                         : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}"
              >
                Max 20x
              </button>
            </div>
            <p class="text-xs text-zinc-500 mt-2">
              {#if ($costsConfig?.subscription_mode ?? 'api') === 'api'}
                Tracking API usage in USD. Set daily and hourly spending limits.
              {:else}
                Claude Max subscription: usage is included in your plan. Track compute hours and requests.
              {/if}
            </p>
          </div>

          <!-- Limits - API Mode -->
          {#if ($costsConfig?.subscription_mode ?? 'api') === 'api'}
            <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
              <h2 class="text-lg font-medium mb-4">Spending Limits (USD)</h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm text-zinc-400 mb-1">Daily Limit</label>
                  <div class="flex items-center gap-2">
                    <span class="text-zinc-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={$costsConfig?.daily_limit_usd ?? 50}
                      on:blur={(e) => updateDailyLimit(e.target.value)}
                      class="w-32 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm text-zinc-400 mb-1">Hourly Limit</label>
                  <div class="flex items-center gap-2">
                    <span class="text-zinc-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={$costsConfig?.hourly_limit_usd ?? 10}
                      on:blur={(e) => updateHourlyLimit(e.target.value)}
                      class="w-32 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <p class="text-xs text-zinc-500 mt-1">Must be less than or equal to daily limit</p>
                </div>
              </div>
            </div>

          <!-- Limits - Max Mode -->
          {:else}
            <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
              <h2 class="text-lg font-medium mb-4">Usage Limits</h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm text-zinc-400 mb-1">Weekly Compute Hours</label>
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={$costsConfig?.weekly_compute_hours_limit ?? 100}
                      on:blur={(e) => updateWeeklyComputeHours(e.target.value)}
                      class="w-32 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-200 focus:border-amber-500 focus:outline-none"
                    />
                    <span class="text-zinc-500">hours</span>
                  </div>
                  <p class="text-xs text-zinc-500 mt-1">
                    {$costsConfig?.subscription_mode === 'max_5x' ? 'Max 5x: ~140-280 hours Sonnet, ~15-35 hours Opus weekly' : 'Max 20x: ~240-480 hours Sonnet, ~24-40 hours Opus weekly'}
                  </p>
                </div>
                <div>
                  <label class="block text-sm text-zinc-400 mb-1">Hourly Request Limit</label>
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={$costsConfig?.hourly_request_limit ?? 50}
                      on:blur={(e) => updateHourlyRequestLimit(e.target.value)}
                      class="w-32 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-200 focus:border-amber-500 focus:outline-none"
                    />
                    <span class="text-zinc-500">requests</span>
                  </div>
                </div>
              </div>
            </div>
          {/if}

          <!-- Alert Threshold (Common) -->
          <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
            <label class="block text-sm text-zinc-400 mb-2">Alert at {$costsConfig?.alert_threshold_pct ?? 80}% of limit</label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={$costsConfig?.alert_threshold_pct ?? 80}
              on:change={(e) => updateAlertThreshold(e.target.value)}
              class="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <!-- Current Usage -->
          <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
            <h2 class="text-lg font-medium mb-4">Current Usage</h2>
            {#if $costsConfig}
              <div class="space-y-4">
                {#if ($costsConfig.subscription_mode ?? 'api') === 'api'}
                  <!-- API Mode Usage -->
                  <div>
                    <div class="flex justify-between text-sm mb-1">
                      <span class="text-zinc-400">Today</span>
                      <span class="text-zinc-200">{formatCurrency($costsConfig.current_daily_usage_usd)} / {formatCurrency($costsConfig.daily_limit_usd)}</span>
                    </div>
                    <div class="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        class="h-full transition-all duration-300 {getUsagePercent($costsConfig.current_daily_usage_usd, $costsConfig.daily_limit_usd) > 80 ? 'bg-red-500' : 'bg-amber-500'}"
                        style="width: {getUsagePercent($costsConfig.current_daily_usage_usd, $costsConfig.daily_limit_usd)}%"
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div class="flex justify-between text-sm mb-1">
                      <span class="text-zinc-400">This Hour</span>
                      <span class="text-zinc-200">{formatCurrency($costsConfig.current_hourly_usage_usd)} / {formatCurrency($costsConfig.hourly_limit_usd)}</span>
                    </div>
                    <div class="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        class="h-full transition-all duration-300 {getUsagePercent($costsConfig.current_hourly_usage_usd, $costsConfig.hourly_limit_usd) > 80 ? 'bg-red-500' : 'bg-amber-500'}"
                        style="width: {getUsagePercent($costsConfig.current_hourly_usage_usd, $costsConfig.hourly_limit_usd)}%"
                      ></div>
                    </div>
                  </div>
                {:else}
                  <!-- Max Mode Usage -->
                  <div>
                    <div class="flex justify-between text-sm mb-1">
                      <span class="text-zinc-400">This Week</span>
                      <span class="text-zinc-200">{($costsConfig.current_weekly_compute_hours ?? 0).toFixed(1)} / {$costsConfig.weekly_compute_hours_limit} hours</span>
                    </div>
                    <div class="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        class="h-full transition-all duration-300 {getUsagePercent($costsConfig.current_weekly_compute_hours ?? 0, $costsConfig.weekly_compute_hours_limit) > 80 ? 'bg-red-500' : 'bg-amber-500'}"
                        style="width: {getUsagePercent($costsConfig.current_weekly_compute_hours ?? 0, $costsConfig.weekly_compute_hours_limit)}%"
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div class="flex justify-between text-sm mb-1">
                      <span class="text-zinc-400">This Hour</span>
                      <span class="text-zinc-200">{$costsConfig.current_hourly_requests ?? 0} / {$costsConfig.hourly_request_limit} requests</span>
                    </div>
                    <div class="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        class="h-full transition-all duration-300 {getUsagePercent($costsConfig.current_hourly_requests ?? 0, $costsConfig.hourly_request_limit) > 80 ? 'bg-red-500' : 'bg-amber-500'}"
                        style="width: {getUsagePercent($costsConfig.current_hourly_requests ?? 0, $costsConfig.hourly_request_limit)}%"
                      ></div>
                    </div>
                  </div>
                {/if}

                {#if $costsConfig.last_updated}
                  <p class="text-xs text-zinc-500">Last updated: {new Date($costsConfig.last_updated).toLocaleString()}</p>
                {/if}
              </div>
            {:else}
              <p class="text-zinc-500">Loading usage data...</p>
            {/if}
          </div>
        </section>

      <!-- Auto-Archive Tab -->
      {:else if activeTab === 'archive'}
        <section class="space-y-6" in:fade={{ duration: 150 }}>
          <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-lg font-medium">Auto-Archive Rules</h2>
                <p class="text-sm text-zinc-500">Automatically archive items after a period of time</p>
              </div>
              <input
                type="checkbox"
                class="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-amber-600 focus:ring-amber-600"
                checked={$autoArchiveConfig?.enabled ?? true}
                on:change={(e) => toggleAutoArchive(e.target.checked)}
              />
            </div>

            {#if $autoArchiveConfig?.enabled}
              <!-- Rules Table -->
              {#if $autoArchiveConfig.rules.length > 0}
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead class="text-zinc-400 text-left border-b border-zinc-700">
                      <tr>
                        <th class="pb-2">Item Type</th>
                        <th class="pb-2">State</th>
                        <th class="pb-2">After Days</th>
                        <th class="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-800">
                      {#each $autoArchiveConfig.rules as rule, index}
                        <tr>
                          <td class="py-3">
                            <select
                              value={rule.item_type}
                              on:change={(e) => updateRule(index, 'item_type', e.target.value)}
                              class="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-200 text-sm"
                            >
                              {#each itemTypes as type}
                                <option value={type}>{type}</option>
                              {/each}
                            </select>
                          </td>
                          <td class="py-3">
                            <select
                              value={rule.state}
                              on:change={(e) => updateRule(index, 'state', e.target.value)}
                              class="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-200 text-sm"
                            >
                              {#each (statesByType[rule.item_type] || ['archived']) as state}
                                <option value={state}>{state}</option>
                              {/each}
                            </select>
                          </td>
                          <td class="py-3">
                            <input
                              type="number"
                              min="1"
                              max="365"
                              value={rule.after_days}
                              on:blur={(e) => updateRule(index, 'after_days', e.target.value)}
                              class="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-200 text-sm"
                            />
                          </td>
                          <td class="py-3 text-right">
                            <button
                              on:click={() => deleteRule(index)}
                              class="text-red-400 hover:text-red-300 text-xs"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {:else}
                <p class="text-zinc-500 py-4">No rules configured. Add a rule to get started.</p>
              {/if}

              <!-- Add Rule -->
              {#if showAddRule}
                <div class="mt-4 p-4 bg-zinc-900 rounded-lg border border-zinc-700" transition:slide>
                  <div class="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label class="block text-xs text-zinc-400 mb-1">Item Type</label>
                      <select bind:value={newRule.item_type} class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm">
                        {#each itemTypes as type}
                          <option value={type}>{type}</option>
                        {/each}
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs text-zinc-400 mb-1">State</label>
                      <select bind:value={newRule.state} class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm">
                        {#each (statesByType[newRule.item_type] || ['archived']) as state}
                          <option value={state}>{state}</option>
                        {/each}
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs text-zinc-400 mb-1">After Days</label>
                      <input type="number" min="1" max="365" bind:value={newRule.after_days} class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm" />
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button on:click={addRule} class="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-sm">Add Rule</button>
                    <button on:click={() => showAddRule = false} class="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-sm">Cancel</button>
                  </div>
                </div>
              {:else}
                <button
                  on:click={() => showAddRule = true}
                  class="mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm transition-colors"
                >
                  + Add Rule
                </button>
              {/if}
            {/if}
          </div>
        </section>

      <!-- API & Connections Tab -->
      {:else if activeTab === 'api'}
        <section class="space-y-6" in:fade={{ duration: 150 }}>
          <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
            <h2 class="text-lg font-medium mb-4">Anthropic API</h2>
            <div class="space-y-2">
              <div class="flex items-center justify-between py-2">
                <span class="text-zinc-400">Status</span>
                <span class="text-sm px-2 py-1 rounded {$apiConnectionConfig?.anthropic_key?.is_set ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}">
                  {$apiConnectionConfig?.anthropic_key?.is_set ? 'Connected' : 'Not Configured'}
                </span>
              </div>
              <div class="flex items-center justify-between py-2">
                <span class="text-zinc-400">API Key</span>
                <code class="text-sm text-zinc-500 font-mono">
                  {$apiConnectionConfig?.anthropic_key?.masked_value || '(not set)'}
                </code>
              </div>
            </div>
          </div>

          <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
            <h2 class="text-lg font-medium mb-4">OpenAI API (Optional)</h2>
            <div class="space-y-2">
              <div class="flex items-center justify-between py-2">
                <span class="text-zinc-400">Status</span>
                <span class="text-sm px-2 py-1 rounded {$apiConnectionConfig?.openai_key?.is_set ? 'bg-green-900/30 text-green-400' : 'bg-zinc-700 text-zinc-500'}">
                  {$apiConnectionConfig?.openai_key?.is_set ? 'Connected' : 'Not Configured'}
                </span>
              </div>
              <div class="flex items-center justify-between py-2">
                <span class="text-zinc-400">API Key</span>
                <code class="text-sm text-zinc-500 font-mono">
                  {$apiConnectionConfig?.openai_key?.masked_value || '(not set)'}
                </code>
              </div>
            </div>
          </div>

          <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
            <h2 class="text-lg font-medium mb-4">MDQ Connection</h2>
            <div class="flex items-center justify-between py-2">
              <span class="text-zinc-400">Socket Path</span>
              <code class="text-sm text-zinc-300 font-mono">
                {$apiConnectionConfig?.mdq_socket_path || '(auto-detect)'}
              </code>
            </div>
          </div>

          <div class="bg-amber-900/10 border border-amber-900/30 rounded-xl p-4">
            <p class="text-sm text-amber-200">
              API keys are managed via environment variables and cannot be modified through this interface. See the documentation for setup instructions.
            </p>
          </div>
        </section>

      <!-- Advanced Tab -->
      {:else if activeTab === 'advanced'}
        <section class="space-y-6" in:fade={{ duration: 150 }}>
          <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
            <h2 class="text-lg font-medium mb-4">Orchestrator Settings</h2>
            <div class="space-y-4">
              <!-- Sandbox Mode -->
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-zinc-200">Sandbox Mode</div>
                  <div class="text-sm text-zinc-500">Run agents in isolated environment (Recommended)</div>
                </div>
                <input
                  type="checkbox"
                  class="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-amber-600 focus:ring-amber-600"
                  checked={$overseerConfig?.sandbox_mode ?? true}
                  on:change={(e) => updateOverseerSandbox(e.target.checked)}
                />
              </div>

              <!-- Max Concurrent -->
              <div>
                <label class="block text-sm text-zinc-400 mb-1">Max Concurrent Tasks</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={$overseerConfig?.max_concurrent_tasks ?? 3}
                  on:blur={(e) => updateOverseerConcurrent(e.target.value)}
                  class="w-24 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <!-- Max Retries -->
              <div>
                <label class="block text-sm text-zinc-400 mb-1">Max Retries</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={$overseerConfig?.max_retries ?? 3}
                  on:blur={(e) => updateOverseerRetries(e.target.value)}
                  class="w-24 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-200 focus:border-amber-500 focus:outline-none"
                />
                <p class="text-xs text-zinc-500 mt-1">Maximum correction attempts before escalating</p>
              </div>

              <!-- Default Timeout -->
              <div>
                <label class="block text-sm text-zinc-400 mb-1">Default Timeout (seconds)</label>
                <input
                  type="number"
                  min="30"
                  max="3600"
                  value={$overseerConfig?.timeout_seconds ?? 300}
                  on:blur={(e) => updateOverseerTimeout(e.target.value)}
                  class="w-24 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-200 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="bg-red-900/10 border border-red-900/30 rounded-xl p-6">
            <h2 class="text-lg font-medium text-red-400 mb-2">Danger Zone</h2>
            <p class="text-sm text-red-300/70 mb-4">These actions cannot be undone. Proceed with caution.</p>
            <div class="space-y-3">
              <button class="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 text-red-200 rounded-lg text-sm transition-colors">
                Restart Decision Engine
              </button>
              <button class="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 text-red-200 rounded-lg text-sm transition-colors ml-3">
                Clear Agent Memory
              </button>
            </div>
          </div>
        </section>
      {/if}

    </div>
  </div>
</div>
