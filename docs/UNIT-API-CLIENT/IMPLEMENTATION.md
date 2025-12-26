# UNIT-API-CLIENT Implementation Notes

## Summary

This unit implements a TypeScript API client service layer for the SvelteKit frontend that handles all communication with the Decision Engine (FastAPI). It provides a reusable HTTP client with retry logic, type-safe interfaces, response transformation from API format to UI format, and connection status monitoring via Svelte stores.

## Decisions Made

### Decision 1: TypeScript Over JavaScript

**Context:** The existing frontend codebase is pure JavaScript/Svelte with no TypeScript files. The spec suggested TypeScript for the API layer.

**Options Considered:**
1. Keep JavaScript with JSDoc type annotations for consistency
2. Introduce TypeScript for the API layer only

**Chosen:** Option 2 - TypeScript for API layer

**Rationale:** The user explicitly confirmed TypeScript was preferred. The API layer benefits most from static typing due to complex response shapes and transformation logic. SvelteKit has native TypeScript support, making integration seamless.

**Downstream Impact:** Other units consuming the API client will have full IntelliSense support. Existing JavaScript components can import from the API module without modification.

---

### Decision 2: Priority Value Passthrough

**Context:** The frontend mock data used 'urgent' priority while the Engine uses 'critical'. A mapping was needed.

**Options Considered:**
1. Map 'critical' ↔ 'urgent' bidirectionally in transforms
2. Adopt 'critical' in the UI, update existing mock data

**Chosen:** Option 2 - Adopt 'critical' in UI

**Rationale:** User explicitly confirmed this approach. Using consistent terminology reduces cognitive load and eliminates potential mapping bugs. The frontend mock data will need updating in a separate pass.

**Downstream Impact:** `DecisionCard.svelte` and filter logic will need to use 'critical' instead of 'urgent' once mock data is replaced with real API data.

---

### Decision 3: Field Extraction from Data Object

**Context:** The API response has `project`, `question`, and `subject.source` nested inside the `data` JSON blob, but the UI expects them as top-level fields.

**Options Considered:**
1. Modify the Engine API to return these as top-level fields
2. Extract these fields in the frontend transformation layer
3. Keep them nested and update all UI components

**Chosen:** Option 2 - Frontend transformation layer extraction

**Rationale:** User confirmed fields should be extracted from `data`. This keeps the Engine API clean and allows the frontend to adapt to any backend structure. The transformation layer provides a clear boundary.

**Downstream Impact:** If the Engine changes the location of these fields within `data`, only `transforms.ts` needs updating.

---

### Decision 4: Singleton API Client

**Context:** The HTTP client could be instantiated per-request or as a singleton.

**Options Considered:**
1. Export class only, require instantiation
2. Export both class and a singleton instance

**Chosen:** Option 2 - Export both

**Rationale:** A singleton (`apiClient`) covers 99% of use cases and simplifies imports. Exporting the class (`ApiClient`) allows custom configuration for edge cases (different timeout, different base URL for testing).

**Downstream Impact:** Most consumers import `apiClient` directly. Test utilities can create custom instances.

---

### Decision 5: Connection Store Health Check Endpoint

**Context:** The spec mentioned connection status tracking but didn't specify which endpoint to use for health checks.

**Options Considered:**
1. Use `GET /api/health` dedicated endpoint
2. Use `GET /api/decisions/?limit=1` as a lightweight probe
3. Use `HEAD` request to base URL

**Chosen:** Option 1 - Use `/api/health`

**Rationale:** A dedicated health endpoint is the standard pattern. If the endpoint doesn't exist, the health check will fail gracefully and set error state. This can be updated once the Engine's health endpoint is confirmed.

**Downstream Impact:** If Engine doesn't have `/api/health`, either add it to Engine or update `connection.ts` to use an alternative endpoint.

---

### Decision 6: Exponential Backoff for Retries

**Context:** The spec required retry logic but didn't specify the backoff strategy.

**Options Considered:**
1. Fixed delay between retries
2. Exponential backoff (delay × attempt number)
3. Exponential backoff with jitter

**Chosen:** Option 2 - Simple exponential backoff

**Rationale:** Exponential backoff prevents overwhelming a recovering server. Jitter was omitted for simplicity since this is a single-user system where thundering herd isn't a concern.

**Downstream Impact:** None - internal implementation detail.

---

## Deviations from Spec

### Deviation 1: No PUT/DELETE Usage in Decision API

**Spec Said:** Base client should handle GET, POST, PUT, DELETE.

**Implementation Does:** Client implements all four methods, but `decisionsApi` only uses GET and POST (matching the Engine's actual endpoints).

**Reason:** The Engine API doesn't have PUT or DELETE endpoints for decisions. The client methods are available for future use.

**Severity:** Minor - no functional impact, methods available when needed.

---

### Deviation 2: Health Check Uses GET Instead of Dedicated Method

**Spec Said:** Connection status store tracks online/offline/error states.

**Implementation Does:** Uses `fetch` directly in `checkHealth()` instead of the `apiClient`.

**Reason:** The health check needs a short timeout (5s) independent of the main client's 30s timeout, and shouldn't trigger retry logic. Using raw fetch keeps it simple.

**Severity:** Minor - more appropriate for the use case.

---

## Known Limitations

1. **No Request Deduplication**: Multiple components calling `decisionsApi.list()` simultaneously will make separate HTTP requests. A caching layer or request deduplication would optimize this.

2. **Relative Time Drift**: The `created` field (e.g., "2m ago") is computed at transformation time. Long-lived decision objects will show stale times. Components should re-fetch or re-transform periodically.

3. **No WebSocket Support**: This unit covers REST API only. Real-time updates via WebSocket are a separate unit.

4. **No Request Cancellation on Navigation**: If a user navigates away mid-request, the request completes in the background. Adding automatic cancellation on route change would be an enhancement.

5. **No Offline Queue**: When offline, requests fail immediately. Queuing requests for later retry is not implemented.

6. **Health Check Endpoint Assumption**: The `checkHealth()` method assumes `/api/health` exists. If the Engine doesn't provide this endpoint, it will always report an error state.

---

## Open Questions

- [ ] **Health Endpoint**: Confirm the Engine has `GET /api/health` or update to use alternative endpoint
- [ ] **CORS Configuration**: Verify the Engine allows requests from `localhost:5173` during development
- [ ] **Error Code Standardization**: Confirm all Engine error codes follow the `DE-DEC-XXX` pattern documented in the stub

---

## Test Coverage

No automated tests were written in this unit. Testing strategy should include:

- **Transform Tests**: Unit tests for `formatRelativeTime`, `mapStatus`, `transformDecision`
- **Client Tests**: Integration tests with mocked fetch for retry logic, timeout handling
- **Store Tests**: Svelte store tests for connection state transitions

**Recommended Test Framework**: Vitest (SvelteKit's recommended test runner)

**Uncovered Areas**:
- All files - manual verification only (svelte-check passes with 0 errors)
- Integration tests require Engine running or MSW (Mock Service Worker) setup

---

## Dependencies Used

| Dependency | Version | Why |
|------------|---------|-----|
| svelte/store | (bundled) | Writable/derived stores for connection status |
| $env/static/public | (SvelteKit) | Access PUBLIC_API_URL environment variable |

No new npm dependencies were added. All functionality uses browser-native `fetch` and SvelteKit's built-in environment variable handling.

---

## Files Delivered

| File | Description |
|------|-------------|
| `src/lib/api/types.ts` | TypeScript interfaces for API responses, UI types, requests, and configuration |
| `src/lib/api/config.ts` | Default configuration, environment variable access, retry settings |
| `src/lib/api/client.ts` | Generic HTTP client with retry logic, timeout handling, error normalization |
| `src/lib/api/transforms.ts` | Functions to transform API responses to UI format |
| `src/lib/api/decisions.ts` | Decision-specific API methods (list, get, resolve, defer, undo) |
| `src/lib/api/index.ts` | Public re-exports for clean imports |
| `src/lib/stores/connection.ts` | Svelte store for tracking API connection status |
| `.env` | Environment variable file with `PUBLIC_API_URL` |
| `docs/UNIT-API-CLIENT/IMPLEMENTATION.md` | This file |
| `docs/UNIT-API-CLIENT/README.md` | Usage documentation and API reference |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend Components                          │
│  (+page.svelte, DecisionCard.svelte, etc.)                         │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                    imports { decisionsApi, UiDecision }
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      src/lib/api/index.ts                           │
│                      (Public API Exports)                           │
└─────────────────────────────────────────────────────────────────────┘
           │                      │                      │
           ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│  decisions.ts    │  │  transforms.ts   │  │  client.ts           │
│  - list()        │  │  - transformDec  │  │  - get/post/put/del  │
│  - get()         │──│  - formatTime    │  │  - retry logic       │
│  - resolve()     │  │  - mapStatus     │  │  - timeout handling  │
│  - defer()       │  └──────────────────┘  │  - error normalize   │
│  - undo()        │                        └──────────────────────┘
└──────────────────┘                                   │
                                                       │
                                          uses fetch() │
                                                       ▼
                                         ┌──────────────────────┐
                                         │  Decision Engine     │
                                         │  (FastAPI @ :8000)   │
                                         └──────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   src/lib/stores/connection.ts                      │
│  - connectionStore (writable)                                       │
│  - isOnline, isOffline, hasError (derived)                         │
└─────────────────────────────────────────────────────────────────────┘
```
