/**
 * config.ts - API configuration for UNIT-API-CLIENT
 *
 * Provides configuration for the API client.
 * Used by downstream units: client.ts, connection.ts
 *
 * Exports:
 *   - DEFAULT_CONFIG: Base URL, timeout, retry settings
 *   - RETRYABLE_STATUS_CODES: HTTP codes that trigger retry
 *   - isDev(): Check if running in development mode
 *   - isRetryableStatus(): Check if status code should retry
 *
 * Environment Variables:
 *   - PUBLIC_API_URL: Decision Engine base URL (default: http://localhost:8000)
 *
 * Usage:
 *   import { DEFAULT_CONFIG, isDev } from '$lib/api/config';
 *
 *   console.log(DEFAULT_CONFIG.baseUrl); // 'http://localhost:8000'
 *   if (isDev()) console.log('Development mode');
 */

import { PUBLIC_API_URL } from '$env/static/public';
import type { ApiConfig } from './types';

/** Default API client configuration */
export const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30000,       // 30 seconds default
  retryAttempts: 3,
  retryDelay: 1000,     // 1 second base delay (multiplied by attempt number)
};

/** HTTP status codes that should trigger a retry */
export const RETRYABLE_STATUS_CODES = [502, 503, 504] as const;

/** Error codes/names that indicate network issues and should trigger retry */
export const RETRYABLE_ERROR_NAMES = ['TypeError', 'NetworkError'] as const;

/**
 * Check if running in development mode
 * Used for conditional logging
 */
export function isDev(): boolean {
  return import.meta.env.DEV;
}

/**
 * Check if a status code should trigger a retry
 */
export function isRetryableStatus(status: number): boolean {
  return (RETRYABLE_STATUS_CODES as readonly number[]).includes(status);
}
