/**
 * chainHistory.ts - Chain history store for UNIT-11-DECISION-CHAINING
 *
 * Tracks completed decision stages per subject for workflow progress visualization.
 * When a decision is resolved, the completion is recorded to show accurate progress.
 *
 * Used by downstream units: DecisionCard.svelte for progress indicator
 *
 * Exports:
 *   - chainHistoryStore: Writable store with recordCompletion/getHistory methods
 *   - getProgress: Get subject's workflow progress
 *
 * Usage:
 *   import { chainHistoryStore } from '$lib/stores';
 *
 *   // After resolving a decision
 *   chainHistoryStore.recordCompletion(
 *     decision.subject.id,
 *     decision.decisionType,
 *     decision.id
 *   );
 *
 *   // Get progress for display
 *   const progress = chainHistoryStore.getProgress(subjectId);
 *   // { completed: ['triage', 'specify'], currentIndex: 2 }
 */

import { writable, derived } from 'svelte/store';

// =============================================================================
// Types
// =============================================================================

/**
 * A completed workflow stage for a subject.
 */
export interface CompletedStage {
  /** The decision type that was completed (triage, specify, etc.) */
  type: string;
  /** The decision ID that was resolved */
  decisionId: string;
  /** When the stage was completed */
  completedAt: Date;
}

/**
 * Store state shape.
 */
interface ChainHistoryState {
  /** Map of subjectId -> array of completed stages */
  history: Map<string, CompletedStage[]>;
}

// =============================================================================
// Constants
// =============================================================================

/** Standard workflow order for progress calculation */
export const WORKFLOW_ORDER = ['triage', 'specify', 'verifying', 'review'] as const;

/** Maximum subjects to track (to prevent memory leaks) */
const MAX_SUBJECTS = 200;

// =============================================================================
// Store Implementation
// =============================================================================

function createChainHistoryStore() {
  const initialState: ChainHistoryState = {
    history: new Map(),
  };

  const { subscribe, set, update } = writable<ChainHistoryState>(initialState);

  return {
    subscribe,

    /**
     * Record a completed decision stage for a subject.
     *
     * @param subjectId - The subject.id (e.g., task path)
     * @param decisionType - The decision type that was completed
     * @param decisionId - The decision ID that was resolved
     */
    recordCompletion(
      subjectId: string,
      decisionType: string,
      decisionId: string
    ): void {
      update((state) => {
        const newHistory = new Map(state.history);
        const stages = newHistory.get(subjectId) || [];

        // Check if this stage is already recorded (idempotent)
        const alreadyRecorded = stages.some(
          (s) => s.decisionId === decisionId
        );
        if (alreadyRecorded) {
          return state;
        }

        // Add the new completion
        stages.push({
          type: decisionType,
          decisionId,
          completedAt: new Date(),
        });

        newHistory.set(subjectId, stages);

        // Enforce maximum subjects to prevent memory leaks
        if (newHistory.size > MAX_SUBJECTS) {
          // Remove oldest entries
          const entries = Array.from(newHistory.entries());
          entries.sort((a, b) => {
            const aLatest = a[1][a[1].length - 1]?.completedAt?.getTime() || 0;
            const bLatest = b[1][b[1].length - 1]?.completedAt?.getTime() || 0;
            return aLatest - bLatest;
          });

          // Remove oldest 20%
          const toRemove = Math.floor(MAX_SUBJECTS * 0.2);
          for (let i = 0; i < toRemove; i++) {
            newHistory.delete(entries[i][0]);
          }
        }

        return { history: newHistory };
      });
    },

    /**
     * Get the completed stages for a subject.
     *
     * @param subjectId - The subject.id to look up
     * @returns Array of completed stages, or empty array if none
     */
    getHistory(subjectId: string): CompletedStage[] {
      let result: CompletedStage[] = [];
      const unsubscribe = subscribe((state) => {
        result = state.history.get(subjectId) || [];
      });
      unsubscribe();
      return result;
    },

    /**
     * Get workflow progress for a subject.
     *
     * @param subjectId - The subject.id to look up
     * @returns Object with completed types and current index in workflow
     */
    getProgress(subjectId: string): {
      completed: string[];
      completedCount: number;
      totalStages: number;
    } {
      const stages = this.getHistory(subjectId);
      const completed = stages.map((s) => s.type);

      return {
        completed,
        completedCount: completed.length,
        totalStages: WORKFLOW_ORDER.length,
      };
    },

    /**
     * Check if a subject has any history.
     *
     * @param subjectId - The subject.id to check
     * @returns True if subject has completed stages
     */
    hasHistory(subjectId: string): boolean {
      return this.getHistory(subjectId).length > 0;
    },

    /**
     * Clear all history.
     * Useful for testing or when switching contexts.
     */
    clear(): void {
      set({ history: new Map() });
    },

    /**
     * Clear history for a specific subject.
     *
     * @param subjectId - The subject.id to clear
     */
    clearSubject(subjectId: string): void {
      update((state) => {
        const newHistory = new Map(state.history);
        newHistory.delete(subjectId);
        return { history: newHistory };
      });
    },

    /**
     * Reset store to initial state.
     */
    reset(): void {
      set({ history: new Map() });
    },
  };
}

// =============================================================================
// Exports
// =============================================================================

/** Main chain history store with all methods */
export const chainHistoryStore = createChainHistoryStore();

/**
 * Derived store with the raw history map for subscriptions.
 */
export const chainHistory = derived(
  chainHistoryStore,
  ($store) => $store.history
);
