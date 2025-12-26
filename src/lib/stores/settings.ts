/**
 * settings.ts - Unified configuration store for Unit 9
 *
 * Centralized store for all settings with per-section loading states.
 * Follows the pattern from decisions.ts.
 *
 * Exports:
 *   - settingsStore: Main writable store with methods
 *   - Derived stores for each section (models, overseer, etc.)
 *
 * Usage:
 *   import { settingsStore, modelsConfig } from '$lib/stores';
 *
 *   onMount(() => {
 *     settingsStore.loadAll();
 *   });
 */

import { writable, derived } from 'svelte/store';
import { settingsApi } from '$lib/api/settingsApi';
import type {
  ModelsConfigResponse,
  OverseerConfigResponse,
  AutoArchiveConfigResponse,
  AutoArchiveRule,
  GeneralConfigResponse,
  ApiConnectionConfigResponse,
  AgentsConfigResponse,
  CostsConfigResponse,
  ModelRole,
  ApiError,
} from '$lib/api/types';

// =============================================================================
// Types
// =============================================================================

interface LoadingState {
  general: boolean;
  models: boolean;
  agents: boolean;
  overseer: boolean;
  autoArchive: boolean;
  api: boolean;
  costs: boolean;
}

interface SettingsStoreState {
  loading: LoadingState;
  general: GeneralConfigResponse | null;
  models: ModelsConfigResponse | null;
  agents: AgentsConfigResponse | null;
  overseer: OverseerConfigResponse | null;
  autoArchive: AutoArchiveConfigResponse | null;
  api: ApiConnectionConfigResponse | null;
  costs: CostsConfigResponse | null;
  error: ApiError | null;
  dirty: Set<string>;
  saving: Set<string>;
}

type SectionKey = keyof Omit<SettingsStoreState, 'loading' | 'error' | 'dirty' | 'saving'>;

// =============================================================================
// Initial State
// =============================================================================

const initialLoadingState: LoadingState = {
  general: false,
  models: false,
  agents: false,
  overseer: false,
  autoArchive: false,
  api: false,
  costs: false,
};

const initialState: SettingsStoreState = {
  loading: { ...initialLoadingState },
  general: null,
  models: null,
  agents: null,
  overseer: null,
  autoArchive: null,
  api: null,
  costs: null,
  error: null,
  dirty: new Set(),
  saving: new Set(),
};

// =============================================================================
// Store Implementation
// =============================================================================

function createSettingsStore() {
  const { subscribe, set, update } = writable<SettingsStoreState>(initialState);

  return {
    subscribe,

    // =========================================================================
    // Load Methods
    // =========================================================================

    /**
     * Load all configuration sections.
     */
    async loadAll(): Promise<void> {
      await Promise.all([
        this.loadGeneral(),
        this.loadModels(),
        this.loadAgents(),
        this.loadOverseer(),
        this.loadAutoArchive(),
        this.loadApiConnection(),
        this.loadCosts(),
      ]);
    },

    /**
     * Load general settings.
     */
    async loadGeneral(): Promise<void> {
      update(s => ({
        ...s,
        loading: { ...s.loading, general: true },
        error: null,
      }));

      try {
        const general = await settingsApi.getGeneral();
        update(s => ({
          ...s,
          loading: { ...s.loading, general: false },
          general,
        }));
      } catch (error) {
        update(s => ({
          ...s,
          loading: { ...s.loading, general: false },
          error: {
            code: 'LOAD_GENERAL_FAILED',
            message: error instanceof Error ? error.message : 'Failed to load general settings',
          },
        }));
      }
    },

    /**
     * Load models configuration.
     */
    async loadModels(): Promise<void> {
      update(s => ({
        ...s,
        loading: { ...s.loading, models: true },
        error: null,
      }));

      try {
        const models = await settingsApi.getModels();
        update(s => ({
          ...s,
          loading: { ...s.loading, models: false },
          models,
        }));
      } catch (error) {
        update(s => ({
          ...s,
          loading: { ...s.loading, models: false },
          error: {
            code: 'LOAD_MODELS_FAILED',
            message: error instanceof Error ? error.message : 'Failed to load models config',
          },
        }));
      }
    },

    /**
     * Load agents configuration.
     */
    async loadAgents(): Promise<void> {
      update(s => ({
        ...s,
        loading: { ...s.loading, agents: true },
        error: null,
      }));

      try {
        const agents = await settingsApi.getAgents();
        update(s => ({
          ...s,
          loading: { ...s.loading, agents: false },
          agents,
        }));
      } catch (error) {
        update(s => ({
          ...s,
          loading: { ...s.loading, agents: false },
          error: {
            code: 'LOAD_AGENTS_FAILED',
            message: error instanceof Error ? error.message : 'Failed to load agents config',
          },
        }));
      }
    },

    /**
     * Load overseer configuration.
     */
    async loadOverseer(): Promise<void> {
      update(s => ({
        ...s,
        loading: { ...s.loading, overseer: true },
        error: null,
      }));

      try {
        const overseer = await settingsApi.getOverseer();
        update(s => ({
          ...s,
          loading: { ...s.loading, overseer: false },
          overseer,
        }));
      } catch (error) {
        update(s => ({
          ...s,
          loading: { ...s.loading, overseer: false },
          error: {
            code: 'LOAD_OVERSEER_FAILED',
            message: error instanceof Error ? error.message : 'Failed to load overseer config',
          },
        }));
      }
    },

    /**
     * Load auto-archive configuration.
     */
    async loadAutoArchive(): Promise<void> {
      update(s => ({
        ...s,
        loading: { ...s.loading, autoArchive: true },
        error: null,
      }));

      try {
        const autoArchive = await settingsApi.getAutoArchive();
        update(s => ({
          ...s,
          loading: { ...s.loading, autoArchive: false },
          autoArchive,
        }));
      } catch (error) {
        update(s => ({
          ...s,
          loading: { ...s.loading, autoArchive: false },
          error: {
            code: 'LOAD_AUTO_ARCHIVE_FAILED',
            message: error instanceof Error ? error.message : 'Failed to load auto-archive config',
          },
        }));
      }
    },

    /**
     * Load API connection configuration.
     */
    async loadApiConnection(): Promise<void> {
      update(s => ({
        ...s,
        loading: { ...s.loading, api: true },
        error: null,
      }));

      try {
        const api = await settingsApi.getApiConnection();
        update(s => ({
          ...s,
          loading: { ...s.loading, api: false },
          api,
        }));
      } catch (error) {
        update(s => ({
          ...s,
          loading: { ...s.loading, api: false },
          error: {
            code: 'LOAD_API_FAILED',
            message: error instanceof Error ? error.message : 'Failed to load API config',
          },
        }));
      }
    },

    /**
     * Load costs configuration.
     */
    async loadCosts(): Promise<void> {
      update(s => ({
        ...s,
        loading: { ...s.loading, costs: true },
        error: null,
      }));

      try {
        const costs = await settingsApi.getCosts();
        update(s => ({
          ...s,
          loading: { ...s.loading, costs: false },
          costs,
        }));
      } catch (error) {
        update(s => ({
          ...s,
          loading: { ...s.loading, costs: false },
          error: {
            code: 'LOAD_COSTS_FAILED',
            message: error instanceof Error ? error.message : 'Failed to load costs config',
          },
        }));
      }
    },

    // =========================================================================
    // Update Methods
    // =========================================================================

    /**
     * Update a model role assignment.
     */
    async updateModel(role: ModelRole, modelId: string): Promise<boolean> {
      update(s => {
        const saving = new Set(s.saving);
        saving.add('models');
        return { ...s, saving, error: null };
      });

      try {
        const result = await settingsApi.updateModel(role, { model_id: modelId });

        // Update local state with new model
        update(s => {
          const saving = new Set(s.saving);
          saving.delete('models');

          if (!s.models) return { ...s, saving };

          return {
            ...s,
            saving,
            models: {
              ...s.models,
              [role]: {
                ...s.models[role],
                current: result.current_model,
              },
            },
          };
        });

        return true;
      } catch (error) {
        update(s => {
          const saving = new Set(s.saving);
          saving.delete('models');
          return {
            ...s,
            saving,
            error: {
              code: 'UPDATE_MODEL_FAILED',
              message: error instanceof Error ? error.message : 'Failed to update model',
            },
          };
        });
        return false;
      }
    },

    /**
     * Update overseer settings.
     */
    async updateOverseer(updates: Partial<OverseerConfigResponse>): Promise<boolean> {
      update(s => {
        const saving = new Set(s.saving);
        saving.add('overseer');
        return { ...s, saving, error: null };
      });

      try {
        const result = await settingsApi.updateOverseer(updates);

        update(s => {
          const saving = new Set(s.saving);
          saving.delete('overseer');
          return {
            ...s,
            saving,
            overseer: result.current,
          };
        });

        return true;
      } catch (error) {
        update(s => {
          const saving = new Set(s.saving);
          saving.delete('overseer');
          return {
            ...s,
            saving,
            error: {
              code: 'UPDATE_OVERSEER_FAILED',
              message: error instanceof Error ? error.message : 'Failed to update overseer settings',
            },
          };
        });
        return false;
      }
    },

    /**
     * Update auto-archive settings.
     */
    async updateAutoArchive(updates: { enabled?: boolean; rules?: AutoArchiveRule[] }): Promise<boolean> {
      update(s => {
        const saving = new Set(s.saving);
        saving.add('autoArchive');
        return { ...s, saving, error: null };
      });

      try {
        const result = await settingsApi.updateAutoArchive(updates);

        update(s => {
          const saving = new Set(s.saving);
          saving.delete('autoArchive');
          return {
            ...s,
            saving,
            autoArchive: result.current,
          };
        });

        return true;
      } catch (error) {
        update(s => {
          const saving = new Set(s.saving);
          saving.delete('autoArchive');
          return {
            ...s,
            saving,
            error: {
              code: 'UPDATE_AUTO_ARCHIVE_FAILED',
              message: error instanceof Error ? error.message : 'Failed to update auto-archive settings',
            },
          };
        });
        return false;
      }
    },

    /**
     * Update general settings.
     */
    async updateGeneral(updates: Partial<GeneralConfigResponse>): Promise<boolean> {
      update(s => {
        const saving = new Set(s.saving);
        saving.add('general');
        return { ...s, saving, error: null };
      });

      try {
        const result = await settingsApi.updateGeneral(updates);

        update(s => {
          const saving = new Set(s.saving);
          saving.delete('general');
          return {
            ...s,
            saving,
            general: result.current,
          };
        });

        return true;
      } catch (error) {
        update(s => {
          const saving = new Set(s.saving);
          saving.delete('general');
          return {
            ...s,
            saving,
            error: {
              code: 'UPDATE_GENERAL_FAILED',
              message: error instanceof Error ? error.message : 'Failed to update general settings',
            },
          };
        });
        return false;
      }
    },

    // Note: API connection settings are read-only.
    // API keys must be managed via environment variables.

    /**
     * Update an agent's configuration.
     */
    async updateAgent(agentName: string, updates: { enabled?: boolean; timeout_seconds?: number }): Promise<boolean> {
      update(s => {
        const saving = new Set(s.saving);
        saving.add('agents');
        return { ...s, saving, error: null };
      });

      try {
        const result = await settingsApi.updateAgent(agentName, updates);

        update(s => {
          const saving = new Set(s.saving);
          saving.delete('agents');

          if (!s.agents) return { ...s, saving };

          // Update the specific agent in the list
          const updatedAgents = s.agents.agents.map(agent =>
            agent.name === agentName ? result.current : agent
          );

          return {
            ...s,
            saving,
            agents: { agents: updatedAgents },
          };
        });

        return true;
      } catch (error) {
        update(s => {
          const saving = new Set(s.saving);
          saving.delete('agents');
          return {
            ...s,
            saving,
            error: {
              code: 'UPDATE_AGENT_FAILED',
              message: error instanceof Error ? error.message : 'Failed to update agent settings',
            },
          };
        });
        return false;
      }
    },

    /**
     * Update costs settings.
     */
    async updateCosts(updates: Partial<CostsConfigResponse>): Promise<boolean> {
      update(s => {
        const saving = new Set(s.saving);
        saving.add('costs');
        return { ...s, saving, error: null };
      });

      try {
        const result = await settingsApi.updateCosts(updates);

        update(s => {
          const saving = new Set(s.saving);
          saving.delete('costs');
          return {
            ...s,
            saving,
            costs: result.current,
          };
        });

        return true;
      } catch (error) {
        update(s => {
          const saving = new Set(s.saving);
          saving.delete('costs');
          return {
            ...s,
            saving,
            error: {
              code: 'UPDATE_COSTS_FAILED',
              message: error instanceof Error ? error.message : 'Failed to update costs settings',
            },
          };
        });
        return false;
      }
    },

    // =========================================================================
    // Utility Methods
    // =========================================================================

    /**
     * Mark a section as dirty (has unsaved changes).
     */
    markDirty(section: string): void {
      update(s => {
        const dirty = new Set(s.dirty);
        dirty.add(section);
        return { ...s, dirty };
      });
    },

    /**
     * Clear dirty flag for a section.
     */
    clearDirty(section: string): void {
      update(s => {
        const dirty = new Set(s.dirty);
        dirty.delete(section);
        return { ...s, dirty };
      });
    },

    /**
     * Clear any error state.
     */
    clearError(): void {
      update(s => ({ ...s, error: null }));
    },

    /**
     * Reset store to initial state.
     */
    reset(): void {
      set(initialState);
    },
  };
}

// =============================================================================
// Exports
// =============================================================================

/** Main settings store with all methods */
export const settingsStore = createSettingsStore();

// Derived stores for individual sections
export const generalConfig = derived(settingsStore, $s => $s.general);
export const modelsConfig = derived(settingsStore, $s => $s.models);
export const agentsConfig = derived(settingsStore, $s => $s.agents);
export const overseerConfig = derived(settingsStore, $s => $s.overseer);
export const autoArchiveConfig = derived(settingsStore, $s => $s.autoArchive);
export const apiConnectionConfig = derived(settingsStore, $s => $s.api);
export const costsConfig = derived(settingsStore, $s => $s.costs);

// Loading states
export const settingsLoading = derived(settingsStore, $s => $s.loading);
export const isAnyLoading = derived(settingsStore, $s =>
  Object.values($s.loading).some(Boolean)
);

// Error state
export const settingsError = derived(settingsStore, $s => $s.error);

// Saving states
export const settingsSaving = derived(settingsStore, $s => $s.saving);
export const isAnySaving = derived(settingsStore, $s => $s.saving.size > 0);

// Dirty states
export const settingsDirty = derived(settingsStore, $s => $s.dirty);
export const isAnyDirty = derived(settingsStore, $s => $s.dirty.size > 0);
