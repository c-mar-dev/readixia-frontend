/**
 * index.ts - Public exports for UNIT-API-CLIENT
 *
 * Re-exports all public APIs for the Decision Engine client.
 * This is the main entry point for consuming the API client.
 *
 * Usage:
 *   // Import functions and singleton
 *   import { decisionsApi, apiClient, transformDecision } from '$lib/api';
 *
 *   // Import types
 *   import type { UiDecision, ApiError, Priority } from '$lib/api';
 *
 *   // List decisions
 *   const decisions = await decisionsApi.list({ status: 'pending' });
 *
 *   // Handle errors
 *   try {
 *     await decisionsApi.resolve('dec-123', { resolution: {} });
 *   } catch (e) {
 *     const error = e as ApiError;
 *     console.error(error.code, error.message);
 *   }
 */

// =============================================================================
// Client
// =============================================================================

export { ApiClient, apiClient } from './client';

// =============================================================================
// Decision API
// =============================================================================

export { decisionsApi } from './decisions';

// =============================================================================
// Entity API
// =============================================================================

export {
  entitiesApi,
  formatActorLabel,
  transformTransition,
  transformTimeline,
  transformProgress,
  transformVerification,
} from './entities';

// =============================================================================
// Session API
// =============================================================================

export { sessionsApi } from './sessions';

// =============================================================================
// Tasks API
// =============================================================================

export { tasksApi } from './tasks';
export type { CreateTaskRequest, CreateTaskResponse } from './tasks';

// =============================================================================
// Speakers API
// =============================================================================

export { speakersApi } from './speakers';

// =============================================================================
// Settings API
// =============================================================================

export { settingsApi } from './settingsApi';

// =============================================================================
// Transforms
// =============================================================================

export {
  transformDecision,
  transformDecisions,
  formatRelativeTime,
  mapStatus,
} from './transforms';

// =============================================================================
// Configuration
// =============================================================================

export { DEFAULT_CONFIG, isDev, isRetryableStatus } from './config';

// =============================================================================
// Types
// =============================================================================

export type {
  // Subject types
  SubjectType,
  ApiSubject,
  UiSubject,

  // Status and priority
  ApiStatus,
  UiStatus,
  Priority,

  // API response types
  ApiDecision,
  ApiResolutionResponse,
  ApiDeferResponse,
  ApiUndoResponse,
  ApiBatchResponse,

  // UI types
  UiDecision,
  ClarificationQuestion,

  // Error types
  ApiError,
  ApiErrorResponse,

  // Request types
  ResolutionRequest,
  DeferRequest,
  DecisionListParams,
  DecisionCreateRequest,
  BatchDecisionRequest,
  RequestOptions,

  // Configuration
  ApiConfig,

  // Connection
  ConnectionStatus,
  ConnectionState,

  // Entity/Timeline API types
  ApiTransitionRecord,
  ApiTimelineResponse,
  ApiStageInfo,
  ApiProgressResponse,
  ApiCriterionResult,
  ApiVerificationResult,
  ApiVerificationStatusResponse,

  // Entity/Timeline UI types
  UiTimelineEvent,
  UiTimeline,
  UiStage,
  UiProgress,
  UiCriterion,
  UiVerification,
  CriterionStatus,
  TimelineParams,

  // Session types
  SessionStartRequest,
  SessionStartResponse,
  SessionEndResponse,
  SessionCurrentResponse,
  SessionState,

  // Config types
  ModelRole,
  ModelRoleConfig,
  ModelsConfigResponse,
  UpdateModelRequest,
  UpdateModelResponse,
  OverseerConfigResponse,
  OverseerConfigRequest,
  UpdateOverseerResponse,
  AutoArchiveRule,
  AutoArchiveConfigResponse,
  AutoArchiveConfigRequest,
  UpdateAutoArchiveResponse,
  GeneralConfigResponse,
  ApiConnectionConfigResponse,
  AgentConfig,
  AgentsConfigResponse,
  CostsConfigResponse,

  // Speaker types
  SpeakerResult,
  SpeakerSearchResponse,
  SpeakerSyncResponse,
  SpeakerCacheStatsResponse,
} from './types';
