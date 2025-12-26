# UNIT-14-AGENT-LOGGING Implementation Notes

## Summary

Created a full execution logs viewer UI that consumes the Engine's `/api/logs/` endpoints. Users can browse, filter, and view detailed execution logs including full prompts, responses, and event timelines. Added navigation link and "View Full Logs" link from AgentCard components.

## Decisions Made

### Decision 1: Dedicated /logs Route

**Context:** Needed to decide where to surface execution logs UI.

**Options Considered:**
1. Modal overlay on /agents page
2. Sidebar panel on /agents page
3. Dedicated /logs route

**Chosen:** Option 3 - Dedicated route

**Rationale:** Execution logs can be large and require full-screen space for readability. Dedicated route allows bookmarking and deep-linking.

**Downstream Impact:** Added new route to navigation. AgentCard links to /logs with agent filter.

### Decision 2: Plain JavaScript in Svelte Files

**Context:** Project uses Svelte 4 which has limited TypeScript support in `.svelte` files.

**Options Considered:**
1. Use `<script lang="ts">` with type annotations
2. Use plain JavaScript with JSDoc comments
3. Use plain JavaScript without types

**Chosen:** Option 3 - Plain JavaScript

**Rationale:** Existing route files don't use TypeScript. Consistency with codebase. Types are handled in `.ts` files (API client, stores).

**Downstream Impact:** Less type safety in route components, but matches project conventions.

### Decision 3: Expand/Collapse for Large Content

**Context:** Prompts and responses can be very large (1MB+).

**Options Considered:**
1. Always show full content
2. Truncate with "show more" button
3. Collapsible sections, collapsed by default

**Chosen:** Option 3 - Collapsible sections

**Rationale:** Initial page load is fast. Users can expand what they need. Good UX for scanning multiple logs.

**Downstream Impact:** Users need to click to see full content.

### Decision 4: Client-Side Filtering

**Context:** How to implement log filtering.

**Options Considered:**
1. Server-side only (new request per filter change)
2. Client-side with full dataset
3. Hybrid - server filters, client refines

**Chosen:** Option 1 - Server-side filtering

**Rationale:** Log datasets can be very large. Engine already supports filtering. Keeps client memory usage reasonable.

**Downstream Impact:** Each filter change triggers API request. Added debounce consideration for future.

## Deviations from Spec

None - implementation matches spec exactly.

## Known Limitations

- No search within prompt/response content (would need Engine support)
- No log export (CSV, JSON download)
- No log deletion/cleanup from UI
- No comparison view between two logs
- Large event timelines may need virtual scrolling

## Open Questions

- [ ] Should we add syntax highlighting for prompts/responses?
- [ ] Should log detail pages show related logs (same session/decision)?
- [ ] Is there value in a real-time log streaming view?

## Test Coverage

- E2E tests in `tests/e2e/logs.spec.ts`
- Covers: List loading, filtering, detail view, navigation
- Not covered: Error states, pagination edge cases

## Dependencies Used

| Dependency | Version | Why |
|------------|---------|-----|
| None new   | -       | Uses existing stores/API infrastructure |

## Files Delivered

| File | Description |
|------|-------------|
| `src/lib/api/logs.ts` | Logs API client with types and methods |
| `src/lib/stores/logs.ts` | Logs store with pagination, filtering, detail loading |
| `src/routes/logs/+page.svelte` | Log list page with filters |
| `src/routes/logs/[id]/+page.svelte` | Log detail page with prompt/response/events |
| `src/lib/components/AgentCard.svelte` | Added "View Full Logs" link |
| `src/routes/+page.svelte` | Added "Logs" navigation link |
