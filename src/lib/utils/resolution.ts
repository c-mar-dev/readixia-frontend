/**
 * resolution.ts - Resolution payload builder for UNIT-4-DECISION-ACTIONS
 *
 * Builds type-specific resolution payloads from decision data and form values.
 * Each decision type has a different required payload structure per Engine spec.
 *
 * Used by downstream units: UNIT-5 (Test Infrastructure)
 *
 * Supported decision types:
 *   - triage: { action, destination, project, priority }
 *   - specify: { aiSpec, successCriteria }
 *   - review: { approved, feedback }
 *   - clarifying/checkpoint: { answers }
 *   - conflict: { choice, mergeContent? }
 *   - verifying: { action }
 *   - escalate: { action, instructions }
 *   - enrich: { project, date, speakers }
 *   - approval: { approved, feedback? }
 *   - categorize: { category, project?, fieldUpdates? }
 *   - meeting_triage: { selectedTasks }
 *
 * Usage:
 *   import { buildResolutionPayload, validateResolution } from '$lib/utils/resolution';
 *
 *   const payload = buildResolutionPayload(decision, 'Proceed', formData);
 *   const missing = validateResolution(decision.decisionType, payload.resolution);
 *   if (missing.length === 0) {
 *     await decisionStore.resolve(decision.id, payload.resolution);
 *   }
 *
 * Testing:
 *   // Pure function, easy to test
 *   const result = buildResolutionPayload(mockDecision, 'Approve', { feedback: 'ok' });
 *   expect(result.resolution.approved).toBe(true);
 */

import type { UiDecision } from '$lib/api/types';

/**
 * Resolution payload structure sent to the API.
 */
export interface ResolutionPayload {
  resolution: Record<string, unknown>;
}

/**
 * Form data collected from DecisionCard inputs.
 * Keys are input names, values are the collected data.
 */
export interface CardFormData {
  // Triage
  destination?: string;
  project?: string;
  priority?: string;

  // Specify
  aiSpec?: Record<string, string>;
  successCriteria?: Array<{ id: string; text: string; checked: boolean }>;

  // Review
  approved?: boolean;
  feedback?: string;

  // Clarifying / Checkpoint
  answers?: Record<string, string | number | string[]>;

  // Conflict
  choice?: 'keep_mine' | 'take_theirs' | 'merge';

  // Categorize
  category?: string;
  fieldUpdates?: Record<string, unknown>;

  // Verifying
  verifyAction?: 'retry' | 'override' | 'escalate';

  // Escalate
  escalateAction?: 'retry' | 'edit' | 'abandon';
  instructions?: string;

  // Enrich
  date?: string;
  speakers?: Array<{ name: string; selected: boolean }>;

  // Approval
  approvalFeedback?: string;

  // Conflict (merge)
  mergeContent?: string;

  // Meeting Triage
  selectedTasks?: string[];
}

/**
 * Map action names to resolution payload builders.
 */
const actionToPayloadMap: Record<string, (decision: UiDecision, actionName: string, formData: CardFormData) => Record<string, unknown>> = {
  // Triage actions
  'Proceed': buildTriagePayload,
  'Archive': buildTriagePayload,
  'Route to': buildTriagePayload,  // Prefix match handled in main function

  // Specify actions
  'Save & Continue': buildSpecifyPayload,
  'Save Draft': buildSpecifyPayload,

  // Review actions
  'Approve': buildReviewPayload,
  'Request Changes': buildReviewPayload,

  // Clarifying actions
  'Submit Answers': buildClarifyingPayload,

  // Checkpoint actions (same as clarifying)
  'Continue': buildClarifyingPayload,

  // Conflict actions
  'Keep Mine': buildConflictPayload,
  'Take Theirs': buildConflictPayload,
  'Merge': buildConflictPayload,

  // Verifying actions
  'Auto-Retry': buildVerifyingPayload,
  'Override': buildVerifyingPayload,
  'Escalate': buildVerifyingPayload,

  // Escalate actions
  'Retry New Instructions': buildEscalatePayload,
  'Edit Myself': buildEscalatePayload,
  'Abandon': buildEscalatePayload,

  // Enrich actions
  'Save & Extract': buildEnrichPayload,

  // Checkpoint actions
  'Submit Checkpoint': buildCheckpointPayload,

  // Approval actions
  'Approve Request': buildApprovalPayload,
  'Reject Request': buildApprovalPayload,

  // Categorize actions
  'Save Category': buildCategorizePayload,

  // Meeting triage actions
  'Confirm Meeting Tasks': buildMeetingTriagePayload,
};

/**
 * Build resolution payload based on decision type and action.
 *
 * @param decision - The decision being resolved
 * @param actionName - The action button that was clicked
 * @param formData - Collected form data from the card
 * @returns Resolution payload for the API
 */
export function buildResolutionPayload(
  decision: UiDecision,
  actionName: string,
  formData: CardFormData
): ResolutionPayload {
  // Handle "Route to X" actions (prefix match)
  if (actionName.startsWith('Route to ')) {
    const destination = actionName.replace('Route to ', '');
    return {
      resolution: buildTriagePayload(decision, actionName, { ...formData, destination }),
    };
  }

  // Look up builder function
  const builder = actionToPayloadMap[actionName];

  if (builder) {
    return {
      resolution: builder(decision, actionName, formData),
    };
  }

  // Fallback: return action name as resolution type
  console.warn(`No resolution builder for action: ${actionName}`);
  return {
    resolution: {
      action: actionName,
      ...formData,
    },
  };
}

// =============================================================================
// Type-Specific Payload Builders
// =============================================================================

function buildTriagePayload(
  _decision: UiDecision,
  actionName: string,
  formData: CardFormData
): Record<string, unknown> {
  if (actionName === 'Archive') {
    return {
      action: 'archive',
      destination: 'archive',
    };
  }

  return {
    action: 'route',
    destination: formData.destination || 'inbox',
    project: formData.project || null,
    priority: formData.priority || 'normal',
  };
}

function buildSpecifyPayload(
  decision: UiDecision,
  _actionName: string,
  formData: CardFormData
): Record<string, unknown> {
  // Get aiSpec from formData or fallback to decision data
  const aiSpec = formData.aiSpec || (decision.data?.aiSpec as Record<string, string>) || {};
  const successCriteria = formData.successCriteria ||
    (decision.data?.successCriteria as Array<{ id: string; text: string; checked: boolean }>) || [];

  return {
    aiSpec,
    successCriteria,
  };
}

function buildReviewPayload(
  _decision: UiDecision,
  actionName: string,
  formData: CardFormData
): Record<string, unknown> {
  const approved = actionName === 'Approve';

  return {
    approved,
    feedback: formData.feedback || null,
  };
}

function buildClarifyingPayload(
  decision: UiDecision,
  _actionName: string,
  formData: CardFormData
): Record<string, unknown> {
  // Build answers object from form data
  const answers = formData.answers || {};

  // If no form answers, try to extract from decision's questions
  if (Object.keys(answers).length === 0 && decision.clarificationQuestions) {
    // This would be populated by the form collection in DecisionCard
  }

  return {
    answers,
  };
}

function buildConflictPayload(
  _decision: UiDecision,
  actionName: string,
  formData: CardFormData
): Record<string, unknown> {
  let choice: 'keep_mine' | 'take_theirs' | 'merge';

  switch (actionName) {
    case 'Keep Mine':
      choice = 'keep_mine';
      break;
    case 'Take Theirs':
      choice = 'take_theirs';
      break;
    default:
      choice = 'merge';
  }

  const result: Record<string, unknown> = { choice };

  // Include merge content if merging
  if (choice === 'merge' && formData.mergeContent) {
    result.mergeContent = formData.mergeContent;
  }

  return result;
}

function buildVerifyingPayload(
  _decision: UiDecision,
  actionName: string,
  _formData: CardFormData
): Record<string, unknown> {
  let action: 'retry' | 'override' | 'escalate';

  switch (actionName) {
    case 'Auto-Retry':
      action = 'retry';
      break;
    case 'Override':
      action = 'override';
      break;
    default:
      action = 'escalate';
  }

  return { action };
}

function buildEscalatePayload(
  _decision: UiDecision,
  actionName: string,
  formData: CardFormData
): Record<string, unknown> {
  let action: 'retry' | 'edit' | 'abandon';

  switch (actionName) {
    case 'Retry New Instructions':
      action = 'retry';
      break;
    case 'Edit Myself':
      action = 'edit';
      break;
    default:
      action = 'abandon';
  }

  return {
    action,
    instructions: formData.instructions || null,
  };
}

function buildEnrichPayload(
  _decision: UiDecision,
  _actionName: string,
  formData: CardFormData
): Record<string, unknown> {
  return {
    project: formData.project || null,
    date: formData.date || null,
    speakers: formData.speakers || [],
  };
}

function buildCheckpointPayload(
  decision: UiDecision,
  _actionName: string,
  formData: CardFormData
): Record<string, unknown> {
  // Same structure as clarifying - answers to questions
  const answers = formData.answers || {};

  if (Object.keys(answers).length === 0 && decision.clarificationQuestions) {
    // Form data would be populated by the card
  }

  return {
    answers,
  };
}

function buildApprovalPayload(
  _decision: UiDecision,
  actionName: string,
  formData: CardFormData
): Record<string, unknown> {
  return {
    approved: actionName === 'Approve Request',
    feedback: formData.approvalFeedback || null,
  };
}

function buildCategorizePayload(
  _decision: UiDecision,
  _actionName: string,
  formData: CardFormData
): Record<string, unknown> {
  return {
    category: formData.category || null,
    project: formData.project || null,
    fieldUpdates: formData.fieldUpdates || null,
  };
}

function buildMeetingTriagePayload(
  _decision: UiDecision,
  _actionName: string,
  formData: CardFormData
): Record<string, unknown> {
  return {
    selectedTasks: formData.selectedTasks || [],
  };
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate that required fields are present in the resolution.
 * Returns array of missing field names, or empty array if valid.
 */
export function validateResolution(
  decisionType: string,
  resolution: Record<string, unknown>
): string[] {
  const missing: string[] = [];

  switch (decisionType) {
    case 'triage':
      if (!resolution.destination) missing.push('destination');
      break;
    case 'specify':
      if (!resolution.aiSpec) missing.push('aiSpec');
      break;
    case 'review':
    case 'approval':
      if (resolution.approved === undefined) missing.push('approved');
      break;
    case 'clarifying':
    case 'checkpoint':
      if (!resolution.answers) missing.push('answers');
      break;
    case 'conflict':
      if (!resolution.choice) missing.push('choice');
      break;
    case 'categorize':
      if (!resolution.category) missing.push('category');
      break;
  }

  return missing;
}
