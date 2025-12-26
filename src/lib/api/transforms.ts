/**
 * transforms.ts - Response transformation for UNIT-API-CLIENT
 *
 * Transforms API responses from Engine format to UI format.
 * Used by downstream units: decisions.ts
 *
 * Exports:
 *   - transformDecision: Convert single ApiDecision → UiDecision
 *   - transformDecisions: Convert array of decisions
 *   - formatRelativeTime: ISO string → "2m ago"
 *   - mapStatus: 'resolved' → 'completed'
 *
 * Usage:
 *   import { transformDecision, formatRelativeTime } from '$lib/api';
 *
 *   const uiDecision = transformDecision(apiDecision);
 *   const relTime = formatRelativeTime('2024-01-01T12:00:00Z');
 *
 * Transformations:
 *   - type → decisionType
 *   - status: 'resolved' → 'completed'
 *   - created_at (ISO) → created ("2m ago")
 *   - Extracts project, question, source from data object
 */

import type {
  ApiDecision,
  ApiStatus,
  UiDecision,
  UiSubject,
  UiStatus,
  ClarificationQuestion,
} from './types';

/**
 * Convert ISO timestamp to relative time string.
 *
 * @example
 * formatRelativeTime('2024-01-01T12:00:00Z') // "2m ago" (if ~2 min ago)
 * formatRelativeTime('2024-01-01T10:00:00Z') // "2h ago" (if ~2 hours ago)
 * formatRelativeTime('2023-12-25T12:00:00Z') // "Dec 25" (if > 7 days ago)
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Handle future dates or invalid dates
  if (diffMs < 0 || isNaN(diffMs)) {
    return 'Just now';
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }

  // For older dates, show abbreviated date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Map API status to UI status.
 * 'resolved' becomes 'completed' for UI display.
 */
export function mapStatus(apiStatus: ApiStatus): UiStatus {
  if (apiStatus === 'resolved') {
    return 'completed';
  }
  return apiStatus;
}

/**
 * Extract nested fields from the data object.
 * These fields are stored in data but need to be top-level in UI.
 */
function extractFromData(data: Record<string, unknown>): {
  project: string | null;
  question: string;
  source: string | undefined;
  originalText: string | undefined;
  date: string | undefined;
  duration: string | undefined;
  clarificationQuestions: ClarificationQuestion[] | undefined;
} {
  // Project: check data.project first, then data.suggestedProject
  let project: string | null = null;
  if (typeof data.project === 'string') {
    project = data.project;
  } else if (typeof data.suggestedProject === 'string') {
    project = data.suggestedProject;
  }

  // Question: default to generic message if not present
  const question = typeof data.question === 'string'
    ? data.question
    : 'Awaiting decision';

  // Source: optional field
  const source = typeof data.source === 'string' ? data.source : undefined;

  // Original text: optional field for triage cards
  const originalText = typeof data.originalText === 'string'
    ? data.originalText
    : undefined;

  // Date and duration for transcripts
  const date = typeof data.date === 'string' ? data.date : undefined;
  const duration = typeof data.duration === 'string' ? data.duration : undefined;

  // Clarification questions for 'clarifying' decision type
  let clarificationQuestions: ClarificationQuestion[] | undefined;
  if (Array.isArray(data.clarificationQuestions)) {
    clarificationQuestions = data.clarificationQuestions as ClarificationQuestion[];
  }

  return {
    project,
    question,
    source,
    originalText,
    date,
    duration,
    clarificationQuestions,
  };
}

/**
 * Transform API decision response to UI decision format.
 *
 * @param api - Decision from API response
 * @returns Decision formatted for UI components
 */
export function transformDecision(api: ApiDecision): UiDecision {
  const extracted = extractFromData(api.data);

  // Build subject with extracted source
  const subject: UiSubject = {
    type: api.subject.type,
    id: api.subject.id,
    title: api.subject.title,
    source: extracted.source,
    originalText: extracted.originalText,
    date: extracted.date,
    duration: extracted.duration,
  };

  return {
    id: api.id,
    decisionType: api.type,
    status: mapStatus(api.status),
    subject,
    project: extracted.project,
    priority: api.priority,
    question: extracted.question,
    created: formatRelativeTime(api.created_at),
    clarificationQuestions: extracted.clarificationQuestions,
    data: api.data,
    canUndo: api.can_undo,
    actionId: api.action_id,
  };
}

/**
 * Transform array of API decisions to UI format.
 *
 * @param apiDecisions - Array of decisions from API
 * @returns Array of decisions formatted for UI
 */
export function transformDecisions(apiDecisions: ApiDecision[]): UiDecision[] {
  return apiDecisions.map(transformDecision);
}
