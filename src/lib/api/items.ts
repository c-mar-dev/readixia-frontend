/**
 * items.ts - Items API methods
 *
 * Provides typed methods for querying MDQ items (tasks, transcripts, sources, etc.).
 * Used by the Items page to display vault contents.
 *
 * Exports:
 *   - itemsApi: Object with list and get methods
 *   - Item, ItemDetail, ItemListResponse types
 *
 * Usage:
 *   import { itemsApi } from '$lib/api';
 *
 *   const result = await itemsApi.list({ type: 'task' });
 *   console.log(result.items);
 */

import { apiClient } from './client';
import type { RequestOptions } from './types';

/**
 * Item types supported by MDQ.
 */
export type ItemType = 'task' | 'transcript' | 'source' | 'project' | 'person' | 'email' | 'calendar';

/**
 * Item response from API.
 */
export interface Item {
  /** File path (e.g., "tasks/fix-login.md") */
  path: string;
  /** Item type */
  itemType: ItemType;
  /** Item title */
  title: string;
  /** Current state */
  state: string;
  /** Associated project path */
  project: string | null;
  /** Priority level */
  priority: string | null;
  /** Relative time (e.g., "2h ago") */
  created: string;
  /** ISO 8601 timestamp */
  createdAt: string | null;
  /** Brief description */
  description: string | null;
  /** Tags */
  tags: string[];
}

/**
 * Detailed item with body content.
 */
export interface ItemDetail extends Item {
  /** Markdown body content */
  body: string | null;
  /** Full frontmatter */
  frontmatter: Record<string, unknown>;
}

/**
 * Response from listing items.
 */
export interface ItemListResponse {
  items: Item[];
  total: number;
  hasMore: boolean;
}

/**
 * Item list query parameters.
 */
export interface ItemListParams {
  /** Filter by item type */
  type?: ItemType;
  /** Filter by state */
  state?: string;
  /** Filter by project path */
  project?: string;
  /** Search query */
  q?: string;
  /** Maximum results (default: 50) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Items API client.
 *
 * @example
 * const result = await itemsApi.list({ type: 'task', state: 'inbox' });
 * console.log(result.items.map(i => i.title));
 */
export const itemsApi = {
  /**
   * List items from MDQ vault.
   *
   * @param params - Query parameters
   * @param options - Request options (timeout, signal)
   * @returns ItemListResponse with items array, total, and hasMore
   *
   * @example
   * // Get all tasks
   * const result = await itemsApi.list({ type: 'task' });
   *
   * // Search for items
   * const result = await itemsApi.list({ q: 'login bug' });
   *
   * // Paginate
   * const page2 = await itemsApi.list({ limit: 20, offset: 20 });
   */
  async list(
    params?: ItemListParams,
    options?: RequestOptions
  ): Promise<ItemListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.set('type', params.type);
    if (params?.state) queryParams.set('state', params.state);
    if (params?.project) queryParams.set('project', params.project);
    if (params?.q) queryParams.set('q', params.q);
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.offset) queryParams.set('offset', String(params.offset));

    const queryString = queryParams.toString();
    const path = `/api/items/${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<ItemListResponse>(path, options);
  },

  /**
   * Get a single item by path.
   *
   * @param itemPath - Item file path (e.g., "tasks/fix-login.md")
   * @param options - Request options
   * @returns ItemDetail with full content
   *
   * @example
   * const item = await itemsApi.get('tasks/fix-login.md');
   * console.log(item.body);
   */
  async get(
    itemPath: string,
    options?: RequestOptions
  ): Promise<ItemDetail> {
    // URL-encode the path to handle slashes
    const encodedPath = encodeURIComponent(itemPath);
    return apiClient.get<ItemDetail>(`/api/items/${encodedPath}`, options);
  },
};
