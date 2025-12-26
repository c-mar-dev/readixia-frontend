/**
 * tasks.ts - Task API methods
 *
 * Provides typed methods for task-related API operations.
 * Currently supports creating new tasks in MDQ via the Engine.
 *
 * Exports:
 *   - tasksApi: Object with create method
 *
 * Usage:
 *   import { tasksApi } from '$lib/api';
 *
 *   const result = await tasksApi.create({
 *     title: 'Fix login bug',
 *     priority: 'high',
 *     project: 'Apollo'
 *   });
 */

import { apiClient } from './client';
import type { RequestOptions } from './types';

/**
 * Request body for creating a new task.
 */
export interface CreateTaskRequest {
  /** Task title (required) */
  title: string;
  /** Project name (optional) */
  project?: string;
  /** Priority level (optional, defaults to 'normal') */
  priority?: 'low' | 'normal' | 'medium' | 'high' | 'urgent';
  /** Task description/notes (optional) */
  description?: string;
}

/**
 * Response from creating a task.
 */
export interface CreateTaskResponse {
  /** Whether the task was created successfully */
  success: boolean;
  /** Path to the created task file (e.g., "tasks/fix-login-bug.md") */
  path: string;
  /** Human-readable message */
  message: string;
}

/**
 * Task API client.
 *
 * @example
 * const result = await tasksApi.create({
 *   title: 'Implement OAuth',
 *   priority: 'high'
 * });
 * console.log(result.path); // "tasks/implement-oauth.md"
 */
export const tasksApi = {
  /**
   * Create a new task in MDQ.
   *
   * The task is created as a markdown file in the vault's tasks/ directory.
   * The Decision Engine will receive an event and create a triage decision.
   *
   * @param request - Task creation parameters
   * @param options - Request options (timeout, signal)
   * @returns CreateTaskResponse with success status and file path
   *
   * @example
   * const result = await tasksApi.create({
   *   title: 'Fix authentication bug',
   *   project: 'Apollo',
   *   priority: 'high',
   *   description: 'Users cannot log in with SSO'
   * });
   */
  async create(
    request: CreateTaskRequest,
    options?: RequestOptions
  ): Promise<CreateTaskResponse> {
    return apiClient.post<CreateTaskResponse>('/api/tasks/', request, options);
  },
};
