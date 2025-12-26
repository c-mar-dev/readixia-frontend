/**
 * errorMessages.ts - Error code to user-friendly message mapping
 *
 * Maps Engine error codes (DE-DEC-XXX) and client errors (NETWORK_ERROR, etc.)
 * to user-friendly messages for display in toasts and error states.
 *
 * Part of: Unit 7 - Error States & Loading UX
 *
 * Usage:
 *   import { getErrorMessage, isRetryableError } from '$lib/utils/errorMessages';
 *
 *   const message = getErrorMessage(error);
 *   if (isRetryableError(error)) {
 *     // Show retry button
 *   }
 */

import type { ApiError } from '$lib/api/types';

/**
 * Error code to user-friendly message mapping.
 *
 * Engine error codes follow DE-DEC-XXX pattern.
 * Client errors use NETWORK_ERROR, TIMEOUT, HTTP_XXX.
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // Engine Decision Errors (from engine/src/api/routes/decisions.py)
  'DE-DEC-001': 'This decision no longer exists',
  'DE-DEC-002': 'This decision was already completed',
  'DE-DEC-003': 'Invalid request format', // Will use error.message directly
  'DE-DEC-004': 'Maximum deferrals reached. Please make a decision.',
  'DE-DEC-005': 'Undo window has expired',

  // Network/Client Errors
  'NETWORK_ERROR': 'Unable to connect. Check your connection.',
  'TIMEOUT': 'Request timed out. Try again?',
  'HTTP_500': 'Server error. Please try again.',
  'HTTP_502': 'Server temporarily unavailable. Please try again.',
  'HTTP_503': 'Service unavailable. Please try again.',
  'HTTP_504': 'Gateway timeout. Please try again.',

  // Generic fallbacks
  'UNKNOWN': 'An unexpected error occurred',
  'RUNTIME_ERROR': 'Something went wrong. Please refresh the page.',
  'LOAD_FAILED': 'Failed to load data. Check your connection.',
  'RESOLVE_FAILED': 'Failed to complete action. Please try again.',
  'DEFER_FAILED': 'Failed to defer decision. Please try again.',
  'UNDO_FAILED': 'Failed to undo action. Please try again.',
};

/**
 * Get user-friendly message for an error.
 *
 * Priority:
 * 1. Exact code match in ERROR_MESSAGES
 * 2. HTTP_5xx pattern match
 * 3. error.message (for DE-DEC-003 and unknown codes)
 * 4. Generic fallback
 *
 * @param error - The API error object
 * @returns User-friendly error message
 */
export function getErrorMessage(error: ApiError | null | undefined): string {
  if (!error) return ERROR_MESSAGES['UNKNOWN'];

  // Exact match
  if (ERROR_MESSAGES[error.code]) {
    // DE-DEC-003 should use error.message directly for validation specifics
    if (error.code === 'DE-DEC-003' && error.message) {
      return error.message;
    }
    return ERROR_MESSAGES[error.code];
  }

  // HTTP 5xx pattern match
  if (error.code?.startsWith('HTTP_5')) {
    return ERROR_MESSAGES['HTTP_500'];
  }

  // Fallback to error message
  return error.message || ERROR_MESSAGES['UNKNOWN'];
}

/**
 * Toast type for UI display.
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Determine toast type based on error code.
 *
 * - info: Conflicts and already-resolved (not really errors)
 * - warning: Deferral limits and undo expiry (user action needed)
 * - error: Everything else
 *
 * @param error - The API error object
 * @returns Appropriate toast type
 */
export function getErrorToastType(error: ApiError | null | undefined): ToastType {
  if (!error) return 'error';

  // Conflicts and already-resolved are informational
  if (error.code === 'DE-DEC-002') return 'info';

  // Deferral limits and undo expiry are warnings
  if (error.code === 'DE-DEC-004' || error.code === 'DE-DEC-005') return 'warning';

  // Everything else is an error
  return 'error';
}

/**
 * Error codes that can be retried.
 * These are transient failures where retrying may succeed.
 */
const RETRYABLE_CODES = new Set([
  'NETWORK_ERROR',
  'TIMEOUT',
  'HTTP_500',
  'HTTP_502',
  'HTTP_503',
  'HTTP_504',
  'LOAD_FAILED',
]);

/**
 * Determine if error should show a retry option.
 *
 * Retryable errors are transient (network, server issues).
 * Non-retryable are permanent (not found, already resolved, validation).
 *
 * @param error - The API error object
 * @returns True if retry makes sense
 */
export function isRetryableError(error: ApiError | null | undefined): boolean {
  if (!error) return false;

  // Check explicit retryable codes
  if (RETRYABLE_CODES.has(error.code)) return true;

  // Any HTTP 5xx is retryable
  if (error.code?.startsWith('HTTP_5')) return true;

  return false;
}

/**
 * Get suggested action based on error type.
 *
 * @param error - The API error object
 * @returns Action text or null if no action applicable
 */
export function getErrorAction(error: ApiError | null | undefined): string | null {
  if (!error) return null;

  if (isRetryableError(error)) {
    return 'Try again';
  }

  // Specific actions for certain errors
  switch (error.code) {
    case 'DE-DEC-001':
      return 'Refresh list';
    case 'DE-DEC-002':
      return null; // No action needed, decision is done
    case 'DE-DEC-004':
      return 'Make a decision';
    case 'DE-DEC-005':
      return null; // Window expired, nothing to do
    default:
      return null;
  }
}
