/**
 * realtime.ts - Real-time service for UNIT-WEBSOCKET-REALTIME
 *
 * Manages WebSocket connections to both /ws/decisions and /ws/agents endpoints.
 * Handles:
 * - Connection lifecycle for both endpoints
 * - Polling fallback during reconnection
 * - Event routing to appropriate handlers
 *
 * Usage:
 *   import { realtimeService } from '$lib/services/realtime';
 *
 *   // In layout onMount
 *   realtimeService.onDecisionEvent = handleDecisionEvent;
 *   realtimeService.onAgentEvent = handleAgentEvent;
 *   realtimeService.onPollNeeded = () => decisionStore.refresh();
 *   realtimeService.initialize();
 *
 *   // In layout onDestroy
 *   realtimeService.destroy();
 */

import { WebSocketClient } from './websocket';
import { REALTIME_CONFIG } from '$lib/stores/config';
import { DEFAULT_CONFIG } from '$lib/api/config';
import type { ConnectionState } from '$lib/api/types';
import type {
  WebSocketEvent,
  DecisionWebSocketEvent,
  AgentWebSocketEvent,
} from '$lib/stores/types';

// =============================================================================
// Types
// =============================================================================

export interface RealtimeServiceState {
  isInitialized: boolean;
  decisions: ConnectionState;
  agents: ConnectionState;
}

export type DecisionEventHandler = (event: DecisionWebSocketEvent) => void;
export type AgentEventHandler = (event: AgentWebSocketEvent) => void;
export type StateChangeHandler = (state: RealtimeServiceState) => void;
export type PollHandler = () => void;
export type ResyncHandler = () => void;

// =============================================================================
// Type Guards
// =============================================================================

function isDecisionEvent(event: WebSocketEvent): event is DecisionWebSocketEvent {
  return (
    event.type === 'decision_created' ||
    event.type === 'decision_resolved' ||
    event.type === 'decision_resurfaced' ||
    event.type === 'undo_available'
  );
}

function isAgentEvent(event: WebSocketEvent): event is AgentWebSocketEvent {
  return (
    event.type === 'checkpoint_expired' ||
    event.type === 'agent_status' ||
    event.type === 'agent_completed'
  );
}

// =============================================================================
// RealtimeService Class
// =============================================================================

class RealtimeService {
  private decisionsClient: WebSocketClient | null = null;
  private agentsClient: WebSocketClient | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private isPolling: boolean = false;
  private isInitialized: boolean = false;

  // Event handlers (set by consumers)
  public onDecisionEvent: DecisionEventHandler | null = null;
  public onAgentEvent: AgentEventHandler | null = null;
  public onStateChange: StateChangeHandler | null = null;
  public onPollNeeded: PollHandler | null = null;
  public onResyncNeeded: ResyncHandler | null = null;

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Initialize WebSocket connections.
   * Should be called once on app load.
   */
  initialize(): void {
    if (this.isInitialized) {
      console.warn('[Realtime] Already initialized');
      return;
    }

    // Only initialize in browser
    if (typeof window === 'undefined') {
      console.log('[Realtime] Skipping initialization (SSR)');
      return;
    }

    console.log('[Realtime] Initializing');
    this.isInitialized = true;

    const wsBaseUrl = this.getWebSocketUrl();

    // Create decisions WebSocket client
    this.decisionsClient = new WebSocketClient({
      url: `${wsBaseUrl}/ws/decisions`,
      name: 'decisions',
      onMessage: this.handleDecisionMessage.bind(this),
      onStateChange: this.handleDecisionsStateChange.bind(this),
      onResyncNeeded: this.handleResyncNeeded.bind(this),
    });

    // Create agents WebSocket client
    this.agentsClient = new WebSocketClient({
      url: `${wsBaseUrl}/ws/agents`,
      name: 'agents',
      onMessage: this.handleAgentMessage.bind(this),
      onStateChange: this.handleAgentsStateChange.bind(this),
    });

    // Connect both
    this.decisionsClient.connect();
    this.agentsClient.connect();
  }

  /**
   * Destroy the service, closing all connections.
   * Should be called on app unmount.
   */
  destroy(): void {
    console.log('[Realtime] Destroying');

    this.stopPollingFallback();

    if (this.decisionsClient) {
      this.decisionsClient.destroy();
      this.decisionsClient = null;
    }

    if (this.agentsClient) {
      this.agentsClient.destroy();
      this.agentsClient = null;
    }

    this.isInitialized = false;
  }

  /**
   * Get the current connection state.
   */
  getState(): RealtimeServiceState {
    return {
      isInitialized: this.isInitialized,
      decisions: this.decisionsClient?.getState() || 'offline',
      agents: this.agentsClient?.getState() || 'offline',
    };
  }

  /**
   * Check if connected to the decisions endpoint.
   */
  isConnected(): boolean {
    return this.decisionsClient?.getState() === 'online';
  }

  /**
   * Check if any endpoint is reconnecting.
   */
  isReconnecting(): boolean {
    return (
      this.decisionsClient?.getState() === 'reconnecting' ||
      this.agentsClient?.getState() === 'reconnecting'
    );
  }

  // ===========================================================================
  // Message Handlers
  // ===========================================================================

  private handleDecisionMessage(event: WebSocketEvent): void {
    if (isDecisionEvent(event) && this.onDecisionEvent) {
      this.onDecisionEvent(event);
    }
  }

  private handleAgentMessage(event: WebSocketEvent): void {
    if (isAgentEvent(event) && this.onAgentEvent) {
      this.onAgentEvent(event);
    }
  }

  // ===========================================================================
  // State Change Handlers
  // ===========================================================================

  private handleDecisionsStateChange(state: ConnectionState): void {
    console.log(`[Realtime] Decisions state: ${state}`);
    this.checkPollingNeeded();
    this.notifyStateChange();
  }

  private handleAgentsStateChange(state: ConnectionState): void {
    console.log(`[Realtime] Agents state: ${state}`);
    this.notifyStateChange();
  }

  private handleResyncNeeded(): void {
    console.log('[Realtime] Resync needed - triggering full refresh');
    if (this.onResyncNeeded) {
      this.onResyncNeeded();
    } else if (this.onPollNeeded) {
      // Fallback to poll handler for resync
      this.onPollNeeded();
    }
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }

  // ===========================================================================
  // Polling Fallback
  // ===========================================================================

  private checkPollingNeeded(): void {
    const decisionsState = this.decisionsClient?.getState() || 'offline';
    const shouldPoll = decisionsState === 'reconnecting' || decisionsState === 'offline';

    if (shouldPoll && !this.isPolling) {
      this.startPollingFallback();
    } else if (!shouldPoll && this.isPolling) {
      this.stopPollingFallback();
    }
  }

  private startPollingFallback(): void {
    if (this.pollingInterval) {
      return;
    }

    this.isPolling = true;
    console.log('[Realtime] Starting polling fallback');

    // Immediate poll
    if (this.onPollNeeded) {
      this.onPollNeeded();
    }

    // Continue polling at interval
    this.pollingInterval = setInterval(() => {
      if (this.onPollNeeded) {
        this.onPollNeeded();
      }
    }, REALTIME_CONFIG.POLL_FALLBACK_INTERVAL);
  }

  private stopPollingFallback(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isPolling = false;
      console.log('[Realtime] Stopped polling fallback');
    }
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private getWebSocketUrl(): string {
    // Convert http(s) to ws(s)
    const httpUrl = DEFAULT_CONFIG.baseUrl;
    return httpUrl.replace(/^http/, 'ws');
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Singleton instance of the realtime service.
 * Use this throughout the app for WebSocket management.
 */
export const realtimeService = new RealtimeService();
