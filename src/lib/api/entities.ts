/**
 * entities.ts - Entity API methods for UNIT-08 Entity Timeline Integration
 *
 * Provides typed methods for entity timeline, progress, and verification operations.
 * All methods return UI-formatted data (transformed from API format).
 *
 * Exports:
 *   - entitiesApi: Object with getTimeline, getProgress, getVerificationStatus methods
 *   - Transform functions for entity data
 *
 * Usage:
 *   import { entitiesApi } from '$lib/api';
 *
 *   // Get entity timeline
 *   const timeline = await entitiesApi.getTimeline('./tasks/feature.md');
 *
 *   // Get workflow progress
 *   const progress = await entitiesApi.getProgress('./tasks/feature.md');
 *
 *   // Get verification status
 *   const verification = await entitiesApi.getVerificationStatus('./tasks/feature.md');
 */

import { apiClient } from './client';
import { formatRelativeTime } from './transforms';
import type {
  ApiTimelineResponse,
  ApiTransitionRecord,
  ApiProgressResponse,
  ApiVerificationStatusResponse,
  UiTimeline,
  UiTimelineEvent,
  UiProgress,
  UiVerification,
  UiCriterion,
  TimelineParams,
  RequestOptions,
} from './types';

// =============================================================================
// Transform Functions
// =============================================================================

/**
 * Format actor string to human-readable label.
 *
 * @example
 * formatActorLabel('system') // "System"
 * formatActorLabel('human') // "Human"
 * formatActorLabel('agent:specifier') // "Agent: Specifier"
 */
export function formatActorLabel(actor: string): string {
  if (actor === 'system') {
    return 'System';
  }
  if (actor === 'human') {
    return 'Human';
  }
  if (actor.startsWith('agent:')) {
    const agentName = actor.slice(6);
    // Capitalize first letter of agent name
    const formattedName = agentName.charAt(0).toUpperCase() + agentName.slice(1);
    return `Agent: ${formattedName}`;
  }
  // Fallback: capitalize first letter
  return actor.charAt(0).toUpperCase() + actor.slice(1);
}

/**
 * Transform a single API transition record to UI format.
 */
export function transformTransition(api: ApiTransitionRecord): UiTimelineEvent {
  const timestamp = new Date(api.timestamp);

  return {
    id: api.id,
    fromState: api.from_state,
    toState: api.to_state,
    timestamp,
    relativeTime: formatRelativeTime(api.timestamp),
    actor: api.actor,
    actorLabel: formatActorLabel(api.actor),
    inputSummary: api.input_summary,
    outputSummary: api.output_summary,
    decisionId: api.decision_id,
    executionId: api.execution_id,
    metadata: api.metadata,
  };
}

/**
 * Transform API timeline response to UI format.
 */
export function transformTimeline(
  api: ApiTimelineResponse,
  currentOffset: number
): UiTimeline {
  return {
    itemPath: api.item_path,
    itemType: api.item_type,
    events: api.transitions.map(transformTransition),
    totalCount: api.total_count,
    hasMore: currentOffset + api.transitions.length < api.total_count,
  };
}

/**
 * Transform API progress response to UI format.
 */
export function transformProgress(api: ApiProgressResponse): UiProgress {
  return {
    currentStage: {
      id: api.current_stage.id,
      label: api.current_stage.label,
      index: api.current_stage.index,
    },
    totalStages: api.total_stages,
    completedStages: api.completed_stages,
    percentage: api.percentage,
  };
}

/**
 * Transform API verification status response to UI format.
 */
export function transformVerification(
  api: ApiVerificationStatusResponse
): UiVerification {
  const criteria: UiCriterion[] = [];
  let timestamp: Date | null = null;
  let relativeTime: string | null = null;
  let passed: boolean | null = null;
  let feedback: string | null = null;

  if (api.latest_verification) {
    timestamp = new Date(api.latest_verification.timestamp);
    relativeTime = formatRelativeTime(api.latest_verification.timestamp);
    passed = api.latest_verification.passed;
    feedback = api.latest_verification.feedback;

    for (const criterion of api.latest_verification.criteria_results) {
      criteria.push({
        id: criterion.criterion_id,
        text: criterion.criterion_text,
        status: criterion.status,
        note: criterion.note,
      });
    }
  }

  return {
    hasVerification: api.has_verification,
    passed,
    timestamp,
    relativeTime,
    criteria,
    feedback,
    retryCount: api.retry_count,
    maxRetries: api.max_retries,
    canRetry: api.can_retry,
  };
}

// =============================================================================
// API Client
// =============================================================================

/**
 * Entity API client with transformed responses.
 *
 * All methods return UI-formatted data, not raw API responses.
 * Entity paths containing "/" characters are automatically URL-encoded.
 *
 * @example
 * // Get timeline for an entity
 * const timeline = await entitiesApi.getTimeline('./tasks/feature.md');
 *
 * // Load more timeline entries
 * const more = await entitiesApi.getTimeline('./tasks/feature.md', {
 *   limit: 50,
 *   offset: 50
 * });
 */
export const entitiesApi = {
  /**
   * Get timeline (state transition history) for an entity.
   *
   * @param path - Entity path (e.g., './tasks/feature.md')
   * @param params - Pagination parameters (limit, offset)
   * @param options - Request options (timeout, signal)
   * @returns Timeline with events and pagination info
   * @throws ApiError with code 'DE-ENT-001' if entity not found
   * @throws ApiError with code 'DE-ENT-003' if history manager unavailable
   *
   * @example
   * // Get first 50 timeline events
   * const timeline = await entitiesApi.getTimeline('./tasks/feature.md', {
   *   limit: 50
   * });
   *
   * // Check if there are more events
   * if (timeline.hasMore) {
   *   const more = await entitiesApi.getTimeline('./tasks/feature.md', {
   *     limit: 50,
   *     offset: 50
   *   });
   * }
   */
  async getTimeline(
    path: string,
    params: TimelineParams = {},
    options?: RequestOptions
  ): Promise<UiTimeline> {
    const encodedPath = encodeURIComponent(path);
    const queryParams = new URLSearchParams();

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    queryParams.set('limit', limit.toString());
    if (offset > 0) {
      queryParams.set('offset', offset.toString());
    }

    const query = queryParams.toString();
    const url = `/api/entities/timeline/${encodedPath}${query ? `?${query}` : ''}`;

    const response = await apiClient.get<ApiTimelineResponse>(url, options);
    return transformTimeline(response, offset);
  },

  /**
   * Get workflow progress for an entity.
   *
   * @param path - Entity path (e.g., './tasks/feature.md')
   * @param options - Request options (timeout, signal)
   * @returns Progress with current stage and percentage
   * @throws ApiError with code 'DE-ENT-001' if entity not found
   * @throws ApiError with code 'DE-ENT-004' if workflow not found
   * @throws ApiError with code 'DE-ENT-005' if state not in workflow
   *
   * @example
   * const progress = await entitiesApi.getProgress('./tasks/feature.md');
   * console.log(`${progress.percentage}% complete`);
   * console.log(`Current stage: ${progress.currentStage.label}`);
   */
  async getProgress(
    path: string,
    options?: RequestOptions
  ): Promise<UiProgress> {
    const encodedPath = encodeURIComponent(path);
    const url = `/api/entities/progress/${encodedPath}`;

    const response = await apiClient.get<ApiProgressResponse>(url, options);
    return transformProgress(response);
  },

  /**
   * Get verification status for an entity.
   *
   * @param path - Entity path (e.g., './tasks/feature.md')
   * @param options - Request options (timeout, signal)
   * @returns Verification status with criteria results
   * @throws ApiError with code 'DE-ENT-001' if entity not found
   *
   * @example
   * const verification = await entitiesApi.getVerificationStatus('./tasks/feature.md');
   *
   * if (verification.hasVerification) {
   *   console.log(`Passed: ${verification.passed}`);
   *   for (const criterion of verification.criteria) {
   *     console.log(`${criterion.text}: ${criterion.status}`);
   *   }
   * }
   */
  async getVerificationStatus(
    path: string,
    options?: RequestOptions
  ): Promise<UiVerification> {
    const encodedPath = encodeURIComponent(path);
    const url = `/api/entities/verification-status/${encodedPath}`;

    const response = await apiClient.get<ApiVerificationStatusResponse>(url, options);
    return transformVerification(response);
  },
};
