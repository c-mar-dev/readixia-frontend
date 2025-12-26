/**
 * filters.test.ts - Unit tests for filter store
 *
 * Tests:
 * - setStage: Setting decision type filter
 * - setType: Setting subject type filter
 * - setProject: Setting project filter
 * - setSearch: Setting search query
 * - clear: Clearing all filters
 * - reset: Resetting to default state
 * - setFilters: Setting multiple filters at once
 * - getFilters: Getting current filter state synchronously
 * - Derived stores: hasActiveFilters, stageFilter, typeFilter, etc.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  filterStore,
  hasActiveFilters,
  stageFilter,
  typeFilter,
  projectFilter,
  searchQuery,
} from './filters';

// =============================================================================
// Test Suite
// =============================================================================

describe('filterStore', () => {
  beforeEach(() => {
    // Reset filters before each test
    filterStore.reset();
  });

  // ---------------------------------------------------------------------------
  // Initial State Tests
  // ---------------------------------------------------------------------------

  describe('initial state', () => {
    it('should have default filter state', () => {
      const filters = filterStore.getFilters();

      expect(filters.stage).toBe('all');
      expect(filters.type).toBe('all');
      expect(filters.project).toBe('all');
      expect(filters.search).toBe('');
    });

    it('should have no active filters initially', () => {
      expect(get(hasActiveFilters)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // setStage Tests
  // ---------------------------------------------------------------------------

  describe('setStage', () => {
    it('should set stage filter', () => {
      filterStore.setStage('triage');

      const filters = filterStore.getFilters();
      expect(filters.stage).toBe('triage');
    });

    it('should set urgent stage filter', () => {
      filterStore.setStage('urgent');

      expect(get(stageFilter)).toBe('urgent');
      expect(get(hasActiveFilters)).toBe(true);
    });

    it('should set all stage filter', () => {
      filterStore.setStage('triage');
      filterStore.setStage('all');

      expect(get(stageFilter)).toBe('all');
    });

    it('should update stage without affecting other filters', () => {
      filterStore.setType('task');
      filterStore.setProject('project-1');
      filterStore.setStage('specify');

      const filters = filterStore.getFilters();
      expect(filters.stage).toBe('specify');
      expect(filters.type).toBe('task');
      expect(filters.project).toBe('project-1');
    });
  });

  // ---------------------------------------------------------------------------
  // setType Tests
  // ---------------------------------------------------------------------------

  describe('setType', () => {
    it('should set type filter', () => {
      filterStore.setType('task');

      const filters = filterStore.getFilters();
      expect(filters.type).toBe('task');
      expect(get(typeFilter)).toBe('task');
    });

    it('should set different subject types', () => {
      filterStore.setType('transcript');
      expect(get(typeFilter)).toBe('transcript');

      filterStore.setType('email');
      expect(get(typeFilter)).toBe('email');

      filterStore.setType('all');
      expect(get(typeFilter)).toBe('all');
    });

    it('should update type without affecting other filters', () => {
      filterStore.setStage('review');
      filterStore.setSearch('test');
      filterStore.setType('task');

      const filters = filterStore.getFilters();
      expect(filters.type).toBe('task');
      expect(filters.stage).toBe('review');
      expect(filters.search).toBe('test');
    });
  });

  // ---------------------------------------------------------------------------
  // setProject Tests
  // ---------------------------------------------------------------------------

  describe('setProject', () => {
    it('should set project filter', () => {
      filterStore.setProject('my-project');

      const filters = filterStore.getFilters();
      expect(filters.project).toBe('my-project');
      expect(get(projectFilter)).toBe('my-project');
    });

    it('should handle project names with special characters', () => {
      filterStore.setProject('Project-123_Test');

      expect(get(projectFilter)).toBe('Project-123_Test');
    });

    it('should update project without affecting other filters', () => {
      filterStore.setStage('triage');
      filterStore.setType('task');
      filterStore.setProject('project-1');

      const filters = filterStore.getFilters();
      expect(filters.project).toBe('project-1');
      expect(filters.stage).toBe('triage');
      expect(filters.type).toBe('task');
    });
  });

  // ---------------------------------------------------------------------------
  // setSearch Tests
  // ---------------------------------------------------------------------------

  describe('setSearch', () => {
    it('should set search query', () => {
      filterStore.setSearch('test query');

      const filters = filterStore.getFilters();
      expect(filters.search).toBe('test query');
      expect(get(searchQuery)).toBe('test query');
    });

    it('should handle empty search query', () => {
      filterStore.setSearch('test');
      filterStore.setSearch('');

      expect(get(searchQuery)).toBe('');
      expect(get(hasActiveFilters)).toBe(false);
    });

    it('should preserve search query case', () => {
      filterStore.setSearch('CaseSensitive');

      expect(get(searchQuery)).toBe('CaseSensitive');
    });

    it('should update search without affecting other filters', () => {
      filterStore.setStage('specify');
      filterStore.setType('task');
      filterStore.setSearch('important');

      const filters = filterStore.getFilters();
      expect(filters.search).toBe('important');
      expect(filters.stage).toBe('specify');
      expect(filters.type).toBe('task');
    });
  });

  // ---------------------------------------------------------------------------
  // clear Tests
  // ---------------------------------------------------------------------------

  describe('clear', () => {
    it('should clear all filters', () => {
      filterStore.setStage('triage');
      filterStore.setType('task');
      filterStore.setProject('project-1');
      filterStore.setSearch('test');

      filterStore.clear();

      const filters = filterStore.getFilters();
      expect(filters.stage).toBe('all');
      expect(filters.type).toBe('all');
      expect(filters.project).toBe('all');
      expect(filters.search).toBe('');
      expect(get(hasActiveFilters)).toBe(false);
    });

    it('should be idempotent', () => {
      filterStore.clear();
      filterStore.clear();

      const filters = filterStore.getFilters();
      expect(filters.stage).toBe('all');
    });
  });

  // ---------------------------------------------------------------------------
  // reset Tests
  // ---------------------------------------------------------------------------

  describe('reset', () => {
    it('should reset to default state', () => {
      filterStore.setStage('review');
      filterStore.setType('email');
      filterStore.setProject('project-1');
      filterStore.setSearch('query');

      filterStore.reset();

      const filters = filterStore.getFilters();
      expect(filters.stage).toBe('all');
      expect(filters.type).toBe('all');
      expect(filters.project).toBe('all');
      expect(filters.search).toBe('');
    });

    it('should be equivalent to clear', () => {
      filterStore.setStage('triage');
      filterStore.reset();

      const afterReset = filterStore.getFilters();

      filterStore.setStage('triage');
      filterStore.clear();

      const afterClear = filterStore.getFilters();

      expect(afterReset).toEqual(afterClear);
    });
  });

  // ---------------------------------------------------------------------------
  // setFilters Tests
  // ---------------------------------------------------------------------------

  describe('setFilters', () => {
    it('should set multiple filters at once', () => {
      filterStore.setFilters({
        stage: 'triage',
        type: 'task',
        project: 'project-1',
        search: 'test',
      });

      const filters = filterStore.getFilters();
      expect(filters.stage).toBe('triage');
      expect(filters.type).toBe('task');
      expect(filters.project).toBe('project-1');
      expect(filters.search).toBe('test');
    });

    it('should set partial filters', () => {
      filterStore.setFilters({ stage: 'review' });

      const filters = filterStore.getFilters();
      expect(filters.stage).toBe('review');
      expect(filters.type).toBe('all'); // Unchanged
      expect(filters.project).toBe('all'); // Unchanged
      expect(filters.search).toBe(''); // Unchanged
    });

    it('should override existing filters', () => {
      filterStore.setFilters({
        stage: 'triage',
        type: 'task',
      });

      filterStore.setFilters({
        stage: 'review',
        project: 'new-project',
      });

      const filters = filterStore.getFilters();
      expect(filters.stage).toBe('review'); // Updated
      expect(filters.type).toBe('task'); // Preserved
      expect(filters.project).toBe('new-project'); // Updated
    });

    it('should handle empty object', () => {
      filterStore.setStage('triage');
      filterStore.setFilters({});

      const filters = filterStore.getFilters();
      expect(filters.stage).toBe('triage'); // Unchanged
    });
  });

  // ---------------------------------------------------------------------------
  // getFilters Tests
  // ---------------------------------------------------------------------------

  describe('getFilters', () => {
    it('should get current filter state synchronously', () => {
      filterStore.setStage('triage');
      filterStore.setType('task');

      const filters = filterStore.getFilters();

      expect(filters).toEqual({
        stage: 'triage',
        type: 'task',
        project: 'all',
        search: '',
      });
    });

    it('should return snapshot not live reference', () => {
      const snapshot1 = filterStore.getFilters();
      filterStore.setStage('triage');
      const snapshot2 = filterStore.getFilters();

      expect(snapshot1.stage).toBe('all');
      expect(snapshot2.stage).toBe('triage');
    });

    it('should work without subscribing', () => {
      // No subscription created
      filterStore.setStage('review');

      const filters = filterStore.getFilters();
      expect(filters.stage).toBe('review');
    });
  });

  // ---------------------------------------------------------------------------
  // Derived Stores Tests
  // ---------------------------------------------------------------------------

  describe('hasActiveFilters', () => {
    it('should be false when all filters are default', () => {
      expect(get(hasActiveFilters)).toBe(false);
    });

    it('should be true when stage filter is set', () => {
      filterStore.setStage('triage');
      expect(get(hasActiveFilters)).toBe(true);
    });

    it('should be true when type filter is set', () => {
      filterStore.setType('task');
      expect(get(hasActiveFilters)).toBe(true);
    });

    it('should be true when project filter is set', () => {
      filterStore.setProject('project-1');
      expect(get(hasActiveFilters)).toBe(true);
    });

    it('should be true when search is set', () => {
      filterStore.setSearch('query');
      expect(get(hasActiveFilters)).toBe(true);
    });

    it('should be true when multiple filters are set', () => {
      filterStore.setStage('triage');
      filterStore.setType('task');
      expect(get(hasActiveFilters)).toBe(true);
    });

    it('should be false after clearing all filters', () => {
      filterStore.setStage('triage');
      filterStore.setType('task');
      filterStore.clear();

      expect(get(hasActiveFilters)).toBe(false);
    });
  });

  describe('stageFilter', () => {
    it('should derive stage value', () => {
      filterStore.setStage('triage');
      expect(get(stageFilter)).toBe('triage');

      filterStore.setStage('review');
      expect(get(stageFilter)).toBe('review');
    });

    it('should update reactively', () => {
      const values: string[] = [];
      const unsubscribe = stageFilter.subscribe((v) => values.push(v));

      filterStore.setStage('triage');
      filterStore.setStage('review');

      unsubscribe();

      expect(values).toEqual(['all', 'triage', 'review']);
    });
  });

  describe('typeFilter', () => {
    it('should derive type value', () => {
      filterStore.setType('task');
      expect(get(typeFilter)).toBe('task');

      filterStore.setType('email');
      expect(get(typeFilter)).toBe('email');
    });

    it('should update reactively', () => {
      const values: string[] = [];
      const unsubscribe = typeFilter.subscribe((v) => values.push(v));

      filterStore.setType('task');
      filterStore.setType('transcript');

      unsubscribe();

      expect(values).toEqual(['all', 'task', 'transcript']);
    });
  });

  describe('projectFilter', () => {
    it('should derive project value', () => {
      filterStore.setProject('project-1');
      expect(get(projectFilter)).toBe('project-1');

      filterStore.setProject('project-2');
      expect(get(projectFilter)).toBe('project-2');
    });

    it('should update reactively', () => {
      const values: string[] = [];
      const unsubscribe = projectFilter.subscribe((v) => values.push(v));

      filterStore.setProject('project-1');
      filterStore.setProject('project-2');

      unsubscribe();

      expect(values).toEqual(['all', 'project-1', 'project-2']);
    });
  });

  describe('searchQuery', () => {
    it('should derive search value', () => {
      filterStore.setSearch('test');
      expect(get(searchQuery)).toBe('test');

      filterStore.setSearch('query');
      expect(get(searchQuery)).toBe('query');
    });

    it('should update reactively', () => {
      const values: string[] = [];
      const unsubscribe = searchQuery.subscribe((v) => values.push(v));

      filterStore.setSearch('test');
      filterStore.setSearch('');

      unsubscribe();

      expect(values).toEqual(['', 'test', '']);
    });
  });

  // ---------------------------------------------------------------------------
  // Integration Tests
  // ---------------------------------------------------------------------------

  describe('integration scenarios', () => {
    it('should handle complex filter workflow', () => {
      // Initial state
      expect(get(hasActiveFilters)).toBe(false);

      // Set filters gradually
      filterStore.setStage('triage');
      expect(get(hasActiveFilters)).toBe(true);

      filterStore.setType('task');
      filterStore.setProject('urgent-tasks');
      filterStore.setSearch('important');

      const filters = filterStore.getFilters();
      expect(filters).toEqual({
        stage: 'triage',
        type: 'task',
        project: 'urgent-tasks',
        search: 'important',
      });

      // Clear one filter
      filterStore.setStage('all');
      expect(get(hasActiveFilters)).toBe(true); // Still has other filters

      // Clear all
      filterStore.clear();
      expect(get(hasActiveFilters)).toBe(false);
    });

    it('should handle rapid filter changes', () => {
      filterStore.setStage('triage');
      filterStore.setStage('review');
      filterStore.setStage('specify');
      filterStore.setStage('all');

      expect(get(stageFilter)).toBe('all');
    });

    it('should support filter presets', () => {
      // Save preset
      const urgentPreset = {
        stage: 'urgent',
        type: 'all',
        project: 'all',
        search: '',
      };

      filterStore.setFilters(urgentPreset);

      expect(filterStore.getFilters()).toEqual(urgentPreset);

      // Switch to another preset
      const reviewPreset = {
        stage: 'review',
        type: 'task',
        project: 'my-project',
        search: '',
      };

      filterStore.setFilters(reviewPreset);

      expect(filterStore.getFilters()).toEqual(reviewPreset);
    });
  });
});
