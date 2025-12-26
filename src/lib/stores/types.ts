/**
 * types.ts - Type definitions for decision stores
 *
 * Provides TypeScript interfaces for store state and per-decision-type data.
 * Used by: decisions.ts, filters.ts, derived.ts
 *
 * Exports:
 *   - DecisionStoreState: Core store state shape
 *   - FilterState: Filter store state shape
 *   - QueueStats: Statistics derived from decisions
 *   - Per-type data interfaces (TriageData, SpecifyData, etc.)
 *   - DecisionEvent: WebSocket event types for future real-time updates
 */

import type { UiDecision, ApiError, Priority, ClarificationQuestion } from '$lib/api/types';

// =============================================================================
// Store State Types
// =============================================================================

/**
 * Core decision store state.
 */
export interface DecisionStoreState {
  decisions: UiDecision[];
  loading: boolean;
  error: ApiError | null;
  lastFetched: Date | null;
  /** Whether more decisions are available (for pagination) */
  hasMore: boolean;
  /** Whether a "load more" operation is in progress */
  loadingMore: boolean;
}

/**
 * Filter store state.
 * All filters default to 'all' (no filter) or empty string (search).
 */
export interface FilterState {
  /** Decision type filter or 'all' or 'urgent' */
  stage: string;
  /** Subject type filter or 'all' */
  type: string;
  /** Project name filter or 'all' */
  project: string;
  /** Free text search query */
  search: string;
  /** Filter mode: 'type' for individual types, 'group' for workflow groups */
  stageMode: 'type' | 'group';
}

/**
 * Queue statistics derived from the decision list.
 */
export interface QueueStats {
  /** Total pending decisions */
  total: number;
  /** Count by decision type */
  byType: Record<string, number>;
  /** Count by priority level */
  byPriority: Record<Priority, number>;
  /** Count of critical priority (urgent) decisions */
  urgent: number;
}

// =============================================================================
// Per-Decision-Type Data Interfaces
// =============================================================================

/**
 * Data shape for 'triage' decision type.
 * Used when routing incoming items to destinations.
 */
export interface TriageData {
  destination: string[];
  suggestedDestination: string;
  suggestedProject: string;
  suggestedPriority: string;
}

/**
 * Data shape for 'specify' decision type.
 * Used when defining AI task specifications.
 */
export interface SpecifyData {
  context?: string;
  aiSpec: Record<string, unknown>;
  successCriteria: SuccessCriterion[];
  contextFiles?: ContextFile[];
}

export interface SuccessCriterion {
  id: string;
  text: string;
  checked: boolean;
}

export interface ContextFile {
  name: string;
  status: 'included' | 'excluded';
  reason?: string;
}

/**
 * Data shape for 'clarifying' decision type.
 * Contains questions from AI needing human answers.
 */
export interface ClarifyingData {
  clarificationQuestions: ClarificationQuestion[];
}

/**
 * Data shape for 'checkpoint' decision type.
 * Similar to clarifying but for mid-execution checkpoints.
 */
export interface CheckpointData {
  checkpointQuestions: ClarificationQuestion[];
  progress?: string;
  currentStep?: string;
}

/**
 * Data shape for 'verifying' decision type.
 * Shows AI verification results.
 */
export interface VerifyingData {
  attempt: number;
  maxAttempts: number;
  verifier: string;
  criteriaResults: CriteriaResult[];
  feedback: string;
}

export interface CriteriaResult {
  text: string;
  status: 'pass' | 'fail' | 'partial';
  note: string;
}

/**
 * Data shape for 'review' decision type.
 * Final human review of completed work.
 */
export interface ReviewData {
  completedBy: string;
  verified: boolean;
  specSummary: Record<string, unknown>;
  resultSummary: ResultSummary;
}

export interface ResultSummary {
  preview: string;
  fullDocLink: string;
  diffLink?: string;
}

/**
 * Data shape for 'conflict' decision type.
 * Shows version conflicts needing resolution.
 */
export interface ConflictData {
  filePath: string;
  conflictType: 'version' | 'concurrent';
  myVersion: VersionInfo;
  incomingVersion: VersionInfo;
}

export interface VersionInfo {
  seq: number;
  timestamp: string;
  actor: string;
  changes: string[];
  /** @deprecated Use 'actor' instead */
  by?: string;
  /** @deprecated Use 'timestamp' instead */
  modified?: string;
}

/**
 * Data shape for 'escalate' decision type.
 * AI escalation when max retries exceeded.
 */
export interface EscalateData {
  reason: string;
  attempts: number;
  lastError: string;
  history: string[];
  draftPreview: string;
}

/**
 * Data shape for 'enrich' decision type.
 * Enriching transcripts with metadata.
 */
export interface EnrichData {
  duration: string;
  autoDetected: string;
  preview: string;
  suggestedProject: string;
  speakers: Speaker[];
  date?: string;
}

export interface Speaker {
  name: string;
  selected: boolean;
}

/**
 * Data shape for 'meeting_triage' decision type.
 * Batch selection of tasks extracted from meeting.
 */
export interface MeetingTriageData {
  extractedTasks: ExtractedTask[];
}

export interface ExtractedTask {
  id: string;
  title: string;
  assignee: string;
  priority: string;
  checked: boolean;
}

/**
 * Data shape for 'checkpoint' decision type.
 * Mid-execution questions requiring immediate human input.
 */
export interface CheckpointData {
  questions: ClarificationQuestion[];
  taskContext: string;
  agentName?: string;
  expiresAt?: string;
  progress?: string;
}

/**
 * Data shape for 'approval' decision type.
 * Actions requiring explicit human approval.
 */
export interface ApprovalData {
  action: string;
  context: string;
  implications?: string;
  requestedBy: string;
  requestedAt: string;
}

/**
 * Data shape for 'categorize' decision type.
 * Categorizing items (email, sources).
 */
export interface CategorizeData {
  preview: string;
  suggestedCategory?: string;
  categories: string[];
  suggestedProject?: string;
  projects: string[];
  showTypeSelector?: boolean;
  itemTypes?: string[];
  additionalFields?: AdditionalField[];
}

/**
 * Additional editable field in categorize card.
 */
export interface AdditionalField {
  name: string;
  value: string;
  editable: boolean;
}

/**
 * Union type for all decision data shapes.
 * Use with type guards for type-safe access.
 */
export type DecisionData =
  | TriageData
  | SpecifyData
  | ClarifyingData
  | CheckpointData
  | VerifyingData
  | ReviewData
  | ConflictData
  | EscalateData
  | EnrichData
  | MeetingTriageData
  | ApprovalData
  | CategorizeData;

// =============================================================================
// WebSocket Event Types
// =============================================================================

/**
 * Base interface for all WebSocket events from Engine.
 * All events include a sequence number for ordering/gap detection.
 */
interface BaseWebSocketEvent {
  seq: number;
}

// -----------------------------------------------------------------------------
// Decision WebSocket Events (from /ws/decisions)
// -----------------------------------------------------------------------------

/**
 * Sent when a new decision is created.
 */
export interface DecisionCreatedEvent extends BaseWebSocketEvent {
  type: 'decision_created';
  decision_id: string;
  decision_type: string;
  subject: {
    type: string;
    id: string;
    title: string;
  };
  priority: string;
  created_at: string;
  data?: Record<string, unknown>;
}

/**
 * Sent when a decision is resolved.
 */
export interface DecisionResolvedEvent extends BaseWebSocketEvent {
  type: 'decision_resolved';
  decision_id: string;
  resolution: Record<string, unknown>;
  resolved_by: string;
  resolved_at: string;
}

/**
 * Sent when a deferred decision resurfaces.
 */
export interface DecisionResurfacedEvent extends BaseWebSocketEvent {
  type: 'decision_resurfaced';
  decision_id: string;
  subject: {
    type: string;
    id: string;
    title: string;
  };
  defer_count: number;
  resurfaced_at: string;
  data?: Record<string, unknown>;
}

/**
 * Sent when an undo action becomes available.
 */
export interface UndoAvailableEvent extends BaseWebSocketEvent {
  type: 'undo_available';
  decision_id: string;
  action_id: string;
  expires_at: string;
}

/**
 * Union of all decision-related WebSocket events.
 */
export type DecisionWebSocketEvent =
  | DecisionCreatedEvent
  | DecisionResolvedEvent
  | DecisionResurfacedEvent
  | UndoAvailableEvent;

// -----------------------------------------------------------------------------
// Agent WebSocket Events (from /ws/agents)
// -----------------------------------------------------------------------------

/**
 * Sent when a checkpoint question expires without an answer.
 */
export interface CheckpointExpiredEvent extends BaseWebSocketEvent {
  type: 'checkpoint_expired';
  task_path: string;
  question: string;
  message: string;
}

/**
 * Periodic agent status updates.
 */
export interface AgentStatusEvent extends BaseWebSocketEvent {
  type: 'agent_status';
  agent_id: string;
  name: string;
  role: string;
  status: string;
  progress: number;
  current_task: string;
  last_active: string;
  logs: string[];
}

/**
 * Sent when an agent completes its task.
 */
export interface AgentCompletedEvent extends BaseWebSocketEvent {
  type: 'agent_completed';
  agent_id: string;
  result: string;
  duration_ms: number;
}

/**
 * Sent when agent execution fails.
 */
export interface AgentFailedEvent extends BaseWebSocketEvent {
  type: 'agent_failed';
  decision_id: string;
  task_path: string;
  error: string | null;
  retry_count: number;
  max_retries: number;
}

/**
 * Sent when agent execution times out.
 */
export interface AgentTimeoutEvent extends BaseWebSocketEvent {
  type: 'agent_timeout';
  decision_id: string;
  task_path: string;
}

/**
 * Union of all agent-related WebSocket events.
 */
export type AgentWebSocketEvent =
  | CheckpointExpiredEvent
  | AgentStatusEvent
  | AgentCompletedEvent
  | AgentFailedEvent
  | AgentTimeoutEvent;

// -----------------------------------------------------------------------------
// Ping/Pong Messages
// -----------------------------------------------------------------------------

/**
 * Client-sent ping message.
 */
export interface PingMessage {
  type: 'ping';
}

/**
 * Server-sent pong response.
 */
export interface PongMessage extends BaseWebSocketEvent {
  type: 'pong';
}

/**
 * Combined union of all possible WebSocket messages.
 */
export type WebSocketEvent =
  | DecisionWebSocketEvent
  | AgentWebSocketEvent
  | PongMessage;

// -----------------------------------------------------------------------------
// Store Events (used by decisionStore.handleEvent)
// -----------------------------------------------------------------------------

/**
 * Decision events for real-time store updates.
 * Store's handleEvent() method processes these.
 * Uses underscore naming to match Engine WebSocket format.
 */
export type DecisionEvent =
  | { type: 'decision_created'; decision: UiDecision }
  | { type: 'decision_updated'; decision: UiDecision }
  | { type: 'decision_resolved'; id: string; resolution: Record<string, unknown> }
  | { type: 'decision_chained'; parentId: string; child: UiDecision }
  | { type: 'decision_expired'; id: string }
  | { type: 'decisions_refresh'; decisions: UiDecision[] };

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for triage decision data.
 */
export function isTriageData(data: unknown): data is TriageData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'destination' in data &&
    Array.isArray((data as TriageData).destination)
  );
}

/**
 * Type guard for specify decision data.
 */
export function isSpecifyData(data: unknown): data is SpecifyData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'aiSpec' in data &&
    'successCriteria' in data
  );
}

/**
 * Type guard for verifying decision data.
 */
export function isVerifyingData(data: unknown): data is VerifyingData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'attempt' in data &&
    'criteriaResults' in data
  );
}

/**
 * Type guard for conflict decision data.
 */
export function isConflictData(data: unknown): data is ConflictData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'myVersion' in data &&
    'incomingVersion' in data
  );
}

/**
 * Type guard for escalate decision data.
 */
export function isEscalateData(data: unknown): data is EscalateData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'reason' in data &&
    'history' in data
  );
}

/**
 * Type guard for enrich decision data.
 */
export function isEnrichData(data: unknown): data is EnrichData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'speakers' in data &&
    'duration' in data
  );
}

/**
 * Type guard for meeting_triage decision data.
 */
export function isMeetingTriageData(data: unknown): data is MeetingTriageData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'extractedTasks' in data &&
    Array.isArray((data as MeetingTriageData).extractedTasks)
  );
}
