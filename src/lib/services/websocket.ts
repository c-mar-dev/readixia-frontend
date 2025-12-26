/**
 * websocket.ts - WebSocket client for UNIT-WEBSOCKET-REALTIME
 *
 * Provides a robust WebSocket client with:
 * - Automatic reconnection with exponential backoff
 * - Ping/pong keepalive
 * - Sequence tracking for gap detection
 * - Page visibility handling (buffer events when hidden)
 *
 * Usage:
 *   const client = new WebSocketClient({
 *     url: 'ws://localhost:8000/ws/decisions',
 *     name: 'decisions',
 *     onMessage: (event) => handleEvent(event),
 *     onStateChange: (state) => updateConnectionState(state),
 *   });
 *   client.connect();
 */

import { REALTIME_CONFIG } from '$lib/stores/config';
import type { ConnectionState } from '$lib/api/types';
import type { WebSocketEvent } from '$lib/stores/types';

// =============================================================================
// Types
// =============================================================================

export interface WebSocketClientOptions {
  /** WebSocket URL to connect to */
  url: string;
  /** Human-readable name for logging (e.g., 'decisions', 'agents') */
  name: string;
  /** Callback when a message is received */
  onMessage: (event: WebSocketEvent) => void;
  /** Callback when connection state changes */
  onStateChange: (state: ConnectionState) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Callback when resync is needed (sequence gap detected) */
  onResyncNeeded?: (lastSeq: number) => void;
}

// =============================================================================
// WebSocketClient Class
// =============================================================================

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private state: ConnectionState = 'offline';
  private lastProcessedSeq: number = 0;
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private isPageVisible: boolean = true;
  private eventBuffer: WebSocketEvent[] = [];
  private pendingResync: boolean = false;
  private isDestroyed: boolean = false;

  constructor(private readonly options: WebSocketClientOptions) {
    // Set up visibility listener if in browser
    if (typeof document !== 'undefined') {
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.isPageVisible = document.visibilityState === 'visible';
    }
  }

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Establish WebSocket connection.
   */
  connect(): void {
    if (this.isDestroyed) {
      console.warn(`[${this.options.name}] Client destroyed, cannot connect`);
      return;
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log(`[${this.options.name}] Already connected`);
      return;
    }

    // Clean up any existing socket
    this.cleanupSocket();

    console.log(`[${this.options.name}] Connecting to ${this.options.url}`);
    this.setState('offline'); // Will transition to online on successful connect

    try {
      this.socket = new WebSocket(this.options.url);
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error(`[${this.options.name}] Failed to create WebSocket:`, error);
      this.scheduleReconnect();
    }
  }

  /**
   * Gracefully disconnect and stop reconnection attempts.
   */
  disconnect(): void {
    console.log(`[${this.options.name}] Disconnecting`);
    this.cancelReconnect();
    this.stopPingInterval();
    this.cleanupSocket();
    this.setState('offline');
  }

  /**
   * Destroy the client, removing all listeners.
   */
  destroy(): void {
    this.isDestroyed = true;
    this.disconnect();

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  /**
   * Get the current connection state.
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get the last processed sequence number.
   */
  getLastSeq(): number {
    return this.lastProcessedSeq;
  }

  /**
   * Get the number of reconnection attempts.
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  private handleOpen(): void {
    console.log(`[${this.options.name}] Connected`);

    this.reconnectAttempts = 0;
    this.setState('online');
    this.startPingInterval();

    // If we have a previous sequence, check if we need to resync
    if (this.lastProcessedSeq > 0 && this.options.onResyncNeeded) {
      console.log(`[${this.options.name}] Reconnected with seq=${this.lastProcessedSeq}, requesting resync`);
      this.options.onResyncNeeded(this.lastProcessedSeq);
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as WebSocketEvent;

      // Handle pong
      if (data.type === 'pong') {
        this.handlePong();
        return;
      }

      // Track sequence numbers for gap detection
      if ('seq' in data && typeof data.seq === 'number') {
        if (this.lastProcessedSeq > 0 && data.seq > this.lastProcessedSeq + 1) {
          console.warn(
            `[${this.options.name}] Sequence gap detected: ${this.lastProcessedSeq} -> ${data.seq}`
          );
          this.requestResync();
        }
        this.lastProcessedSeq = data.seq;
      }

      // Process or buffer based on visibility
      if (this.isPageVisible) {
        this.options.onMessage(data);
      } else {
        this.bufferEvent(data);
      }
    } catch (error) {
      console.error(`[${this.options.name}] Failed to parse message:`, error, event.data);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log(
      `[${this.options.name}] Connection closed: code=${event.code}, reason=${event.reason || 'none'}, clean=${event.wasClean}`
    );

    this.stopPingInterval();
    this.cleanupSocket();

    // Determine if we should reconnect
    // Clean close with code 1000 = intentional disconnect, don't reconnect
    const shouldReconnect = !this.isDestroyed && (event.code !== 1000 || !event.wasClean);

    if (shouldReconnect) {
      this.scheduleReconnect();
    } else {
      this.setState('offline');
    }
  }

  private handleError(event: Event): void {
    console.error(`[${this.options.name}] WebSocket error:`, event);

    if (this.options.onError) {
      this.options.onError(new Error('WebSocket connection error'));
    }

    // Note: onclose will fire after onerror, which will handle reconnection
  }

  // ===========================================================================
  // Reconnection Logic
  // ===========================================================================

  private scheduleReconnect(): void {
    if (this.isDestroyed || this.reconnectTimer) {
      return;
    }

    this.setState('reconnecting');

    const delay = this.getReconnectDelay();
    this.reconnectAttempts++;

    console.log(
      `[${this.options.name}] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private getReconnectDelay(): number {
    const {
      INITIAL_RECONNECT_DELAY,
      MAX_RECONNECT_DELAY,
    } = REALTIME_CONFIG;

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
    const exponentialDelay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_DELAY
    );

    // Add jitter: +/- 10%
    const jitter = exponentialDelay * (0.9 + Math.random() * 0.2);

    return Math.floor(jitter);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ===========================================================================
  // Ping/Pong Keepalive
  // ===========================================================================

  private startPingInterval(): void {
    this.stopPingInterval();

    this.pingTimer = setInterval(() => {
      this.sendPing();
    }, REALTIME_CONFIG.PING_INTERVAL);
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  private sendPing(): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.socket.send(JSON.stringify({ type: 'ping' }));

      // Set timeout for pong response
      this.pongTimeoutTimer = setTimeout(() => {
        console.warn(`[${this.options.name}] Pong timeout - connection may be dead`);
        this.socket?.close(4000, 'Pong timeout');
      }, REALTIME_CONFIG.PONG_TIMEOUT);
    } catch (error) {
      console.error(`[${this.options.name}] Failed to send ping:`, error);
    }
  }

  private handlePong(): void {
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  // ===========================================================================
  // Visibility Handling
  // ===========================================================================

  private handleVisibilityChange(): void {
    const wasVisible = this.isPageVisible;
    this.isPageVisible = document.visibilityState === 'visible';

    if (!wasVisible && this.isPageVisible) {
      // Tab became visible - flush buffered events
      this.resumeProcessing();
    }
    // When tab becomes hidden, we keep processing but buffer new events
    // (handled in handleMessage)
  }

  private bufferEvent(event: WebSocketEvent): void {
    // Limit buffer size to prevent memory issues
    if (this.eventBuffer.length >= REALTIME_CONFIG.MAX_EVENT_BUFFER) {
      // Drop oldest event
      this.eventBuffer.shift();
      console.warn(`[${this.options.name}] Event buffer full, dropping oldest event`);
    }
    this.eventBuffer.push(event);
  }

  private resumeProcessing(): void {
    console.log(`[${this.options.name}] Resuming - flushing ${this.eventBuffer.length} buffered events`);

    // Flush buffered events in order
    while (this.eventBuffer.length > 0) {
      const event = this.eventBuffer.shift()!;
      this.options.onMessage(event);
    }
  }

  // ===========================================================================
  // Sequence Tracking
  // ===========================================================================

  private requestResync(): void {
    if (this.pendingResync) {
      return;
    }

    this.pendingResync = true;

    // Request full refresh from API
    if (this.options.onResyncNeeded) {
      this.options.onResyncNeeded(this.lastProcessedSeq);
    }

    // Reset flag after a delay to allow resync
    setTimeout(() => {
      this.pendingResync = false;
    }, 5000);
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.options.onStateChange(state);
    }
  }

  private cleanupSocket(): void {
    if (this.socket) {
      // Remove listeners to prevent callbacks after cleanup
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;

      // Close if still open
      if (this.socket.readyState === WebSocket.OPEN ||
          this.socket.readyState === WebSocket.CONNECTING) {
        try {
          this.socket.close(1000, 'Client cleanup');
        } catch {
          // Ignore close errors
        }
      }

      this.socket = null;
    }
  }
}
