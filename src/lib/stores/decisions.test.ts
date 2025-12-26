/**
 * decisions.test.ts - Unit tests for decision store
 *
 * Tests:
 * - load: Loading decisions from API
 * - resolve: Resolving with optimistic updates and chained decisions
 * - defer: Deferring decisions
 * - undo: Undoing decisions
 * - addDecision: Local decision addition
 * - insertAfter: Inserting chained decisions
 * - updateDecision: Local decision updates
 * - removeDecision: Local decision removal
 * - handleEvent: Real-time event handling
 * - reset: Store reset
 * - Polling: Start/stop polling
 * - Error handling: API failures and rollbacks
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { decisionStore, decisions, isLoading, storeError } from './decisions';
import type { UiDecision, ApiDecision } from '$lib/api/types';
import type { DecisionEvent } from './types';

// =============================================================================
// Mocks
// =============================================================================

// Mock the decisionsApi
vi.mock('$lib/api', () => {
  return {
    decisionsApi: {
      list: vi.fn(),
      resolve: vi.fn(),
      defer: vi.fn(),
      undo: vi.fn(),
    },
  };
});

import { decisionsApi } from '$lib/api';

// =============================================================================
// Test Data Factories
// =============================================================================

function createMockDecision(overrides: Partial<UiDecision> = {}): UiDecision {
  return {
    id: 'dec-1',
    decisionType: 'triage',
    status: 'pending',
    subject: {
      type: 'task',
      id: 'task-1',
      title: 'Test task',
    },
    project: 'test-project',
    priority: 'normal',
    question: 'Where should this go?',
    created: '2m ago',
    data: {},
    ...overrides,
  };
}

function createMockApiDecision(overrides: Partial<ApiDecision> = {}): ApiDecision {
  return {
    id: 'dec-1',
    type: 'triage',
    status: 'pending',
    subject: {
      type: 'task',
      id: 'task-1',
      title: 'Test task',
    },
    priority: 'normal',
    data: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    resolved_at: null,
    resolved_by: null,
    resolution: null,
    defer_until: null,
    defer_count: 0,
    defer_reason: null,
    batch_id: null,
    batch_index: null,
    action_id: null,
    can_undo: false,
    ...overrides,
  };
}

// =============================================================================
// Test Suite
// =============================================================================

describe('decisionStore', () => {
  beforeEach(() => {
    // Reset store before each test
    decisionStore.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Ensure polling is stopped
    decisionStore.stopPolling();
  });

  // ---------------------------------------------------------------------------
  // Load Tests
  // ---------------------------------------------------------------------------

  describe('load', () => {
    it('should load decisions from API', async () => {
      const mockDecisions = [
        createMockDecision({ id: 'dec-1' }),
        createMockDecision({ id: 'dec-2' }),
      ];

      vi.mocked(decisionsApi.list).mockResolvedValue(mockDecisions);

      await decisionStore.load();

      expect(get(decisions)).toEqual(mockDecisions);
      expect(get(isLoading)).toBe(false);
      expect(get(storeError)).toBeNull();
      expect(decisionsApi.list).toHaveBeenCalledWith(
        { status: 'pending', limit: 50 },
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('should set loading state during load', async () => {
      vi.mocked(decisionsApi.list).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      const loadPromise = decisionStore.load();
      expect(get(isLoading)).toBe(true);

      await loadPromise;
      expect(get(isLoading)).toBe(false);
    });

    it('should handle load errors gracefully', async () => {
      const error = new Error('Network error');
      vi.mocked(decisionsApi.list).mockRejectedValue(error);

      await decisionStore.load();

      expect(get(decisions)).toEqual([]);
      expect(get(isLoading)).toBe(false);
      expect(get(storeError)).toEqual({
        code: 'LOAD_FAILED',
        message: 'Network error',
      });
    });

    it('should apply windowing when exceeding MAX_DECISIONS', async () => {
      // Create 600 decisions (more than MAX_DECISIONS=500)
      const manyDecisions = Array.from({ length: 600 }, (_, i) =>
        createMockDecision({ id: `dec-${i}` })
      );

      vi.mocked(decisionsApi.list).mockResolvedValue(manyDecisions);

      await decisionStore.load();

      const loaded = get(decisions);
      expect(loaded.length).toBe(500); // Should be windowed to MAX
      expect(loaded[0].id).toBe('dec-0'); // First 500 kept
    });
  });

  // ---------------------------------------------------------------------------
  // Resolve Tests
  // ---------------------------------------------------------------------------

  describe('resolve', () => {
    it('should resolve a decision with optimistic update', async () => {
      const decision = createMockDecision({ id: 'dec-1', status: 'pending' });
      decisionStore.addDecision(decision);

      const resolvedDecision = { ...decision, status: 'completed' as const };
      vi.mocked(decisionsApi.resolve).mockResolvedValue({
        decision: resolvedDecision,
        chainedDecisions: [],
        undo_available: true,
        undo_expires_at: new Date(Date.now() + 30000).toISOString(),
        action_id: 'action-1',
      });

      // Check optimistic update
      const resolvePromise = decisionStore.resolve('dec-1', { choice: 'specify' });
      const optimistic = get(decisions).find((d) => d.id === 'dec-1');
      expect(optimistic?.status).toBe('completed');

      await resolvePromise;

      const final = get(decisions).find((d) => d.id === 'dec-1');
      expect(final?.status).toBe('completed');
      expect(decisionsApi.resolve).toHaveBeenCalledWith('dec-1', {
        resolution: { choice: 'specify' },
      });
    });

    it('should insert chained decisions after resolved decision', async () => {
      const decision = createMockDecision({ id: 'dec-1' });
      decisionStore.addDecision(decision);

      const chainedDecision = createMockDecision({ id: 'dec-2', decisionType: 'specify' });
      vi.mocked(decisionsApi.resolve).mockResolvedValue({
        decision: { ...decision, status: 'completed' as const },
        chainedDecisions: [chainedDecision],
        undo_available: false,
        undo_expires_at: null,
        action_id: null,
      });

      await decisionStore.resolve('dec-1', {});

      const list = get(decisions);
      expect(list.length).toBe(2);
      expect(list[0].id).toBe('dec-1');
      expect(list[1].id).toBe('dec-2');
      expect(list[1]._isNew).toBe(true);
    });

    it('should revert optimistic update on resolve failure', async () => {
      const decision = createMockDecision({ id: 'dec-1', status: 'pending' });
      decisionStore.addDecision(decision);

      vi.mocked(decisionsApi.resolve).mockRejectedValue(new Error('Resolve failed'));

      await expect(decisionStore.resolve('dec-1', {})).rejects.toThrow();

      const reverted = get(decisions).find((d) => d.id === 'dec-1');
      expect(reverted?.status).toBe('pending');
      expect(get(storeError)).toEqual({
        code: 'RESOLVE_FAILED',
        message: 'Resolve failed',
      });
    });

    it('should deduplicate chained decisions with same ID', async () => {
      const decision = createMockDecision({ id: 'dec-1' });
      decisionStore.addDecision(decision);

      const chained = createMockDecision({ id: 'dec-2' });
      decisionStore.addDecision(chained); // Already exists

      vi.mocked(decisionsApi.resolve).mockResolvedValue({
        decision: { ...decision, status: 'completed' as const },
        chainedDecisions: [chained], // Duplicate ID
        undo_available: false,
        undo_expires_at: null,
        action_id: null,
      });

      await decisionStore.resolve('dec-1', {});

      const list = get(decisions);
      expect(list.length).toBe(2); // Should not duplicate
      expect(list.filter((d) => d.id === 'dec-2').length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Defer Tests
  // ---------------------------------------------------------------------------

  describe('defer', () => {
    it('should defer a decision', async () => {
      const decision = createMockDecision({ id: 'dec-1', status: 'pending' });
      decisionStore.addDecision(decision);

      const deferredDecision = { ...decision, status: 'deferred' as const };
      vi.mocked(decisionsApi.defer).mockResolvedValue({
        decision: deferredDecision,
        defer_count: 1,
        defer_until: '2024-01-01T12:00:00Z',
        remaining_deferrals: 2,
      });

      await decisionStore.defer('dec-1', '2024-01-01T12:00:00Z', 'Need more info');

      const deferred = get(decisions).find((d) => d.id === 'dec-1');
      expect(deferred?.status).toBe('deferred');
      expect(decisionsApi.defer).toHaveBeenCalledWith('dec-1', {
        until: '2024-01-01T12:00:00Z',
        reason: 'Need more info',
      });
    });

    it('should handle defer errors', async () => {
      const decision = createMockDecision({ id: 'dec-1' });
      decisionStore.addDecision(decision);

      vi.mocked(decisionsApi.defer).mockRejectedValue(new Error('Defer failed'));

      await expect(
        decisionStore.defer('dec-1', '2024-01-01T12:00:00Z')
      ).rejects.toThrow();

      expect(get(storeError)).toEqual({
        code: 'DEFER_FAILED',
        message: 'Defer failed',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Undo Tests
  // ---------------------------------------------------------------------------

  describe('undo', () => {
    it('should undo a decision', async () => {
      const decision = createMockDecision({ id: 'dec-1', status: 'completed' });
      decisionStore.addDecision(decision);

      const undoneDecision = { ...decision, status: 'undone' as const };
      vi.mocked(decisionsApi.undo).mockResolvedValue({
        decision: undoneDecision,
        restored_status: 'pending',
        side_effects_reverted: [],
      });

      await decisionStore.undo('dec-1');

      const undone = get(decisions).find((d) => d.id === 'dec-1');
      expect(undone?.status).toBe('undone');
      expect(decisionsApi.undo).toHaveBeenCalledWith('dec-1');
    });

    it('should handle undo errors', async () => {
      vi.mocked(decisionsApi.undo).mockRejectedValue(new Error('Undo failed'));

      await expect(decisionStore.undo('dec-1')).rejects.toThrow();

      expect(get(storeError)).toEqual({
        code: 'UNDO_FAILED',
        message: 'Undo failed',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Local Update Tests
  // ---------------------------------------------------------------------------

  describe('addDecision', () => {
    it('should add a decision locally', () => {
      const decision = createMockDecision({ id: 'dec-1' });

      decisionStore.addDecision(decision);

      const list = get(decisions);
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('dec-1');
      expect(list[0]._isNew).toBe(true);
    });

    it('should prepend new decisions', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1' }));
      decisionStore.addDecision(createMockDecision({ id: 'dec-2' }));

      const list = get(decisions);
      expect(list[0].id).toBe('dec-2'); // Most recent first
      expect(list[1].id).toBe('dec-1');
    });

    it('should deduplicate added decisions', () => {
      const decision = createMockDecision({ id: 'dec-1' });

      decisionStore.addDecision(decision);
      decisionStore.addDecision(decision); // Duplicate

      const list = get(decisions);
      expect(list.length).toBe(1);
    });
  });

  describe('updateDecision', () => {
    it('should update a decision locally', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1', priority: 'normal' }));

      decisionStore.updateDecision('dec-1', { priority: 'high' });

      const updated = get(decisions).find((d) => d.id === 'dec-1');
      expect(updated?.priority).toBe('high');
    });

    it('should not affect other decisions', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1' }));
      decisionStore.addDecision(createMockDecision({ id: 'dec-2' }));

      decisionStore.updateDecision('dec-1', { priority: 'high' });

      const dec2 = get(decisions).find((d) => d.id === 'dec-2');
      expect(dec2?.priority).toBe('normal'); // Unchanged
    });
  });

  describe('removeDecision', () => {
    it('should remove a decision locally', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1' }));
      decisionStore.addDecision(createMockDecision({ id: 'dec-2' }));

      decisionStore.removeDecision('dec-1');

      const list = get(decisions);
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('dec-2');
    });

    it('should handle removing non-existent decision', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1' }));

      decisionStore.removeDecision('dec-999');

      const list = get(decisions);
      expect(list.length).toBe(1); // Unchanged
    });
  });

  // ---------------------------------------------------------------------------
  // Event Handling Tests
  // ---------------------------------------------------------------------------

  describe('handleEvent', () => {
    it('should handle decision_created event', () => {
      const newDecision = createMockDecision({ id: 'dec-1' });
      const event: DecisionEvent = {
        type: 'decision_created',
        decision: newDecision,
      };

      decisionStore.handleEvent(event);

      const list = get(decisions);
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('dec-1');
      expect(list[0]._isNew).toBe(true);
    });

    it('should handle decision_updated event', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1', priority: 'normal' }));

      const updatedDecision = createMockDecision({ id: 'dec-1', priority: 'high' });
      const event: DecisionEvent = {
        type: 'decision_updated',
        decision: updatedDecision,
      };

      decisionStore.handleEvent(event);

      const updated = get(decisions).find((d) => d.id === 'dec-1');
      expect(updated?.priority).toBe('high');
    });

    it('should handle decision_resolved event', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1', status: 'pending' }));

      const event: DecisionEvent = {
        type: 'decision_resolved',
        id: 'dec-1',
        resolution: { choice: 'specify' },
      };

      decisionStore.handleEvent(event);

      const resolved = get(decisions).find((d) => d.id === 'dec-1');
      expect(resolved?.status).toBe('completed');
    });

    it('should handle decision_chained event', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1' }));

      const chainedDecision = createMockDecision({ id: 'dec-2' });
      const event: DecisionEvent = {
        type: 'decision_chained',
        parentId: 'dec-1',
        child: chainedDecision,
      };

      decisionStore.handleEvent(event);

      const list = get(decisions);
      expect(list.length).toBe(2);
      expect(list[0].id).toBe('dec-1');
      expect(list[1].id).toBe('dec-2');
      expect(list[1]._isNew).toBe(true);
    });

    it('should handle decision_expired event', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1', status: 'pending' }));

      const event: DecisionEvent = {
        type: 'decision_expired',
        id: 'dec-1',
      };

      decisionStore.handleEvent(event);

      const expired = get(decisions).find((d) => d.id === 'dec-1');
      expect(expired?.status).toBe('expired');
    });

    it('should handle decisions_refresh event', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-old' }));

      const newList = [
        createMockDecision({ id: 'dec-1' }),
        createMockDecision({ id: 'dec-2' }),
      ];
      const event: DecisionEvent = {
        type: 'decisions_refresh',
        decisions: newList,
      };

      decisionStore.handleEvent(event);

      const list = get(decisions);
      expect(list.length).toBe(2);
      expect(list.find((d) => d.id === 'dec-old')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Polling Tests
  // ---------------------------------------------------------------------------

  describe('polling', () => {
    it('should start polling', async () => {
      vi.useFakeTimers();
      vi.mocked(decisionsApi.list).mockResolvedValue([]);

      decisionStore.startPolling(1000); // 1 second for testing

      // Initial load not triggered by polling
      expect(decisionsApi.list).not.toHaveBeenCalled();

      // Advance time and wait for promise
      await vi.advanceTimersByTimeAsync(1000);

      expect(decisionsApi.list).toHaveBeenCalledTimes(1);

      decisionStore.stopPolling();
      vi.useRealTimers();
    });

    it('should not start duplicate polling', () => {
      vi.useFakeTimers();

      decisionStore.startPolling(1000);
      decisionStore.startPolling(1000); // Duplicate call

      vi.advanceTimersByTime(1000);

      // Should only have one interval running
      decisionStore.stopPolling();
      vi.useRealTimers();
    });

    it('should stop polling', async () => {
      vi.useFakeTimers();
      vi.mocked(decisionsApi.list).mockResolvedValue([]);

      decisionStore.startPolling(1000);
      decisionStore.stopPolling();

      vi.advanceTimersByTime(2000);
      await vi.runAllTimersAsync();

      expect(decisionsApi.list).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // ---------------------------------------------------------------------------
  // Reset Tests
  // ---------------------------------------------------------------------------

  describe('reset', () => {
    it('should reset store to initial state', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1' }));
      decisionStore.startPolling();

      decisionStore.reset();

      expect(get(decisions)).toEqual([]);
      expect(get(isLoading)).toBe(false);
      expect(get(storeError)).toBeNull();
      expect(decisionStore.initialized).toBe(false);
    });

    it('should stop polling on reset', () => {
      vi.useFakeTimers();
      vi.mocked(decisionsApi.list).mockResolvedValue([]);

      decisionStore.startPolling(1000);
      decisionStore.reset();

      vi.advanceTimersByTime(2000);

      expect(decisionsApi.list).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // ---------------------------------------------------------------------------
  // Derived Stores Tests
  // ---------------------------------------------------------------------------

  describe('derived stores', () => {
    it('decisions store should derive decision array', () => {
      const decision = createMockDecision({ id: 'dec-1' });
      decisionStore.addDecision(decision);

      const list = get(decisions);
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('dec-1');
      expect(list[0].decisionType).toBe(decision.decisionType);
    });

    it('isLoading store should derive loading state', async () => {
      vi.mocked(decisionsApi.list).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      const loadPromise = decisionStore.load();
      expect(get(isLoading)).toBe(true);

      await loadPromise;
      expect(get(isLoading)).toBe(false);
    });

    it('storeError store should derive error state', async () => {
      vi.mocked(decisionsApi.list).mockRejectedValue(new Error('Test error'));

      await decisionStore.load();

      expect(get(storeError)).toEqual({
        code: 'LOAD_FAILED',
        message: 'Test error',
      });

      decisionStore.clearError();
      expect(get(storeError)).toBeNull();
    });
  });
});
