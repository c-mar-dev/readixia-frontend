/**
 * types.ts - Type definitions for UNIT-API-CLIENT
 *
 * Provides TypeScript interfaces for the Decision Engine API client.
 * Used by downstream units: All frontend components consuming decisions
 *
 * Exports:
 *   - ApiDecision, ApiSubject: Mirror Engine response schemas
 *   - UiDecision, UiSubject: Transformed types for UI components
 *   - ApiError: Normalized error format
 *   - Request types: ResolutionRequest, DeferRequest, etc.
 *   - ConnectionStatus: Store state type
 *
 * Usage:
 *   import type { UiDecision, ApiError } from '$lib/api';
 *
 *   function handleDecision(decision: UiDecision) {
 *     console.log(decision.decisionType, decision.status);
 *   }
 *
 * Reference:
 *   - Engine schema: engine/src/stubs/api/decision_routes_stub.py
 *   - UI shape: frontend/src/lib/data/decisions.js
 */

// =============================================================================
// API Response Types (mirror Engine schemas exactly)
// =============================================================================

/** Subject types supported by the system */
export type SubjectType = 'task' | 'transcript' | 'email' | 'calendar' | 'source' | 'project' | 'person';

/** API subject schema as returned by the Engine */
export interface ApiSubject {
  type: SubjectType;
  id: string;
  title: string;
}

/** Decision status values from the Engine */
export type ApiStatus = 'pending' | 'resolved' | 'deferred' | 'expired' | 'undone';

/** Priority values from the Engine */
export type Priority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Decision response from the Engine API
 * Source: engine/src/stubs/api/decision_routes_stub.py:143-164
 */
export interface ApiDecision {
  id: string;
  type: string;
  subject: ApiSubject;
  status: ApiStatus;
  priority: Priority;
  data: Record<string, unknown>;
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
  resolved_at: string | null;
  resolved_by: string | null;
  resolution: Record<string, unknown> | null;
  defer_until: string | null;
  defer_count: number;
  defer_reason: string | null;
  batch_id: string | null;
  batch_index: number | null;
  action_id: string | null;
  can_undo: boolean;
}

/** Response from POST /api/decisions/{id}/resolve */
export interface ApiResolutionResponse {
  decision: ApiDecision;
  chained_decisions: ApiDecision[];
  undo_available: boolean;
  undo_expires_at: string | null;
  action_id: string | null;
}

/** Response from POST /api/decisions/{id}/defer */
export interface ApiDeferResponse {
  decision: ApiDecision;
  defer_count: number;
  defer_until: string;
  remaining_deferrals: number;
}

/** Response from POST /api/decisions/{id}/undo */
export interface ApiUndoResponse {
  decision: ApiDecision;
  restored_status: string;
  side_effects_reverted: string[];
}

/** Response from POST /api/decisions/batch */
export interface ApiBatchResponse {
  batch_id: string;
  decisions: ApiDecision[];
  count: number;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Normalized error object
 * Source: engine/src/stubs/api/decision_routes_stub.py:238-244
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Error response wrapper from the API */
export interface ApiErrorResponse {
  error: ApiError;
}

// =============================================================================
// UI Types (what frontend components consume)
// =============================================================================

/** UI status values (maps 'resolved' to 'completed') */
export type UiStatus = 'pending' | 'completed' | 'deferred' | 'expired' | 'undone';

/** UI subject with additional extracted fields */
export interface UiSubject {
  type: SubjectType;
  id: string;
  title: string;
  source?: string;
  originalText?: string;
  date?: string;
  duration?: string;
}

/** Clarification question for 'clarifying' decision type */
export interface ClarificationQuestion {
  id: string;
  type: 'text' | 'choice' | 'number';
  text: string;
  options?: string[];
}

/**
 * UI Decision format consumed by frontend components
 * Source: frontend/src/lib/data/decisions.js
 */
export interface UiDecision {
  id: string;
  decisionType: string;
  status: UiStatus;
  subject: UiSubject;
  project: string | null;
  priority: Priority;
  question: string;
  created: string;  // Relative time like "2m ago"
  clarificationQuestions?: ClarificationQuestion[];
  data: Record<string, unknown>;
  canUndo?: boolean;
  actionId?: string | null;
}

// =============================================================================
// Request Types
// =============================================================================

/** Request body for POST /api/decisions/{id}/resolve */
export interface ResolutionRequest {
  resolution: Record<string, unknown>;
  resolved_by?: string;
}

/** Request body for POST /api/decisions/{id}/defer */
export interface DeferRequest {
  until: string;  // ISO 8601
  reason?: string;
}

/** Query parameters for GET /api/decisions/ */
export interface DecisionListParams {
  type?: string;
  status?: string;
  limit?: number;
}

/** Single decision in batch create request */
export interface DecisionCreateRequest {
  type: string;
  subject: ApiSubject;
  data?: Record<string, unknown>;
  priority?: Priority;
}

/** Request body for POST /api/decisions/batch */
export interface BatchDecisionRequest {
  decisions: DecisionCreateRequest[];
}

// =============================================================================
// Client Configuration
// =============================================================================

/** API client configuration options */
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/** Per-request options */
export interface RequestOptions {
  timeout?: number;
  signal?: AbortSignal;
}

// =============================================================================
// Connection Status
// =============================================================================

/** Connection state values */
export type ConnectionState = 'online' | 'offline' | 'error' | 'reconnecting';

/** Connection status store shape */
export interface ConnectionStatus {
  state: ConnectionState;
  lastChecked: Date | null;
  error: ApiError | null;
}

// =============================================================================
// Entity/Timeline API Response Types (mirror Engine schemas)
// =============================================================================

/**
 * Single state transition record from the Engine.
 * Source: engine/src/api/schemas/entities.py:24-54
 */
export interface ApiTransitionRecord {
  id: string;
  from_state: string | null;
  to_state: string;
  timestamp: string;  // ISO 8601 with Z suffix
  actor: string;      // "human", "system", "agent:{name}"
  input_summary: Record<string, unknown> | null;
  output_summary: Record<string, unknown> | null;
  decision_id: string | null;
  execution_id: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Timeline response from GET /api/entities/timeline/{path}
 * Source: engine/src/api/schemas/entities.py:62-75
 */
export interface ApiTimelineResponse {
  item_path: string;
  item_type: string;
  transitions: ApiTransitionRecord[];
  total_count: number;
}

/**
 * Stage info from progress endpoint.
 * Source: engine/src/api/schemas/entities.py:82-88
 */
export interface ApiStageInfo {
  id: string;
  label: string;
  index: number;
}

/**
 * Progress response from GET /api/entities/progress/{path}
 * Source: engine/src/api/schemas/entities.py:90-108
 */
export interface ApiProgressResponse {
  item_path: string;
  workflow_name: string;
  current_stage: ApiStageInfo;
  total_stages: number;
  completed_stages: string[];
  percentage: number;
}

/** Criterion status for verification */
export type CriterionStatus = 'pass' | 'fail' | 'pending';

/**
 * Single criterion result from verification.
 * Source: engine/src/api/schemas/entities.py:116-124
 */
export interface ApiCriterionResult {
  criterion_id: string;
  criterion_text: string;
  status: CriterionStatus;
  note: string | null;
}

/**
 * Verification result from a verification attempt.
 * Source: engine/src/api/schemas/entities.py:127-143
 */
export interface ApiVerificationResult {
  timestamp: string;  // ISO 8601 with Z suffix
  passed: boolean;
  criteria_results: ApiCriterionResult[];
  feedback: string | null;
}

/**
 * Verification status response from GET /api/entities/verification-status/{path}
 * Source: engine/src/api/schemas/entities.py:145-167
 */
export interface ApiVerificationStatusResponse {
  item_path: string;
  has_verification: boolean;
  latest_verification: ApiVerificationResult | null;
  retry_count: number;
  max_retries: number;
  can_retry: boolean;
}

// =============================================================================
// Entity/Timeline UI Types
// =============================================================================

/** Timeline event formatted for UI display */
export interface UiTimelineEvent {
  id: string;
  fromState: string | null;
  toState: string;
  timestamp: Date;
  relativeTime: string;
  actor: string;
  actorLabel: string;
  inputSummary: Record<string, unknown> | null;
  outputSummary: Record<string, unknown> | null;
  decisionId: string | null;
  executionId: string | null;
  metadata: Record<string, unknown>;
}

/** Timeline data with pagination info */
export interface UiTimeline {
  itemPath: string;
  itemType: string;
  events: UiTimelineEvent[];
  totalCount: number;
  hasMore: boolean;
}

/** Workflow stage for UI display */
export interface UiStage {
  id: string;
  label: string;
  index: number;
}

/** Progress data formatted for UI display */
export interface UiProgress {
  currentStage: UiStage;
  totalStages: number;
  completedStages: string[];
  percentage: number;
}

/** Single verification criterion for UI display */
export interface UiCriterion {
  id: string;
  text: string;
  status: CriterionStatus;
  note: string | null;
}

/** Verification data formatted for UI display */
export interface UiVerification {
  hasVerification: boolean;
  passed: boolean | null;
  timestamp: Date | null;
  relativeTime: string | null;
  criteria: UiCriterion[];
  feedback: string | null;
  retryCount: number;
  maxRetries: number;
  canRetry: boolean;
}

/** Parameters for timeline API calls */
export interface TimelineParams {
  limit?: number;
  offset?: number;
}

// =============================================================================
// Session Types
// =============================================================================

/** Request body for POST /api/sessions/start */
export interface SessionStartRequest {
  metadata?: Record<string, unknown>;
}

/** Response from POST /api/sessions/start */
export interface SessionStartResponse {
  id: string;
  started_at: string;
  message: string;
}

/** Response from POST /api/sessions/end */
export interface SessionEndResponse {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  duration_hours: number;
  decisions_resolved: number;
  velocity: number;
}

/** Response from GET /api/sessions/current */
export interface SessionCurrentResponse {
  id: string;
  started_at: string;
  duration_seconds: number;
  duration_hours: number;
  decisions_resolved: number;
  velocity: number;
}

/** Session store state */
export interface SessionState {
  session: SessionCurrentResponse | null;
  loading: boolean;
  starting: boolean;
  ending: boolean;
  error: ApiError | null;
  lastPolled: Date | null;
}

// =============================================================================
// Config Types (Settings API)
// =============================================================================

/** Model role for configuration */
export type ModelRole = 'architect' | 'worker' | 'verifier' | 'clerk';

/** Single role's model configuration */
export interface ModelRoleConfig {
  current: string;
  available: string[];
  description: string;
}

/** Response from GET /api/config/models */
export interface ModelsConfigResponse {
  architect: ModelRoleConfig;
  worker: ModelRoleConfig;
  verifier: ModelRoleConfig;
  clerk: ModelRoleConfig;
}

/** Request for PUT /api/config/models/{role} */
export interface UpdateModelRequest {
  model_id: string;
}

/** Response from PUT /api/config/models/{role} */
export interface UpdateModelResponse {
  success: boolean;
  role: ModelRole;
  previous_model: string;
  current_model: string;
}

/** Response from GET /api/config/overseer */
export interface OverseerConfigResponse {
  polling_interval_ms: number;
  max_concurrent_tasks: number;
  max_retries: number;
  sandbox_mode: boolean;
  timeout_seconds: number;
}

/** Request for PUT /api/config/overseer (partial update) */
export type OverseerConfigRequest = Partial<OverseerConfigResponse>;

/** Response from PUT /api/config/overseer */
export interface UpdateOverseerResponse {
  success: boolean;
  previous: OverseerConfigResponse;
  current: OverseerConfigResponse;
}

/** Single auto-archive rule */
export interface AutoArchiveRule {
  item_type: string;
  state: string;
  after_days: number;
}

/** Response from GET /api/config/auto-archive */
export interface AutoArchiveConfigResponse {
  enabled: boolean;
  rules: AutoArchiveRule[];
}

/** Request for PUT /api/config/auto-archive (partial update) */
export interface AutoArchiveConfigRequest {
  enabled?: boolean;
  rules?: AutoArchiveRule[];
}

/** Response from PUT /api/config/auto-archive */
export interface UpdateAutoArchiveResponse {
  success: boolean;
  previous: AutoArchiveConfigResponse;
  current: AutoArchiveConfigResponse;
}

// --- General Settings API (UNIT-API-009) ---

/** Response from GET /api/config/general */
export interface GeneralConfigResponse {
  theme: 'dark' | 'light';
  notifications_enabled: boolean;
  sound_effects: boolean;
}

/** Request for PUT /api/config/general */
export interface UpdateGeneralRequest {
  theme?: 'dark' | 'light';
  notifications_enabled?: boolean;
  sound_effects?: boolean;
}

/** Response from PUT /api/config/general */
export interface UpdateGeneralResponse {
  success: boolean;
  previous: GeneralConfigResponse;
  current: GeneralConfigResponse;
}

// --- API Keys API (UNIT-API-009, Read-Only) ---

/** Status of an API key (masked for security) */
export interface ApiKeyStatus {
  masked_value: string;
  is_set: boolean;
}

/** Response from GET /api/config/api */
export interface ApiConfigResponse {
  anthropic_key: ApiKeyStatus;
  openai_key: ApiKeyStatus;
  mdq_socket_path: string;
}

// Legacy alias for backwards compatibility
export type ApiConnectionConfigResponse = ApiConfigResponse;

// --- Agents API (UNIT-API-009) ---

/** Configuration for a single agent */
export interface AgentConfigResponse {
  name: string;
  display_name: string;
  enabled: boolean;
  model_role: string;
  timeout_seconds: number;
}

/** Response from GET /api/config/agents */
export interface AgentsConfigResponse {
  agents: AgentConfigResponse[];
}

/** Request for PUT /api/config/agents/{agent_name} */
export interface UpdateAgentRequest {
  enabled?: boolean;
  timeout_seconds?: number;
}

/** Response from PUT /api/config/agents/{agent_name} */
export interface UpdateAgentResponse {
  success: boolean;
  previous: AgentConfigResponse;
  current: AgentConfigResponse;
}

// Legacy AgentConfig for backward compat with settings store
export interface AgentConfig {
  name: string;
  enabled: boolean;
  model: string;
  timeout_seconds: number;
  system_prompt?: string;
  system_prompt_preview?: string;
  trigger_states: string[];
}

// --- Costs API (UNIT-API-009) ---

/** Subscription mode for cost tracking */
export type SubscriptionMode = 'api' | 'max_5x' | 'max_20x';

/** Response from GET /api/config/costs */
export interface CostsConfigResponse {
  // Subscription mode
  subscription_mode: SubscriptionMode;

  // API mode limits
  daily_limit_usd: number;
  hourly_limit_usd: number;

  // Max mode limits
  weekly_compute_hours_limit: number;
  hourly_request_limit: number;

  // Common
  alert_threshold_pct: number;

  // API mode usage (read-only)
  current_daily_usage_usd: number;
  current_hourly_usage_usd: number;

  // Max mode usage (read-only)
  current_weekly_compute_hours: number;
  current_hourly_requests: number;

  last_updated: string | null;
}

/** Request for PUT /api/config/costs */
export interface UpdateCostsRequest {
  subscription_mode?: SubscriptionMode;
  daily_limit_usd?: number;
  hourly_limit_usd?: number;
  weekly_compute_hours_limit?: number;
  hourly_request_limit?: number;
  alert_threshold_pct?: number;
}

/** Response from PUT /api/config/costs */
export interface UpdateCostsResponse {
  success: boolean;
  previous: CostsConfigResponse;
  current: CostsConfigResponse;
}

// =============================================================================
// Speaker Types
// =============================================================================

/** Single speaker search result */
export interface SpeakerResult {
  name: string;
  source?: string;  // 'transcript' | 'person'
  email?: string;
  company?: string;
  last_seen?: string;  // ISO 8601
  frequency: number;
}

/** Response from GET /api/speakers/search */
export interface SpeakerSearchResponse {
  results: SpeakerResult[];
  count: number;
  query: string;
}

/** Response from POST /api/speakers/sync */
export interface SpeakerSyncResponse {
  synced: number;
  message: string;
}

/** Response from GET /api/speakers/stats */
export interface SpeakerCacheStatsResponse {
  speaker_count: number;
  last_sync: string | null;
  sync_interval: number;
  running: boolean;
}
