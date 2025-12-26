/**
 * agents.ts - Agent status store for UNIT-10-AGENT-STATUS
 *
 * Tracks real-time agent execution status from WebSocket events.
 * Maintains a map of active agents with their progress, logs, and results.
 *
 * Exports:
 *   - agentStore: Writable store with handleEvent method
 *   - agents: Derived array of agent states
 *   - hasErrors: Derived boolean for any agents in error state
 *
 * Usage:
 *   import { agents, hasErrors } from '$lib/stores/agents';
 *
 *   {#each $agents as agent}
 *     <AgentCard {agent} />
 *   {/each}
 */

import { writable, derived } from 'svelte/store';
import type { AgentWebSocketEvent } from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Agent execution status.
 */
export type AgentStatus = 'idle' | 'running' | 'error' | 'completed' | 'failed' | 'timeout';

/**
 * Agent result information.
 */
export interface AgentResult {
  /** Result type */
  type: 'completed' | 'failed' | 'timeout';
  /** Execution duration in milliseconds (if available) */
  durationMs?: number;
  /** Error message (for failed/timeout) */
  error?: string;
  /** Number of retries attempted (for failed) */
  retryCount?: number;
}

/**
 * Agent state tracked by the store.
 */
export interface AgentState {
  /** Unique agent ID */
  id: string;
  /** Human-readable agent name */
  name: string;
  /** Agent role/description */
  role: string;
  /** Current status */
  status: AgentStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current task description */
  currentTask: string | null;
  /** Last active timestamp */
  lastActive: Date;
  /** Recent log entries */
  logs: string[];
  /** Result information (if completed/failed/timeout) */
  result?: AgentResult;
}

/**
 * Agent store state.
 */
export interface AgentStoreState {
  /** Map of agent ID to agent state */
  agents: Map<string, AgentState>;
}

// =============================================================================
// Store Implementation
// =============================================================================

const MAX_LOGS_PER_AGENT = 10;
const IDLE_TIMEOUT_MS = 30_000; // 30 seconds without activity = idle
const IDLE_CHECK_INTERVAL_MS = 10_000; // Check every 10 seconds

let idleCheckInterval: ReturnType<typeof setInterval> | null = null;

function createAgentStore() {
  const initialState: AgentStoreState = {
    agents: new Map(),
  };

  const { subscribe, set, update } = writable<AgentStoreState>(initialState);

  return {
    subscribe,

    /**
     * Handle incoming agent WebSocket events.
     */
    handleEvent(event: AgentWebSocketEvent): void {
      switch (event.type) {
        case 'agent_status':
          update((s) => {
            const agents = new Map(s.agents);
            const existing = agents.get(event.agent_id);

            // Determine status based on event data
            let status: AgentStatus = 'idle';
            if (event.status === 'running') {
              status = 'running';
            } else if (event.status === 'idle') {
              status = 'idle';
            } else if (event.status === 'error') {
              status = 'error';
            }

            agents.set(event.agent_id, {
              id: event.agent_id,
              name: event.name,
              role: event.role,
              status,
              progress: event.progress || 0,
              currentTask: event.current_task || null,
              lastActive: new Date(event.last_active),
              logs: event.logs || existing?.logs || [],
              result: existing?.result, // Preserve existing result
            });

            return { agents };
          });
          break;

        case 'agent_completed':
          update((s) => {
            const agents = new Map(s.agents);
            const existing = agents.get(event.agent_id);

            if (existing) {
              agents.set(event.agent_id, {
                ...existing,
                status: 'completed',
                progress: 100,
                currentTask: `Completed in ${formatDuration(event.duration_ms)}`,
                lastActive: new Date(),
                result: {
                  type: 'completed',
                  durationMs: event.duration_ms,
                },
              });
            }

            return { agents };
          });
          break;

        case 'agent_failed':
          update((s) => {
            const agents = new Map(s.agents);
            const existing = agents.get(event.decision_id); // Note: uses decision_id

            if (existing) {
              agents.set(event.decision_id, {
                ...existing,
                status: 'failed',
                currentTask: `Failed: ${event.error || 'Unknown error'}`,
                lastActive: new Date(),
                result: {
                  type: 'failed',
                  error: event.error || undefined,
                  retryCount: event.retry_count,
                },
              });
            }

            return { agents };
          });
          break;

        case 'agent_timeout':
          update((s) => {
            const agents = new Map(s.agents);
            const existing = agents.get(event.decision_id); // Note: uses decision_id

            if (existing) {
              agents.set(event.decision_id, {
                ...existing,
                status: 'timeout',
                currentTask: 'Execution timed out',
                lastActive: new Date(),
                result: {
                  type: 'timeout',
                  error: 'Agent execution exceeded maximum time limit',
                },
              });
            }

            return { agents };
          });
          break;

        case 'checkpoint_expired':
          // Checkpoint events don't affect agent state directly
          // They're handled by the event handler for notifications
          break;
      }
    },

    /**
     * Remove an agent from the active list.
     */
    remove(agentId: string): void {
      update((s) => {
        const agents = new Map(s.agents);
        agents.delete(agentId);
        return { agents };
      });
    },

    /**
     * Clear all agents.
     */
    clear(): void {
      set(initialState);
    },

    /**
     * Reset store to initial state.
     */
    reset(): void {
      set(initialState);
    },

    /**
     * Start the idle detection interval.
     * Running agents with no activity for 30s will transition to idle.
     * Call this when the agents page mounts.
     */
    startIdleDetection(): void {
      if (idleCheckInterval) return; // Already running

      idleCheckInterval = setInterval(() => {
        const now = Date.now();

        update((s) => {
          let changed = false;
          const agents = new Map(s.agents);

          for (const [id, agent] of agents) {
            // Only transition running agents to idle
            if (agent.status === 'running') {
              const elapsed = now - agent.lastActive.getTime();
              if (elapsed > IDLE_TIMEOUT_MS) {
                agents.set(id, {
                  ...agent,
                  status: 'idle',
                  currentTask: 'Waiting...',
                });
                changed = true;
              }
            }
          }

          return changed ? { agents } : s;
        });
      }, IDLE_CHECK_INTERVAL_MS);
    },

    /**
     * Stop the idle detection interval.
     * Call this when the agents page unmounts.
     */
    stopIdleDetection(): void {
      if (idleCheckInterval) {
        clearInterval(idleCheckInterval);
        idleCheckInterval = null;
      }
    },
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format duration in milliseconds to human-readable string.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

// =============================================================================
// Exports
// =============================================================================

/** Main agent store */
export const agentStore = createAgentStore();

/**
 * Array of all active agents.
 * Sorted by last active (most recent first).
 */
export const agents = derived(agentStore, ($s) => {
  return Array.from($s.agents.values()).sort(
    (a, b) => b.lastActive.getTime() - a.lastActive.getTime()
  );
});

/**
 * Only agents with status 'running'.
 * Useful for showing active agent indicators.
 */
export const activeAgents = derived(agents, ($agents) => {
  return $agents.filter((a) => a.status === 'running');
});

/**
 * True if any agent is in error state.
 */
export const hasErrors = derived(agents, ($agents) => {
  return $agents.some((a) => a.status === 'error' || a.status === 'failed');
});

/**
 * Count of running agents.
 */
export const runningCount = derived(agents, ($agents) => {
  return $agents.filter((a) => a.status === 'running').length;
});

/**
 * Count of agents with errors.
 */
export const errorCount = derived(agents, ($agents) => {
  return $agents.filter((a) => a.status === 'error' || a.status === 'failed').length;
});
