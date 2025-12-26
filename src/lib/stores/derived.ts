/**
 * derived.ts - Derived stores for UNIT-STORE-ARCH
 *
 * Provides computed/derived stores from decisions and filters.
 * These update automatically when source stores change.
 *
 * Exports:
 *   - pendingDecisions: Decisions with status='pending'
 *   - filteredDecisions: Pending decisions with filters applied
 *   - queueStats: Statistics about the decision queue
 *   - allProjects: Unique project names from decisions
 *
 * Usage:
 *   import { filteredDecisions, queueStats } from '$lib/stores';
 *
 *   {#each $filteredDecisions as decision (decision.id)}
 *     <DecisionCard {decision} />
 *   {/each}
 *
 *   <span>Total: {$queueStats.total}</span>
 */

import { derived } from 'svelte/store';
import { decisions } from './decisions';
import { filterStore } from './filters';
import { getTypesInGroup } from '$lib/data/decisions.js';
import type { UiDecision, Priority } from '$lib/api/types';
import type { FilterState, QueueStats } from './types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Apply filters to a decision list.
 * Matches the filtering logic from +page.svelte:86-93.
 */
function applyFilters(decisionList: UiDecision[], filters: FilterState): UiDecision[] {
  return decisionList.filter((d) => {
    // Stage filter (decision type, group, or urgent)
    if (filters.stage !== 'all') {
      if (filters.stage === 'urgent') {
        // 'urgent' maps to 'critical' priority (per Engine terminology)
        if (d.priority !== 'critical') return false;
      } else if (filters.stageMode === 'group') {
        // Group mode: match any type in the group
        const typesInGroup = getTypesInGroup(filters.stage);
        if (!typesInGroup.includes(d.decisionType)) {
          return false;
        }
      } else if (d.decisionType !== filters.stage) {
        // Type mode: exact match
        return false;
      }
    }

    // Type filter (subject type)
    if (filters.type !== 'all' && d.subject.type !== filters.type) {
      return false;
    }

    // Project filter
    if (filters.project !== 'all' && d.project !== filters.project) {
      return false;
    }

    // Search filter (case-insensitive title match)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!d.subject.title.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Compute queue statistics from decision list.
 */
function computeStats(decisionList: UiDecision[]): QueueStats {
  const byType: Record<string, number> = {};
  const byPriority: Record<Priority, number> = {
    critical: 0,
    high: 0,
    normal: 0,
    low: 0,
  };

  for (const d of decisionList) {
    // Count by type
    byType[d.decisionType] = (byType[d.decisionType] || 0) + 1;

    // Count by priority
    if (d.priority in byPriority) {
      byPriority[d.priority]++;
    }
  }

  return {
    total: decisionList.length,
    byType,
    byPriority,
    urgent: byPriority.critical,
  };
}

// =============================================================================
// Derived Stores
// =============================================================================

/**
 * Pending decisions only.
 * Filters out completed, deferred, expired, and undone decisions.
 */
export const pendingDecisions = derived(
  decisions,
  ($decisions) => $decisions.filter((d) => d.status === 'pending')
);

/**
 * Filtered decisions.
 * Applies all active filters to pending decisions.
 */
export const filteredDecisions = derived(
  [pendingDecisions, filterStore],
  ([$pending, $filters]) => applyFilters($pending, $filters)
);

/**
 * Queue statistics for pending decisions.
 * Counts by type, priority, and total.
 */
export const queueStats = derived(
  pendingDecisions,
  ($pending) => computeStats($pending)
);

/**
 * Statistics for filtered decisions.
 * Useful for showing "X of Y" counts.
 */
export const filteredStats = derived(
  filteredDecisions,
  ($filtered) => computeStats($filtered)
);

/**
 * Unique project names from all decisions.
 * Sorted alphabetically, excludes null projects.
 */
export const allProjects = derived(
  decisions,
  ($decisions) => {
    const projects = new Set<string>();
    for (const d of $decisions) {
      if (d.project) {
        projects.add(d.project);
      }
    }
    return Array.from(projects).sort();
  }
);

/**
 * Unique decision types currently in the queue.
 * Useful for populating filter dropdowns.
 */
export const activeDecisionTypes = derived(
  pendingDecisions,
  ($pending) => {
    const types = new Set<string>();
    for (const d of $pending) {
      types.add(d.decisionType);
    }
    return Array.from(types).sort();
  }
);

/**
 * Unique subject types currently in the queue.
 * Useful for populating filter dropdowns.
 */
export const activeSubjectTypes = derived(
  pendingDecisions,
  ($pending) => {
    const types = new Set<string>();
    for (const d of $pending) {
      types.add(d.subject.type);
    }
    return Array.from(types).sort();
  }
);

/**
 * Count of decisions by type.
 * Useful for filter badges.
 */
export const countByType = derived(
  queueStats,
  ($stats) => $stats.byType
);

/**
 * Count of urgent (critical priority) decisions.
 */
export const urgentCount = derived(
  queueStats,
  ($stats) => $stats.urgent
);

/**
 * Total pending decision count.
 */
export const totalCount = derived(
  queueStats,
  ($stats) => $stats.total
);
