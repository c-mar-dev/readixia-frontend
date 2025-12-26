/**
 * sessions.ts - Session management API for UNIT-SESSION-MGMT
 *
 * Provides API methods for work session lifecycle management.
 * Sessions track productivity metrics: duration, decisions resolved, velocity.
 *
 * Exports:
 *   - sessionsApi: Object with current(), start(), end() methods
 *
 * Usage:
 *   import { sessionsApi } from '$lib/api';
 *
 *   // Check for active session
 *   const session = await sessionsApi.current();
 *   if (session) {
 *     console.log(`Active session: ${session.decisions_resolved} decisions`);
 *   }
 *
 *   // Start a new session
 *   await sessionsApi.start({ client: 'dashboard' });
 *
 *   // End the session
 *   const summary = await sessionsApi.end();
 *   console.log(`Session ended: ${summary.velocity} decisions/hour`);
 *
 * Error Handling:
 *   - current(): Returns null on 404 (no active session), throws on other errors
 *   - start(): Throws on 409 (session already active)
 *   - end(): Throws on 404 (no session to end)
 */

import { apiClient } from './client';
import type {
  SessionStartRequest,
  SessionStartResponse,
  SessionEndResponse,
  SessionCurrentResponse,
  ApiError,
} from './types';

/**
 * Check if an error is a 404 Not Found.
 */
function isNotFoundError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const apiError = error as ApiError;
    return apiError.code === 'HTTP_404';
  }
  return false;
}

/**
 * Session management API.
 *
 * @example
 * // Check current session
 * const session = await sessionsApi.current();
 *
 * // Start new session
 * await sessionsApi.start({ client: 'dashboard', source: 'auto' });
 *
 * // End session
 * const stats = await sessionsApi.end();
 */
export const sessionsApi = {
  /**
   * Get the current active session.
   *
   * @returns Active session data, or null if no session is active
   * @throws ApiError on network or server errors (except 404)
   */
  async current(): Promise<SessionCurrentResponse | null> {
    try {
      return await apiClient.get<SessionCurrentResponse>('/api/sessions/current');
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Start a new work session.
   *
   * @param metadata - Optional metadata to attach to the session
   * @returns Start response with session ID and start time
   * @throws ApiError with code HTTP_409 if a session is already active
   */
  async start(metadata?: Record<string, unknown>): Promise<SessionStartResponse> {
    const body: SessionStartRequest = metadata ? { metadata } : {};
    return apiClient.post<SessionStartResponse>('/api/sessions/start', body);
  },

  /**
   * End the current active session.
   *
   * @returns End response with final stats (duration, velocity, etc.)
   * @throws ApiError with code HTTP_404 if no session is active
   */
  async end(): Promise<SessionEndResponse> {
    return apiClient.post<SessionEndResponse>('/api/sessions/end', {});
  },
};
