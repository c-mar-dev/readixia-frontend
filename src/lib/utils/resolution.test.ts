/**
 * resolution.test.ts - Unit tests for resolution payload builders
 *
 * Part of: Unit 12 - Frontend New Decision Card Designs (Gap 3)
 *
 * Tests:
 * - buildResolutionPayload: Main entry point for payload construction
 * - Type-specific payload builders (triage, review, conflict, etc.)
 * - validateResolution: Validation helper for required fields
 */

import { describe, it, expect } from 'vitest';
import { buildResolutionPayload, validateResolution } from './resolution';
import type { UiDecision } from '$lib/api/types';

// Mock decision factory
function createMockDecision(overrides: Partial<UiDecision> = {}): UiDecision {
  return {
    id: 'd_test_1',
    decisionType: 'triage',
    title: 'Test Decision',
    description: 'Test description',
    status: 'pending',
    priority: 'normal',
    createdAt: new Date().toISOString(),
    subject: {
      id: 'item_1',
      type: 'task',
      title: 'Test Task',
    },
    data: {},
    actions: [],
    ...overrides,
  } as UiDecision;
}

describe('resolution', () => {
  // ---------------------------------------------------------------------------
  // buildResolutionPayload - Main Entry Point
  // ---------------------------------------------------------------------------

  describe('buildResolutionPayload', () => {
    it('should handle "Route to X" prefix actions', () => {
      const decision = createMockDecision({ decisionType: 'triage' });
      const result = buildResolutionPayload(decision, 'Route to Inbox', {});

      expect(result.resolution.action).toBe('route');
      expect(result.resolution.destination).toBe('Inbox');
    });

    it('should return fallback for unknown action', () => {
      const decision = createMockDecision();
      const result = buildResolutionPayload(decision, 'Unknown Action', {
        someField: 'value',
      });

      expect(result.resolution.action).toBe('Unknown Action');
      expect(result.resolution.someField).toBe('value');
    });
  });

  // ---------------------------------------------------------------------------
  // Triage Payload Builder
  // ---------------------------------------------------------------------------

  describe('Triage payloads', () => {
    it('should build archive payload for "Archive" action', () => {
      const decision = createMockDecision({ decisionType: 'triage' });
      const result = buildResolutionPayload(decision, 'Archive', {});

      expect(result.resolution.action).toBe('archive');
      expect(result.resolution.destination).toBe('archive');
    });

    it('should build route payload for "Proceed" action', () => {
      const decision = createMockDecision({ decisionType: 'triage' });
      const result = buildResolutionPayload(decision, 'Proceed', {
        destination: 'specifying',
        project: 'Project A',
        priority: 'high',
      });

      expect(result.resolution.action).toBe('route');
      expect(result.resolution.destination).toBe('specifying');
      expect(result.resolution.project).toBe('Project A');
      expect(result.resolution.priority).toBe('high');
    });

    it('should use defaults when form data is missing', () => {
      const decision = createMockDecision({ decisionType: 'triage' });
      const result = buildResolutionPayload(decision, 'Proceed', {});

      expect(result.resolution.action).toBe('route');
      expect(result.resolution.destination).toBe('inbox');
      expect(result.resolution.project).toBeNull();
      expect(result.resolution.priority).toBe('normal');
    });
  });

  // ---------------------------------------------------------------------------
  // Specify Payload Builder
  // ---------------------------------------------------------------------------

  describe('Specify payloads', () => {
    it('should build payload with aiSpec and successCriteria', () => {
      const decision = createMockDecision({ decisionType: 'specify' });
      const formData = {
        aiSpec: { objective: 'Test objective', constraints: 'None' },
        successCriteria: [
          { id: 'c1', text: 'Criterion 1', checked: true },
          { id: 'c2', text: 'Criterion 2', checked: false },
        ],
      };

      const result = buildResolutionPayload(decision, 'Save & Continue', formData);

      expect(result.resolution.aiSpec).toEqual(formData.aiSpec);
      expect(result.resolution.successCriteria).toEqual(formData.successCriteria);
    });

    it('should fallback to decision data when form data is missing', () => {
      const decision = createMockDecision({
        decisionType: 'specify',
        data: {
          aiSpec: { objective: 'From decision' },
          successCriteria: [{ id: 'c1', text: 'Criterion', checked: false }],
        },
      });

      const result = buildResolutionPayload(decision, 'Save Draft', {});

      expect(result.resolution.aiSpec).toEqual({ objective: 'From decision' });
    });
  });

  // ---------------------------------------------------------------------------
  // Review Payload Builder
  // ---------------------------------------------------------------------------

  describe('Review payloads', () => {
    it('should set approved=true for "Approve" action', () => {
      const decision = createMockDecision({ decisionType: 'review' });
      const result = buildResolutionPayload(decision, 'Approve', {
        feedback: 'Looks good!',
      });

      expect(result.resolution.approved).toBe(true);
      expect(result.resolution.feedback).toBe('Looks good!');
    });

    it('should set approved=false for "Request Changes" action', () => {
      const decision = createMockDecision({ decisionType: 'review' });
      const result = buildResolutionPayload(decision, 'Request Changes', {
        feedback: 'Please fix X',
      });

      expect(result.resolution.approved).toBe(false);
      expect(result.resolution.feedback).toBe('Please fix X');
    });

    it('should handle missing feedback', () => {
      const decision = createMockDecision({ decisionType: 'review' });
      const result = buildResolutionPayload(decision, 'Approve', {});

      expect(result.resolution.approved).toBe(true);
      expect(result.resolution.feedback).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Conflict Payload Builder
  // ---------------------------------------------------------------------------

  describe('Conflict payloads', () => {
    it('should set choice to keep_mine for "Keep Mine" action', () => {
      const decision = createMockDecision({ decisionType: 'conflict' });
      const result = buildResolutionPayload(decision, 'Keep Mine', {});

      expect(result.resolution.choice).toBe('keep_mine');
      expect(result.resolution.mergeContent).toBeUndefined();
    });

    it('should set choice to take_theirs for "Take Theirs" action', () => {
      const decision = createMockDecision({ decisionType: 'conflict' });
      const result = buildResolutionPayload(decision, 'Take Theirs', {});

      expect(result.resolution.choice).toBe('take_theirs');
    });

    it('should include mergeContent for "Merge" action', () => {
      const decision = createMockDecision({ decisionType: 'conflict' });
      const result = buildResolutionPayload(decision, 'Merge', {
        mergeContent: 'Combined content here',
      });

      expect(result.resolution.choice).toBe('merge');
      expect(result.resolution.mergeContent).toBe('Combined content here');
    });

    it('should not include mergeContent if not provided for merge', () => {
      const decision = createMockDecision({ decisionType: 'conflict' });
      const result = buildResolutionPayload(decision, 'Merge', {});

      expect(result.resolution.choice).toBe('merge');
      expect(result.resolution.mergeContent).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Checkpoint / Clarifying Payload Builder
  // ---------------------------------------------------------------------------

  describe('Checkpoint payloads', () => {
    it('should build answers object from form data', () => {
      const decision = createMockDecision({
        decisionType: 'checkpoint',
        clarificationQuestions: [
          { id: 'q1', text: 'Question 1', type: 'text' },
          { id: 'q2', text: 'Question 2', type: 'choice', options: ['A', 'B'] },
        ],
      });

      const result = buildResolutionPayload(decision, 'Submit Checkpoint', {
        answers: { q1: 'Answer 1', q2: 'A' },
      });

      expect(result.resolution.answers).toEqual({ q1: 'Answer 1', q2: 'A' });
    });

    it('should handle empty answers', () => {
      const decision = createMockDecision({ decisionType: 'checkpoint' });
      const result = buildResolutionPayload(decision, 'Continue', {});

      expect(result.resolution.answers).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // Approval Payload Builder
  // ---------------------------------------------------------------------------

  describe('Approval payloads', () => {
    it('should set approved=true for "Approve Request" action', () => {
      const decision = createMockDecision({ decisionType: 'approval' });
      const result = buildResolutionPayload(decision, 'Approve Request', {
        approvalFeedback: 'Approved for production',
      });

      expect(result.resolution.approved).toBe(true);
      expect(result.resolution.feedback).toBe('Approved for production');
    });

    it('should set approved=false for "Reject Request" action', () => {
      const decision = createMockDecision({ decisionType: 'approval' });
      const result = buildResolutionPayload(decision, 'Reject Request', {
        approvalFeedback: 'Not ready yet',
      });

      expect(result.resolution.approved).toBe(false);
      expect(result.resolution.feedback).toBe('Not ready yet');
    });
  });

  // ---------------------------------------------------------------------------
  // Categorize Payload Builder
  // ---------------------------------------------------------------------------

  describe('Categorize payloads', () => {
    it('should build payload with category, project, and fieldUpdates', () => {
      const decision = createMockDecision({ decisionType: 'categorize' });
      const result = buildResolutionPayload(decision, 'Save Category', {
        category: 'Work',
        project: 'Project Alpha',
        fieldUpdates: { priority: 'high', status: 'active' },
      });

      expect(result.resolution.category).toBe('Work');
      expect(result.resolution.project).toBe('Project Alpha');
      expect(result.resolution.fieldUpdates).toEqual({
        priority: 'high',
        status: 'active',
      });
    });

    it('should handle missing optional fields', () => {
      const decision = createMockDecision({ decisionType: 'categorize' });
      const result = buildResolutionPayload(decision, 'Save Category', {
        category: 'Personal',
      });

      expect(result.resolution.category).toBe('Personal');
      expect(result.resolution.project).toBeNull();
      expect(result.resolution.fieldUpdates).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Verifying Payload Builder
  // ---------------------------------------------------------------------------

  describe('Verifying payloads', () => {
    it('should set action to retry for "Auto-Retry"', () => {
      const decision = createMockDecision({ decisionType: 'verifying' });
      const result = buildResolutionPayload(decision, 'Auto-Retry', {});

      expect(result.resolution.action).toBe('retry');
    });

    it('should set action to override for "Override"', () => {
      const decision = createMockDecision({ decisionType: 'verifying' });
      const result = buildResolutionPayload(decision, 'Override', {});

      expect(result.resolution.action).toBe('override');
    });

    it('should set action to escalate for "Escalate"', () => {
      const decision = createMockDecision({ decisionType: 'verifying' });
      const result = buildResolutionPayload(decision, 'Escalate', {});

      expect(result.resolution.action).toBe('escalate');
    });
  });

  // ---------------------------------------------------------------------------
  // Escalate Payload Builder
  // ---------------------------------------------------------------------------

  describe('Escalate payloads', () => {
    it('should set action to retry for "Retry New Instructions"', () => {
      const decision = createMockDecision({ decisionType: 'escalate' });
      const result = buildResolutionPayload(decision, 'Retry New Instructions', {
        instructions: 'Try with different approach',
      });

      expect(result.resolution.action).toBe('retry');
      expect(result.resolution.instructions).toBe('Try with different approach');
    });

    it('should set action to edit for "Edit Myself"', () => {
      const decision = createMockDecision({ decisionType: 'escalate' });
      const result = buildResolutionPayload(decision, 'Edit Myself', {});

      expect(result.resolution.action).toBe('edit');
    });

    it('should set action to abandon for "Abandon"', () => {
      const decision = createMockDecision({ decisionType: 'escalate' });
      const result = buildResolutionPayload(decision, 'Abandon', {});

      expect(result.resolution.action).toBe('abandon');
    });
  });

  // ---------------------------------------------------------------------------
  // Enrich Payload Builder
  // ---------------------------------------------------------------------------

  describe('Enrich payloads', () => {
    it('should build payload with project, date, and speakers', () => {
      const decision = createMockDecision({ decisionType: 'enrich' });
      const result = buildResolutionPayload(decision, 'Save & Extract', {
        project: 'Meeting Notes',
        date: '2024-01-15',
        speakers: [
          { name: 'Alice', selected: true },
          { name: 'Bob', selected: false },
        ],
      });

      expect(result.resolution.project).toBe('Meeting Notes');
      expect(result.resolution.date).toBe('2024-01-15');
      expect(result.resolution.speakers).toHaveLength(2);
    });

    it('should handle missing fields', () => {
      const decision = createMockDecision({ decisionType: 'enrich' });
      const result = buildResolutionPayload(decision, 'Save & Extract', {});

      expect(result.resolution.project).toBeNull();
      expect(result.resolution.date).toBeNull();
      expect(result.resolution.speakers).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Meeting Triage Payload Builder
  // ---------------------------------------------------------------------------

  describe('Meeting Triage payloads', () => {
    it('should build payload with selectedTasks', () => {
      const decision = createMockDecision({ decisionType: 'meeting_triage' });
      const result = buildResolutionPayload(decision, 'Confirm Meeting Tasks', {
        selectedTasks: ['task_1', 'task_2', 'task_3'],
      });

      expect(result.resolution.selectedTasks).toEqual(['task_1', 'task_2', 'task_3']);
    });

    it('should handle empty selectedTasks', () => {
      const decision = createMockDecision({ decisionType: 'meeting_triage' });
      const result = buildResolutionPayload(decision, 'Confirm Meeting Tasks', {});

      expect(result.resolution.selectedTasks).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // validateResolution Tests
  // ---------------------------------------------------------------------------

  describe('validateResolution', () => {
    it('should return empty array for valid triage resolution', () => {
      const missing = validateResolution('triage', { destination: 'inbox' });
      expect(missing).toEqual([]);
    });

    it('should return missing fields for invalid triage resolution', () => {
      const missing = validateResolution('triage', {});
      expect(missing).toContain('destination');
    });

    it('should validate specify requires aiSpec', () => {
      const missing = validateResolution('specify', {});
      expect(missing).toContain('aiSpec');
    });

    it('should validate review requires approved', () => {
      const missing = validateResolution('review', { feedback: 'test' });
      expect(missing).toContain('approved');
    });

    it('should pass when approved is explicitly false', () => {
      const missing = validateResolution('review', { approved: false });
      expect(missing).toEqual([]);
    });

    it('should validate approval requires approved', () => {
      const missing = validateResolution('approval', {});
      expect(missing).toContain('approved');
    });

    it('should validate checkpoint requires answers', () => {
      const missing = validateResolution('checkpoint', {});
      expect(missing).toContain('answers');
    });

    it('should validate clarifying requires answers', () => {
      const missing = validateResolution('clarifying', {});
      expect(missing).toContain('answers');
    });

    it('should validate conflict requires choice', () => {
      const missing = validateResolution('conflict', {});
      expect(missing).toContain('choice');
    });

    it('should validate categorize requires category', () => {
      const missing = validateResolution('categorize', {});
      expect(missing).toContain('category');
    });

    it('should return empty array for unknown decision types', () => {
      const missing = validateResolution('unknown_type', {});
      expect(missing).toEqual([]);
    });
  });
});
