/**
 * config.ts - Configuration constants for decision stores
 *
 * Provides tunable constants for store behavior.
 * Adjust these values based on system scale and performance needs.
 *
 * Usage:
 *   import { STORE_CONFIG } from '$lib/stores/config';
 *
 *   if (decisions.length > STORE_CONFIG.MAX_DECISIONS) {
 *     // Trigger windowing
 *   }
 */

/**
 * Store configuration constants.
 * Per CLAUDE.md: System is single-user with < 1000 active tasks.
 */
/**
 * Realtime (WebSocket) configuration constants.
 * Used by WebSocketClient and RealtimeService.
 */
export const REALTIME_CONFIG = {
  /** Initial reconnection delay in ms */
  INITIAL_RECONNECT_DELAY: 1000,

  /** Maximum reconnection delay in ms (cap for exponential backoff) */
  MAX_RECONNECT_DELAY: 30000,

  /** Ping interval in ms (client sends ping to server) */
  PING_INTERVAL: 30000,

  /** Pong timeout in ms (close connection if no pong received) */
  PONG_TIMEOUT: 5000,

  /** Polling fallback interval in ms (used when WebSocket disconnected) */
  POLL_FALLBACK_INTERVAL: 5000,

  /** Maximum events to buffer when page is hidden */
  MAX_EVENT_BUFFER: 100,

  /** Maximum notifications to keep in store */
  MAX_NOTIFICATIONS: 10,
} as const;

export type RealtimeConfig = typeof REALTIME_CONFIG;

export const STORE_CONFIG = {
  /**
   * Maximum number of decisions to keep in memory.
   * Oldest decisions are evicted when this limit is exceeded.
   * Default: 500 (generous for < 1000 task system)
   */
  MAX_DECISIONS: 500,

  /**
   * Polling interval in milliseconds for refreshing decisions.
   * Lower values = more responsive, higher API load.
   * Default: 30 seconds
   */
  POLL_INTERVAL_MS: 30_000,

  /**
   * Undo window duration in milliseconds.
   * After this time, undo is no longer available.
   * Default: 5 minutes (matches Engine's undo_expires_at)
   */
  UNDO_WINDOW_MS: 300_000,

  /**
   * Debounce delay for search input in milliseconds.
   * Prevents excessive filtering during rapid typing.
   * Default: 300ms
   */
  SEARCH_DEBOUNCE_MS: 300,

  /**
   * Initial page size when loading decisions.
   * Used for API pagination if implemented.
   * Default: 100
   */
  PAGE_SIZE: 100,
} as const;

/**
 * Type for STORE_CONFIG to allow type-safe access.
 */
export type StoreConfig = typeof STORE_CONFIG;
