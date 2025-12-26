/**
 * speakers.ts - Speaker search API client
 *
 * Provides API methods for speaker autocomplete search.
 * Speakers are synced from MDQ transcripts and person entities.
 *
 * Exports:
 *   - speakersApi: Object with search(), sync(), stats() methods
 *
 * Usage:
 *   import { speakersApi } from '$lib/api';
 *
 *   // Search for speakers
 *   const results = await speakersApi.search('joh', 10);
 *   results.results.forEach(s => console.log(s.name));
 *
 *   // Manually trigger sync
 *   await speakersApi.sync();
 *
 *   // Get cache stats
 *   const stats = await speakersApi.stats();
 */

import { apiClient } from './client';
import type {
  SpeakerSearchResponse,
  SpeakerSyncResponse,
  SpeakerCacheStatsResponse,
  RequestOptions,
} from './types';

/**
 * Speaker search API client.
 *
 * @example
 * const results = await speakersApi.search('john');
 * if (results.count > 0) {
 *   console.log('Found:', results.results[0].name);
 * }
 */
export const speakersApi = {
  /**
   * Search for speakers with fuzzy matching.
   *
   * Uses prefix matching and trigram similarity. Results are sorted by:
   * - Match quality (50%)
   * - Recency (30%)
   * - Frequency (20%)
   *
   * @param query - Search query (min 1 character)
   * @param limit - Maximum results to return (1-50, default 10)
   * @param options - Request options (timeout, signal)
   * @returns Search results with speaker metadata
   */
  async search(
    query: string,
    limit: number = 10,
    options?: RequestOptions
  ): Promise<SpeakerSearchResponse> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });
    return apiClient.get<SpeakerSearchResponse>(
      `/api/speakers/search?${params}`,
      options
    );
  },

  /**
   * Manually trigger speaker cache sync from MDQ.
   *
   * Useful after bulk transcript imports or when autocomplete
   * results seem stale.
   *
   * @param options - Request options
   * @returns Number of speakers synced
   */
  async sync(options?: RequestOptions): Promise<SpeakerSyncResponse> {
    return apiClient.post<SpeakerSyncResponse>(
      '/api/speakers/sync',
      {},
      options
    );
  },

  /**
   * Get speaker cache statistics.
   *
   * Useful for debugging and monitoring the speaker cache.
   *
   * @param options - Request options
   * @returns Cache statistics
   */
  async stats(options?: RequestOptions): Promise<SpeakerCacheStatsResponse> {
    return apiClient.get<SpeakerCacheStatsResponse>(
      '/api/speakers/stats',
      options
    );
  },
};
