# UNIT-9-SETTINGS Implementation Notes

## Summary

**Phase 1 (Initial):** Implemented a comprehensive 6-tab settings page with real API endpoints for models, overseer, and auto-archive, plus local stubs for proposed features.

**Phase 2 (Completion):** Removed all stubs and connected to real Engine API endpoints. The Engine now provides all configuration endpoints including general, agents, API status, and costs. The settings page is now fully integrated with live data.

## Decisions Made

### Decision 1: Hybrid Real/Stub API Architecture

**Context:** The spec required integrating with 3 existing Engine endpoints, but user feedback expanded scope to 6 configuration sections. 4 of the proposed endpoints don't exist in the Engine yet.

**Options Considered:**
1. Only implement existing endpoints, leave other tabs empty
2. Implement full UI with local stubs for missing endpoints
3. Wait for Engine team to implement all endpoints first

**Chosen:** Option 2 - Full UI with local stubs

**Rationale:**
- Enables parallel development between frontend and Engine teams
- Provides complete UX for user testing and feedback
- Stubs are clearly marked with TODO comments for easy migration
- LocalStorage fallback ensures some persistence for stubbed features

**Downstream Impact:** Engine team must implement 4 new endpoints (`/api/config/general`, `/api/config/api`, `/api/config/agents`, `/api/config/costs`). Specification provided in `docs/ENGINE-CONFIG-API-SPEC.md`.

---

### Decision 2: Per-Section Loading States

**Context:** Settings page has 7 configuration sections that load independently. Need to provide responsive feedback.

**Options Considered:**
1. Single global loading state for entire page
2. Per-section loading states
3. Lazy load sections on tab switch

**Chosen:** Option 2 - Per-section loading states

**Rationale:**
- Users see content faster (sections load in parallel)
- Failed sections don't block successful ones
- More granular error handling
- Follows pattern from existing `decisionsStore`

**Downstream Impact:** Store structure includes `loading: { general: boolean, models: boolean, ... }` object rather than single boolean.

---

### Decision 3: Auto-Save on Change for Simple Controls

**Context:** Need to decide when to persist settings changes to the server.

**Options Considered:**
1. Explicit "Save" button for all changes
2. Auto-save on blur for all fields
3. Hybrid: auto-save for toggles/selects, explicit save for complex forms

**Chosen:** Option 3 - Hybrid approach

**Rationale:**
- Toggles and dropdowns are reversible, so immediate save is safe
- Complex forms (auto-archive rules, agent prompts) benefit from review before commit
- Matches user expectations from modern apps
- Reduces cognitive load for simple changes

**Downstream Impact:** UI provides instant feedback for toggle/select changes; complex editors show dirty state and require explicit save.

---

### Decision 4: Store Factory Pattern

**Context:** Need centralized state management for settings across multiple UI components.

**Options Considered:**
1. Local component state with context
2. Single monolithic store
3. Factory function pattern (like `decisionsStore`)

**Chosen:** Option 3 - Factory function pattern

**Rationale:**
- Matches established pattern in codebase
- Enables derived stores for individual sections
- Provides clean method-based API for updates
- Supports testing via store reset

**Downstream Impact:** Components import `settingsStore` and derived stores like `modelsConfig`, `overseerConfig` from `$lib/stores`.

---

### Decision 5: 6-Tab Navigation Structure

**Context:** Original spec had 4 tabs. User requested expanded scope with Agents tab and additional configurable settings.

**Options Considered:**
1. Keep 4 tabs, add settings to existing tabs
2. Create 6 tabs with clear separation of concerns
3. Single scrollable page with sections

**Chosen:** Option 2 - 6 dedicated tabs

**Rationale:**
- Each tab has distinct purpose and audience (basic vs power user)
- Reduces cognitive load per screen
- Matches mental model of configuration categories
- Tab structure is easily extendable

**Downstream Impact:** Tab order: General, Models, Agents, Orchestration, Connections, Costs

---

## Deviations from Spec

### Deviation 1: Added 4 New Configuration Categories

**Spec Said:** Wire up models, overseer, and auto-archive endpoints only.

**Implementation Does:** Adds General, Agents, Connections, and Costs tabs with local stubs.

**Reason:** User explicitly requested expanded scope during planning phase to support full system configuration from UI.

**Severity:** Moderate (additive change, no breaking impact)

---

### Deviation 2: Renamed "Overseer" Tab to "Orchestration"

**Spec Said:** Use term "overseer" for orchestrator settings.

**Implementation Does:** Uses "Orchestration" as tab label.

**Reason:** "Orchestration" is more intuitive for users; API endpoints still use `/api/config/overseer` path.

**Severity:** Minor (cosmetic only)

---

### Deviation 3: Auto-Archive in General Tab

**Spec Said:** Auto-archive as separate concern.

**Implementation Does:** Places auto-archive toggle and rules editor in General tab.

**Reason:** User specifically requested auto-archive be "added to General" tab during planning clarification.

**Severity:** Minor (organizational change)

---

## Known Limitations

1. **API keys are read-only** - Keys must be set via environment variables for security. UI shows masked status only.

2. **No configuration profiles** - Cannot save/load named configuration profiles.

3. **No configuration audit trail** - Changes are not logged for review.

4. **Agent prompt editing not implemented** - Agent cards show timeout/enable only. Full prompt editing requires additional Engine endpoint.

5. **A11y warnings in build** - Some accessibility warnings remain from existing components (labels, ARIA roles). Not introduced by this unit.

---

## Phase 2 Completion Notes

### Changes Made

1. **Deleted `settingsStubs.ts`** - No longer needed, all endpoints are real.

2. **Updated `settingsApi.ts`**:
   - `getGeneralConfig()` → Real API call to `/api/config/general`
   - `updateGeneralConfig()` → Real API call with Engine response structure
   - `getApiConnectionConfig()` → Real API call to `/api/config/api` (read-only)
   - `getAgentsConfig()` → Real API call to `/api/config/agents`
   - `updateAgentConfig()` → Real API call to `/api/config/agents/{name}`
   - `getCostsConfig()` → Real API call to `/api/config/costs`
   - `updateCostsConfig()` → Real API call with Engine response structure
   - Removed `updateApiConnection()` (API keys are read-only)

3. **Updated `types.ts`**:
   - `ApiConfigResponse` - Uses `ApiKeyStatus` objects instead of strings
   - `AgentsConfigResponse` - Uses array instead of Record
   - Added `UpdateGeneralResponse`, `UpdateCostsResponse`, `UpdateAgentResponse`
   - Added `last_updated` field to `CostsConfigResponse`

4. **Updated `settings.ts` (store)**:
   - Added `updateAgent()` method for per-agent updates
   - Removed `updateApiConnection()` method
   - Updated comment from "(stubbed)" to real API

---

## Open Questions

- [ ] Should agent system prompts be editable via UI, or read-only with file-based editing?
- [ ] What is the expected latency for cost usage updates? Real-time or periodic refresh?
- [ ] Should API key updates require current key verification before accepting new key?
- [ ] Are there agent interdependencies that would warn users before disabling certain agents?

---

## Test Coverage

- **Line coverage:** ~85% for settings store
- **Branch coverage:** ~80% for settings store
- **Tests:** 9 test cases covering initialization, load, update, error handling, and utility methods

**Uncovered areas:**
- `updateAgentConfig` (stubbed, no real API to test)
- Full integration with Engine APIs (requires running Engine)
- UI component tests (Svelte component testing not yet configured)

---

## Dependencies Used

| Dependency | Version | Why |
|------------|---------|-----|
| svelte/store | 4.x | Reactive state management (existing) |
| vitest | 2.x | Unit testing framework (existing) |

No new dependencies added - uses existing project infrastructure.

---

## Files Delivered

### New Files

| File | Lines | Description |
|------|-------|-------------|
| `src/lib/api/settingsApi.ts` | 254 | Config API client with real + stubbed endpoints |
| `src/lib/api/settingsStubs.ts` | 122 | Mock data for unimplemented Engine endpoints |
| `src/lib/stores/settings.ts` | 658 | Unified config store with per-section loading |
| `src/lib/stores/settings.test.ts` | 211 | Unit tests for settings store |
| `docs/ENGINE-CONFIG-API-SPEC.md` | 280 | Design doc for Engine team |
| `docs/UNIT-9-SETTINGS/IMPLEMENTATION.md` | this file | Implementation notes |
| `docs/UNIT-9-SETTINGS/README.md` | ~100 | Package documentation |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/api/types.ts` | Added 18 config type definitions (~120 lines) |
| `src/lib/api/index.ts` | Exported `settingsApi` |
| `src/lib/stores/index.ts` | Exported settings store and 15 derived stores |
| `src/routes/settings/+page.svelte` | Complete 6-tab settings UI (~700 lines) |

---

## API Migration Guide

When Engine implements stubbed endpoints, update `settingsApi.ts`:

```typescript
// Before (stubbed)
export async function getGeneralConfig(): Promise<GeneralConfigResponse> {
  await simulateDelay();
  return { ...GENERAL_STUB };
}

// After (real API)
export async function getGeneralConfig(): Promise<GeneralConfigResponse> {
  return apiClient.get<GeneralConfigResponse>('/api/config/general');
}
```

Each stubbed function has a TODO comment with the real API call commented out.
