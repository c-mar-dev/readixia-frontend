/**
 * settingsApi.ts - Configuration API client for Unit 9
 *
 * Provides methods for fetching and updating Engine configuration.
 * All endpoints now use real Engine APIs.
 *
 * Available Engine endpoints:
 *   - GET/PUT /api/config/models
 *   - GET/PUT /api/config/overseer
 *   - GET/PUT /api/config/auto-archive
 *   - GET/PUT /api/config/general
 *   - GET /api/config/api (read-only)
 *   - GET/PUT /api/config/agents
 *   - GET/PUT /api/config/costs
 */

import { apiClient } from './client';
import type {
  ModelsConfigResponse,
  UpdateModelRequest,
  UpdateModelResponse,
  ModelRole,
  OverseerConfigResponse,
  OverseerConfigRequest,
  UpdateOverseerResponse,
  AutoArchiveConfigResponse,
  AutoArchiveConfigRequest,
  UpdateAutoArchiveResponse,
  GeneralConfigResponse,
  UpdateGeneralRequest,
  UpdateGeneralResponse,
  ApiConfigResponse,
  AgentsConfigResponse,
  UpdateAgentRequest,
  UpdateAgentResponse,
  CostsConfigResponse,
  UpdateCostsRequest,
  UpdateCostsResponse,
} from './types';

// =============================================================================
// Models Configuration (Existing Engine API)
// =============================================================================

/**
 * Fetch current model assignments for all roles.
 */
export async function getModelsConfig(): Promise<ModelsConfigResponse> {
  return apiClient.get<ModelsConfigResponse>('/api/config/models');
}

/**
 * Update the model for a specific role.
 */
export async function updateModelConfig(
  role: ModelRole,
  request: UpdateModelRequest
): Promise<UpdateModelResponse> {
  return apiClient.put<UpdateModelResponse>(
    `/api/config/models/${role}`,
    request
  );
}

// =============================================================================
// Overseer Configuration (Existing Engine API)
// =============================================================================

/**
 * Fetch current overseer/orchestrator settings.
 */
export async function getOverseerConfig(): Promise<OverseerConfigResponse> {
  return apiClient.get<OverseerConfigResponse>('/api/config/overseer');
}

/**
 * Update overseer settings (partial update supported).
 */
export async function updateOverseerConfig(
  request: OverseerConfigRequest
): Promise<UpdateOverseerResponse> {
  return apiClient.put<UpdateOverseerResponse>('/api/config/overseer', request);
}

// =============================================================================
// Auto-Archive Configuration (Existing Engine API)
// =============================================================================

/**
 * Fetch current auto-archive settings.
 */
export async function getAutoArchiveConfig(): Promise<AutoArchiveConfigResponse> {
  return apiClient.get<AutoArchiveConfigResponse>('/api/config/auto-archive');
}

/**
 * Update auto-archive settings (partial update; rules are atomic).
 */
export async function updateAutoArchiveConfig(
  request: AutoArchiveConfigRequest
): Promise<UpdateAutoArchiveResponse> {
  return apiClient.put<UpdateAutoArchiveResponse>(
    '/api/config/auto-archive',
    request
  );
}

// =============================================================================
// General Configuration (UNIT-API-009)
// =============================================================================

/**
 * Fetch general settings (theme, notifications, sound).
 */
export async function getGeneralConfig(): Promise<GeneralConfigResponse> {
  return apiClient.get<GeneralConfigResponse>('/api/config/general');
}

/**
 * Update general settings (partial update supported).
 */
export async function updateGeneralConfig(
  request: UpdateGeneralRequest
): Promise<UpdateGeneralResponse> {
  return apiClient.put<UpdateGeneralResponse>('/api/config/general', request);
}

// =============================================================================
// API Connection Configuration (UNIT-API-009, Read-Only)
// =============================================================================

/**
 * Fetch API connection settings.
 * Note: API keys are always masked and cannot be updated via API.
 * Keys must be set via environment variables.
 */
export async function getApiConnectionConfig(): Promise<ApiConfigResponse> {
  return apiClient.get<ApiConfigResponse>('/api/config/api');
}

// Note: No update endpoint - API keys are managed via environment variables

// =============================================================================
// Agents Configuration (UNIT-API-009)
// =============================================================================

/**
 * Fetch configuration for all AI agents.
 */
export async function getAgentsConfig(): Promise<AgentsConfigResponse> {
  return apiClient.get<AgentsConfigResponse>('/api/config/agents');
}

/**
 * Update a single agent's configuration.
 */
export async function updateAgentConfig(
  agentName: string,
  request: UpdateAgentRequest
): Promise<UpdateAgentResponse> {
  return apiClient.put<UpdateAgentResponse>(
    `/api/config/agents/${agentName}`,
    request
  );
}

// =============================================================================
// Costs Configuration (UNIT-API-009)
// =============================================================================

/**
 * Fetch cost management settings and current usage.
 */
export async function getCostsConfig(): Promise<CostsConfigResponse> {
  return apiClient.get<CostsConfigResponse>('/api/config/costs');
}

/**
 * Update cost settings (limits and thresholds).
 * Note: Usage fields are read-only.
 */
export async function updateCostsConfig(
  request: UpdateCostsRequest
): Promise<UpdateCostsResponse> {
  return apiClient.put<UpdateCostsResponse>('/api/config/costs', request);
}

// =============================================================================
// Convenience Object Export
// =============================================================================

export const settingsApi = {
  // Models
  getModels: getModelsConfig,
  updateModel: updateModelConfig,

  // Overseer
  getOverseer: getOverseerConfig,
  updateOverseer: updateOverseerConfig,

  // Auto-Archive
  getAutoArchive: getAutoArchiveConfig,
  updateAutoArchive: updateAutoArchiveConfig,

  // General
  getGeneral: getGeneralConfig,
  updateGeneral: updateGeneralConfig,

  // API Connection (read-only - keys managed via env vars)
  getApiConnection: getApiConnectionConfig,

  // Agents
  getAgents: getAgentsConfig,
  updateAgent: updateAgentConfig,

  // Costs
  getCosts: getCostsConfig,
  updateCosts: updateCostsConfig,
};
