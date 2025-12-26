/**
 * projects.ts - Project API methods
 *
 * Provides typed methods for project-related API operations.
 * Used for project dropdown population with fuzzy search.
 *
 * Exports:
 *   - projectsApi: Object with list method
 *
 * Usage:
 *   import { projectsApi } from '$lib/api';
 *
 *   const result = await projectsApi.list({ state: 'active' });
 *   console.log(result.projects); // [{ id, title, state }]
 */

import { apiClient } from './client';
import type { RequestOptions } from './types';

/**
 * Project response from API.
 */
export interface Project {
  /** Project file path (e.g., "projects/apollo.md") */
  id: string;
  /** Project title */
  title: string;
  /** Project state (active, completed, archived) */
  state: string;
}

/**
 * Response from listing projects.
 */
export interface ProjectListResponse {
  projects: Project[];
  count: number;
}

/**
 * Project list query parameters.
 */
export interface ProjectListParams {
  /** Search query for fuzzy matching */
  q?: string;
  /** Filter by state (active, completed, archived, all) */
  state?: string;
  /** Maximum results (default: 100) */
  limit?: number;
}

/**
 * Project API client.
 *
 * @example
 * const result = await projectsApi.list({ state: 'active' });
 * console.log(result.projects.map(p => p.title));
 */
export const projectsApi = {
  /**
   * List projects from MDQ.
   *
   * @param params - Query parameters (q, state, limit)
   * @param options - Request options (timeout, signal)
   * @returns ProjectListResponse with projects array and count
   *
   * @example
   * // Get all active projects
   * const result = await projectsApi.list({ state: 'active' });
   *
   * // Search for projects
   * const result = await projectsApi.list({ q: 'apollo' });
   */
  async list(
    params?: ProjectListParams,
    options?: RequestOptions
  ): Promise<ProjectListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.q) queryParams.set('q', params.q);
    if (params?.state) queryParams.set('state', params.state);
    if (params?.limit) queryParams.set('limit', String(params.limit));

    const queryString = queryParams.toString();
    const path = `/api/projects/${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<ProjectListResponse>(path, options);
  },
};
