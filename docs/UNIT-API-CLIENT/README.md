# API Client Foundation

A TypeScript API client for the Decision Engine, providing type-safe HTTP communication with automatic retry logic, response transformation, and connection status monitoring.

## Installation

The API client is included in the frontend package. No additional installation required.

Ensure `.env` file exists with:
```bash
PUBLIC_API_URL=http://localhost:8000
```

## Usage

### Basic Usage

```typescript
import { decisionsApi } from '$lib/api';
import type { UiDecision } from '$lib/api';

// List all pending decisions
const decisions: UiDecision[] = await decisionsApi.list({ status: 'pending' });

// Get a single decision
const decision = await decisionsApi.get('dec-123');

// Resolve a decision
const result = await decisionsApi.resolve('dec-123', {
  resolution: { action: 'approve', notes: 'Looks good' },
  resolved_by: 'user@example.com'
});

// Handle chained decisions (e.g., triage → specify)
if (result.chainedDecisions.length > 0) {
  console.log('Next decision:', result.chainedDecisions[0]);
}
```

### Connection Status

```svelte
<script>
  import { connectionStore, isOnline, isOffline, hasError } from '$lib/stores/connection';

  // Check health on mount
  import { onMount } from 'svelte';
  onMount(() => {
    connectionStore.checkHealth();
  });
</script>

{#if $isOffline}
  <div class="warning">No network connection</div>
{:else if $hasError}
  <div class="error">API Error: {$connectionStore.error?.message}</div>
{:else if $isOnline}
  <div class="success">Connected</div>
{/if}
```

### Error Handling

```typescript
import { decisionsApi } from '$lib/api';
import type { ApiError } from '$lib/api';

try {
  await decisionsApi.resolve('dec-123', { resolution: {} });
} catch (error) {
  const apiError = error as ApiError;

  switch (apiError.code) {
    case 'DE-DEC-001':
      console.error('Decision not found');
      break;
    case 'DE-DEC-002':
      console.error('Already resolved');
      break;
    case 'NETWORK_ERROR':
      console.error('Network unavailable');
      break;
    case 'TIMEOUT':
      console.error('Request timed out');
      break;
    default:
      console.error(apiError.message);
  }
}
```

### Custom Timeout

```typescript
// Per-request timeout
const decisions = await decisionsApi.list({}, { timeout: 5000 }); // 5 seconds

// Or create a client with different defaults
import { ApiClient } from '$lib/api';

const fastClient = new ApiClient({
  timeout: 10000,      // 10 second timeout
  retryAttempts: 1,    // Only 1 retry
});
```

---

## API Reference

### decisionsApi

The main API client for decision operations.

#### `list(params?, options?): Promise<UiDecision[]>`

Fetch decisions with optional filters.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `params.type` | string | - | Filter by decision type (e.g., 'triage', 'specify') |
| `params.status` | string | - | Filter by status ('pending', 'resolved', etc.) |
| `params.limit` | number | - | Maximum number of decisions to return |
| `options.timeout` | number | 30000 | Request timeout in milliseconds |
| `options.signal` | AbortSignal | - | Abort signal for cancellation |

#### `get(decisionId, options?): Promise<UiDecision>`

Fetch a single decision by ID.

**Throws:** `ApiError` with code `DE-DEC-001` if not found.

#### `resolve(decisionId, request, options?): Promise<ResolutionResult>`

Resolve a decision.

| Parameter | Type | Description |
|-----------|------|-------------|
| `request.resolution` | object | Resolution data (required) |
| `request.resolved_by` | string | Who resolved it (optional) |

**Returns:**
```typescript
{
  decision: UiDecision;           // The resolved decision
  chainedDecisions: UiDecision[]; // Any triggered follow-up decisions
  undoAvailable: boolean;         // Can this be undone?
  undoExpiresAt: Date | null;     // When undo expires (5 min window)
  actionId: string | null;        // Action ID for undo
}
```

**Throws:** `ApiError` with code `DE-DEC-002` if already resolved.

#### `defer(decisionId, request, options?): Promise<DeferResult>`

Defer a decision to a later time.

| Parameter | Type | Description |
|-----------|------|-------------|
| `request.until` | string | ISO 8601 datetime when to resurface |
| `request.reason` | string | Reason for deferral (optional) |

**Returns:**
```typescript
{
  decision: UiDecision;
  deferCount: number;         // Total times deferred
  deferUntil: Date;           // When it will resurface
  remainingDeferrals: number; // How many more deferrals allowed (max 5)
}
```

**Throws:** `ApiError` with code `DE-DEC-004` if deferral limit exceeded.

#### `undo(decisionId, options?): Promise<UndoResult>`

Undo a recently resolved decision. Only available within 5 minutes of resolution.

**Returns:**
```typescript
{
  decision: UiDecision;
  restoredStatus: string;
  sideEffectsReverted: string[];
}
```

**Throws:** `ApiError` with code `DE-DEC-005` if undo window expired.

---

### connectionStore

Svelte store tracking API connection status.

#### Methods

| Method | Description |
|--------|-------------|
| `setOnline()` | Set state to online, clear error |
| `setOffline()` | Set state to offline |
| `setError(error)` | Set state to error with details |
| `checkHealth()` | Ping API and update state |
| `reset()` | Reset to initial state |

#### Derived Stores

| Store | Type | Description |
|-------|------|-------------|
| `isOnline` | boolean | True when connected |
| `isOffline` | boolean | True when network unavailable |
| `hasError` | boolean | True when API error occurred |
| `connectionError` | ApiError \| null | Current error details |

---

### Types

#### UiDecision

The transformed decision format used by UI components.

```typescript
interface UiDecision {
  id: string;
  decisionType: string;        // 'triage', 'specify', 'review', etc.
  status: UiStatus;            // 'pending', 'completed', 'deferred', etc.
  subject: UiSubject;
  project: string | null;
  priority: Priority;          // 'critical', 'high', 'normal', 'low'
  question: string;
  created: string;             // Relative time: "2m ago"
  clarificationQuestions?: ClarificationQuestion[];
  data: Record<string, unknown>;
  canUndo?: boolean;
  actionId?: string | null;
}
```

#### ApiError

Normalized error format.

```typescript
interface ApiError {
  code: string;      // 'DE-DEC-001', 'NETWORK_ERROR', 'TIMEOUT', etc.
  message: string;   // Human-readable message
  details?: object;  // Additional context
}
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PUBLIC_API_URL` | `http://localhost:8000` | Decision Engine base URL |

### Client Defaults

| Setting | Default | Description |
|---------|---------|-------------|
| `timeout` | 30000 | Request timeout in milliseconds |
| `retryAttempts` | 3 | Max retry attempts for transient failures |
| `retryDelay` | 1000 | Base delay between retries (multiplied by attempt) |

### Retryable Errors

The client automatically retries on:
- HTTP 502 (Bad Gateway)
- HTTP 503 (Service Unavailable)
- HTTP 504 (Gateway Timeout)
- Network errors (connection refused, DNS failure)

Not retried:
- HTTP 4xx errors (client errors)
- Timeouts (user may want to cancel)

---

## Testing

### Running Type Check

```bash
cd frontend
npx svelte-check
```

### Manual Integration Test

1. Start the Decision Engine:
   ```bash
   cd engine
   uvicorn main:app --reload
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open browser console and test:
   ```javascript
   import { decisionsApi } from '$lib/api';
   const decisions = await decisionsApi.list();
   console.log(decisions);
   ```

### Recommended Test Setup

For automated tests, use Vitest with MSW (Mock Service Worker):

```typescript
// tests/api/decisions.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { decisionsApi } from '$lib/api';

const server = setupServer(
  http.get('http://localhost:8000/api/decisions/', () => {
    return HttpResponse.json([
      { id: 'dec-1', type: 'triage', status: 'pending', /* ... */ }
    ]);
  })
);

beforeAll(() => server.listen());
afterAll(() => server.close());

describe('decisionsApi', () => {
  it('lists decisions', async () => {
    const decisions = await decisionsApi.list();
    expect(decisions).toHaveLength(1);
    expect(decisions[0].decisionType).toBe('triage');
  });
});
```

---

## Troubleshooting

### "Network connection failed" Error

1. Verify the Engine is running: `curl http://localhost:8000/api/health`
2. Check `PUBLIC_API_URL` in `.env` matches Engine URL
3. Check browser console for CORS errors

### CORS Errors

If you see CORS errors in the browser console, the Engine needs CORS middleware:

```python
# engine/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### TypeScript Errors

If imports fail, ensure SvelteKit is configured for TypeScript:

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-auto';

export default {
  kit: { adapter: adapter() }
};
```

---

## Changelog

### 1.0.0 (Initial Release)

- Base HTTP client with retry logic
- Decision API methods (list, get, resolve, defer, undo)
- Response transformation (API → UI format)
- Connection status store
- TypeScript interfaces for all types
