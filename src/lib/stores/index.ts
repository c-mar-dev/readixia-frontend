/**
 * index.ts - Public exports for decision stores
 *
 * Re-exports all stores and types from the stores module.
 *
 * Usage:
 *   import {
 *     decisionStore,
 *     filterStore,
 *     filteredDecisions,
 *     queueStats
 *   } from '$lib/stores';
 */

// =============================================================================
// Core Stores
// =============================================================================

export {
  decisionStore,
  decisions,
  isLoading,
  storeError,
  lastFetched,
  hasMore,
  isLoadingMore,
} from './decisions';

export {
  filterStore,
  hasActiveFilters,
  stageFilter,
  stageMode,
  typeFilter,
  projectFilter,
  searchQuery,
} from './filters';

export {
  sessionStore,
  isSessionActive,
  isSessionLoading,
  isStarting,
  isEnding,
  sessionError,
  sessionDuration,
  decisionsResolved,
  sessionVelocity,
  currentSession,
  completedCount, // deprecated, use decisionsResolved
} from './session';

export {
  actionStore,
  undoableActions,
  hasUndoableActions,
  latestUndoableAction,
  isUndoing,
  undoError,
} from './actions';

export type { UndoableAction } from './actions';

export {
  realtimeStore,
  isConnected,
  isReconnecting,
  isDecisionsConnected,
  decisionsConnectionState,
  agentsConnectionState,
  notifications,
  notificationCount,
} from './realtime';

export type { RealtimeNotification, RealtimeStoreState } from './realtime';

export {
  agentStore,
  agents,
  activeAgents,
  hasErrors,
  runningCount,
  errorCount,
} from './agents';

export type { AgentState, AgentStatus, AgentStoreState, AgentResult } from './agents';

export {
  chainHistoryStore,
  chainHistory,
  WORKFLOW_ORDER,
} from './chainHistory';

export type { CompletedStage } from './chainHistory';

export {
  uiStore,
  toasts,
  toastCount,
  isOffline,
  wasOffline,
  isAnyLoading,
  createLoadingStore,
} from './ui';

export type { ToastItem, ToastOptions } from './ui';

export {
  settingsStore,
  generalConfig,
  modelsConfig,
  agentsConfig,
  overseerConfig,
  autoArchiveConfig,
  apiConnectionConfig,
  costsConfig,
  settingsLoading,
  isAnyLoading as isAnySettingsLoading,
  settingsError,
  settingsSaving,
  isAnySaving,
  settingsDirty,
  isAnyDirty,
} from './settings';

// =============================================================================
// Derived Stores
// =============================================================================

export {
  pendingDecisions,
  filteredDecisions,
  queueStats,
  filteredStats,
  allProjects,
  activeDecisionTypes,
  activeSubjectTypes,
  countByType,
  urgentCount,
  totalCount,
} from './derived';

// =============================================================================
// Types
// =============================================================================

export type {
  DecisionStoreState,
  FilterState,
  QueueStats,
  DecisionEvent,
  // Per-type data interfaces
  TriageData,
  SpecifyData,
  SuccessCriterion,
  ContextFile,
  ClarifyingData,
  CheckpointData,
  VerifyingData,
  CriteriaResult,
  ReviewData,
  ResultSummary,
  ConflictData,
  VersionInfo,
  EscalateData,
  EnrichData,
  Speaker,
  MeetingTriageData,
  ExtractedTask,
  ExtractData,
  CategorizeData,
  DecisionData,
  // WebSocket event types
  DecisionWebSocketEvent,
  AgentWebSocketEvent,
  WebSocketEvent,
  DecisionCreatedEvent,
  DecisionResolvedEvent,
  DecisionResurfacedEvent,
  UndoAvailableEvent,
  CheckpointExpiredEvent,
  AgentStatusEvent,
  AgentCompletedEvent,
  AgentFailedEvent,
  AgentTimeoutEvent,
} from './types';

export type { SessionState } from './session';

// Type guards
export {
  isTriageData,
  isSpecifyData,
  isVerifyingData,
  isConflictData,
  isEscalateData,
  isEnrichData,
  isMeetingTriageData,
} from './types';

// =============================================================================
// Configuration
// =============================================================================

export { STORE_CONFIG, REALTIME_CONFIG } from './config';
export type { StoreConfig, RealtimeConfig } from './config';
