/**
 * ui.test.ts - Unit tests for UI state store
 *
 * Part of: Unit 7 - Error States & Loading UX
 *
 * Tests:
 * - Toast management: showToast, dismissToast, clearToasts
 * - Convenience methods: success, error, info, warning
 * - Loading state: setLoading, isLoading, clearLoading
 * - Offline detection: setOffline, clearWasOffline
 * - Derived stores: toasts, isOffline, isAnyLoading
 * - Auto-dismiss behavior
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  uiStore,
  toasts,
  toastCount,
  isOffline,
  wasOffline,
  isAnyLoading,
} from './ui';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store before each test
    uiStore.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Toast Management Tests
  // ---------------------------------------------------------------------------

  describe('showToast', () => {
    it('should add a toast with unique id', () => {
      const id = uiStore.showToast({ type: 'success', message: 'Test' });

      expect(id).toBeTruthy();
      expect(id).toMatch(/^toast-/);
      expect(get(toasts)).toHaveLength(1);
    });

    it('should add toast with correct properties', () => {
      uiStore.showToast({
        type: 'error',
        message: 'Error message',
        title: 'Error Title',
      });

      const [toast] = get(toasts);
      expect(toast.type).toBe('error');
      expect(toast.message).toBe('Error message');
      expect(toast.title).toBe('Error Title');
      expect(toast.dismissible).toBe(true);
    });

    it('should use default duration for success toasts', () => {
      uiStore.showToast({ type: 'success', message: 'Test' });

      const [toast] = get(toasts);
      expect(toast.duration).toBe(4000);
    });

    it('should use longer duration for error toasts', () => {
      uiStore.showToast({ type: 'error', message: 'Test' });

      const [toast] = get(toasts);
      expect(toast.duration).toBe(6000);
    });

    it('should allow custom duration', () => {
      uiStore.showToast({ type: 'info', message: 'Test', duration: 10000 });

      const [toast] = get(toasts);
      expect(toast.duration).toBe(10000);
    });

    it('should allow sticky toast with duration 0', () => {
      uiStore.showToast({ type: 'warning', message: 'Sticky', duration: 0 });

      const [toast] = get(toasts);
      expect(toast.duration).toBe(0);
    });

    it('should limit to MAX_TOASTS (5)', () => {
      for (let i = 0; i < 10; i++) {
        uiStore.showToast({ type: 'info', message: `Toast ${i}` });
      }

      expect(get(toasts)).toHaveLength(5);
    });

    it('should keep newest toasts when limit exceeded', () => {
      for (let i = 0; i < 7; i++) {
        uiStore.showToast({ type: 'info', message: `Toast ${i}` });
      }

      const messages = get(toasts).map((t) => t.message);
      expect(messages).toContain('Toast 6');
      expect(messages).toContain('Toast 5');
      expect(messages).toContain('Toast 4');
    });

    it('should return unique ids for each toast', () => {
      const id1 = uiStore.showToast({ type: 'success', message: 'One' });
      const id2 = uiStore.showToast({ type: 'success', message: 'Two' });
      const id3 = uiStore.showToast({ type: 'success', message: 'Three' });

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
  });

  describe('dismissToast', () => {
    it('should remove toast by id', () => {
      const id = uiStore.showToast({ type: 'success', message: 'Test' });
      expect(get(toasts)).toHaveLength(1);

      uiStore.dismissToast(id);
      expect(get(toasts)).toHaveLength(0);
    });

    it('should only remove specified toast', () => {
      uiStore.showToast({ type: 'success', message: 'One' });
      const id2 = uiStore.showToast({ type: 'info', message: 'Two' });
      uiStore.showToast({ type: 'warning', message: 'Three' });

      uiStore.dismissToast(id2);

      expect(get(toasts)).toHaveLength(2);
      expect(get(toasts).find((t) => t.message === 'Two')).toBeUndefined();
    });

    it('should handle dismissing non-existent toast', () => {
      uiStore.showToast({ type: 'success', message: 'Test' });

      uiStore.dismissToast('non-existent-id');
      expect(get(toasts)).toHaveLength(1);
    });
  });

  describe('clearToasts', () => {
    it('should remove all toasts', () => {
      uiStore.showToast({ type: 'success', message: 'One' });
      uiStore.showToast({ type: 'error', message: 'Two' });
      uiStore.showToast({ type: 'info', message: 'Three' });

      uiStore.clearToasts();

      expect(get(toasts)).toHaveLength(0);
    });

    it('should be idempotent', () => {
      uiStore.clearToasts();
      uiStore.clearToasts();

      expect(get(toasts)).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Convenience Methods Tests
  // ---------------------------------------------------------------------------

  describe('convenience methods', () => {
    it('success() should create success toast', () => {
      uiStore.success('Success message');

      const [toast] = get(toasts);
      expect(toast.type).toBe('success');
      expect(toast.message).toBe('Success message');
    });

    it('success() should support title', () => {
      uiStore.success('Message', 'Title');

      const [toast] = get(toasts);
      expect(toast.title).toBe('Title');
    });

    it('error() should create error toast', () => {
      uiStore.error('Error message');

      const [toast] = get(toasts);
      expect(toast.type).toBe('error');
      expect(toast.message).toBe('Error message');
    });

    it('info() should create info toast', () => {
      uiStore.info('Info message');

      const [toast] = get(toasts);
      expect(toast.type).toBe('info');
      expect(toast.message).toBe('Info message');
    });

    it('warning() should create warning toast', () => {
      uiStore.warning('Warning message');

      const [toast] = get(toasts);
      expect(toast.type).toBe('warning');
      expect(toast.message).toBe('Warning message');
    });

    it('all convenience methods should return toast id', () => {
      const id1 = uiStore.success('One');
      const id2 = uiStore.error('Two');
      const id3 = uiStore.info('Three');
      const id4 = uiStore.warning('Four');

      expect(id1).toMatch(/^toast-/);
      expect(id2).toMatch(/^toast-/);
      expect(id3).toMatch(/^toast-/);
      expect(id4).toMatch(/^toast-/);
    });
  });

  // ---------------------------------------------------------------------------
  // Loading State Tests
  // ---------------------------------------------------------------------------

  describe('setLoading', () => {
    it('should set loading state for action', () => {
      uiStore.setLoading('resolve:dec-123', true);

      expect(uiStore.isLoading('resolve:dec-123')).toBe(true);
    });

    it('should clear loading state', () => {
      uiStore.setLoading('resolve:dec-123', true);
      uiStore.setLoading('resolve:dec-123', false);

      expect(uiStore.isLoading('resolve:dec-123')).toBe(false);
    });

    it('should track multiple loading states independently', () => {
      uiStore.setLoading('resolve:dec-1', true);
      uiStore.setLoading('defer:dec-2', true);
      uiStore.setLoading('resolve:dec-1', false);

      expect(uiStore.isLoading('resolve:dec-1')).toBe(false);
      expect(uiStore.isLoading('defer:dec-2')).toBe(true);
    });
  });

  describe('isLoading', () => {
    it('should return false for unknown action', () => {
      expect(uiStore.isLoading('unknown:action')).toBe(false);
    });

    it('should return true for loading action', () => {
      uiStore.setLoading('test:action', true);

      expect(uiStore.isLoading('test:action')).toBe(true);
    });
  });

  describe('isAnyLoading', () => {
    it('should return false when no actions loading', () => {
      expect(uiStore.isAnyLoading()).toBe(false);
    });

    it('should return true when at least one action loading', () => {
      uiStore.setLoading('test:action', true);

      expect(uiStore.isAnyLoading()).toBe(true);
    });

    it('should return false when all actions complete', () => {
      uiStore.setLoading('test:action', true);
      uiStore.setLoading('test:action', false);

      expect(uiStore.isAnyLoading()).toBe(false);
    });
  });

  describe('clearLoading', () => {
    it('should clear all loading states', () => {
      uiStore.setLoading('action1', true);
      uiStore.setLoading('action2', true);
      uiStore.setLoading('action3', true);

      uiStore.clearLoading();

      expect(uiStore.isAnyLoading()).toBe(false);
      expect(uiStore.isLoading('action1')).toBe(false);
      expect(uiStore.isLoading('action2')).toBe(false);
      expect(uiStore.isLoading('action3')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Offline Detection Tests
  // ---------------------------------------------------------------------------

  describe('setOffline', () => {
    it('should set offline state', () => {
      uiStore.setOffline(true);

      expect(get(isOffline)).toBe(true);
    });

    it('should set wasOffline when going offline', () => {
      uiStore.setOffline(true);

      expect(get(wasOffline)).toBe(true);
    });

    it('should preserve wasOffline when going back online', () => {
      uiStore.setOffline(true);
      uiStore.setOffline(false);

      expect(get(isOffline)).toBe(false);
      expect(get(wasOffline)).toBe(true);
    });
  });

  describe('clearWasOffline', () => {
    it('should clear wasOffline flag', () => {
      uiStore.setOffline(true);
      uiStore.setOffline(false);
      uiStore.clearWasOffline();

      expect(get(wasOffline)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Derived Stores Tests
  // ---------------------------------------------------------------------------

  describe('toasts derived store', () => {
    it('should reflect current toasts', () => {
      expect(get(toasts)).toHaveLength(0);

      uiStore.showToast({ type: 'success', message: 'Test' });
      expect(get(toasts)).toHaveLength(1);

      uiStore.clearToasts();
      expect(get(toasts)).toHaveLength(0);
    });
  });

  describe('toastCount derived store', () => {
    it('should reflect toast count', () => {
      expect(get(toastCount)).toBe(0);

      uiStore.showToast({ type: 'success', message: 'One' });
      expect(get(toastCount)).toBe(1);

      uiStore.showToast({ type: 'success', message: 'Two' });
      expect(get(toastCount)).toBe(2);
    });
  });

  describe('isAnyLoading derived store', () => {
    it('should update reactively', () => {
      expect(get(isAnyLoading)).toBe(false);

      uiStore.setLoading('test', true);
      expect(get(isAnyLoading)).toBe(true);

      uiStore.setLoading('test', false);
      expect(get(isAnyLoading)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Reset Tests
  // ---------------------------------------------------------------------------

  describe('reset', () => {
    it('should reset all state', () => {
      uiStore.showToast({ type: 'success', message: 'Test' });
      uiStore.setLoading('action', true);
      uiStore.setOffline(true);

      uiStore.reset();

      expect(get(toasts)).toHaveLength(0);
      expect(uiStore.isAnyLoading()).toBe(false);
      expect(get(isOffline)).toBe(false);
      expect(get(wasOffline)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Auto-dismiss Tests
  // ---------------------------------------------------------------------------

  describe('auto-dismiss', () => {
    it('should auto-dismiss toast after duration', () => {
      uiStore.showToast({ type: 'success', message: 'Test', duration: 1000 });

      expect(get(toasts)).toHaveLength(1);

      // Advance time past the duration
      vi.advanceTimersByTime(1100);

      expect(get(toasts)).toHaveLength(0);
    });

    it('should not auto-dismiss sticky toasts', () => {
      uiStore.showToast({ type: 'warning', message: 'Sticky', duration: 0 });

      vi.advanceTimersByTime(10000);

      expect(get(toasts)).toHaveLength(1);
    });

    it('should auto-dismiss only expired toasts', () => {
      uiStore.showToast({ type: 'success', message: 'Short', duration: 1000 });
      uiStore.showToast({ type: 'error', message: 'Long', duration: 5000 });

      vi.advanceTimersByTime(2000);

      expect(get(toasts)).toHaveLength(1);
      expect(get(toasts)[0].message).toBe('Long');
    });
  });

  // ---------------------------------------------------------------------------
  // Integration Tests
  // ---------------------------------------------------------------------------

  describe('integration scenarios', () => {
    it('should handle typical user workflow', () => {
      // Initial state
      expect(get(toasts)).toHaveLength(0);
      expect(get(isOffline)).toBe(false);

      // User performs action
      uiStore.setLoading('resolve:dec-1', true);
      expect(uiStore.isLoading('resolve:dec-1')).toBe(true);

      // Action succeeds
      uiStore.setLoading('resolve:dec-1', false);
      uiStore.success('Decision resolved');
      expect(get(toasts)).toHaveLength(1);

      // Toast auto-dismisses
      vi.advanceTimersByTime(5000);
      expect(get(toasts)).toHaveLength(0);
    });

    it('should handle error scenario', () => {
      uiStore.setLoading('resolve:dec-1', true);

      // Action fails
      uiStore.setLoading('resolve:dec-1', false);
      uiStore.error('Failed to resolve', 'Error');

      const [toast] = get(toasts);
      expect(toast.type).toBe('error');
      expect(toast.title).toBe('Error');
      expect(toast.duration).toBe(6000);
    });

    it('should handle offline/online transitions', () => {
      // Go offline
      uiStore.setOffline(true);
      expect(get(isOffline)).toBe(true);
      expect(get(wasOffline)).toBe(true);

      // Come back online
      uiStore.setOffline(false);
      expect(get(isOffline)).toBe(false);
      expect(get(wasOffline)).toBe(true); // Still true until cleared

      // Clear flag after showing "back online" toast
      uiStore.clearWasOffline();
      expect(get(wasOffline)).toBe(false);
    });
  });
});
