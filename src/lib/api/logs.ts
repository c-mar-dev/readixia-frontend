/**
 * logs.ts - Execution Logs API client for Unit 14
 *
 * Provides methods for fetching agent execution logs from the Engine.
 *
 * Endpoints:
 *   - GET /api/logs/ - List logs with filtering
 *   - GET /api/logs/{id} - Get full execution detail
 *   - GET /api/logs/stats - Get storage statistics
 */

import { apiClient } from './client';

// =============================================================================
// Types
// =============================================================================

/** Execution status enum */
export type ExecutionStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'CHECKPOINTED';

/** Summary execution log for list view */
export interface ExecutionLogResponse {
  id: string;
  task_path: string;
  agent_name: string;
  started_at: string;
  completed_at: string | null;
  status: ExecutionStatus;
  execution_time_ms: number;
  estimated_cost_usd: number | null;
  output_preview: string | null;
  error: string | null;
  tool_calls_count: number;
  session_id: string | null;
  decision_id: string | null;
  has_detail: boolean;
}

/** Paginated list of execution logs */
export interface LogsListResponse {
  logs: ExecutionLogResponse[];
  total_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/** Execution event in timeline */
export interface ExecutionEventResponse {
  id: string;
  event_type: string;
  timestamp: string;
  data: Record<string, unknown>;
  tool_name: string | null;
  duration_ms: number | null;
}

/** Full execution log detail */
export interface ExecutionLogDetailResponse {
  id: string;
  task_path: string;
  agent_name: string;
  started_at: string;
  completed_at: string | null;
  status: ExecutionStatus;
  execution_time_ms: number;
  estimated_cost_usd: number | null;
  prompt_hash: string;
  prompt_full: string | null;
  response_full: string | null;
  events: ExecutionEventResponse[];
  tool_calls_detailed: Record<string, unknown>[];
  session_id: string | null;
  decision_id: string | null;
}

/** Storage statistics */
export interface StorageStatsResponse {
  total_count: number;
  total_prompt_bytes: number;
  total_response_bytes: number;
  compressed_count: number;
  oldest_record: string | null;
  newest_record: string | null;
}

/** Filter parameters for logs list */
export interface LogsFilter {
  agent?: string;
  task?: string;
  session?: string;
  decision?: string;
  status?: ExecutionStatus;
  from_time?: string;
  to_time?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * List execution logs with optional filtering.
 */
export async function listLogs(filters?: LogsFilter): Promise<LogsListResponse> {
  const params = new URLSearchParams();

  if (filters) {
    if (filters.agent) params.set('agent', filters.agent);
    if (filters.task) params.set('task', filters.task);
    if (filters.session) params.set('session', filters.session);
    if (filters.decision) params.set('decision', filters.decision);
    if (filters.status) params.set('status', filters.status);
    if (filters.from_time) params.set('from_time', filters.from_time);
    if (filters.to_time) params.set('to_time', filters.to_time);
    if (filters.limit !== undefined) params.set('limit', String(filters.limit));
    if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  }

  const query = params.toString();
  const url = query ? `/api/logs/?${query}` : '/api/logs/';

  return apiClient.get<LogsListResponse>(url);
}

/**
 * Get full execution log detail by ID.
 */
export async function getLog(id: string): Promise<ExecutionLogDetailResponse> {
  return apiClient.get<ExecutionLogDetailResponse>(`/api/logs/${encodeURIComponent(id)}`);
}

/**
 * Get storage statistics for execution logs.
 */
export async function getLogsStats(): Promise<StorageStatsResponse> {
  return apiClient.get<StorageStatsResponse>('/api/logs/stats');
}

// =============================================================================
// Convenience Export
// =============================================================================

export const logsApi = {
  list: listLogs,
  get: getLog,
  getStats: getLogsStats,
};
