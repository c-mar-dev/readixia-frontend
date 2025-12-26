/**
 * eventHandlers.ts - WebSocket event to store adapters for UNIT-WEBSOCKET-REALTIME
 *
 * Handles incoming WebSocket events and updates appropriate stores.
 * Transforms Engine event format to store format where needed.
 *
 * Usage:
 *   import { handleDecisionWebSocketEvent, handleAgentWebSocketEvent } from '$lib/services/eventHandlers';
 *
 *   realtimeService.onDecisionEvent = handleDecisionWebSocketEvent;
 *   realtimeService.onAgentEvent = handleAgentWebSocketEvent;
 */

import { get } from 'svelte/store';
import { decisionStore, decisions } from '$lib/stores/decisions';
import { actionStore } from '$lib/stores/actions';
import { realtimeStore } from '$lib/stores/realtime';
import { agentStore } from '$lib/stores/agents';
import type { UiDecision, Priority, SubjectType } from '$lib/api/types';
import type {
  DecisionWebSocketEvent,
  AgentWebSocketEvent,
  DecisionCreatedEvent,
  DecisionResolvedEvent,
  DecisionResurfacedEvent,
  UndoAvailableEvent,
  CheckpointExpiredEvent,
} from '$lib/stores/types';

// =============================================================================
// Decision Event Handlers
// =============================================================================

/**
 * Handle all decision WebSocket events.
 * Routes to specific handlers based on event type.
 */
export function handleDecisionWebSocketEvent(event: DecisionWebSocketEvent): void {
  // Update sequence tracking in realtime store
  if ('seq' in event) {
    realtimeStore.setDecisionsState('online', event.seq);
  }

  switch (event.type) {
    case 'decision_created':
      handleDecisionCreated(event);
      break;
    case 'decision_resolved':
      handleDecisionResolved(event);
      break;
    case 'decision_resurfaced':
      handleDecisionResurfaced(event);
      break;
    case 'undo_available':
      handleUndoAvailable(event);
      break;
  }
}

/**
 * Handle decision_created event.
 * Adds a new decision to the store.
 */
function handleDecisionCreated(event: DecisionCreatedEvent): void {
  // Transform WebSocket event to UiDecision format
  const decision = transformToUiDecision(event);

  // Add to store using handleEvent (which handles deduplication and windowing)
  decisionStore.handleEvent({
    type: 'decision_created',
    decision,
  });
}

/**
 * Handle decision_resolved event.
 * Removes the decision from the active list.
 */
function handleDecisionResolved(event: DecisionResolvedEvent): void {
  decisionStore.handleEvent({
    type: 'decision_resolved',
    id: event.decision_id,
    resolution: event.resolution,
  });
}

/**
 * Handle decision_resurfaced event.
 * Adds a deferred decision back to the list.
 */
function handleDecisionResurfaced(event: DecisionResurfacedEvent): void {
  // Transform to UiDecision format
  const decision = transformResurfacedToUiDecision(event);

  // Add to store
  decisionStore.handleEvent({
    type: 'decision_created',
    decision,
  });
}

/**
 * Handle undo_available event.
 * Adds the action to the undo history.
 */
function handleUndoAvailable(event: UndoAvailableEvent): void {
  // Look up decision title from current store
  const currentDecisions = get(decisions);
  const decision = currentDecisions.find((d) => d.id === event.decision_id);
  const title = decision?.subject?.title || decision?.question || 'Decision';

  actionStore.add({
    id: event.action_id,
    decisionId: event.decision_id,
    decisionTitle: title,
    expiresAt: new Date(event.expires_at),
    timestamp: new Date(),
  });
}

// =============================================================================
// Agent Event Handlers
// =============================================================================

/**
 * Handle all agent WebSocket events.
 * Routes to specific handlers based on event type.
 */
export function handleAgentWebSocketEvent(event: AgentWebSocketEvent): void {
  // Update sequence tracking in realtime store
  if ('seq' in event) {
    realtimeStore.setAgentsState('online', event.seq);
  }

  // Route agent status events to agent store
  agentStore.handleEvent(event);

  // Additional handling for checkpoint_expired (notifications)
  if (event.type === 'checkpoint_expired') {
    handleCheckpointExpired(event);
  }
}

/**
 * Handle checkpoint_expired event.
 * Shows a notification to the user.
 */
function handleCheckpointExpired(event: CheckpointExpiredEvent): void {
  realtimeStore.addNotification({
    type: 'checkpoint_expired',
    message: event.message || `Checkpoint expired: ${event.question}`,
    data: {
      taskPath: event.task_path,
      question: event.question,
    },
  });
}

// =============================================================================
// Transform Helpers
// =============================================================================

/**
 * Transform a decision_created event to UiDecision format.
 * Note: WebSocket events have partial data, so some fields are defaults.
 */
function transformToUiDecision(event: DecisionCreatedEvent): UiDecision {
  return {
    id: event.decision_id,
    decisionType: event.decision_type,
    status: 'pending',
    subject: {
      type: event.subject.type as SubjectType,
      id: event.subject.id,
      title: event.subject.title,
    },
    project: (event.data?.project as string) || null,
    priority: (event.priority as Priority) || 'normal',
    question: generateQuestionFromType(event.decision_type, event.subject.title),
    created: formatRelativeTime(event.created_at),
    data: event.data || {},
  };
}

/**
 * Transform a decision_resurfaced event to UiDecision format.
 */
function transformResurfacedToUiDecision(event: DecisionResurfacedEvent): UiDecision {
  return {
    id: event.decision_id,
    decisionType: 'triage', // Resurfaced decisions typically need triaging
    status: 'pending',
    subject: {
      type: event.subject.type as SubjectType,
      id: event.subject.id,
      title: event.subject.title,
    },
    project: (event.data?.project as string) || null,
    priority: 'normal',
    question: `This decision has resurfaced (deferred ${event.defer_count} time${event.defer_count === 1 ? '' : 's'})`,
    created: formatRelativeTime(event.resurfaced_at),
    data: {
      ...event.data,
      defer_count: event.defer_count,
    },
  };
}

/**
 * Generate a question string based on decision type.
 */
function generateQuestionFromType(type: string, title: string): string {
  const questions: Record<string, string> = {
    triage: `How should we route "${title}"?`,
    specify: `What are the requirements for "${title}"?`,
    review: `Review the completed work for "${title}"`,
    clarify: `Answer questions about "${title}"`,
    verify: `Verify the results for "${title}"`,
    checkpoint: `Checkpoint: "${title}"`,
    enrich: `Add context to "${title}"`,
    categorize: `Categorize "${title}"`,
  };

  return questions[type] || `New decision for "${title}"`;
}

/**
 * Format an ISO timestamp as relative time.
 * Simple implementation - returns "just now" for recent events.
 */
function formatRelativeTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHour < 24) {
    return `${diffHour}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}
