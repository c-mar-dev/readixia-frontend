<script>
  import { fade } from 'svelte/transition';

  let activeTab = 'general';

  // Mock settings state
  let settings = {
    general: {
      theme: 'dark',
      notifications: true,
      soundEffects: false,
      autoArchive: true
    },
    api: {
      anthropicKey: 'sk-ant-api03-...',
      openAiKey: '',
      mdqSocketPath: '/tmp/mdq.sock'
    },
    models: {
      architect: 'claude-3-haiku-20240307',
      worker: 'claude-3-5-sonnet-20240620',
      verifier: 'claude-3-5-sonnet-20240620',
      clerk: 'claude-3-haiku-20240307'
    },
    overseer: {
      pollingInterval: 5000,
      maxConcurrentTasks: 2,
      maxRetries: 3,
      sandboxMode: true
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'api', label: 'API & Connections', icon: '🔌' },
    { id: 'models', label: 'Model Configuration', icon: '🧠' },
    { id: 'overseer', label: 'Overseer & Safety', icon: '🛡️' }
  ];

  let isSaved = false;

  function saveSettings() {
    isSaved = true;
    setTimeout(() => isSaved = false, 2000);
  }
</script>

<div class="min-h-screen bg-zinc-900 text-zinc-100 flex flex-col">
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
      <button
        on:click={saveSettings}
        class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
      >
        {#if isSaved}
          <span class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        {:else}
          Save Changes
        {/if}
      </button>
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
    <div class="flex-1 space-y-8" in:fade={{ duration: 200 }}>
      
      <!-- General Settings -->
      {#if activeTab === 'general'}
        <section class="space-y-6">
          <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
            <h2 class="text-lg font-medium mb-4">Interface & Experience</h2>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-zinc-200">Dark Mode</div>
                  <div class="text-sm text-zinc-500">Enable dark theme for the dashboard</div>
                </div>
                <div class="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" name="toggle" id="theme-toggle" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" checked={settings.general.theme === 'dark'}/>
                    <label for="theme-toggle" class="toggle-label block overflow-hidden h-6 rounded-full bg-amber-600 cursor-pointer"></label>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-zinc-200">Desktop Notifications</div>
                  <div class="text-sm text-zinc-500">Get notified when tasks need review</div>
                </div>
                <input type="checkbox" class="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-amber-600 focus:ring-amber-600" bind:checked={settings.general.notifications} />
              </div>
            </div>
          </div>
        </section>
      {/if}

      <!-- API Settings -->
      {#if activeTab === 'api'}
        <section class="space-y-6">
          <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
            <h2 class="text-lg font-medium mb-4">Anthropic API</h2>
            <div class="space-y-4">
              <div>
                <label for="anthropic-key" class="block text-sm font-medium text-zinc-300 mb-1">API Key</label>
                <input
                  id="anthropic-key"
                  type="password"
                  class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 focus:border-amber-500 focus:outline-none"
                  bind:value={settings.api.anthropicKey}
                />
                <p class="text-xs text-zinc-500 mt-1">Used for all Claude interactions.</p>
              </div>
            </div>
          </div>

          <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
            <h2 class="text-lg font-medium mb-4">System Integration</h2>
            <div>
              <label for="socket-path" class="block text-sm font-medium text-zinc-300 mb-1">MDQ Socket Path</label>
              <input
                id="socket-path"
                type="text"
                class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 focus:border-amber-500 focus:outline-none font-mono text-sm"
                bind:value={settings.api.mdqSocketPath}
              />
            </div>
          </div>
        </section>
      {/if}

      <!-- Model Configuration -->
      {#if activeTab === 'models'}
        <section class="space-y-6">
          <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
            <h2 class="text-lg font-medium mb-4">Agent Role Assignment</h2>
            <div class="space-y-6">
              
              <!-- Architect -->
              <div>
                <label for="model-architect" class="block text-sm font-medium text-zinc-300 mb-1">Architect (Specification)</label>
                <select
                  id="model-architect"
                  class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 focus:border-amber-500 focus:outline-none"
                  bind:value={settings.models.architect}
                >
                  <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fast & Cheap)</option>
                  <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (Balanced)</option>
                  <option value="claude-3-opus-20240229">Claude 3 Opus (Powerful)</option>
                </select>
                <p class="text-xs text-zinc-500 mt-1">Responsible for structuring tasks and finding context.</p>
              </div>

              <!-- Worker -->
              <div>
                <label for="model-worker" class="block text-sm font-medium text-zinc-300 mb-1">Worker (Execution)</label>
                <select
                  id="model-worker"
                  class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 focus:border-amber-500 focus:outline-none"
                  bind:value={settings.models.worker}
                >
                  <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                  <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                  <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                </select>
                <p class="text-xs text-zinc-500 mt-1">The heavy lifter. Runs headless.</p>
              </div>

              <!-- Verifier -->
              <div>
                <label for="model-verifier" class="block text-sm font-medium text-zinc-300 mb-1">Verifier (QA)</label>
                <select
                  id="model-verifier"
                  class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 focus:border-amber-500 focus:outline-none"
                  bind:value={settings.models.verifier}
                >
                  <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                  <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                </select>
                <p class="text-xs text-zinc-500 mt-1">Checks drafts against Done Criteria.</p>
              </div>

            </div>
          </div>
        </section>
      {/if}

      <!-- Overseer Settings -->
      {#if activeTab === 'overseer'}
        <section class="space-y-6">
          <div class="bg-zinc-800/30 rounded-xl p-6 border border-zinc-800">
            <h2 class="text-lg font-medium mb-4">Safety & Limits</h2>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-zinc-200">Sandbox Mode</div>
                  <div class="text-sm text-zinc-500">Run workers in Docker container (Recommended)</div>
                </div>
                <input type="checkbox" class="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-amber-600 focus:ring-amber-600" bind:checked={settings.overseer.sandboxMode} />
              </div>
              
              <div>
                <label for="max-retries" class="block text-sm font-medium text-zinc-300 mb-1">Max Retries</label>
                <input
                  id="max-retries"
                  type="number"
                  min="0"
                  max="10"
                  class="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:border-amber-500 focus:outline-none"
                  bind:value={settings.overseer.maxRetries}
                />
                <p class="text-xs text-zinc-500 mt-1">Maximum number of "Strike System" correction attempts.</p>
              </div>
            </div>
          </div>

          <div class="bg-red-900/10 border border-red-900/30 rounded-xl p-6">
            <h2 class="text-lg font-medium text-red-400 mb-2">Danger Zone</h2>
            <p class="text-sm text-red-300/70 mb-4">Be careful with these controls.</p>
            <button class="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 text-red-200 rounded-lg text-sm transition-colors">
              Restart Overseer Service
            </button>
          </div>
        </section>
      {/if}

    </div>
  </div>
</div>

<style>
  /* Toggle Switch Styles */
  .toggle-checkbox:checked {
    right: 0;
    border-color: #d97706; /* amber-600 */
  }
  .toggle-checkbox:checked + .toggle-label {
    background-color: #d97706; /* amber-600 */
  }
</style>
