/**
 * client.ts - Base HTTP client for UNIT-API-CLIENT
 *
 * Provides a reusable fetch wrapper with retry logic, timeout handling,
 * and error normalization. Used by decisionsApi for all HTTP operations.
 * Used by downstream units: decisions.ts, connection.ts
 *
 * Exports:
 *   - ApiClient: Configurable HTTP client class
 *   - apiClient: Singleton instance with default config
 *
 * Usage:
 *   import { apiClient } from '$lib/api';
 *
 *   // Simple GET
 *   const data = await apiClient.get<MyType>('/api/endpoint');
 *
 *   // POST with body
 *   const result = await apiClient.post<Result>('/api/action', { key: 'value' });
 *
 *   // Custom timeout
 *   const fast = await apiClient.get<Data>('/api/data', { timeout: 5000 });
 *
 * Features:
 *   - Automatic retry on 502, 503, 504 (up to 3 attempts)
 *   - Exponential backoff between retries
 *   - 30s default timeout (configurable)
 *   - All errors normalized to ApiError format
 *   - Request/response logging in development mode
 */

import { DEFAULT_CONFIG, isDev, isRetryableStatus } from './config';
import type { ApiConfig, ApiError, ApiErrorResponse, RequestOptions } from './types';

/**
 * HTTP client with retry logic and error handling.
 *
 * @example
 * const client = new ApiClient();
 * const decisions = await client.get<ApiDecision[]>('/api/decisions/');
 */
export class ApiClient {
  private config: ApiConfig;

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Make an HTTP request with retry logic.
   *
   * @param method - HTTP method
   * @param path - API path (will be appended to baseUrl)
   * @param body - Request body (will be JSON stringified)
   * @param options - Per-request options (timeout, signal)
   * @returns Parsed JSON response
   * @throws ApiError on failure
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const timeout = options.timeout ?? this.config.timeout;

    let lastError: ApiError | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await this.executeRequest<T>(
          method,
          url,
          body,
          timeout,
          options.signal
        );
        return result;
      } catch (error) {
        lastError = this.normalizeError(error);

        if (!this.isRetryable(error, attempt)) {
          throw lastError;
        }

        if (isDev()) {
          console.warn(
            `[API] Retry ${attempt}/${this.config.retryAttempts} for ${method} ${path}:`,
            lastError.message
          );
        }

        // Exponential backoff
        await this.delay(this.config.retryDelay * attempt);
      }
    }

    throw lastError ?? { code: 'UNKNOWN', message: 'Request failed' };
  }

  /**
   * Execute a single HTTP request.
   */
  private async executeRequest<T>(
    method: string,
    url: string,
    body: unknown,
    timeout: number,
    externalSignal?: AbortSignal
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine external signal with timeout
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort());
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (isDev()) {
      console.log(`[API] ${method} ${url}`, body ? JSON.stringify(body) : '');
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await this.parseErrorResponse(response);
        throw errorBody;
      }

      // Handle empty responses (204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      const data = (await response.json()) as T;

      if (isDev()) {
        console.log(`[API] Response:`, data);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Parse error response body into ApiError.
   */
  private async parseErrorResponse(response: Response): Promise<ApiError> {
    try {
      const body = (await response.json()) as ApiErrorResponse;
      if (body.error) {
        return body.error;
      }
      // Handle non-standard error format
      return {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'Request failed',
      };
    } catch {
      // JSON parsing failed
      return {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'Request failed',
      };
    }
  }

  /**
   * Normalize any error to ApiError format.
   */
  private normalizeError(error: unknown): ApiError {
    // Already an ApiError
    if (this.isApiError(error)) {
      return error;
    }

    // Timeout (AbortError)
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { code: 'TIMEOUT', message: 'Request timed out' };
    }

    // Network error (TypeError from fetch)
    if (error instanceof TypeError) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed. Is the API server running?',
      };
    }

    // Unknown error
    return {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  /**
   * Type guard for ApiError.
   */
  private isApiError(error: unknown): error is ApiError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      typeof (error as ApiError).code === 'string' &&
      typeof (error as ApiError).message === 'string'
    );
  }

  /**
   * Check if an error should trigger a retry.
   */
  private isRetryable(error: unknown, attempt: number): boolean {
    // Don't retry if we've exhausted attempts
    if (attempt >= this.config.retryAttempts) {
      return false;
    }

    // Check for API error with retryable status
    if (this.isApiError(error)) {
      const statusMatch = error.code.match(/^HTTP_(\d+)$/);
      if (statusMatch) {
        return isRetryableStatus(parseInt(statusMatch[1], 10));
      }
    }

    // Network errors are retryable
    if (error instanceof TypeError) {
      return true;
    }

    // Timeouts are not retryable (user may want to cancel)
    if (error instanceof DOMException && error.name === 'AbortError') {
      return false;
    }

    return false;
  }

  /**
   * Delay for specified milliseconds.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // =========================================================================
  // Convenience Methods
  // =========================================================================

  /**
   * Make a GET request.
   */
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * Make a POST request.
   */
  post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  /**
   * Make a PUT request.
   */
  put<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }

  /**
   * Make a DELETE request.
   */
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }
}

/** Singleton instance for general use */
export const apiClient = new ApiClient();
