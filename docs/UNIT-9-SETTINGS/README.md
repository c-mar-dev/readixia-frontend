# UNIT-9-SETTINGS: Settings & Config Integration

Settings page integration with Decision Engine configuration APIs. Provides a unified interface for managing model assignments, orchestrator settings, auto-archive rules, AI agent configurations, API connections, and cost limits.

## Overview

This unit connects the Dashboard settings UI to Engine configuration endpoints, enabling users to modify system behavior without editing config files. The implementation uses a hybrid approach: real API calls for existing endpoints and local stubs for proposed endpoints.

## Features

- **6-Tab Settings Interface**
  - General: Theme, notifications, auto-archive rules
  - Models: Role-based model assignment (architect, worker, verifier, clerk)
  - Agents: Per-agent configuration for all 9 AI agents
  - Orchestration: Polling, concurrency, retries, sandbox mode
  - Connections: API keys, MDQ socket path
  - Costs: Daily/hourly limits, alert thresholds, usage display

- **Real-Time Updates**: Changes take effect immediately via Engine hot reload
- **Per-Section Loading**: Independent loading states for responsive UX
- **Error Handling**: Graceful degradation with user-friendly error messages
- **Dirty State Tracking**: Visual indicators for unsaved changes

## Installation

This unit is part of the Dashboard frontend. No separate installation required.

## Usage

### Importing the Store

```typescript
import {
  settingsStore,
  modelsConfig,
  overseerConfig,
  settingsLoading,
  settingsError
} from '$lib/stores';
```

### Loading Configuration

```typescript
import { onMount } from 'svelte';
import { settingsStore } from '$lib/stores';

onMount(() => {
  // Load all configuration sections in parallel
  settingsStore.loadAll();
});
```

### Updating Settings

```typescript
// Update a model role
await settingsStore.updateModel('worker', 'claude-3-5-sonnet-20241022');

// Update overseer settings (partial update)
await settingsStore.updateOverseer({
  max_concurrent_tasks: 5,
  sandbox_mode: true
});

// Update auto-archive rules
await settingsStore.updateAutoArchive({
  enabled: true,
  rules: [
    { item_type: 'task', state: 'done', after_days: 30 }
  ]
});
```

### Subscribing to State

```svelte
<script>
  import { modelsConfig, settingsLoading } from '$lib/stores';
</script>

{#if $settingsLoading.models}
  <p>Loading models...</p>
{:else if $modelsConfig}
  <p>Current worker model: {$modelsConfig.worker.current}</p>
{/if}
```

## API Reference

### settingsStore

Main store with methods for loading and updating configuration.

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `loadAll()` | - | `Promise<void>` | Load all config sections |
| `loadModels()` | - | `Promise<void>` | Load model assignments |
| `loadOverseer()` | - | `Promise<void>` | Load orchestrator settings |
| `loadAutoArchive()` | - | `Promise<void>` | Load auto-archive config |
| `updateModel(role, modelId)` | `ModelRole, string` | `Promise<boolean>` | Update model for role |
| `updateOverseer(updates)` | `Partial<OverseerConfig>` | `Promise<boolean>` | Update orchestrator |
| `updateAutoArchive(updates)` | `{enabled?, rules?}` | `Promise<boolean>` | Update auto-archive |
| `markDirty(section)` | `string` | `void` | Mark section as dirty |
| `clearDirty(section)` | `string` | `void` | Clear dirty flag |
| `clearError()` | - | `void` | Clear error state |
| `reset()` | - | `void` | Reset to initial state |

### Derived Stores

| Store | Type | Description |
|-------|------|-------------|
| `modelsConfig` | `ModelsConfigResponse \| null` | Current model assignments |
| `overseerConfig` | `OverseerConfigResponse \| null` | Orchestrator settings |
| `autoArchiveConfig` | `AutoArchiveConfigResponse \| null` | Auto-archive config |
| `generalConfig` | `GeneralConfigResponse \| null` | General settings (stubbed) |
| `agentsConfig` | `AgentsConfigResponse \| null` | Agent configs (stubbed) |
| `apiConnectionConfig` | `ApiConnectionConfigResponse \| null` | API settings (stubbed) |
| `costsConfig` | `CostsConfigResponse \| null` | Cost settings (stubbed) |
| `settingsLoading` | `LoadingState` | Per-section loading flags |
| `isAnyLoading` | `boolean` | True if any section loading |
| `settingsError` | `ApiError \| null` | Current error state |
| `isAnySaving` | `boolean` | True if any section saving |
| `isAnyDirty` | `boolean` | True if any unsaved changes |

## Testing

```bash
# Run all tests
npm test

# Run settings store tests only
npm test -- --run src/lib/stores/settings.test.ts
```

## Engine API Endpoints

### Implemented (Real API)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/config/models` | GET | Fetch model assignments |
| `/api/config/models/{role}` | PUT | Update model for role |
| `/api/config/overseer` | GET | Fetch orchestrator settings |
| `/api/config/overseer` | PUT | Update orchestrator (partial) |
| `/api/config/auto-archive` | GET | Fetch auto-archive config |
| `/api/config/auto-archive` | PUT | Update auto-archive (partial) |

### Proposed (Stubbed)

See `docs/ENGINE-CONFIG-API-SPEC.md` for full specification.

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `/api/config/general` | Theme, notifications | P1 |
| `/api/config/api` | API keys, socket path | P1 |
| `/api/config/agents` | Agent configuration | P2 |
| `/api/config/costs` | Spending limits | P2 |

## Architecture

```
src/lib/
├── api/
│   ├── settingsApi.ts      # API client (real + stubs)
│   ├── settingsStubs.ts    # Mock data for unimplemented endpoints
│   └── types.ts            # Type definitions
├── stores/
│   ├── settings.ts         # Unified config store
│   └── settings.test.ts    # Unit tests
└── routes/
    └── settings/
        └── +page.svelte    # Settings UI (6 tabs)
```

## Related Documentation

- [ENGINE-CONFIG-API-SPEC.md](../ENGINE-CONFIG-API-SPEC.md) - Proposed Engine endpoints
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Implementation decisions and notes
