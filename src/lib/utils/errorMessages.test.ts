/**
 * errorMessages.test.ts - Unit tests for error message utilities
 *
 * Part of: Unit 7 - Error States & Loading UX
 *
 * Tests:
 * - getErrorMessage: Error code to user-friendly message mapping
 * - getErrorToastType: Determining appropriate toast type for errors
 * - isRetryableError: Checking if an error should have retry option
 * - getErrorAction: Getting suggested action for errors
 */

import { describe, it, expect } from 'vitest';
import {
  getErrorMessage,
  getErrorToastType,
  isRetryableError,
  getErrorAction,
  ERROR_MESSAGES,
} from './errorMessages';

describe('errorMessages', () => {
  // ---------------------------------------------------------------------------
  // getErrorMessage Tests
  // ---------------------------------------------------------------------------

  describe('getErrorMessage', () => {
    it('should return "not found" message for DE-DEC-001', () => {
      const message = getErrorMessage({ code: 'DE-DEC-001', message: '' });
      expect(message).toBe('This decision no longer exists');
    });

    it('should return "already completed" message for DE-DEC-002', () => {
      const message = getErrorMessage({ code: 'DE-DEC-002', message: '' });
      expect(message).toBe('This decision was already completed');
    });

    it('should use error.message directly for DE-DEC-003', () => {
      const message = getErrorMessage({
        code: 'DE-DEC-003',
        message: 'Invalid defer date provided',
      });
      expect(message).toBe('Invalid defer date provided');
    });

    it('should return deferral limit message for DE-DEC-004', () => {
      const message = getErrorMessage({ code: 'DE-DEC-004', message: '' });
      expect(message).toBe('Maximum deferrals reached. Please make a decision.');
    });

    it('should return undo expired message for DE-DEC-005', () => {
      const message = getErrorMessage({ code: 'DE-DEC-005', message: '' });
      expect(message).toBe('Undo window has expired');
    });

    it('should return network error message for NETWORK_ERROR', () => {
      const message = getErrorMessage({ code: 'NETWORK_ERROR', message: '' });
      expect(message).toBe('Unable to connect. Check your connection.');
    });

    it('should return timeout message for TIMEOUT', () => {
      const message = getErrorMessage({ code: 'TIMEOUT', message: '' });
      expect(message).toBe('Request timed out. Try again?');
    });

    it('should handle HTTP 5xx codes', () => {
      expect(getErrorMessage({ code: 'HTTP_500', message: '' })).toBe(
        'Server error. Please try again.'
      );
      expect(getErrorMessage({ code: 'HTTP_502', message: '' })).toBe(
        'Server temporarily unavailable. Please try again.'
      );
      expect(getErrorMessage({ code: 'HTTP_503', message: '' })).toBe(
        'Service unavailable. Please try again.'
      );
    });

    it('should use generic message for unknown HTTP 5xx codes', () => {
      const message = getErrorMessage({ code: 'HTTP_599', message: '' });
      expect(message).toBe('Server error. Please try again.');
    });

    it('should fallback to error.message for unknown codes', () => {
      const message = getErrorMessage({
        code: 'UNKNOWN_CODE',
        message: 'Custom error message',
      });
      expect(message).toBe('Custom error message');
    });

    it('should return generic message for null error', () => {
      const message = getErrorMessage(null);
      expect(message).toBe(ERROR_MESSAGES['UNKNOWN']);
    });

    it('should return generic message for undefined error', () => {
      const message = getErrorMessage(undefined);
      expect(message).toBe(ERROR_MESSAGES['UNKNOWN']);
    });

    it('should return generic message for error without code or message', () => {
      const message = getErrorMessage({ code: '', message: '' });
      expect(message).toBe(ERROR_MESSAGES['UNKNOWN']);
    });
  });

  // ---------------------------------------------------------------------------
  // getErrorToastType Tests
  // ---------------------------------------------------------------------------

  describe('getErrorToastType', () => {
    it('should return info for DE-DEC-002 (already resolved)', () => {
      const type = getErrorToastType({ code: 'DE-DEC-002', message: '' });
      expect(type).toBe('info');
    });

    it('should return warning for DE-DEC-004 (deferral limit)', () => {
      const type = getErrorToastType({ code: 'DE-DEC-004', message: '' });
      expect(type).toBe('warning');
    });

    it('should return warning for DE-DEC-005 (undo expired)', () => {
      const type = getErrorToastType({ code: 'DE-DEC-005', message: '' });
      expect(type).toBe('warning');
    });

    it('should return error for DE-DEC-001 (not found)', () => {
      const type = getErrorToastType({ code: 'DE-DEC-001', message: '' });
      expect(type).toBe('error');
    });

    it('should return error for network errors', () => {
      const type = getErrorToastType({ code: 'NETWORK_ERROR', message: '' });
      expect(type).toBe('error');
    });

    it('should return error for HTTP 5xx', () => {
      const type = getErrorToastType({ code: 'HTTP_500', message: '' });
      expect(type).toBe('error');
    });

    it('should return error for null/undefined', () => {
      expect(getErrorToastType(null)).toBe('error');
      expect(getErrorToastType(undefined)).toBe('error');
    });
  });

  // ---------------------------------------------------------------------------
  // isRetryableError Tests
  // ---------------------------------------------------------------------------

  describe('isRetryableError', () => {
    it('should return true for NETWORK_ERROR', () => {
      expect(isRetryableError({ code: 'NETWORK_ERROR', message: '' })).toBe(true);
    });

    it('should return true for TIMEOUT', () => {
      expect(isRetryableError({ code: 'TIMEOUT', message: '' })).toBe(true);
    });

    it('should return true for HTTP 5xx errors', () => {
      expect(isRetryableError({ code: 'HTTP_500', message: '' })).toBe(true);
      expect(isRetryableError({ code: 'HTTP_502', message: '' })).toBe(true);
      expect(isRetryableError({ code: 'HTTP_503', message: '' })).toBe(true);
      expect(isRetryableError({ code: 'HTTP_504', message: '' })).toBe(true);
    });

    it('should return true for LOAD_FAILED', () => {
      expect(isRetryableError({ code: 'LOAD_FAILED', message: '' })).toBe(true);
    });

    it('should return false for DE-DEC-001 (not found)', () => {
      expect(isRetryableError({ code: 'DE-DEC-001', message: '' })).toBe(false);
    });

    it('should return false for DE-DEC-002 (already resolved)', () => {
      expect(isRetryableError({ code: 'DE-DEC-002', message: '' })).toBe(false);
    });

    it('should return false for DE-DEC-003 (validation error)', () => {
      expect(isRetryableError({ code: 'DE-DEC-003', message: '' })).toBe(false);
    });

    it('should return false for DE-DEC-004 (deferral limit)', () => {
      expect(isRetryableError({ code: 'DE-DEC-004', message: '' })).toBe(false);
    });

    it('should return false for DE-DEC-005 (undo expired)', () => {
      expect(isRetryableError({ code: 'DE-DEC-005', message: '' })).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError(undefined)).toBe(false);
    });

    it('should return false for unknown codes', () => {
      expect(isRetryableError({ code: 'UNKNOWN', message: '' })).toBe(false);
    });

    it('should return true for unknown HTTP 5xx codes', () => {
      expect(isRetryableError({ code: 'HTTP_599', message: '' })).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getErrorAction Tests
  // ---------------------------------------------------------------------------

  describe('getErrorAction', () => {
    it('should return "Try again" for retryable errors', () => {
      expect(getErrorAction({ code: 'NETWORK_ERROR', message: '' })).toBe('Try again');
      expect(getErrorAction({ code: 'TIMEOUT', message: '' })).toBe('Try again');
      expect(getErrorAction({ code: 'HTTP_503', message: '' })).toBe('Try again');
    });

    it('should return "Refresh list" for DE-DEC-001', () => {
      expect(getErrorAction({ code: 'DE-DEC-001', message: '' })).toBe('Refresh list');
    });

    it('should return null for DE-DEC-002 (no action needed)', () => {
      expect(getErrorAction({ code: 'DE-DEC-002', message: '' })).toBeNull();
    });

    it('should return "Make a decision" for DE-DEC-004', () => {
      expect(getErrorAction({ code: 'DE-DEC-004', message: '' })).toBe('Make a decision');
    });

    it('should return null for DE-DEC-005 (window expired)', () => {
      expect(getErrorAction({ code: 'DE-DEC-005', message: '' })).toBeNull();
    });

    it('should return null for null/undefined', () => {
      expect(getErrorAction(null)).toBeNull();
      expect(getErrorAction(undefined)).toBeNull();
    });

    it('should return null for unknown non-retryable codes', () => {
      expect(getErrorAction({ code: 'UNKNOWN', message: '' })).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // ERROR_MESSAGES constant Tests
  // ---------------------------------------------------------------------------

  describe('ERROR_MESSAGES', () => {
    it('should have all DE-DEC error codes', () => {
      expect(ERROR_MESSAGES['DE-DEC-001']).toBeDefined();
      expect(ERROR_MESSAGES['DE-DEC-002']).toBeDefined();
      expect(ERROR_MESSAGES['DE-DEC-003']).toBeDefined();
      expect(ERROR_MESSAGES['DE-DEC-004']).toBeDefined();
      expect(ERROR_MESSAGES['DE-DEC-005']).toBeDefined();
    });

    it('should have network error codes', () => {
      expect(ERROR_MESSAGES['NETWORK_ERROR']).toBeDefined();
      expect(ERROR_MESSAGES['TIMEOUT']).toBeDefined();
    });

    it('should have HTTP error codes', () => {
      expect(ERROR_MESSAGES['HTTP_500']).toBeDefined();
      expect(ERROR_MESSAGES['HTTP_502']).toBeDefined();
      expect(ERROR_MESSAGES['HTTP_503']).toBeDefined();
      expect(ERROR_MESSAGES['HTTP_504']).toBeDefined();
    });

    it('should have generic fallback codes', () => {
      expect(ERROR_MESSAGES['UNKNOWN']).toBeDefined();
      expect(ERROR_MESSAGES['RUNTIME_ERROR']).toBeDefined();
    });
  });
});
