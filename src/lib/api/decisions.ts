/**
 * decisions.ts - Decision API methods for UNIT-API-CLIENT
 *
 * Provides typed methods for all decision-related API operations.
 * All methods return UI-formatted decisions (transformed from API format).
 * Used by downstream units: +page.svelte, DecisionCard.svelte
 *
 * Exports:
 *   - decisionsApi: Object with list, get, resolve, defer, undo methods
 *
 * Usage:
 *   import { decisionsApi } from '$lib/api';
 *
 *   // List pending decisions
 *   const decisions = await decisionsApi.list({ status: 'pending' });
 *
 *   // Resolve a decision
 *   const result = await decisionsApi.resolve('dec-123', {
 *     resolution: { action: 'approve' }
 *   });
 *
 *   // Check for chained decisions
 *   if (result.chainedDecisions.length > 0) {
 *     // Handle follow-up decision
 *   }
 */

import { apiClient } from './client';
import { transformDecision, transformDecisions } from './transforms';
import type {
  ApiDecision,
  ApiResolutionResponse,
  ApiDeferResponse,
  ApiUndoResponse,
  UiDecision,
  DecisionListParams,
  ResolutionRequest,
  DeferRequest,
  RequestOptions,
} from './types';

/**
 * Decision API client with transformed responses.
 *
 * All methods return UI-formatted decisions, not raw API responses.
 *
 * @example
 * // List all pending decisions
 * const decisions = await decisionsApi.list({ status: 'pending' });
 *
 * // Resolve a decision
 * const result = await decisionsApi.resolve('dec-123', {
 *   resolution: { action: 'approve' }
 * });
 */
export const decisionsApi = {
  /**
   * List decisions with optional filters.
   *
   * @param params - Query parameters for filtering
   * @param options - Request options (timeout, signal)
   * @returns Array of UI-formatted decisions
   *
   * @example
   * // Get all pending triage decisions
   * const decisions = await decisionsApi.list({
   *   status: 'pending',
   *   type: 'triage',
   *   limit: 50
   * });
   */
  async list(
    params: DecisionListParams = {},
    options?: RequestOptions
  ): Promise<UiDecision[]> {
    const queryParams = new URLSearchParams();

    if (params.type) {
      queryParams.set('type', params.type);
    }
    if (params.status) {
      queryParams.set('status', params.status);
    }
    if (params.limit !== undefined) {
      queryParams.set('limit', params.limit.toString());
    }

    const query = queryParams.toString();
    const path = `/api/decisions/${query ? `?${query}` : ''}`;

    const apiDecisions = await apiClient.get<ApiDecision[]>(path, options);
    return transformDecisions(apiDecisions);
  },

  /**
   * Get a single decision by ID.
   *
   * @param decisionId - The decision ID
   * @param options - Request options
   * @returns UI-formatted decision
   * @throws ApiError with code 'DE-DEC-001' if not found
   */
  async get(
    decisionId: string,
    options?: RequestOptions
  ): Promise<UiDecision> {
    const apiDecision = await apiClient.get<ApiDecision>(
      `/api/decisions/${decisionId}`,
      options
    );
    return transformDecision(apiDecision);
  },

  /**
   * Resolve a decision with the given resolution data.
   *
   * @param decisionId - The decision ID to resolve
   * @param request - Resolution request with resolution data
   * @param options - Request options
   * @returns Object containing resolved decision and any chained decisions
   * @throws ApiError with code 'DE-DEC-002' if already resolved
   *
   * @example
   * const result = await decisionsApi.resolve('dec-123', {
   *   resolution: { action: 'approve', notes: 'Looks good' },
   *   resolved_by: 'user@example.com'
   * });
   *
   * if (result.chainedDecisions.length > 0) {
   *   // Handle chained decisions (e.g., triage -> specify)
   * }
   */
  async resolve(
    decisionId: string,
    request: ResolutionRequest,
    options?: RequestOptions
  ): Promise<{
    decision: UiDecision;
    chainedDecisions: UiDecision[];
    undoAvailable: boolean;
    undoExpiresAt: Date | null;
    actionId: string | null;
  }> {
    const response = await apiClient.post<ApiResolutionResponse>(
      `/api/decisions/${decisionId}/resolve`,
      request,
      options
    );

    return {
      decision: transformDecision(response.decision),
      chainedDecisions: transformDecisions(response.chained_decisions),
      undoAvailable: response.undo_available,
      undoExpiresAt: response.undo_expires_at
        ? new Date(response.undo_expires_at)
        : null,
      actionId: response.action_id,
    };
  },

  /**
   * Defer a decision to a later time.
   *
   * @param decisionId - The decision ID to defer
   * @param request - Defer request with target time
   * @param options - Request options
   * @returns Object with deferred decision and deferral info
   * @throws ApiError with code 'DE-DEC-004' if deferral limit exceeded
   *
   * @example
   * const result = await decisionsApi.defer('dec-123', {
   *   until: new Date(Date.now() + 3600000).toISOString(), // 1 hour
   *   reason: 'Need more information'
   * });
   *
   * console.log(`${result.remainingDeferrals} deferrals remaining`);
   */
  async defer(
    decisionId: string,
    request: DeferRequest,
    options?: RequestOptions
  ): Promise<{
    decision: UiDecision;
    deferCount: number;
    deferUntil: Date;
    remainingDeferrals: number;
  }> {
    const response = await apiClient.post<ApiDeferResponse>(
      `/api/decisions/${decisionId}/defer`,
      request,
      options
    );

    return {
      decision: transformDecision(response.decision),
      deferCount: response.defer_count,
      deferUntil: new Date(response.defer_until),
      remainingDeferrals: response.remaining_deferrals,
    };
  },

  /**
   * Undo a recently resolved decision.
   *
   * Only available within the 5-minute undo window after resolution.
   *
   * @param decisionId - The decision ID to undo
   * @param options - Request options
   * @returns Object with undone decision and status
   * @throws ApiError with code 'DE-DEC-005' if undo window expired
   *
   * @example
   * try {
   *   const result = await decisionsApi.undo('dec-123');
   *   console.log('Decision restored to:', result.restoredStatus);
   * } catch (error) {
   *   if (error.code === 'DE-DEC-005') {
   *     console.log('Undo window expired');
   *   }
   * }
   */
  async undo(
    decisionId: string,
    options?: RequestOptions
  ): Promise<{
    decision: UiDecision;
    restoredStatus: string;
    sideEffectsReverted: string[];
  }> {
    const response = await apiClient.post<ApiUndoResponse>(
      `/api/decisions/${decisionId}/undo`,
      {},
      options
    );

    return {
      decision: transformDecision(response.decision),
      restoredStatus: response.restored_status,
      sideEffectsReverted: response.side_effects_reverted,
    };
  },
};
