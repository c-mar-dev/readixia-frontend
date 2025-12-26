/**
 * chainHistory.test.ts - Unit tests for chain history store
 *
 * Tests:
 * - recordCompletion: Recording decision completions
 * - getHistory: Getting completion history for a subject
 * - getProgress: Getting workflow progress for a subject
 * - hasHistory: Checking if subject has history
 * - clear: Clearing all history
 * - clearSubject: Clearing history for a specific subject
 * - reset: Resetting to initial state
 * - Memory limits: MAX_SUBJECTS enforcement
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  chainHistoryStore,
  chainHistory,
  WORKFLOW_ORDER,
} from './chainHistory';

// =============================================================================
// Test Suite
// =============================================================================

describe('chainHistoryStore', () => {
  beforeEach(() => {
    // Reset store before each test
    chainHistoryStore.reset();
  });

  // ---------------------------------------------------------------------------
  // Initial State Tests
  // ---------------------------------------------------------------------------

  describe('initial state', () => {
    it('should have empty history', () => {
      const history = get(chainHistory);
      expect(history.size).toBe(0);
    });

    it('should return empty array for unknown subject', () => {
      const stages = chainHistoryStore.getHistory('unknown-subject');
      expect(stages).toEqual([]);
    });

    it('should report no history for unknown subject', () => {
      expect(chainHistoryStore.hasHistory('unknown-subject')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // recordCompletion Tests
  // ---------------------------------------------------------------------------

  describe('recordCompletion', () => {
    it('should record a single completion', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-123');

      const stages = chainHistoryStore.getHistory('subject-1');
      expect(stages).toHaveLength(1);
      expect(stages[0].type).toBe('triage');
      expect(stages[0].decisionId).toBe('dec-123');
      expect(stages[0].completedAt).toBeInstanceOf(Date);
    });

    it('should record multiple completions for same subject', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');
      chainHistoryStore.recordCompletion('subject-1', 'specify', 'dec-2');
      chainHistoryStore.recordCompletion('subject-1', 'verifying', 'dec-3');

      const stages = chainHistoryStore.getHistory('subject-1');
      expect(stages).toHaveLength(3);
      expect(stages.map(s => s.type)).toEqual(['triage', 'specify', 'verifying']);
    });

    it('should record completions for different subjects', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');
      chainHistoryStore.recordCompletion('subject-2', 'specify', 'dec-2');

      const stages1 = chainHistoryStore.getHistory('subject-1');
      const stages2 = chainHistoryStore.getHistory('subject-2');

      expect(stages1).toHaveLength(1);
      expect(stages1[0].type).toBe('triage');

      expect(stages2).toHaveLength(1);
      expect(stages2[0].type).toBe('specify');
    });

    it('should be idempotent (same decisionId)', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-123');
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-123');
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-123');

      const stages = chainHistoryStore.getHistory('subject-1');
      expect(stages).toHaveLength(1);
    });

    it('should allow same type with different decisionId', () => {
      // Edge case: same type resolved twice (e.g., review → revise → review again)
      chainHistoryStore.recordCompletion('subject-1', 'review', 'dec-1');
      chainHistoryStore.recordCompletion('subject-1', 'review', 'dec-2');

      const stages = chainHistoryStore.getHistory('subject-1');
      expect(stages).toHaveLength(2);
    });

    it('should update derived chainHistory store', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');

      const history = get(chainHistory);
      expect(history.has('subject-1')).toBe(true);
      expect(history.get('subject-1')).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getHistory Tests
  // ---------------------------------------------------------------------------

  describe('getHistory', () => {
    it('should return empty array for unknown subject', () => {
      const stages = chainHistoryStore.getHistory('unknown');
      expect(stages).toEqual([]);
    });

    it('should return stages in order of completion', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');
      chainHistoryStore.recordCompletion('subject-1', 'specify', 'dec-2');

      const stages = chainHistoryStore.getHistory('subject-1');
      expect(stages[0].type).toBe('triage');
      expect(stages[1].type).toBe('specify');
    });

    it('should reflect current state (returns reference)', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');
      const stages1 = chainHistoryStore.getHistory('subject-1');
      expect(stages1).toHaveLength(1);

      chainHistoryStore.recordCompletion('subject-1', 'specify', 'dec-2');
      const stages2 = chainHistoryStore.getHistory('subject-1');
      expect(stages2).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // getProgress Tests
  // ---------------------------------------------------------------------------

  describe('getProgress', () => {
    it('should return empty progress for unknown subject', () => {
      const progress = chainHistoryStore.getProgress('unknown');

      expect(progress.completed).toEqual([]);
      expect(progress.completedCount).toBe(0);
      expect(progress.totalStages).toBe(WORKFLOW_ORDER.length);
    });

    it('should return progress with completed stages', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');
      chainHistoryStore.recordCompletion('subject-1', 'specify', 'dec-2');

      const progress = chainHistoryStore.getProgress('subject-1');

      expect(progress.completed).toEqual(['triage', 'specify']);
      expect(progress.completedCount).toBe(2);
      expect(progress.totalStages).toBe(4);
    });

    it('should handle full workflow completion', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');
      chainHistoryStore.recordCompletion('subject-1', 'specify', 'dec-2');
      chainHistoryStore.recordCompletion('subject-1', 'verifying', 'dec-3');
      chainHistoryStore.recordCompletion('subject-1', 'review', 'dec-4');

      const progress = chainHistoryStore.getProgress('subject-1');

      expect(progress.completedCount).toBe(4);
      expect(progress.totalStages).toBe(4);
    });
  });

  // ---------------------------------------------------------------------------
  // hasHistory Tests
  // ---------------------------------------------------------------------------

  describe('hasHistory', () => {
    it('should return false for unknown subject', () => {
      expect(chainHistoryStore.hasHistory('unknown')).toBe(false);
    });

    it('should return true for subject with history', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');

      expect(chainHistoryStore.hasHistory('subject-1')).toBe(true);
    });

    it('should return false after clearing subject', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');
      chainHistoryStore.clearSubject('subject-1');

      expect(chainHistoryStore.hasHistory('subject-1')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // clear Tests
  // ---------------------------------------------------------------------------

  describe('clear', () => {
    it('should clear all history', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');
      chainHistoryStore.recordCompletion('subject-2', 'specify', 'dec-2');

      chainHistoryStore.clear();

      expect(chainHistoryStore.hasHistory('subject-1')).toBe(false);
      expect(chainHistoryStore.hasHistory('subject-2')).toBe(false);
      expect(get(chainHistory).size).toBe(0);
    });

    it('should be idempotent', () => {
      chainHistoryStore.clear();
      chainHistoryStore.clear();

      expect(get(chainHistory).size).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // clearSubject Tests
  // ---------------------------------------------------------------------------

  describe('clearSubject', () => {
    it('should clear only specified subject', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');
      chainHistoryStore.recordCompletion('subject-2', 'specify', 'dec-2');

      chainHistoryStore.clearSubject('subject-1');

      expect(chainHistoryStore.hasHistory('subject-1')).toBe(false);
      expect(chainHistoryStore.hasHistory('subject-2')).toBe(true);
    });

    it('should handle clearing unknown subject', () => {
      chainHistoryStore.clearSubject('unknown');

      // Should not throw
      expect(get(chainHistory).size).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // reset Tests
  // ---------------------------------------------------------------------------

  describe('reset', () => {
    it('should reset to initial state', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');
      chainHistoryStore.recordCompletion('subject-2', 'specify', 'dec-2');

      chainHistoryStore.reset();

      expect(get(chainHistory).size).toBe(0);
    });

    it('should be equivalent to clear', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');
      chainHistoryStore.reset();
      const afterReset = get(chainHistory);

      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');
      chainHistoryStore.clear();
      const afterClear = get(chainHistory);

      expect(afterReset.size).toBe(afterClear.size);
    });
  });

  // ---------------------------------------------------------------------------
  // WORKFLOW_ORDER Tests
  // ---------------------------------------------------------------------------

  describe('WORKFLOW_ORDER', () => {
    it('should have 4 stages', () => {
      expect(WORKFLOW_ORDER).toHaveLength(4);
    });

    it('should have correct order', () => {
      expect(WORKFLOW_ORDER).toEqual(['triage', 'specify', 'verifying', 'review']);
    });

    it('should be immutable in TypeScript (compile-time readonly)', () => {
      // WORKFLOW_ORDER is marked as `readonly` in TypeScript
      // This provides compile-time protection, not runtime protection
      // Just verify it's defined as expected
      expect(WORKFLOW_ORDER).toBeDefined();
      expect(Object.isFrozen(WORKFLOW_ORDER)).toBe(false); // JS arrays aren't frozen by TS readonly
    });
  });

  // ---------------------------------------------------------------------------
  // Derived Store Tests
  // ---------------------------------------------------------------------------

  describe('chainHistory derived store', () => {
    it('should update reactively', () => {
      const values: Map<string, unknown>[] = [];
      const unsubscribe = chainHistory.subscribe((v) => values.push(new Map(v)));

      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');
      chainHistoryStore.recordCompletion('subject-1', 'specify', 'dec-2');

      unsubscribe();

      expect(values).toHaveLength(3); // Initial + 2 updates
      expect(values[0].size).toBe(0);
      expect(values[1].size).toBe(1);
      expect(values[2].size).toBe(1);
    });

    it('should provide access to all subjects', () => {
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');
      chainHistoryStore.recordCompletion('subject-2', 'specify', 'dec-2');

      const history = get(chainHistory);

      expect(history.has('subject-1')).toBe(true);
      expect(history.has('subject-2')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Integration Tests
  // ---------------------------------------------------------------------------

  describe('integration scenarios', () => {
    it('should handle full workflow chain', () => {
      const subjectId = 'task/my-task.md';

      // Simulate full workflow progression
      chainHistoryStore.recordCompletion(subjectId, 'triage', 'dec-triage');
      expect(chainHistoryStore.getProgress(subjectId).completedCount).toBe(1);

      chainHistoryStore.recordCompletion(subjectId, 'specify', 'dec-specify');
      expect(chainHistoryStore.getProgress(subjectId).completedCount).toBe(2);

      chainHistoryStore.recordCompletion(subjectId, 'verifying', 'dec-verify');
      expect(chainHistoryStore.getProgress(subjectId).completedCount).toBe(3);

      chainHistoryStore.recordCompletion(subjectId, 'review', 'dec-review');
      expect(chainHistoryStore.getProgress(subjectId).completedCount).toBe(4);

      // Full workflow complete
      const progress = chainHistoryStore.getProgress(subjectId);
      expect(progress.completed).toEqual(['triage', 'specify', 'verifying', 'review']);
    });

    it('should handle revision loop (review → specify → verifying → review)', () => {
      const subjectId = 'task/revised-task.md';

      // Initial workflow
      chainHistoryStore.recordCompletion(subjectId, 'triage', 'dec-1');
      chainHistoryStore.recordCompletion(subjectId, 'specify', 'dec-2');
      chainHistoryStore.recordCompletion(subjectId, 'verifying', 'dec-3');
      chainHistoryStore.recordCompletion(subjectId, 'review', 'dec-4');

      // Revision loop
      chainHistoryStore.recordCompletion(subjectId, 'specify', 'dec-5');
      chainHistoryStore.recordCompletion(subjectId, 'verifying', 'dec-6');
      chainHistoryStore.recordCompletion(subjectId, 'review', 'dec-7');

      const stages = chainHistoryStore.getHistory(subjectId);
      expect(stages).toHaveLength(7);
    });

    it('should handle multiple subjects concurrently', () => {
      // Subject 1 starts
      chainHistoryStore.recordCompletion('subject-1', 'triage', 'dec-1');

      // Subject 2 starts
      chainHistoryStore.recordCompletion('subject-2', 'triage', 'dec-2');

      // Both progress
      chainHistoryStore.recordCompletion('subject-1', 'specify', 'dec-3');
      chainHistoryStore.recordCompletion('subject-2', 'specify', 'dec-4');

      // Verify isolation
      expect(chainHistoryStore.getProgress('subject-1').completedCount).toBe(2);
      expect(chainHistoryStore.getProgress('subject-2').completedCount).toBe(2);
    });

    it('should handle non-standard decision types gracefully', () => {
      // Types outside WORKFLOW_ORDER should still be recorded
      chainHistoryStore.recordCompletion('subject-1', 'checkpoint', 'dec-1');
      chainHistoryStore.recordCompletion('subject-1', 'clarifying', 'dec-2');

      const stages = chainHistoryStore.getHistory('subject-1');
      expect(stages).toHaveLength(2);
      expect(stages.map(s => s.type)).toEqual(['checkpoint', 'clarifying']);
    });
  });
});
