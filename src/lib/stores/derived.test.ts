/**
 * derived.test.ts - Unit tests for derived stores
 *
 * Tests:
 * - pendingDecisions: Filtering by status='pending'
 * - filteredDecisions: Applying filters to pending decisions
 * - queueStats: Computing statistics from pending decisions
 * - filteredStats: Statistics for filtered decisions
 * - allProjects: Extracting unique project names
 * - activeDecisionTypes: Extracting unique decision types
 * - activeSubjectTypes: Extracting unique subject types
 * - countByType: Decision counts by type
 * - urgentCount: Critical priority count
 * - totalCount: Total pending count
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { decisionStore } from './decisions';
import { filterStore } from './filters';
import {
  pendingDecisions,
  filteredDecisions,
  queueStats,
  filteredStats,
  allProjects,
  activeDecisionTypes,
  activeSubjectTypes,
  countByType,
  urgentCount,
  totalCount,
} from './derived';
import type { UiDecision, Priority } from '$lib/api/types';

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

// =============================================================================
// Test Suite
// =============================================================================

describe('derived stores', () => {
  beforeEach(() => {
    decisionStore.reset();
    filterStore.reset();
  });

  // ---------------------------------------------------------------------------
  // pendingDecisions Tests
  // ---------------------------------------------------------------------------

  describe('pendingDecisions', () => {
    it('should filter pending decisions only', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1', status: 'pending' }));
      decisionStore.addDecision(createMockDecision({ id: 'dec-2', status: 'completed' }));
      decisionStore.addDecision(createMockDecision({ id: 'dec-3', status: 'pending' }));
      decisionStore.addDecision(createMockDecision({ id: 'dec-4', status: 'deferred' }));

      const pending = get(pendingDecisions);

      expect(pending.length).toBe(2);
      expect(pending.every((d) => d.status === 'pending')).toBe(true);
      expect(pending.find((d) => d.id === 'dec-1')).toBeDefined();
      expect(pending.find((d) => d.id === 'dec-3')).toBeDefined();
    });

    it('should return empty array when no pending decisions', () => {
      decisionStore.addDecision(createMockDecision({ status: 'completed' }));
      decisionStore.addDecision(createMockDecision({ status: 'expired' }));

      const pending = get(pendingDecisions);

      expect(pending).toEqual([]);
    });

    it('should update reactively when decisions change', () => {
      const values: UiDecision[][] = [];
      const unsubscribe = pendingDecisions.subscribe((v) => values.push(v));

      decisionStore.addDecision(createMockDecision({ id: 'dec-1', status: 'pending' }));
      decisionStore.addDecision(createMockDecision({ id: 'dec-2', status: 'completed' }));

      unsubscribe();

      expect(values.length).toBe(3); // Initial [], after dec-1, after dec-2
      expect(values[0]).toEqual([]);
      expect(values[1].length).toBe(1);
      expect(values[2].length).toBe(1); // Still 1 pending
    });
  });

  // ---------------------------------------------------------------------------
  // filteredDecisions Tests
  // ---------------------------------------------------------------------------

  describe('filteredDecisions', () => {
    beforeEach(() => {
      // Add test data
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-1',
          decisionType: 'triage',
          status: 'pending',
          subject: { type: 'task', id: 'task-1', title: 'First task' },
          project: 'project-a',
          priority: 'normal',
        })
      );
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-2',
          decisionType: 'review',
          status: 'pending',
          subject: { type: 'task', id: 'task-2', title: 'Second task' },
          project: 'project-b',
          priority: 'high',
        })
      );
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-3',
          decisionType: 'triage',
          status: 'pending',
          subject: { type: 'transcript', id: 'trans-1', title: 'Meeting notes' },
          project: 'project-a',
          priority: 'critical',
        })
      );
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-4',
          decisionType: 'specify',
          status: 'completed', // Not pending
          subject: { type: 'task', id: 'task-3', title: 'Done task' },
          project: null,
          priority: 'low',
        })
      );
    });

    it('should return all pending decisions when no filters', () => {
      const filtered = get(filteredDecisions);

      expect(filtered.length).toBe(3); // Only pending
      expect(filtered.find((d) => d.id === 'dec-4')).toBeUndefined(); // Completed excluded
    });

    it('should filter by stage (decision type)', () => {
      filterStore.setStage('triage');

      const filtered = get(filteredDecisions);

      expect(filtered.length).toBe(2);
      expect(filtered.every((d) => d.decisionType === 'triage')).toBe(true);
    });

    it('should filter by urgent (critical priority)', () => {
      filterStore.setStage('urgent');

      const filtered = get(filteredDecisions);

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('dec-3');
      expect(filtered[0].priority).toBe('critical');
    });

    it('should filter by type (subject type)', () => {
      filterStore.setType('task');

      const filtered = get(filteredDecisions);

      expect(filtered.length).toBe(2);
      expect(filtered.every((d) => d.subject.type === 'task')).toBe(true);
    });

    it('should filter by project', () => {
      filterStore.setProject('project-a');

      const filtered = get(filteredDecisions);

      expect(filtered.length).toBe(2);
      expect(filtered.every((d) => d.project === 'project-a')).toBe(true);
    });

    it('should filter by search query (case-insensitive)', () => {
      filterStore.setSearch('task');

      const filtered = get(filteredDecisions);

      expect(filtered.length).toBe(2);
      expect(filtered.every((d) => d.subject.title.toLowerCase().includes('task'))).toBe(true);
    });

    it('should apply multiple filters together', () => {
      filterStore.setStage('triage');
      filterStore.setType('task');
      filterStore.setProject('project-a');

      const filtered = get(filteredDecisions);

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('dec-1');
    });

    it('should return empty array when no matches', () => {
      filterStore.setStage('review');
      filterStore.setType('transcript');

      const filtered = get(filteredDecisions);

      expect(filtered).toEqual([]);
    });

    it('should update reactively when filters change', () => {
      filterStore.setStage('triage');
      const triage = get(filteredDecisions);

      filterStore.setStage('review');
      const review = get(filteredDecisions);

      expect(triage.length).toBe(2);
      expect(review.length).toBe(1);
    });

    it('should update reactively when decisions change', () => {
      filterStore.setStage('triage');

      const before = get(filteredDecisions);
      expect(before.length).toBe(2);

      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-5',
          decisionType: 'triage',
          status: 'pending',
        })
      );

      const after = get(filteredDecisions);
      expect(after.length).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // queueStats Tests
  // ---------------------------------------------------------------------------

  describe('queueStats', () => {
    beforeEach(() => {
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-1',
          decisionType: 'triage',
          priority: 'normal',
          status: 'pending',
        })
      );
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-2',
          decisionType: 'triage',
          priority: 'high',
          status: 'pending',
        })
      );
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-3',
          decisionType: 'review',
          priority: 'critical',
          status: 'pending',
        })
      );
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-4',
          decisionType: 'specify',
          priority: 'low',
          status: 'completed', // Not counted
        })
      );
    });

    it('should compute total pending count', () => {
      const stats = get(queueStats);

      expect(stats.total).toBe(3);
    });

    it('should compute count by decision type', () => {
      const stats = get(queueStats);

      expect(stats.byType.triage).toBe(2);
      expect(stats.byType.review).toBe(1);
      expect(stats.byType.specify).toBeUndefined(); // Completed not counted
    });

    it('should compute count by priority', () => {
      const stats = get(queueStats);

      expect(stats.byPriority.normal).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.critical).toBe(1);
      expect(stats.byPriority.low).toBe(0); // Completed not counted
    });

    it('should compute urgent count', () => {
      const stats = get(queueStats);

      expect(stats.urgent).toBe(1);
      expect(stats.urgent).toBe(stats.byPriority.critical);
    });

    it('should return zero stats when no pending decisions', () => {
      decisionStore.reset();

      const stats = get(queueStats);

      expect(stats.total).toBe(0);
      expect(stats.byType).toEqual({});
      expect(stats.byPriority).toEqual({
        critical: 0,
        high: 0,
        normal: 0,
        low: 0,
      });
      expect(stats.urgent).toBe(0);
    });

    it('should update reactively', () => {
      const before = get(queueStats);
      expect(before.total).toBe(3);

      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-5',
          decisionType: 'review',
          status: 'pending',
        })
      );

      const after = get(queueStats);
      expect(after.total).toBe(4);
      expect(after.byType.review).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // filteredStats Tests
  // ---------------------------------------------------------------------------

  describe('filteredStats', () => {
    beforeEach(() => {
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-1',
          decisionType: 'triage',
          priority: 'critical',
          status: 'pending',
        })
      );
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-2',
          decisionType: 'triage',
          priority: 'normal',
          status: 'pending',
        })
      );
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-3',
          decisionType: 'review',
          priority: 'high',
          status: 'pending',
        })
      );
    });

    it('should compute stats for filtered decisions', () => {
      filterStore.setStage('triage');

      const stats = get(filteredStats);

      expect(stats.total).toBe(2);
      expect(stats.byType.triage).toBe(2);
      expect(stats.byType.review).toBeUndefined();
    });

    it('should show different stats than queueStats when filtered', () => {
      filterStore.setStage('triage');

      const queue = get(queueStats);
      const filtered = get(filteredStats);

      expect(queue.total).toBe(3); // All pending
      expect(filtered.total).toBe(2); // Only triage
    });

    it('should match queueStats when no filters', () => {
      const queue = get(queueStats);
      const filtered = get(filteredStats);

      expect(filtered).toEqual(queue);
    });
  });

  // ---------------------------------------------------------------------------
  // allProjects Tests
  // ---------------------------------------------------------------------------

  describe('allProjects', () => {
    it('should extract unique project names', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1', project: 'project-a' }));
      decisionStore.addDecision(createMockDecision({ id: 'dec-2', project: 'project-b' }));
      decisionStore.addDecision(createMockDecision({ id: 'dec-3', project: 'project-a' })); // Duplicate project

      const projects = get(allProjects);

      expect(projects).toEqual(['project-a', 'project-b']);
    });

    it('should exclude null projects', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1', project: 'project-a' }));
      decisionStore.addDecision(createMockDecision({ id: 'dec-2', project: null }));

      const projects = get(allProjects);

      expect(projects).toEqual(['project-a']);
    });

    it('should sort projects alphabetically', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1', project: 'zebra' }));
      decisionStore.addDecision(createMockDecision({ id: 'dec-2', project: 'alpha' }));
      decisionStore.addDecision(createMockDecision({ id: 'dec-3', project: 'beta' }));

      const projects = get(allProjects);

      expect(projects).toEqual(['alpha', 'beta', 'zebra']);
    });

    it('should return empty array when no projects', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1', project: null }));

      const projects = get(allProjects);

      expect(projects).toEqual([]);
    });

    it('should include completed decisions', () => {
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-1', project: 'project-a', status: 'pending' })
      );
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-2', project: 'project-b', status: 'completed' })
      );

      const projects = get(allProjects);

      expect(projects).toEqual(['project-a', 'project-b']);
    });

    it('should update reactively', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1', project: 'project-a' }));

      const before = get(allProjects);
      expect(before).toEqual(['project-a']);

      decisionStore.addDecision(createMockDecision({ id: 'dec-2', project: 'project-b' }));

      const after = get(allProjects);
      expect(after).toEqual(['project-a', 'project-b']);
    });
  });

  // ---------------------------------------------------------------------------
  // activeDecisionTypes Tests
  // ---------------------------------------------------------------------------

  describe('activeDecisionTypes', () => {
    it('should extract unique decision types from pending', () => {
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-1', decisionType: 'triage', status: 'pending' })
      );
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-2', decisionType: 'review', status: 'pending' })
      );
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-3', decisionType: 'triage', status: 'pending' })
      ); // Duplicate type

      const types = get(activeDecisionTypes);

      expect(types).toEqual(['review', 'triage']);
    });

    it('should only include pending decisions', () => {
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-1', decisionType: 'triage', status: 'pending' })
      );
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-2', decisionType: 'review', status: 'completed' })
      );

      const types = get(activeDecisionTypes);

      expect(types).toEqual(['triage']);
    });

    it('should sort types alphabetically', () => {
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-1', decisionType: 'verify', status: 'pending' })
      );
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-2', decisionType: 'clarify', status: 'pending' })
      );
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-3', decisionType: 'specify', status: 'pending' })
      );

      const types = get(activeDecisionTypes);

      expect(types).toEqual(['clarify', 'specify', 'verify']);
    });

    it('should return empty array when no pending decisions', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1', status: 'completed' }));

      const types = get(activeDecisionTypes);

      expect(types).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // activeSubjectTypes Tests
  // ---------------------------------------------------------------------------

  describe('activeSubjectTypes', () => {
    it('should extract unique subject types from pending', () => {
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-1',
          subject: { type: 'task', id: '1', title: 'Task' },
          status: 'pending',
        })
      );
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-2',
          subject: { type: 'transcript', id: '2', title: 'Transcript' },
          status: 'pending',
        })
      );
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-3',
          subject: { type: 'task', id: '3', title: 'Another task' },
          status: 'pending',
        })
      );

      const types = get(activeSubjectTypes);

      expect(types).toEqual(['task', 'transcript']);
    });

    it('should only include pending decisions', () => {
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-1',
          subject: { type: 'task', id: '1', title: 'Task' },
          status: 'pending',
        })
      );
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-2',
          subject: { type: 'email', id: '2', title: 'Email' },
          status: 'completed',
        })
      );

      const types = get(activeSubjectTypes);

      expect(types).toEqual(['task']);
    });

    it('should sort types alphabetically', () => {
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-1',
          subject: { type: 'transcript', id: '1', title: 'T' },
          status: 'pending',
        })
      );
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-2',
          subject: { type: 'email', id: '2', title: 'E' },
          status: 'pending',
        })
      );
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-3',
          subject: { type: 'task', id: '3', title: 'Tk' },
          status: 'pending',
        })
      );

      const types = get(activeSubjectTypes);

      expect(types).toEqual(['email', 'task', 'transcript']);
    });
  });

  // ---------------------------------------------------------------------------
  // Convenience Derived Stores Tests
  // ---------------------------------------------------------------------------

  describe('countByType', () => {
    it('should derive type counts from queueStats', () => {
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-1', decisionType: 'triage', status: 'pending' })
      );
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-2', decisionType: 'triage', status: 'pending' })
      );
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-3', decisionType: 'review', status: 'pending' })
      );

      const counts = get(countByType);

      expect(counts.triage).toBe(2);
      expect(counts.review).toBe(1);
    });
  });

  describe('urgentCount', () => {
    it('should derive urgent count from queueStats', () => {
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-1', priority: 'critical', status: 'pending' })
      );
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-2', priority: 'critical', status: 'pending' })
      );
      decisionStore.addDecision(
        createMockDecision({ id: 'dec-3', priority: 'normal', status: 'pending' })
      );

      const urgent = get(urgentCount);

      expect(urgent).toBe(2);
    });
  });

  describe('totalCount', () => {
    it('should derive total count from queueStats', () => {
      decisionStore.addDecision(createMockDecision({ id: 'dec-1', status: 'pending' }));
      decisionStore.addDecision(createMockDecision({ id: 'dec-2', status: 'pending' }));
      decisionStore.addDecision(createMockDecision({ id: 'dec-3', status: 'completed' }));

      const total = get(totalCount);

      expect(total).toBe(2); // Only pending
    });
  });

  // ---------------------------------------------------------------------------
  // Integration Tests
  // ---------------------------------------------------------------------------

  describe('integration scenarios', () => {
    it('should handle complex filtering workflow', () => {
      // Setup diverse data
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-1',
          decisionType: 'triage',
          subject: { type: 'task', id: 'task-1', title: 'Urgent task' },
          project: 'project-a',
          priority: 'critical',
          status: 'pending',
        })
      );
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-2',
          decisionType: 'review',
          subject: { type: 'task', id: 'task-2', title: 'Normal task' },
          project: 'project-b',
          priority: 'normal',
          status: 'pending',
        })
      );
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-3',
          decisionType: 'triage',
          subject: { type: 'transcript', id: 'trans-1', title: 'Meeting' },
          project: 'project-a',
          priority: 'high',
          status: 'pending',
        })
      );

      // No filters - all pending
      expect(get(filteredDecisions).length).toBe(3);
      expect(get(totalCount)).toBe(3);
      expect(get(urgentCount)).toBe(1);

      // Filter by urgent
      filterStore.setStage('urgent');
      expect(get(filteredDecisions).length).toBe(1);
      expect(get(filteredDecisions)[0].id).toBe('dec-1');

      // Filter by project
      filterStore.clear();
      filterStore.setProject('project-a');
      expect(get(filteredDecisions).length).toBe(2);

      // Combine filters
      filterStore.setType('task');
      expect(get(filteredDecisions).length).toBe(1);
      expect(get(filteredDecisions)[0].id).toBe('dec-1');

      // Search filter
      filterStore.clear();
      filterStore.setSearch('urgent');
      expect(get(filteredDecisions).length).toBe(1);
    });

    it('should update all derived stores when decisions change', () => {
      // Initial state
      expect(get(pendingDecisions)).toEqual([]);
      expect(get(totalCount)).toBe(0);
      expect(get(allProjects)).toEqual([]);

      // Add decision
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-1',
          decisionType: 'triage',
          project: 'project-a',
          status: 'pending',
        })
      );

      expect(get(pendingDecisions).length).toBe(1);
      expect(get(totalCount)).toBe(1);
      expect(get(allProjects)).toEqual(['project-a']);
      expect(get(activeDecisionTypes)).toEqual(['triage']);

      // Add another
      decisionStore.addDecision(
        createMockDecision({
          id: 'dec-2',
          decisionType: 'review',
          project: 'project-b',
          status: 'pending',
        })
      );

      expect(get(totalCount)).toBe(2);
      expect(get(allProjects)).toEqual(['project-a', 'project-b']);
      expect(get(activeDecisionTypes)).toEqual(['review', 'triage']);
    });
  });
});
